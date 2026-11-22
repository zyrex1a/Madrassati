# الدليل التقني لفهم مشروع Madrassati

هاد الوثيقة معمولة باش تفهم المشروع ديالك وتقدر تشرح علاش استعملتي كل تقنية، شنو كيدير كل dossier، وكيفاش كتدوز المعلومة من الواجهة حتى قاعدة البيانات.

## 1) شنو هو Madrassati؟

Madrassati هو prototype ديال منصة ويب لتسيير مدرسة خصوصية فيها الابتدائي والإعدادي. الفكرة هي تجمع الخدمات المدرسية فبلاصة وحدة:

- الإدارة: التلاميذ، الأقسام، التسجيلات، الإحصائيات.
- الأستاذ: النقط، الحضور، الدروس، الفروض وحصص الدعم.
- ولي الأمر: متابعة الأبناء والنقط والغياب والأداءات.
- التلميذ: الدروس والفروض والنتائج.
- المحاسب: تتبع الأداءات والفواتير.

**مهم:** الواجهات ديال الأدوار فيها بيانات demo ثابتة ومحفوظة فـ `localStorage`. الـAPI وMySQL موجودين، ولكن الربط بين كل dashboard والـAPI مازال ما تكملش. تسجيل الدخول الحقيقي كيتحقق من API، ولكن من بعد الدخول الواجهة كتعرّض محتوى تجريبي. قول هاد الحقيقة فالعرض وما تقولش بأن جميع الصفحات كتجيب البيانات الحقيقية من MySQL.

## 2) Architecture — كيفاش الأجزاء خدامة مع بعضياتها؟

```text
المستخدم (Browser)
       |
       v
Frontend: HTML + CSS + JavaScript (dist/)
       |
       | HTTP Request / JSON
       v
Backend: Node.js + Express (backend/server.js)
       |
       | SQL queries عبر mysql2
       v
MySQL Database (database/schema.sql)
```

- **Frontend:** كيعرض الصفحات، الفورمات، الجداول، وكيجمع المعلومات من المستخدم.
- **Backend:** كيتلقى HTTP requests، كيتأكد من البيانات والصلاحيات، وكيطبق منطق التطبيق.
- **Database:** كتخزن الحسابات والتلاميذ والنقط والغياب والأداءات وغيرها.
- **API:** هي الواجهة اللي كتخلي Frontend يتواصل مع Backend باستعمال HTTP وJSON.

## 3) شرح الملفات والمجلدات

### `dist/`

هاد المجلد فيه الملفات اللي كيتعرضو فالمتصفح:

- `index.html`: الهيكل ديال الصفحة؛ Header، Hero، الخدمات، التسجيل، Login Modal، Dashboard container.
- `styles.css`: الستايل العام ديال الموقع.
- `app.js`: التفاعلات ديال JavaScript؛ فتح نافذة الدخول، إرسال التسجيل، بناء الجداول والواجهات التجريبية.
- `login.css`, `dashboard.css`, `guide.css`, `premium.css`, `levels.css`, `school-theme.css`: ملفات CSS مقسمة حسب أجزاء التصميم.
- الصور `.webp`: صور المدرسة والأقسام والمكتبة والدعم.

علاش HTML/CSS/JS؟ HTML للبنية، CSS للمظهر والتجاوب، وJavaScript للتفاعل وإرسال الطلبات.

### `backend/server.js`

هاد هو قلب Backend:

1. `dotenv/config`: كيقرا متغيرات الإعداد من `.env`.
2. `express`: كينشئ HTTP server وكيعرف routes.
3. `cors`: كينظم شكون من origin مسموح ليه يتواصل مع API.
4. `helmet`: كيزيد HTTP security headers.
5. `bcryptjs`: كيهشّي كلمات المرور قبل تخزينها.
6. `jsonwebtoken`: كينشئ ويتحقق من JWT بعد تسجيل الدخول.
7. `mysql2/promise`: كيربط Node.js بـ MySQL وكيشغل SQL queries.

**مفاهيم خاصك تعرف:**

