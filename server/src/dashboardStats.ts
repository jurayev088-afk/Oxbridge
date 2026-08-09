import pool from './db';
import { ensureMonthlyBills } from './monthlyBillsDb';

export async function fetchDashboardStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  await ensureMonthlyBills(year, month);

  const result = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM groups) AS groups_count,
      (SELECT COUNT(*)::int FROM users WHERE role = 'teacher') AS teachers_count,
      (SELECT COUNT(*)::int FROM users WHERE role = 'student' AND group_id IS NOT NULL) AS active_students,
      (SELECT COUNT(*)::int FROM users WHERE role = 'student' AND group_id IS NULL) AS trial_students,
      (
        SELECT COALESCE(
          SUM(GREATEST(b.expected_amount - COALESCE(b.paid_amount, 0), 0)),
          0
        )::float
        FROM monthly_student_bills b
        JOIN users u ON u.id = b.student_id
        WHERE u.role = 'student'
          AND b.year = $1
          AND b.month = $2
          AND b.status IN ('pending', 'partial')
      ) AS remaining_debts,
      (
        SELECT COUNT(*)::int
        FROM monthly_student_bills b
        JOIN users u ON u.id = b.student_id
        WHERE u.role = 'student'
          AND b.year = $1
          AND b.month = $2
          AND b.status IN ('pending', 'partial')
      ) AS debtors,
      (
        SELECT COUNT(*)::int
        FROM monthly_student_bills b
        JOIN users u ON u.id = b.student_id
        WHERE u.role = 'student'
          AND b.year = $1
          AND b.month = $2
          AND b.status IN ('pending', 'partial')
          AND $3 >= 20
      ) AS payment_near,
      (SELECT COUNT(*)::int FROM leads WHERE status NOT IN ('converted', 'lost')) AS active_leads
  `,
    [year, month, day]
  );

  const row = result.rows[0];
  return {
    activeLeads: row.active_leads,
    groupsCount: row.groups_count,
    remainingDebts: row.remaining_debts,
    debtors: row.debtors,
    paymentNear: row.payment_near,
    activeStudents: row.active_students,
    trialStudents: row.trial_students,
    leftStudents: 0,
    teachersCount: row.teachers_count,
  };
}
