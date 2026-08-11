import './env';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { hashPassword, verifyPassword } from './auth';

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/crm_demo',
  ssl:
    process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
      ? { rejectUnauthorized: false }
      : undefined,
});

export async function initDb(): Promise<boolean> {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schema);

    const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM groups');
    const hasData = Number(rows[0]?.count ?? 0) > 0;

    if (!hasData) {
      const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
      await pool.query(seed);
      console.log('PostgreSQL: boshlang\'ich sozlamalar yuklandi');
    } else {
      console.log('PostgreSQL: mavjud ma\'lumotlar saqlanib qoldi');
    }

    await ensureStaffUsers();
    await ensureSchemaMigrations();

    return true;
  } catch (err) {
    console.error('PostgreSQL ulanish xatolik:', err);
    return false;
  }
}

async function ensureStaffUsers() {
  await pool.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('teacher', 'student', 'admin', 'director'));
  `).catch(() => {});

  await pool.query(
    `INSERT INTO users (id, name, role, phone, email, address)
     VALUES ('director', 'Xojayin', 'director', '+998 90 000 00 01', 'xojayin@oxbridge.uz', 'Toshkent, Oxbridge academy')
     ON CONFLICT (id) DO NOTHING`
  );

  await pool.query(
    `INSERT INTO users (id, name, role, phone, email, address)
     VALUES ('admin', 'Admin', 'admin', '+998 90 000 00 00', 'admin@oxbridge.uz', 'Toshkent, Oxbridge academy')
     ON CONFLICT (id) DO NOTHING`
  );
}

async function ensureSchemaMigrations() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(12, 0) DEFAULT 0;
  `).catch(() => {});

  await pool.query(`
    UPDATE users
    SET monthly_fee = payment_due
    WHERE role = 'student' AND COALESCE(monthly_fee, 0) = 0 AND COALESCE(payment_due, 0) > 0;
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS monthly_student_bills (
      id SERIAL PRIMARY KEY,
      student_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      expected_amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
      status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
      payment_id INTEGER REFERENCES student_payments(id) ON DELETE SET NULL,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (student_id, year, month)
    );
  `).catch(() => {});

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_monthly_student_bills_period ON monthly_student_bills (year, month);
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login VARCHAR(50) UNIQUE;
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_day_type_check;
    ALTER TABLE groups ADD CONSTRAINT groups_day_type_check
      CHECK (day_type IN ('even', 'odd', 'weekdays', 'daily'));
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE schedule_entries DROP CONSTRAINT IF EXISTS schedule_entries_day_type_check;
    ALTER TABLE schedule_entries ADD CONSTRAINT schedule_entries_day_type_check
      CHECK (day_type IN ('even', 'odd', 'weekdays', 'daily'));
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE monthly_student_bills ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15, 0) NOT NULL DEFAULT 0;
  `).catch(() => {});

  await pool.query(`
    UPDATE monthly_student_bills
    SET paid_amount = expected_amount
    WHERE status = 'paid' AND COALESCE(paid_amount, 0) = 0;
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE monthly_student_bills DROP CONSTRAINT IF EXISTS monthly_student_bills_status_check;
    ALTER TABLE monthly_student_bills ADD CONSTRAINT monthly_student_bills_status_check
      CHECK (status IN ('pending', 'partial', 'paid'));
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS grade VARCHAR(20);
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_grade_check;
    ALTER TABLE attendance ADD CONSTRAINT attendance_grade_check
      CHECK (grade IS NULL OR grade IN ('excellent', 'good', 'no_homework'));
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE student_payments ADD COLUMN IF NOT EXISTS bill_year INTEGER;
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE student_payments ADD COLUMN IF NOT EXISTS bill_month INTEGER;
  `).catch(() => {});

  await ensureDirectorCredentials();
  await ensureAdminCredentials();
}

async function ensureDirectorCredentials() {
  await pool.query(`UPDATE users SET name = 'Xojayin' WHERE id = 'director'`);

  const { rows } = await pool.query<{ login: string | null; password_hash: string | null }>(
    `SELECT login, password_hash FROM users WHERE id = 'director'`
  );

  if (rows.length === 0) return;

  const login = rows[0].login;
  const passwordHash = rows[0].password_hash;
  const needsCredentials = !login || !passwordHash;
  const migratingLogin = login === 'boshliq';

  if (!needsCredentials && !migratingLogin) return;

  const { resolveBootstrapPassword } = await import('./security');
  const directorPassword = resolveBootstrapPassword('DIRECTOR_PASSWORD', 'xojayin123');
  const directorHash = hashPassword(directorPassword);

  if (migratingLogin) {
    await pool.query(
      `UPDATE users SET login = $1, password_hash = $2 WHERE id = 'director'`,
      ['xojayin', directorHash]
    );
    return;
  }

  await pool.query(`UPDATE users SET login = $1, password_hash = $2 WHERE id = 'director'`, [
    'xojayin',
    directorHash,
  ]);
  console.log('Xojayin login sozlandi: xojayin (parol env yoki dev default)');
}

async function ensureAdminCredentials() {
  const { rows } = await pool.query<{ login: string | null; password_hash: string | null }>(
    `SELECT login, password_hash FROM users WHERE id = 'admin'`
  );

  if (rows.length === 0) return;

  const needsCredentials = !rows[0].login || !rows[0].password_hash;
  if (!needsCredentials) return;

  const { resolveBootstrapPassword } = await import('./security');
  const adminPassword = resolveBootstrapPassword('ADMIN_PASSWORD', 'admin123');
  const adminHash = hashPassword(adminPassword);

  await pool.query(`UPDATE users SET login = $1, password_hash = $2 WHERE id = 'admin'`, [
    'admin',
    adminHash,
  ]);
  console.log('Admin login sozlandi: admin (parol env yoki dev default)');
}

export default pool;