- Route: عنوان HTTP مع method بحال `GET /api/students`.
- Middleware: function كتخدم قبل route، مثلا `authenticate` كيتأكد واش المستخدم داخل.
- Authentication: شكون نتا؟ التحقق من الهوية.
- Authorization: واش عندك الحق تدير هاد العملية؟ التحقق من الصلاحية.
- JWT: token موقّع كيتبعت فـ `Authorization: Bearer <token>`.
- bcrypt hash: تخزين تمثيل مشفر أحادي الاتجاه لكلمة المرور، ماشي كلمة المرور الأصلية.
- Prepared/parameterized query: تمرير القيم كـ parameters عوض دمجها مباشرة فـ SQL، لتقليل SQL injection.

### `database/schema.sql`

هاد الملف كينشئ قاعدة البيانات والجداول والعلاقات. الجداول الرئيسية:

| Table | الدور ديالها |
|---|---|
| `roles` | أسماء الأدوار والصلاحيات الأساسية. |
| `users` | حسابات المستخدمين وكلمات المرور hashed. |
| `classes` | الأقسام والمستوى والسنة الدراسية والأستاذ المسؤول. |
| `students` | الملف المدرسي للتلميذ ورقم التسجيل والقسم. |
| `parent_students` | الربط بين ولي الأمر والتلميذ؛ علاقة many-to-many. |
| `subjects` | المواد الدراسية. |
| `teacher_subjects` | المواد والأقسام المسندة للأستاذ. |
| `admissions` | طلبات التسجيل الأولي. |
| `attendance` | الحضور والغياب والتأخر. |
| `grades` | النقط حسب التلميذ والمادة والأستاذ. |
| `lessons` | الدروس والموارد المنشورة. |
| `assignments` | الفروض والواجبات وآجالها. |
| `support_sessions` | حصص الدعم. |
| `support_students` | التلاميذ المشاركون فكل حصة دعم. |
| `payments` | الفواتير والأداءات وحالتها. |
| `notifications` | إشعارات كل مستخدم. |

**Primary Key:** معرف فريد للسطر. **Foreign Key:** رابط بين جدولين كيحافظ على سلامة العلاقات. **UNIQUE:** كيمنع تكرار قيمة بحال email أو registration number. **ENUM:** كيحدد القيم المسموح بها. **ON DELETE CASCADE:** ملي كيتحذف parent record، بعض السجلات المرتبطة به كتتحذف حتى هي حسب العلاقة.

### `backend/seed.js`

Seed script كينشئ حساب Admin الأول باستعمال `ADMIN_EMAIL` و`ADMIN_PASSWORD` اللي فـ `.env`. كلمة المرور كتدوز من bcrypt قبل التخزين. خاصك تشغل `database/schema.sql` قبل `npm run seed`.

### `.env` و`.env.example`

`.env` فيه الإعدادات الحساسة بحال DB password وJWT secret. ما خاصوش يطلع لـ GitHub. `.env.example` غير نموذج بلا أسرار حقيقية، باش أي واحد يعرف شنو خاصو يعمر.

### `package.json` و`package-lock.json`

- `package.json`: اسم المشروع، dependencies وscripts.
- `package-lock.json`: كيثبت نسخ dependencies بالتفصيل باش installation تكون متقاربة عند الجميع.

## 4) كيفاش كيدوز تسجيل الدخول؟

1. المستخدم كيدخل email وpassword فـ Login form.
2. `dist/app.js` كيرسل `POST /api/auth/login` بصيغة JSON.
3. Backend كيقلب على user فـ `users` وكيجيب الدور من `roles`.
4. `bcrypt.compare()` كيقارن password المدخل مع password hash المخزن.
5. إلا كانت المعلومات صحيحة والحساب active، Backend كيرجع JWT وبيانات المستخدم الأساسية.
6. Frontend كيخزن token فـ `localStorage` وكيعرض dashboard.

**ملاحظة أمنية:** تخزين JWT فـ localStorage عندو مخاطر إلا كان XSS؛ فالإنتاج خاص دراسة HttpOnly Secure cookies أو حل مناسب، مع حماية XSS.

## 5) كيفاش كيدوز طلب التسجيل؟

