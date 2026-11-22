# Code Walkthrough — شرح الكود المهم فـ Madrassati

هاد الملف كيركز على الأجزاء اللي غالباً غادي تحتاج تشرحها فالمناقشة. ماشي شرح حرفي لكل CSS declaration، ولكن شرح منطقي للكود والـflow ديال التطبيق.

## A. `backend/server.js`

### 1. Imports

```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
```

- `dotenv/config`: كيحمّل متغيرات `.env` لـ `process.env`.
- `express`: framework باش نبنيو server وroutes.
- `cors`: كيتحكم فطلبات cross-origin.
- `helmet`: كيضيف security headers.
- `bcrypt`: hash ومقارنة كلمات المرور.
- `jwt`: إنشاء والتحقق من tokens.
- `mysql2/promise`: اتصال MySQL باستعمال Promises و`async/await`.

### 2. إعدادات الخادم والاتصال

`port` كياخذ `PORT` أو 3000. `jwtSecret` كياخذ السر من environment؛ فـ production إلا ما كانش السر مضبوط التطبيق كيوقف، باش ما يخدمش بسر افتراضي معروف. `allowedOrigins` كتقرا origins المسموح بها من `APP_ORIGIN`.

`mysql.createPool()` كينشئ connection pool: مجموعة اتصالات كتعاود تستعملها عوض فتح connection جديد لكل query. `connectionLimit: 10` هو الحد الأقصى ديال الاتصالات المتزامنة فهاد الإعداد.

### 3. Middleware

- `helmet(...)`: security headers.
- `cors(...)`: كيرفض origins اللي ماشي فـ allowlist.
- `express.json(...)`: كيفك JSON request body ويحط البيانات فـ `req.body`.

### 4. Helper functions

- `asyncRoute(fn)`: كيلتقط أخطاء async ويرسلها لـ Express error handler.
- `query(sql, params)`: helper كينفذ SQL باستعمال `pool.execute` ويرجع rows أو result.
- `signUser(user)`: كيصنع JWT فيه `id`, `role`, `email` ومدة الصلاحية.
- `authenticate`: كيقرا Bearer token من Authorization header، كيتحقق منه، وكيحط معلومات المستخدم فـ `req.user`.
- `allow('admin', ...)`: middleware ديال authorization؛ كيسمح غير للأدوار المحددة.
- `required(body, fields)`: كيرجع أسماء الحقول الناقصة.
- `canTeachClass`: كيتأكد واش الأستاذ مسؤول على القسم أو مربوط به فـ `teacher_subjects`.
- `canAccessStudent`: كيتأكد واش المستخدم مسموح ليه يوصل لملف تلميذ حسب الدور والعلاقة.

### 5. أهم Routes

| Route | شنو كتدير؟ | شنو خاص تشرح؟ |
|---|---|---|
| `GET /api/health` | كتجرب `SELECT 1` | فحص سريع لاتصال قاعدة البيانات. |
| `POST /api/auth/login` | كتجيب الحساب وتقارن password بـ bcrypt | login، status ديال الحساب، JWT. |
| `GET /api/auth/me` | كتجيب profile باستعمال id اللي فـ JWT | route محمية. |
| `POST /api/admissions` | كتتحقق من البيانات وكتسجل الطلب | validation، INSERT، reference. |
| `GET /api/admissions/status/:reference` | كتجيب status فقط | route عامة ولكن كتقلل المعلومات المكشوفة. |
| `GET /api/admissions` | الإدارة كتستعرض الطلبات | `authenticate` + `allow('admin')`. |
| `PATCH /api/admissions/:id` | كتبدل status وملاحظة الإدارة | PATCH لتعديل جزئي. |
| `POST /api/students` | transaction كتخلق user وstudent | علاش transaction؟ باش العمليتين ينجحو بجوج أو يتلغى التغيير بجوج. |
| `GET /api/grades` | كتجيب النقط بعد فحص الوصول | authorization حسب الطالب/ولي الأمر/الأستاذ. |
| `POST /api/grades` | كتضيف نقطة | validation ديال score وmaxScore. |
| `POST /api/attendance` | كتسجل الحضور | ENUM values و`ON DUPLICATE KEY UPDATE`. |
| `POST /api/lessons` | كتضيف درس | التحقق من القسم والأستاذ. |
| `POST /api/assignments` | كتضيف فرض | due date وmax score. |
| `POST /api/support-sessions` | كتسجل حصة دعم وتربط التلاميذ | transaction وإضافة rows لجدول الربط. |
| `POST /api/payments` | كتسجل أداء | invoice number وmethod وstatus. |
| `GET /api/dashboard/admin` | إحصائيات الإدارة | `COUNT`, `SUM`, `MONTH`, `YEAR`. |

### 6. Error handling وStatic files

