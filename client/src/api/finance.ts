import type { FinanceOverview, MonthlyExpenses, MonthlyStudentBill, StudentPayment } from '../types/finance';
import { MONTH_LABELS_SHORT, getMonthPeriodLabel } from '../lib/monthLabels';

function buildEmptyMonthlyTurnover() {
  return MONTH_LABELS_SHORT.map((label, index) => ({
    month: label,
    monthNum: index + 1,
    income: 0,
    expense: 0,
    profit: 0,
  }));
}

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export async function fetchFinanceOverview(year?: number, month?: number): Promise<FinanceOverview> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const query = params.toString();

  const res = await fetch(`/api/finance/overview${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(await readError(res, 'Moliyani yuklab bo\'lmadi'));
  return res.json();
}

export async function fetchStudentPayments(year: number, month: number): Promise<StudentPayment[]> {
  const res = await fetch(`/api/finance/student-payments?year=${year}&month=${month}`);
  if (!res.ok) throw new Error(await readError(res, 'To\'lovlarni yuklab bo\'lmadi'));
  return res.json();
}

export async function fetchMonthlyExpenses(year: number, month: number): Promise<MonthlyExpenses> {
  const res = await fetch(`/api/finance/monthly-expenses?year=${year}&month=${month}`);
  if (!res.ok) throw new Error(await readError(res, 'Xarajatlarni yuklab bo\'lmadi'));
  return res.json();
}

export async function saveMonthlyExpenses(data: MonthlyExpenses): Promise<MonthlyExpenses> {
  const res = await fetch('/api/finance/monthly-expenses', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year: data.year,
      month: data.month,
      teacherSalaries: data.teacherSalaries,
      electricity: data.electricity,
      electricityNote: data.electricityNote,
    }),
  });

  if (!res.ok) {
    throw new Error(await readError(res, 'Xarajatlarni saqlashda xatolik'));
  }

  return res.json();
}

export async function recordStudentPayment(data: {
  studentId: string;
  amount: number;
  method?: string;
  paymentDate?: string;
  note?: string;
  billYear?: number;
  billMonth?: number;
}): Promise<StudentPayment> {
  const res = await fetch('/api/finance/student-payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await readError(res, 'To\'lovni saqlashda xatolik'));
  }

  return res.json();
}

export async function fetchMonthlyBills(year: number, month: number): Promise<MonthlyStudentBill[]> {
  const res = await fetch(`/api/finance/monthly-bills?year=${year}&month=${month}`);
  if (!res.ok) throw new Error(await readError(res, 'Oylik to\'lovlarni yuklab bo\'lmadi'));
  return res.json();
}

export async function updateMonthlyBillAmount(
  billId: number,
  expectedAmount: number
): Promise<{ id: number; expectedAmount: number; paidAmount: number; remainingAmount: number; status: 'pending' | 'partial' | 'paid' }> {
  const res = await fetch(`/api/finance/monthly-bills/${billId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedAmount }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Summani saqlashda xatolik'));
  return res.json();
}

export function emptyFinanceOverview(year: number, month: number): FinanceOverview {
  return {
    selectedPeriod: {
      year,
      month,
      label: getMonthPeriodLabel(year, month),
    },
    summary: {
      income: 0,
      expense: 0,
      profit: 0,
      yearToDateIncome: 0,
    },
    paymentMethods: [],
    monthlyTurnover: buildEmptyMonthlyTurnover(),
  };
}