1. ولي الأمر كيعمر اسم التلميذ، المستوى، اسم ولي الأمر، الهاتف والبريد.
2. JavaScript كيبعث `POST /api/admissions`.
3. Backend كيتأكد من الحقول المطلوبة ومن المستوى (`primary` أو `middle`).
4. Backend كينشئ reference بحال `MD-12345678` وكيحفظ الطلب فـ `admissions`.
5. API كيرجع رقم المرجع، والواجهة كتعرضه للمستخدم.
6. من بعد يمكن التحقق من الحالة عبر `GET /api/admissions/status/:reference`.

إلا فشل API، الواجهة دابا كتظهر رسالة خطأ؛ ما كتدعيش أنها حفظات الطلب محلياً.

## 6) الأدوار والصلاحيات

- `admin`: إدارة المستخدمين، الأقسام، التسجيلات، التلاميذ وبعض العمليات الإدارية.
- `teacher`: إضافة النقط والدروس والفروض وحصص الدعم وتسجيل الحضور.
- `parent`: الاطلاع على الأبناء المرتبطين بالحساب.
- `student`: الاطلاع على معلوماته الدراسية.
- `accountant`: الاطلاع على ملفات مرتبطة بالتسيير المالي وإضافة الأداءات.

التحقق كيدوز بجوج مراحل: `authenticate` كيتأكد من JWT، و`allow(...)` كيتأكد من الدور. بعض قواعد الوصول التفصيلية مازال خاصها توسعة ومراجعة قبل الإنتاج.

## 7) واش المشروع كامل؟ شنو خدام وشنو باقي؟

**موجود فالكود:** صفحة عامة، فورم طلب التسجيل، login API، JWT، schema ديال MySQL، seed ديال Admin، ومجموعات API للتلاميذ والنقط والحضور والدروس والفروض والدعم والأداءات والإشعارات.

**Prototype / غير مكتمل:** dashboards كتستعمل بيانات demo فـ `localStorage`؛ ماشي كل العمليات ديال dashboard مربوطة بالـAPI. حسابات الأدوار الأخرى وواجهات CRUD الكاملة خاصها تكملة. ما كاينش رفع وثائق حقيقي فالتسجيل. الدفع بالبطاقة غير مفعّل. ما كايناش اختبارات آلية شاملة.

## 8) التعديلات اللي تدارو فهاد النسخة المراجعة

- منع fallback ديال JWT secret الضعيف فـ production؛ خاص `JWT_SECRET` يكون مضبوط.
- تحديد CORS على origins اللي فـ `APP_ORIGIN` بدل السماح لأي origin افتراضياً.
- تحسين التحقق من صلاحية الأستاذ للوصول لملف التلميذ والقسم، وإضافة القيود على قراءة التلاميذ وإضافة النقط والحضور والدروس والفروض والدعم.
- منع الأستاذ من الاطلاع على بيانات الأداءات.
- تقليل المعلومات اللي كيرجع endpoint العمومي ديال حالة التسجيل؛ ما بقاش كيرجع اسم التلميذ أو ملاحظة الإدارة.
- إضافة تحقق من البريد وكلمة المرور عند إنشاء المستخدم/التلميذ.
- `seed.js` ما بقاش يستعمل كلمة مرور Admin افتراضية معروفة؛ خاص إعداد كلمة مرور قوية فـ `.env`.
- إضافة escaping للقيم اللي كتدخل للجداول فواجهة demo لتقليل خطر HTML injection.
- حذف السلوك اللي كان كيعرض طلب التسجيل كأنه محفوظ تجريبياً فالإنتاج عند فشل API.
- توضيح أن الدفع بالبطاقة غير مفعّل وأن الواجهات demo.

هاد الإصلاحات تحسينات أولية وماشي شهادة بأن التطبيق ولى production-ready.

## 9) كيفاش تشرح المشروع بجملة تقنية؟

"Madrassati est un prototype full-stack de gestion scolaire. Le frontend est développé en HTML, CSS et JavaScript. Le backend expose une API REST avec Node.js et Express. Les données sont structurées dans MySQL. L'authentification utilise bcrypt pour le hash des mots de passe et JWT pour les sessions. Le projet modélise plusieurs rôles et fonctionnalités scolaires, avec une partie dashboard encore en mode démonstration."
