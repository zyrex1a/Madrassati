import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-secret-change-before-deploy');
if (!jwtSecret) throw new Error('JWT_SECRET must be configured in production.');

const allowedOrigins = (process.env.APP_ORIGIN || 'http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean);

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'madrassati',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  charset: 'utf8mb4'
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin not allowed by CORS'));
}, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const query = async (sql, params = {}) => (await pool.execute(sql, params))[0];

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'يجب تسجيل الدخول' });
  try { req.user = jwt.verify(token, jwtSecret); next(); }
  catch { res.status(401).json({ message: 'الجلسة منتهية أو غير صالحة' }); }
}

const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'ليس لديك صلاحية' });
const required = (body, fields) => fields.filter(field => body[field] === undefined || body[field] === null || body[field] === '');

async function canTeachClass(user, classId) {
  if (user.role === 'admin') return true;
  const rows = await query(`SELECT 1 FROM classes c LEFT JOIN teacher_subjects ts
    ON ts.class_id=c.id AND ts.teacher_user_id=:user
    WHERE c.id=:classId AND (c.teacher_id=:user OR ts.teacher_user_id=:user) LIMIT 1`,
    { user:user.id, classId });
  return Boolean(rows[0]);
}

async function canAccessStudent(user, studentId) {
  if (['admin','accountant'].includes(user.role)) return true;
  if (user.role === 'teacher') {
    const rows = await query(`SELECT 1 FROM students s JOIN classes c ON c.id=s.class_id
      LEFT JOIN teacher_subjects ts ON ts.class_id=c.id AND ts.teacher_user_id=:user
      WHERE s.id=:student AND (c.teacher_id=:user OR ts.teacher_user_id=:user) LIMIT 1`, { user:user.id, student:studentId });
    return Boolean(rows[0]);
  }
  if (user.role === 'student') {
    const rows = await query('SELECT 1 FROM students WHERE id=:student AND user_id=:user', { student:studentId,user:user.id });
    return Boolean(rows[0]);
  }
  if (user.role === 'parent') {
    const rows = await query('SELECT 1 FROM parent_students WHERE parent_user_id=:user AND student_id=:student', { user:user.id,student:studentId });
    return Boolean(rows[0]);
  }
  return false;
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await query('SELECT 1');
  res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const missing = required(req.body, ['email', 'password']);
  if (missing.length) return res.status(400).json({ message: 'البريد وكلمة المرور مطلوبان' });
  const rows = await query(`SELECT u.id,u.full_name,u.email,u.password_hash,u.status,r.name role
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=:email LIMIT 1`, { email: req.body.email.toLowerCase().trim() });
  const user = rows[0];
  if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ message: 'معلومات الدخول غير صحيحة' });
  if (user.status !== 'active') return res.status(403).json({ message: 'الحساب غير مفعل' });
  res.json({ token: signUser(user), user: { id:user.id, fullName:user.full_name, email:user.email, role:user.role } });
}));

app.get('/api/auth/me', authenticate, asyncRoute(async (req, res) => {
  const rows = await query(`SELECT u.id,u.full_name,u.email,u.phone,u.status,r.name role
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=:id`, { id:req.user.id });
  res.json(rows[0] || null);
}));

app.post('/api/admissions', asyncRoute(async (req, res) => {
  const fields = ['studentName','desiredLevel','parentName','parentEmail','parentPhone'];
  const missing = required(req.body, fields);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (!['primary','middle'].includes(req.body.desiredLevel)) return res.status(400).json({ message:'المستوى غير صالح' });
  const reference = 'MD-' + Date.now().toString().slice(-8);
  await query(`INSERT INTO admissions(reference_code,student_name,desired_level,desired_class,birth_date,parent_name,parent_email,parent_phone)
    VALUES(:reference,:studentName,:desiredLevel,:desiredClass,:birthDate,:parentName,:parentEmail,:parentPhone)`, {
      reference, studentName:req.body.studentName.trim(), desiredLevel:req.body.desiredLevel,
      desiredClass:req.body.desiredClass || null, birthDate:req.body.birthDate || null,
      parentName:req.body.parentName.trim(), parentEmail:req.body.parentEmail.toLowerCase().trim(), parentPhone:req.body.parentPhone.trim()
    });
  res.status(201).json({ message:'تم إرسال الطلب', reference });
}));

