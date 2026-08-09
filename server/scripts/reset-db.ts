import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pool from '../src/db';

async function resetDb() {
  const seedPath = path.join(__dirname, '..', 'src', 'seed.sql');
  const seed = fs.readFileSync(seedPath, 'utf-8');

  console.log('Barcha ma\'lumotlar o\'chirilmoqda...');
  await pool.query('DELETE FROM monthly_student_bills');
  await pool.query('DELETE FROM student_payments');
  await pool.query('DELETE FROM monthly_expense_records');
  await pool.query('DELETE FROM finance_transactions');
  await pool.query('DELETE FROM attendance');
  await pool.query('DELETE FROM schedule_entries');
  await pool.query('DELETE FROM users WHERE id <> \'admin\'');
  await pool.query('DELETE FROM groups');

  console.log('Boshlang\'ich sozlamalar yuklanmoqda...');
  await pool.query(seed);

  console.log('Tayyor — baza tozalandi (faqat admin qoldi).');
  await pool.end();
}

resetDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
