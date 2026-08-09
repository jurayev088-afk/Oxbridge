import pool from './db';
import { getMonthPeriodLabel } from './monthLabels';
import { applyPaymentToMonthlyBill, fetchStudentMonthlyBill } from './monthlyBillsDb';
const methodLabels: Record<string, string> = {
  naxt: 'Naqt',
  click: 'Click',
  payme: 'Payme',
  uzum: 'Uzum',
};

export interface StudentPaymentRow {
  id: number;
  studentId: string;
  studentName: string;
  groupName: string;
  amount: number;
  method: string;
  methodLabel: string;
  paymentDate: string;
  note: string;
}

export interface TeacherSalaryRow {
  teacherId: string;
  teacherName: string;
  amount: number;
  note: string;
}

export interface MonthlyExpensesData {
  year: number;
  month: number;
  periodLabel: string;
  teacherSalaries: TeacherSalaryRow[];
  electricity: number;
  electricityNote: string;
  totalTeacherSalaries: number;
  totalExpenses: number;
}

export async function fetchStudentPayments(year: number, month: number): Promise<StudentPaymentRow[]> {
  const result = await pool.query(
    `SELECT sp.id,
            sp.student_id,
            u.name AS student_name,
            COALESCE(g.name, '—') AS group_name,
            sp.amount::float AS amount,
            sp.method,
            sp.payment_date,
            COALESCE(sp.note, '') AS note
     FROM student_payments sp
     JOIN users u ON u.id = sp.student_id
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE EXTRACT(YEAR FROM sp.payment_date) = $1
       AND EXTRACT(MONTH FROM sp.payment_date) = $2
     ORDER BY sp.payment_date DESC, u.name ASC`,
    [year, month]
  );

  return result.rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    groupName: row.group_name,
    amount: Number(row.amount),
    method: row.method,
    methodLabel: methodLabels[row.method] ?? row.method,
    paymentDate: row.payment_date,
    note: row.note,
  }));
}

export async function fetchMonthlyExpenses(year: number, month: number): Promise<MonthlyExpensesData> {
  const teachersResult = await pool.query(
    `SELECT id, name FROM users WHERE role = 'teacher' ORDER BY name ASC`
  );

  const savedResult = await pool.query(
    `SELECT category, teacher_id, label, amount::float AS amount, COALESCE(note, '') AS note
     FROM monthly_expense_records
     WHERE year = $1 AND month = $2`,
    [year, month]
  );

  const salaryMap = new Map<string, { amount: number; note: string }>();
  let electricity = 0;
  let electricityNote = '';

  for (const row of savedResult.rows) {
    if (row.category === 'teacher_salary' && row.teacher_id) {
      salaryMap.set(row.teacher_id, { amount: Number(row.amount), note: row.note });
    }
    if (row.category === 'utility') {
      electricity = Number(row.amount);
      electricityNote = row.note;
    }
  }

  const teacherSalaries = teachersResult.rows.map((teacher) => {
    const saved = salaryMap.get(teacher.id);
    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      amount: saved?.amount ?? 0,
      note: saved?.note ?? '',
    };
  });

  const totalTeacherSalaries = teacherSalaries.reduce((sum, row) => sum + row.amount, 0);

  return {
    year,
    month,
    periodLabel: getMonthPeriodLabel(year, month),
    teacherSalaries,
    electricity,
    electricityNote,
    totalTeacherSalaries,
    totalExpenses: totalTeacherSalaries + electricity,
  };
}