app.get('/api/admissions/status/:reference', asyncRoute(async (req, res) => {
  const rows = await query('SELECT reference_code,student_name,status,admin_note,updated_at FROM admissions WHERE reference_code=:reference', { reference:req.params.reference });
  if (!rows[0]) return res.status(404).json({ message:'الطلب غير موجود' });
  res.json({ reference_code: rows[0].reference_code, status: rows[0].status, updated_at: rows[0].updated_at });
}));

app.get('/api/admissions', authenticate, allow('admin'), asyncRoute(async (req, res) => {
  const status = req.query.status;
  const rows = status
    ? await query('SELECT * FROM admissions WHERE status=:status ORDER BY created_at DESC', { status })
    : await query('SELECT * FROM admissions ORDER BY created_at DESC');
  res.json(rows);
}));

app.patch('/api/admissions/:id', authenticate, allow('admin'), asyncRoute(async (req, res) => {
  if (!['pending','documents_required','accepted','rejected'].includes(req.body.status)) return res.status(400).json({ message:'الحالة غير صالحة' });
  const result = await query('UPDATE admissions SET status=:status,admin_note=:note WHERE id=:id', { status:req.body.status, note:req.body.note || null, id:req.params.id });
  if (!result.affectedRows) return res.status(404).json({ message:'الطلب غير موجود' });
  res.json({ message:'تم تحديث الطلب' });
}));

app.get('/api/users', authenticate, allow('admin'), asyncRoute(async (req, res) => {
  const rows = await query(`SELECT u.id,u.full_name,u.email,u.phone,u.status,r.name role,u.created_at
    FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.created_at DESC`);
  res.json(rows);
}));

app.post('/api/users', authenticate, allow('admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['fullName','email','password','role']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (!/^\S+@\S+\.\S+$/.test(req.body.email) || String(req.body.password).length < 10) return res.status(400).json({ message:'البريد الإلكتروني أو كلمة المرور غير صالحة (10 أحرف على الأقل)' });
  const roles = await query('SELECT id FROM roles WHERE name=:role', { role:req.body.role });
  if (!roles[0]) return res.status(400).json({ message:'الدور غير صالح' });
  const hash = await bcrypt.hash(req.body.password, 12);
  const result = await query(`INSERT INTO users(role_id,full_name,email,phone,password_hash)
    VALUES(:roleId,:fullName,:email,:phone,:hash)`, { roleId:roles[0].id, fullName:req.body.fullName, email:req.body.email.toLowerCase(), phone:req.body.phone || null, hash });
  res.status(201).json({ id:result.insertId, message:'تم إنشاء الحساب' });
}));

app.get('/api/classes', authenticate, asyncRoute(async (_req, res) => {
  res.json(await query(`SELECT c.*,u.full_name teacher_name,(SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) student_count
    FROM classes c LEFT JOIN users u ON u.id=c.teacher_id ORDER BY c.level,c.name`));
}));

app.post('/api/classes', authenticate, allow('admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['name','level','schoolYear']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  const result = await query('INSERT INTO classes(name,level,school_year,teacher_id) VALUES(:name,:level,:year,:teacher)', {
    name:req.body.name, level:req.body.level, year:req.body.schoolYear, teacher:req.body.teacherId || null
  });
  res.status(201).json({ id:result.insertId, message:'تم إنشاء القسم' });
}));

app.get('/api/students', authenticate, allow('admin','teacher','accountant'), asyncRoute(async (req, res) => {
  const teacherId = req.user.role === 'teacher' ? req.user.id : null;
  const rows = await query(`SELECT s.id,s.registration_number,u.full_name,u.email,c.name class_name,c.level,s.birth_date
    FROM students s LEFT JOIN users u ON u.id=s.user_id LEFT JOIN classes c ON c.id=s.class_id
    WHERE (:classId IS NULL OR s.class_id=:classId)
      AND (:teacherId IS NULL OR c.teacher_id=:teacherId OR EXISTS (SELECT 1 FROM teacher_subjects ts WHERE ts.class_id=c.id AND ts.teacher_user_id=:teacherId))
    ORDER BY u.full_name`, { classId:req.query.classId || null, teacherId });
  res.json(rows);
}));

