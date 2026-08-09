import pool from './db';
import { getFinanceStartMonth } from './monthLabels';

export async function resetFinanceData(now = new Date()) {
  const year = now.getFullYear();
  const month = getFinanceStartMonth(year, now);

  await pool.query('UPDATE monthly_student_bills SET payment_id = NULL, status = $1, paid_at = NULL', ['pending']);
  await pool.query('DELETE FROM student_payments');
  await pool.query('DELETE FROM finance_transactions');
  await pool.query('DELETE FROM monthly_expense_records');
  await pool.query(
    `DELETE FROM monthly_student_bills
     WHERE year < $1 OR (year = $1 AND month < $2)`,
    [year, month]
  );
}