export async function saveMonthlyExpenses(data: {
  year: number;
  month: number;
  teacherSalaries: TeacherSalaryRow[];
  electricity: number;
  electricityNote?: string;
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM monthly_expense_records WHERE year = $1 AND month = $2`,
      [data.year, data.month]
    );

    for (const salary of data.teacherSalaries) {
      if (salary.amount <= 0) continue;
      await client.query(
        `INSERT INTO monthly_expense_records (year, month, category, teacher_id, label, amount, note)
         VALUES ($1, $2, 'teacher_salary', $3, $4, $5, $6)`,
        [data.year, data.month, salary.teacherId, salary.teacherName, salary.amount, salary.note ?? '']
      );
    }

    if (data.electricity > 0) {
      await client.query(
        `INSERT INTO monthly_expense_records (year, month, category, label, amount, note)
         VALUES ($1, $2, 'utility', 'Svet', $3, $4)`,
        [data.year, data.month, data.electricity, data.electricityNote ?? '']
      );
    }

    await client.query('COMMIT');
    return fetchMonthlyExpenses(data.year, data.month);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function createStudentPayment(data: {
  studentId: string;
  amount: number;
  method?: string;
  paymentDate?: string;
  note?: string;
  billYear?: number;
  billMonth?: number;
}) {
  const paymentDateValue = data.paymentDate ?? null;
  const paymentDateObj = paymentDateValue ? new Date(paymentDateValue) : new Date();
  const billYear = data.billYear ?? paymentDateObj.getFullYear();
  const billMonth = data.billMonth ?? paymentDateObj.getMonth() + 1;

  const existingBill = await fetchStudentMonthlyBill(data.studentId, billYear, billMonth);
  if (existingBill?.paymentStatus === 'paid') {
    throw new Error('Bu oy uchun to\'lov allaqachon to\'liq qilingan');
  }

  const remaining = existingBill?.remainingAmount ?? data.amount;
  if (remaining <= 0) {
    throw new Error('Bu oy uchun qolgan to\'lov yo\'q');
  }
  if (data.amount > remaining) {
    throw new Error(`To'lov summasi qolgan ${remaining.toLocaleString('uz-UZ')} so'mdan oshmasligi kerak`);
  }

  const result = await pool.query(
    `INSERT INTO student_payments (student_id, amount, method, payment_date, note, bill_year, bill_month)
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7)
     RETURNING id, student_id, amount, method, payment_date, note`,
    [
      data.studentId,
      data.amount,
      data.method ?? 'naxt',
      data.paymentDate ?? null,
      data.note ?? '',
      billYear,
      billMonth,
    ]
  );

  const payment = result.rows[0];

  await pool.query(
    `INSERT INTO finance_transactions (type, amount, method, description, transaction_date)
     VALUES ('income', $1, $2, $3, $4)`,
    [
      data.amount,
      data.method ?? 'naxt',
      data.note ? `To'lov: ${data.note}` : 'O\'quvchi to\'lovi',
      data.paymentDate ?? payment.payment_date,
    ]
  );

  const billUpdate = await applyPaymentToMonthlyBill(
    data.studentId,
    billYear,
    billMonth,
    payment.id,
    data.amount
  );

  const studentRow = await pool.query(
    `SELECT u.name AS student_name, COALESCE(g.name, '—') AS group_name
     FROM users u
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE u.id = $1`,
    [data.studentId]
  );

  const info = studentRow.rows[0] ?? { student_name: '—', group_name: '—' };
  const methodLabels: Record<string, string> = {
    naxt: 'Naqt',
    click: 'Click',
    payme: 'Payme',
    uzum: 'Uzum',
  };

  return {
    id: payment.id,
    studentId: payment.student_id,
    studentName: info.student_name,
    groupName: info.group_name,
    amount: Number(payment.amount),
    method: payment.method,
    methodLabel: methodLabels[payment.method] ?? payment.method,
    paymentDate: payment.payment_date,
    note: payment.note ?? '',
    billStatus: billUpdate?.status ?? 'pending',
    paidAmount: billUpdate?.paidAmount ?? data.amount,
    remainingAmount: billUpdate?.remainingAmount ?? 0,
  };
}

export async function getMonthlyExpenseTotal(year: number, month: number): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::float AS total
     FROM monthly_expense_records
     WHERE year = $1 AND month = $2`,
    [year, month]
  );
  return Number(result.rows[0].total);
}