app.post('/api/students', authenticate, allow('admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['fullName','email','password','registrationNumber']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (!/^\S+@\S+\.\S+$/.test(req.body.email) || String(req.body.password).length < 10) return res.status(400).json({ message:'البريد الإلكتروني أو كلمة المرور غير صالحة (10 أحرف على الأقل)' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const role = (await connection.execute("SELECT id FROM roles WHERE name='student'"))[0][0];
    const hash = await bcrypt.hash(req.body.password, 12);
    const [userResult] = await connection.execute(`INSERT INTO users(role_id,full_name,email,phone,password_hash)
      VALUES(?,?,?,?,?)`, [role.id,req.body.fullName,req.body.email.toLowerCase(),req.body.phone || null,hash]);
    const [studentResult] = await connection.execute(`INSERT INTO students(user_id,registration_number,birth_date,gender,class_id,joined_at,medical_notes)
      VALUES(?,?,?,?,?,CURDATE(),?)`, [userResult.insertId,req.body.registrationNumber,req.body.birthDate || null,req.body.gender || null,req.body.classId || null,req.body.medicalNotes || null]);
    if (req.body.parentUserId) await connection.execute('INSERT INTO parent_students(parent_user_id,student_id) VALUES(?,?)', [req.body.parentUserId,studentResult.insertId]);
    await connection.commit();
    res.status(201).json({ id:studentResult.insertId, message:'تم إنشاء ملف التلميذ' });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}));

app.get('/api/parent/children', authenticate, allow('parent'), asyncRoute(async (req, res) => {
  res.json(await query(`SELECT s.id,s.registration_number,u.full_name,c.name class_name,c.level
    FROM parent_students ps JOIN students s ON s.id=ps.student_id
    LEFT JOIN users u ON u.id=s.user_id LEFT JOIN classes c ON c.id=s.class_id
    WHERE ps.parent_user_id=:parentId`, { parentId:req.user.id }));
}));

app.get('/api/grades', authenticate, asyncRoute(async (req, res) => {
  let studentId = req.query.studentId;
  if (req.user.role === 'student') {
    const row = await query('SELECT id FROM students WHERE user_id=:id', { id:req.user.id });
    studentId = row[0]?.id;
  }
  if (!studentId) return res.status(400).json({ message:'studentId مطلوب' });
  if (!(await canAccessStudent(req.user, studentId))) return res.status(403).json({ message:'غير مسموح' });
  res.json(await query(`SELECT g.id,g.title,g.score,g.max_score,g.graded_at,g.note,sub.name subject,t.full_name teacher
    FROM grades g JOIN subjects sub ON sub.id=g.subject_id JOIN users t ON t.id=g.teacher_id
    WHERE g.student_id=:studentId ORDER BY g.graded_at DESC`, { studentId }));
}));

app.post('/api/grades', authenticate, allow('teacher','admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['studentId','subjectId','title','score']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (req.user.role === 'teacher' && !(await canAccessStudent(req.user, req.body.studentId))) return res.status(403).json({ message:'لا يمكنك إدخال نقطة لهذا التلميذ' });
  const maxScore = Number(req.body.maxScore || 20), score = Number(req.body.score);
  if (score < 0 || score > maxScore) return res.status(400).json({ message:'النقطة غير صالحة' });
  const result = await query(`INSERT INTO grades(student_id,subject_id,teacher_id,title,score,max_score,graded_at,note)
    VALUES(:student,:subject,:teacher,:title,:score,:maxScore,:date,:note)`, {
      student:req.body.studentId, subject:req.body.subjectId, teacher:req.user.id, title:req.body.title,
      score, maxScore, date:req.body.gradedAt || new Date().toISOString().slice(0,10), note:req.body.note || null
    });
  res.status(201).json({ id:result.insertId, message:'تم حفظ النقطة' });
}));

app.get('/api/attendance', authenticate, asyncRoute(async (req, res) => {
  if (!req.query.studentId) return res.status(400).json({ message:'studentId مطلوب' });
  if (!(await canAccessStudent(req.user, req.query.studentId))) return res.status(403).json({ message:'غير مسموح' });
  res.json(await query('SELECT * FROM attendance WHERE student_id=:student ORDER BY class_date DESC LIMIT 120', { student:req.query.studentId }));
}));