- `app.use('/api', ...)`: أي API route غير موجودة كترجع 404 JSON.
- `express.static(...)`: كيعرض ملفات `dist/` بحال HTML وCSS وJS والصور.
- آخر middleware كيرجع `index.html` للمسارات الأخرى.
- Error handler كيسجل الخطأ فالخادم ويرجع رسالة عامة للعميل، وما كيكشفش تفاصيل SQL الداخلية.

## B. `dist/app.js`

### 1. DOM helpers

`$` كتجيب أول عنصر مطابق لـ CSS selector. `$$` كتجيب جميع العناصر المطابقة فـ Array. `escapeHtml` كتحول الرموز الحساسة (`<`, `>`, `&`, quotes) لنسخ آمنة ملي كنركبو محتوى فـ HTML.

### 2. Login form

`onsubmit` كيلغي submit الافتراضي، كيجمع البيانات من FormData، كيبعث `fetch('/api/auth/login')`، كيقرا JSON، وكيعرض رسالة خطأ إلا response ما كانش ناجح. إلا نجح، كيخزن token وبيانات المستخدم فـ localStorage وكيعرض dashboard حسب role.

### 3. `seed` و`db`

`seed` هنا ماشي database seed script؛ هو object ديال بيانات demo للواجهة. `db` كيقرا نسخة من `localStorage` أو كيستعمل `seed`. `save()` كيرجع يخزن البيانات التجريبية محلياً. هاد البيانات ما كتساويش MySQL.

### 4. Admission form

الفورم كيجمع القيم، كيحوّل المستوى إلى `primary` أو `middle`، وكيبعث POST JSON لـ `/api/admissions`. إلا رجع API نجاح، كيعرض reference. إلا فشل، كيعرض الخطأ وما كيدعيش أن الطلب تخزن.

### 5. `roles`

Object فيه labels وgreetings وnavigation لكل role. هادشي كيتحكم فشكل القائمة الجانبية التجريبية، ماشي هو مصدر الصلاحيات الحقيقي. الصلاحيات الحقيقية خاصها تكون دائماً فالBackend.

### 6. UI helper functions

- `status`: كيبني badge ديال الحالة.
- `table`: كيبني جدول HTML وكيعمل escaping للقيم العادية.
- `stats`: كيبني cards ديال الإحصائيات التجريبية.
- `title`: كيبني عنوان الصفحة.
- `form`: كيبني form تجريبي من fields configuration.
- `home()` و`page()`: كيركبو محتوى كل dashboard.
- `bind()`: كيربط forms التجريبية بوظائف كتعدل `db` وكتحفظها فـ localStorage.
- `open(roleName)`: كيعرض dashboard ويضبط الدور والقائمة.

## C. `database/schema.sql` — أمثلة ديال العلاقات

### Users وRoles

كل user عندو `role_id` كيرجع لـ `roles.id`. هادي علاقة One-to-Many: دور واحد ممكن يكون عندو بزاف ديال المستخدمين، وكل مستخدم عندو دور واحد.

### Classes وStudents

`students.class_id` كيرجع لـ `classes.id`. القسم يقدر يكون فيه عدة تلاميذ، والتلميذ عندو قسم واحد أو NULL.

### Parent وStudent

`parent_students` جدول ربط فيه `parent_user_id` و`student_id`. هادي Many-to-Many: ولي أمر يقدر يتبع أكثر من طفل، والطفل ممكن يكون عندو أكثر من ولي أمر.

### Grades

كل note مرتبطة بـ student وsubject وteacher. Foreign Keys كتضمن أن هاد المراجع موجودة.

### Attendance

`UNIQUE(student_id, class_date)` كيعني ما يمكنش يكون أكثر من سجل حضور لنفس التلميذ فنفس التاريخ. `ON DUPLICATE KEY UPDATE` كيسمح بتحديث الحالة إلا كان السجل موجود من قبل.

### Support sessions

`support_sessions` فيها معلومات الحصة، و`support_students` جدول ربط بين الحصة والتلاميذ المشاركين.

## D. `backend/seed.js`

1. كيقرا `.env`.
2. كيتأكد من `ADMIN_EMAIL` و`ADMIN_PASSWORD`.
3. كيدير bcrypt hash لكلمة المرور.
4. كيقلب على role ديال admin.
5. كيدخل حساب Admin أو كيحدث الحساب الموجود بنفس email.
6. كيسد pool فالنهاية.

## E. جمل تقنية قصيرة تقدر تستعملها

- "We use a connection pool to reuse MySQL connections efficiently."
- "Passwords are hashed with bcrypt; we never store plain-text passwords."
- "JWT authentication identifies the current user, while role middleware authorizes actions."
- "The database schema uses primary and foreign keys to preserve relational integrity."
- "The current dashboards are a prototype and still need full API integration."
