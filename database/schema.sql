CREATE DATABASE IF NOT EXISTS madrassati CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE madrassati;

CREATE TABLE roles (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role_id TINYINT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','inactive','pending') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE classes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  level ENUM('primary','middle') NOT NULL,
  school_year VARCHAR(20) NOT NULL,
  teacher_id BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_class_year (name, school_year),
  CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE students (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL UNIQUE,
  registration_number VARCHAR(40) NOT NULL UNIQUE,
  birth_date DATE,
  gender ENUM('male','female') NULL,
  class_id BIGINT UNSIGNED NULL,
  joined_at DATE,
  medical_notes TEXT,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE TABLE parent_students (
  parent_user_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  relation_type VARCHAR(30) DEFAULT 'guardian',
  PRIMARY KEY (parent_user_id, student_id),
  CONSTRAINT fk_ps_parent FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE subjects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE teacher_subjects (
  teacher_user_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (teacher_user_id, subject_id, class_id),
  CONSTRAINT fk_ts_teacher FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE admissions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  reference_code VARCHAR(30) NOT NULL UNIQUE,
  student_name VARCHAR(120) NOT NULL,
  desired_level ENUM('primary','middle') NOT NULL,
  desired_class VARCHAR(80),
  birth_date DATE,
  parent_name VARCHAR(120) NOT NULL,
  parent_email VARCHAR(190) NOT NULL,
  parent_phone VARCHAR(30) NOT NULL,
  status ENUM('pending','documents_required','accepted','rejected') DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  class_date DATE NOT NULL,
  status ENUM('present','absent','late','excused') NOT NULL,
  note VARCHAR(255),
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_student_date (student_id, class_date),
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_user FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE grades (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL DEFAULT 20,
  graded_at DATE NOT NULL,
  note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_grade_score CHECK (score >= 0 AND score <= max_score),
  CONSTRAINT fk_gr_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_gr_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_gr_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE lessons (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  resource_url VARCHAR(500),
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_less_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_less_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_less_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE assignments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  instructions TEXT,
  due_at DATETIME NOT NULL,
  max_score DECIMAL(5,2) DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_as_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_as_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_as_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE support_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  session_date DATETIME NOT NULL,
  room VARCHAR(80),
  topic VARCHAR(180) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sup_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  CONSTRAINT fk_sup_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_sup_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE support_students (
  support_session_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  attended BOOLEAN DEFAULT FALSE,
  progress_note VARCHAR(255),
  PRIMARY KEY (support_session_id, student_id),
  CONSTRAINT fk_ss_session FOREIGN KEY (support_session_id) REFERENCES support_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  payment_month VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash','bank_transfer','card') NOT NULL,
  status ENUM('pending','paid','rejected') DEFAULT 'pending',
  transaction_reference VARCHAR(120),
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO roles (id, name) VALUES (1,'admin'),(2,'teacher'),(3,'parent'),(4,'student'),(5,'accountant');
INSERT IGNORE INTO subjects (name) VALUES ('اللغة العربية'),('اللغة الفرنسية'),('الرياضيات'),('النشاط العلمي'),('الاجتماعيات'),('التربية الإسلامية'),('التربية البدنية');

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_grades_student_subject ON grades(student_id, subject_id);
CREATE INDEX idx_attendance_date ON attendance(class_date);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_payments_student_status ON payments(student_id, status);
