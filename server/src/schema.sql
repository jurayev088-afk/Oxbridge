CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR(10) PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  teacher_id VARCHAR(10) NOT NULL,
  teacher_name VARCHAR(100) NOT NULL,
  room_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_type VARCHAR(12) NOT NULL CHECK (day_type IN ('even', 'odd', 'weekdays', 'daily')),
  color VARCHAR(20) DEFAULT '#c4a882',
  branch_id INTEGER REFERENCES branches(id) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student', 'admin', 'director')),
  phone VARCHAR(30),
  email VARCHAR(100),
  address TEXT,
  payment_due NUMERIC(12, 0) DEFAULT 0,
  monthly_fee NUMERIC(12, 0) DEFAULT 0,
  photo_url TEXT,
  father_name VARCHAR(100),
  father_phone VARCHAR(30),
  mother_name VARCHAR(100),
  mother_phone VARCHAR(30),
  group_id VARCHAR(10) REFERENCES groups(id),
  telegram_chat_id VARCHAR(32),
  father_telegram_chat_id VARCHAR(32),
  mother_telegram_chat_id VARCHAR(32),
  login VARCHAR(50) UNIQUE,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id),
  group_id VARCHAR(10) REFERENCES groups(id),
  day_type VARCHAR(12) NOT NULL CHECK (day_type IN ('even', 'odd', 'weekdays', 'daily')),
  room_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  group_code VARCHAR(20) NOT NULL,
  teacher_name VARCHAR(100) NOT NULL,
  teacher_id VARCHAR(10) NOT NULL,
  color VARCHAR(20) DEFAULT '#c4a882'
);

CREATE TABLE IF NOT EXISTS attendance (
  group_id VARCHAR(10) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  grade VARCHAR(20) CHECK (grade IN ('excellent', 'good', 'no_homework')),
  PRIMARY KEY (group_id, student_id, date)
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id) DEFAULT 1,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
  method VARCHAR(20) DEFAULT 'naxt',
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions (transaction_date);

CREATE TABLE IF NOT EXISTS student_payments (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
  method VARCHAR(20) DEFAULT 'naxt',
  payment_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_payments_date ON student_payments (payment_date);

CREATE TABLE IF NOT EXISTS monthly_student_bills (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  expected_amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  payment_id INTEGER REFERENCES student_payments(id) ON DELETE SET NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (student_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_student_bills_period ON monthly_student_bills (year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_student_bills_status ON monthly_student_bills (status);

CREATE TABLE IF NOT EXISTS monthly_expense_records (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  category VARCHAR(30) NOT NULL CHECK (category IN ('teacher_salary', 'utility')),
  teacher_id VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
  label VARCHAR(200) NOT NULL DEFAULT '',
  amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_expense_period ON monthly_expense_records (year, month);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) DEFAULT '',
  source VARCHAR(50) DEFAULT 'boshqa',
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'trial', 'converted', 'lost')),
  course_interest VARCHAR(100) DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_group_id ON users (group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_group_date ON attendance (group_id, date);

CREATE TABLE IF NOT EXISTS telegram_phone_links (
  phone VARCHAR(20) PRIMARY KEY,
  chat_id VARCHAR(32) NOT NULL,
  linked_at TIMESTAMP DEFAULT NOW()
);