app.post('/api/attendance', authenticate, allow('teacher','admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['studentId','date','status']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (req.user.role === 'teacher' && !(await canAccessStudent(req.user, req.body.studentId))) return res.status(403).json({ message:'لا يمكنك تسجيل حضور هذا التلميذ' });
  if (!['present','absent','late','excused'].includes(req.body.status)) return res.status(400).json({ message:'حالة الحضور غير صالحة' });
  await query(`INSERT INTO attendance(student_id,class_date,status,note,recorded_by)
    VALUES(:student,:date,:status,:note,:user)
    ON DUPLICATE KEY UPDATE status=VALUES(status),note=VALUES(note),recorded_by=VALUES(recorded_by)`, {
      student:req.body.studentId,date:req.body.date,status:req.body.status,note:req.body.note || null,user:req.user.id
    });
  res.status(201).json({ message:'تم حفظ الحضور' });
}));

app.get('/api/lessons', authenticate, asyncRoute(async (req, res) => {
  res.json(await query(`SELECT l.*,s.name subject,u.full_name teacher,c.name class_name FROM lessons l
    JOIN subjects s ON s.id=l.subject_id JOIN users u ON u.id=l.teacher_id JOIN classes c ON c.id=l.class_id
    WHERE (:classId IS NULL OR l.class_id=:classId) ORDER BY l.published_at DESC`, { classId:req.query.classId || null }));
}));

app.post('/api/lessons', authenticate, allow('teacher','admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['classId','subjectId','title']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (req.user.role === 'teacher' && !(await canTeachClass(req.user, req.body.classId))) return res.status(403).json({ message:'لا يمكنك نشر درس لهذا القسم' });
  const result = await query(`INSERT INTO lessons(class_id,subject_id,teacher_id,title,description,resource_url)
    VALUES(:classId,:subjectId,:teacher,:title,:description,:url)`, {
      classId:req.body.classId,subjectId:req.body.subjectId,teacher:req.user.id,title:req.body.title,
      description:req.body.description || null,url:req.body.resourceUrl || null
    });
  res.status(201).json({ id:result.insertId, message:'تم نشر الدرس' });
}));

app.get('/api/assignments', authenticate, asyncRoute(async (req, res) => {
  res.json(await query(`SELECT a.*,s.name subject,u.full_name teacher,c.name class_name FROM assignments a
    JOIN subjects s ON s.id=a.subject_id JOIN users u ON u.id=a.teacher_id JOIN classes c ON c.id=a.class_id
    WHERE (:classId IS NULL OR a.class_id=:classId) ORDER BY a.due_at`, { classId:req.query.classId || null }));
}));

app.post('/api/assignments', authenticate, allow('teacher','admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['classId','subjectId','title','dueAt']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (req.user.role === 'teacher' && !(await canTeachClass(req.user, req.body.classId))) return res.status(403).json({ message:'لا يمكنك إنشاء فرض لهذا القسم' });
  const result = await query(`INSERT INTO assignments(class_id,subject_id,teacher_id,title,instructions,due_at,max_score)
    VALUES(:classId,:subjectId,:teacher,:title,:instructions,:dueAt,:maxScore)`, {
      classId:req.body.classId,subjectId:req.body.subjectId,teacher:req.user.id,title:req.body.title,
      instructions:req.body.instructions || null,dueAt:req.body.dueAt,maxScore:req.body.maxScore || 20
    });
  res.status(201).json({ id:result.insertId, message:'تم نشر الفرض' });
}));

app.get('/api/support-sessions', authenticate, asyncRoute(async (_req, res) => {
  res.json(await query(`SELECT ss.*,sub.name subject,u.full_name teacher,c.name class_name,
    (SELECT COUNT(*) FROM support_students x WHERE x.support_session_id=ss.id) student_count
    FROM support_sessions ss JOIN subjects sub ON sub.id=ss.subject_id JOIN users u ON u.id=ss.teacher_id
    LEFT JOIN classes c ON c.id=ss.class_id ORDER BY ss.session_date`));
}));

