import pool from './db';

export interface MonthlyStudentBillRow {
  id: number;
  studentId: string;
  studentName: string;
  groupName: string;
  year: number;
  month: number;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'paid';
  paidAt: string | null;
  paymentMethodLabel: string | null;
  paymentDate: string | null;
}

function previousMonth(year: number, month: number) {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function getBillRemaining(expectedAmount: number, paidAmount: number) {
  return Math.max(0, expectedAmount - paidAmount);
}

function mapBillStatus(expectedAmount: number, paidAmount: number): 'pending' | 'partial' | 'paid' {
  if (expectedAmount === 0) return 'paid';
  if (paidAmount >= expectedAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'pending';
}

export async function ensureMonthlyBills(year: number, month: number) {
  const students = await pool.query<{ id: string; monthly_fee: string | number }>(
    `SELECT id, COALESCE(monthly_fee, 0) AS monthly_fee
     FROM users
     WHERE role = 'student'
     ORDER BY name ASC`
  );

  for (const student of students.rows) {
    const exists = await pool.query(
      `SELECT id FROM monthly_student_bills WHERE student_id = $1 AND year = $2 AND month = $3`,
      [student.id, year, month]
    );
    if (exists.rows.length > 0) continue;

    const prev = previousMonth(year, month);
    const prevBill = await pool.query<{ expected_amount: string | number }>(
      `SELECT expected_amount
       FROM monthly_student_bills
       WHERE student_id = $1 AND year = $2 AND month = $3`,
      [student.id, prev.year, prev.month]
    );

    const monthlyFee = Number(student.monthly_fee ?? 0);
    const prevAmount = Number(prevBill.rows[0]?.expected_amount ?? 0);
    const expectedAmount = monthlyFee > 0 ? monthlyFee : prevAmount;

    await pool.query(
      `INSERT INTO monthly_student_bills (student_id, year, month, expected_amount, paid_amount, status)
       VALUES ($1, $2, $3, $4, 0, 'pending')`,
      [student.id, year, month, expectedAmount]
    );
  }
}

export async function fetchMonthlyBills(year: number, month: number): Promise<MonthlyStudentBillRow[]> {
  await ensureMonthlyBills(year, month);

  await pool.query(
    `UPDATE monthly_student_bills
     SET status = 'paid',
         paid_at = COALESCE(paid_at, NOW())
     WHERE year = $1 AND month = $2 AND expected_amount = 0 AND status <> 'paid'`,
    [year, month]
  );

  const methodLabels: Record<string, string> = {
    naxt: 'Naqt',
    click: 'Click',
    payme: 'Payme',
    uzum: 'Uzum',
  };

  const result = await pool.query(
    `SELECT b.id,
            b.student_id,
            u.name AS student_name,
            COALESCE(g.name, '—') AS group_name,
            b.year,
            b.month,
            b.expected_amount::float AS expected_amount,
            COALESCE(b.paid_amount, 0)::float AS paid_amount,
            b.status,
            b.paid_at,
            sp.method AS payment_method,
            sp.payment_date
     FROM monthly_student_bills b
     JOIN users u ON u.id = b.student_id
     LEFT JOIN groups g ON g.id = u.group_id
     LEFT JOIN student_payments sp ON sp.id = b.payment_id
     WHERE b.year = $1 AND b.month = $2
     ORDER BY b.status ASC, u.name ASC`,
    [year, month]
  );

  return result.rows.map((row) => {
    const expectedAmount = Number(row.expected_amount);
    const paidAmount = Number(row.paid_amount);
    return {
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      groupName: row.group_name,
      year: row.year,
      month: row.month,
      expectedAmount,
      paidAmount,
      remainingAmount: getBillRemaining(expectedAmount, paidAmount),
      status: row.status as 'pending' | 'partial' | 'paid',
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
      paymentMethodLabel: row.payment_method ? methodLabels[row.payment_method] ?? row.payment_method : null,
      paymentDate: row.payment_date ?? null,
    };
  });
}

export async function updateMonthlyBillAmount(billId: number, expectedAmount: number) {
  const result = await pool.query(
    `UPDATE monthly_student_bills
     SET expected_amount = $2::numeric,
         status = CASE
           WHEN $2::numeric = 0 THEN 'paid'
           WHEN COALESCE(paid_amount, 0) >= $2::numeric THEN 'paid'
           WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
           ELSE 'pending'
         END,
         paid_at = CASE
           WHEN $2::numeric = 0 OR COALESCE(paid_amount, 0) >= $2::numeric THEN NOW()
           ELSE paid_at
         END
     WHERE id = $1 AND status <> 'paid'
     RETURNING id, student_id, year, month, expected_amount::float AS expected_amount,
               COALESCE(paid_amount, 0)::float AS paid_amount, status`,
    [billId, expectedAmount]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const paidAmount = Number(row.paid_amount);
  const expected = Number(row.expected_amount);
  return {
    id: row.id,
    studentId: row.student_id,
    year: row.year,
    month: row.month,
    expectedAmount: expected,
    paidAmount,
    remainingAmount: getBillRemaining(expected, paidAmount),
    status: row.status as 'pending' | 'partial' | 'paid',
  };
}

export async function applyPaymentToMonthlyBill(
  studentId: string,
  year: number,
  month: number,
  paymentId: number,
  amount: number
) {
  await ensureMonthlyBills(year, month);

  const billResult = await pool.query(
    `SELECT id, expected_amount, COALESCE(paid_amount, 0) AS paid_amount, status
     FROM monthly_student_bills
     WHERE student_id = $1 AND year = $2 AND month = $3`,
    [studentId, year, month]
  );

  if (billResult.rows.length === 0) return null;

  const bill = billResult.rows[0];
  if (bill.status === 'paid') {
    return {
      expectedAmount: Number(bill.expected_amount),
      paidAmount: Number(bill.paid_amount),
      remainingAmount: 0,
      status: 'paid' as const,
    };
  }

  const expectedAmount = Number(bill.expected_amount);
  const newPaidAmount = Number(bill.paid_amount) + amount;
  const status = mapBillStatus(expectedAmount, newPaidAmount);

  await pool.query(
    `UPDATE monthly_student_bills
     SET paid_amount = $4,
         status = $5,
         payment_id = $6,
         paid_at = CASE WHEN $5::varchar = 'paid' THEN NOW() ELSE paid_at END
     WHERE student_id = $1 AND year = $2 AND month = $3`,
    [studentId, year, month, newPaidAmount, status, paymentId]
  );

  return {
    expectedAmount,
    paidAmount: newPaidAmount,
    remainingAmount: getBillRemaining(expectedAmount, newPaidAmount),
    status,
  };
}

/** @deprecated use applyPaymentToMonthlyBill */
export async function markMonthlyBillPaid(
  studentId: string,
  year: number,
  month: number,
  paymentId: number
) {
  const bill = await pool.query(
    `SELECT expected_amount, COALESCE(paid_amount, 0) AS paid_amount
     FROM monthly_student_bills
     WHERE student_id = $1 AND year = $2 AND month = $3`,
    [studentId, year, month]
  );
  const expected = Number(bill.rows[0]?.expected_amount ?? 0);
  const alreadyPaid = Number(bill.rows[0]?.paid_amount ?? 0);
  const amount = Math.max(0, expected - alreadyPaid);
  if (amount <= 0) return;
  await applyPaymentToMonthlyBill(studentId, year, month, paymentId, amount);
}

export async function ensureBillForNewStudent(studentId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  await ensureMonthlyBills(year, month);

  const student = await pool.query<{ monthly_fee: string | number }>(
    `SELECT COALESCE(monthly_fee, 0) AS monthly_fee FROM users WHERE id = $1`,
    [studentId]
  );
  const monthlyFee = Number(student.rows[0]?.monthly_fee ?? 0);

  if (monthlyFee > 0) {
    await pool.query(
      `UPDATE monthly_student_bills
       SET expected_amount = $4
       WHERE student_id = $1 AND year = $2 AND month = $3 AND status IN ('pending', 'partial')`,
      [studentId, year, month, monthlyFee]
    );
  }
}

export async function fetchStudentsWithMonthlyStatus(year: number, month: number) {
  await ensureMonthlyBills(year, month);

  const result = await pool.query(
    `SELECT u.id,
            u.name,
            u.phone,
            u.email,
            COALESCE(u.photo_url, '') AS photo_url,
            u.login,
            (u.login IS NOT NULL AND u.password_hash IS NOT NULL) AS has_login,
            u.group_id,
            g.name AS group_name,
            COALESCE(u.payment_due, 0)::float AS payment_due,
            COALESCE(u.monthly_fee, 0)::float AS monthly_fee,
            COALESCE(b.expected_amount, 0)::float AS bill_amount,
            COALESCE(b.paid_amount, 0)::float AS paid_amount,
            COALESCE(b.status, 'pending') AS payment_status,
            sp.payment_date
     FROM users u
     LEFT JOIN groups g ON g.id = u.group_id
     LEFT JOIN monthly_student_bills b
       ON b.student_id = u.id AND b.year = $1 AND b.month = $2
     LEFT JOIN student_payments sp ON sp.id = b.payment_id
     WHERE u.role = 'student'
     ORDER BY u.name ASC`,
    [year, month]
  );

  return result.rows.map((row) => {
    const expectedAmount = Number(row.bill_amount);
    const paidAmount = Number(row.paid_amount);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone ?? '',
      email: row.email ?? '',
      photoUrl: row.photo_url ?? '',
      login: row.login ?? '',
      hasLogin: Boolean(row.has_login),
      groupId: row.group_id ?? undefined,
      groupName: row.group_name ?? undefined,
      paymentDue: Number(row.payment_due),
      monthlyFee: Number(row.monthly_fee),
      currentBillAmount: expectedAmount,
      paidAmount,
      remainingAmount: getBillRemaining(expectedAmount, paidAmount),
      paymentStatus: row.payment_status as 'pending' | 'partial' | 'paid',
      paymentDate: row.payment_date ?? null,
    };
  });
}

export async function fetchStudentMonthlyBill(
  studentId: string,
  year?: number,
  month?: number
) {
  const now = new Date();
  const billYear = year ?? now.getFullYear();
  const billMonth = month ?? now.getMonth() + 1;
  await ensureMonthlyBills(billYear, billMonth);

  const result = await pool.query(
    `SELECT b.expected_amount::float AS expected_amount,
            COALESCE(b.paid_amount, 0)::float AS paid_amount,
            b.status,
            sp.payment_date
     FROM monthly_student_bills b
     LEFT JOIN student_payments sp ON sp.id = b.payment_id
     WHERE b.student_id = $1 AND b.year = $2 AND b.month = $3`,
    [studentId, billYear, billMonth]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const expectedAmount = Number(row.expected_amount);
  const paidAmount = Number(row.paid_amount);
  return {
    currentBillAmount: expectedAmount,
    paidAmount,
    remainingAmount: getBillRemaining(expectedAmount, paidAmount),
    paymentStatus: row.status as 'pending' | 'partial' | 'paid',
    paymentDate: row.payment_date ?? null,
  };
}

export async function syncStudentMonthlyFee(studentId: string, monthlyFee: number) {
  await pool.query(
    `UPDATE users SET monthly_fee = $2, payment_due = $2 WHERE id = $1 AND role = 'student'`,
    [studentId, monthlyFee]
  );

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  await ensureMonthlyBills(year, month);

  await pool.query(
    `UPDATE monthly_student_bills
     SET expected_amount = $4::numeric,
         status = CASE
           WHEN $4::numeric = 0 THEN 'paid'
           WHEN COALESCE(paid_amount, 0) >= $4::numeric THEN 'paid'
           WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
           ELSE 'pending'
         END,
         paid_at = CASE
           WHEN $4::numeric = 0 OR COALESCE(paid_amount, 0) >= $4::numeric THEN NOW()
           ELSE paid_at
         END
     WHERE student_id = $1 AND year = $2 AND month = $3`,
    [studentId, year, month, monthlyFee]
  );
}