app.post('/api/support-sessions', authenticate, allow('teacher','admin'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['subjectId','sessionDate','topic']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  if (req.user.role === 'teacher' && req.body.classId && !(await canTeachClass(req.user, req.body.classId))) return res.status(403).json({ message:'لا يمكنك برمجة دعم لهذا القسم' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(`INSERT INTO support_sessions(class_id,subject_id,teacher_id,session_date,room,topic)
      VALUES(?,?,?,?,?,?)`, [req.body.classId || null,req.body.subjectId,req.user.id,req.body.sessionDate,req.body.room || null,req.body.topic]);
    for (const studentId of req.body.studentIds || []) await connection.execute('INSERT INTO support_students(support_session_id,student_id) VALUES(?,?)', [result.insertId,studentId]);
    await connection.commit();
    res.status(201).json({ id:result.insertId, message:'تمت برمجة حصة الدعم' });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}));

app.get('/api/payments', authenticate, asyncRoute(async (req, res) => {
  let studentId = req.query.studentId;
  if (req.user.role === 'student') {
    const rows = await query('SELECT id FROM students WHERE user_id=:id', { id:req.user.id });
    studentId = rows[0]?.id;
  }
  if (!['admin','accountant','parent','student'].includes(req.user.role)) return res.status(403).json({ message:'غير مسموح' });
  if (!['admin','accountant'].includes(req.user.role)) {
    if (!studentId || !(await canAccessStudent(req.user, studentId))) return res.status(403).json({ message:'غير مسموح' });
  }
  const sql = `SELECT p.*,u.full_name student_name FROM payments p JOIN students s ON s.id=p.student_id
    LEFT JOIN users u ON u.id=s.user_id WHERE (:studentId IS NULL OR p.student_id=:studentId) ORDER BY p.created_at DESC`;
  res.json(await query(sql, { studentId:studentId || null }));
}));

app.post('/api/payments', authenticate, allow('admin','accountant'), asyncRoute(async (req, res) => {
  const missing = required(req.body, ['studentId','paymentMonth','amount','method']);
  if (missing.length) return res.status(400).json({ message:'معلومات ناقصة', fields:missing });
  const invoice = 'INV-' + Date.now().toString().slice(-10);
  const result = await query(`INSERT INTO payments(student_id,invoice_number,payment_month,amount,method,status,transaction_reference,paid_at)
    VALUES(:student,:invoice,:month,:amount,:method,:status,:reference,:paidAt)`, {
      student:req.body.studentId,invoice,month:req.body.paymentMonth,amount:req.body.amount,method:req.body.method,
      status:req.body.status || 'pending',reference:req.body.transactionReference || null,
      paidAt:req.body.status === 'paid' ? new Date() : null
    });
  res.status(201).json({ id:result.insertId, invoice, message:'تم تسجيل الدفعة' });
}));

app.get('/api/notifications', authenticate, asyncRoute(async (req, res) => {
  res.json(await query('SELECT * FROM notifications WHERE user_id=:user ORDER BY created_at DESC LIMIT 50', { user:req.user.id }));
}));

app.patch('/api/notifications/:id/read', authenticate, asyncRoute(async (req, res) => {
  await query('UPDATE notifications SET is_read=TRUE WHERE id=:id AND user_id=:user', { id:req.params.id,user:req.user.id });
  res.json({ message:'تمت القراءة' });
}));

app.get('/api/dashboard/admin', authenticate, allow('admin'), asyncRoute(async (_req, res) => {
  const [[students],[teachers],[admissions],[payments],[support]] = await Promise.all([
    query('SELECT COUNT(*) total FROM students'),
    query("SELECT COUNT(*) total FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='teacher'"),
    query("SELECT COUNT(*) total FROM admissions WHERE status='pending'"),
    query("SELECT COALESCE(SUM(amount),0) total FROM payments WHERE status='paid' AND MONTH(created_at)=MONTH(CURDATE()) AND YEAR(created_at)=YEAR(CURDATE())"),
    query('SELECT COUNT(*) total FROM support_sessions WHERE session_date>=NOW()')
  ]);
  res.json({ students:students.total,teachers:teachers.total,pendingAdmissions:admissions.total,monthlyRevenue:payments.total,upcomingSupport:support.total });
}));

app.use('/api', (_req, res) => res.status(404).json({ message:'المسار غير موجود' }));
app.use(express.static(path.resolve(__dirname, '../dist')));
app.use((_req, res) => res.sendFile(path.resolve(__dirname, '../dist/index.html')));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message:'هذه البيانات موجودة مسبقاً' });
  res.status(500).json({ message:'حدث خطأ في الخادم' });
});

const isMain = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);
if (isMain) {
  app.listen(port, async () => {
    try { await query('SELECT 1'); console.log(`Madrassati running: http://localhost:${port}`); }
    catch (error) { console.error('MySQL connection failed:', error.message); }
  });
}

export default app;
