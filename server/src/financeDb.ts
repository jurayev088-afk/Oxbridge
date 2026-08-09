import pool from './db';
import { getEmptyFinanceOverview } from './financeData';
import { MONTH_LABELS_SHORT, getMonthPeriodLabel, getFinanceStartMonth } from './monthLabels';

const methodMeta: Record<string, { label: string; color: string }> = {
  naxt: { label: 'Naqt pul', color: '#14b8a6' },
  click: { label: 'Click', color: '#f97316' },
  payme: { label: 'Payme', color: '#22c55e' },
  uzum: { label: 'Uzum', color: '#a855f7' },
};

function resolvePeriod(year?: number, month?: number) {
  const now = new Date();
  const selectedYear = year ?? now.getFullYear();
  const selectedMonth = month ?? now.getMonth() + 1;

  return {
    year: selectedYear,
    month: Math.min(12, Math.max(1, selectedMonth)),
  };
}

export async function fetchFinanceOverview(year?: number, month?: number) {
  const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM finance_transactions');
  const { year: selectedYear, month: selectedMonth } = resolvePeriod(year, month);
  const startMonth = getFinanceStartMonth(selectedYear);
  const now = new Date();
  const isCurrentYear = selectedYear === now.getFullYear();

  if (countResult.rows[0].count === 0) {
    return getEmptyFinanceOverview(selectedYear, selectedMonth);
  }

  const monthSummary = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::float AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::float AS expense
     FROM finance_transactions
     WHERE EXTRACT(YEAR FROM transaction_date) = $1
       AND EXTRACT(MONTH FROM transaction_date) = $2`,
    [selectedYear, selectedMonth]
  );

  const monthlyExpenseExtra = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::float AS expense
     FROM monthly_expense_records
     WHERE year = $1 AND month = $2`,
    [selectedYear, selectedMonth]
  );

  const yearIncomeResult = await pool.query(
    isCurrentYear
      ? `SELECT COALESCE(SUM(amount), 0)::float AS income
         FROM finance_transactions
         WHERE type = 'income'
           AND EXTRACT(YEAR FROM transaction_date) = $1
           AND EXTRACT(MONTH FROM transaction_date) >= $2`
      : `SELECT COALESCE(SUM(amount), 0)::float AS income
         FROM finance_transactions
         WHERE type = 'income'
           AND EXTRACT(YEAR FROM transaction_date) = $1`,
    isCurrentYear ? [selectedYear, startMonth] : [selectedYear]
  );

  const methodsResult = await pool.query(
    `SELECT method,
            COUNT(*)::int AS count,
            COALESCE(SUM(amount), 0)::float AS amount
     FROM finance_transactions
     WHERE type = 'income'
       AND EXTRACT(YEAR FROM transaction_date) = $1
       AND EXTRACT(MONTH FROM transaction_date) = $2
     GROUP BY method
     ORDER BY amount DESC`,
    [selectedYear, selectedMonth]
  );

  const monthlyResult = await pool.query(
    `SELECT
       EXTRACT(MONTH FROM transaction_date)::int AS month_num,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::float AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::float AS expense
     FROM finance_transactions
     WHERE EXTRACT(YEAR FROM transaction_date) = $1
     GROUP BY EXTRACT(MONTH FROM transaction_date)
     ORDER BY month_num`,
    [selectedYear]
  );

  const monthlyExtraExpenses = await pool.query(
    `SELECT month, COALESCE(SUM(amount), 0)::float AS expense
     FROM monthly_expense_records
     WHERE year = $1
     GROUP BY month
     ORDER BY month`,
    [selectedYear]
  );

  const income = monthSummary.rows[0].income;
  const expense = monthSummary.rows[0].expense + monthlyExpenseExtra.rows[0].expense;

  const monthlyMap = Object.fromEntries(
    monthlyResult.rows.map((row) => [row.month_num, row])
  );
  const monthlyExtraMap = Object.fromEntries(
    monthlyExtraExpenses.rows.map((row) => [row.month, row])
  );

  return {
    selectedPeriod: {
      year: selectedYear,
      month: selectedMonth,
      label: getMonthPeriodLabel(selectedYear, selectedMonth),
    },
    summary: {
      income,
      expense,
      profit: income - expense,
      yearToDateIncome: yearIncomeResult.rows[0].income,
    },
    paymentMethods: methodsResult.rows.map((row) => ({
      method: row.method,
      label: methodMeta[row.method]?.label ?? row.method,
      count: row.count,
      amount: row.amount,
      color: methodMeta[row.method]?.color ?? '#64748b',
    })),
    monthlyTurnover: MONTH_LABELS_SHORT.map((label, index) => {
      const monthNum = index + 1;
      const row = monthlyMap[monthNum];
      const extraExpense = monthlyExtraMap[monthNum]?.expense ?? 0;
      const monthIncome = row?.income ?? 0;
      const monthExpense = (row?.expense ?? 0) + Number(extraExpense);
      return {
        month: label,
        monthNum,
        income: monthIncome,
        expense: monthExpense,
        profit: monthIncome - monthExpense,
      };
    }).filter((row) => row.monthNum >= startMonth),
  };
}

export async function createFinanceTransaction(data: {
  type: 'income' | 'expense';
  amount: number;
  method?: string;
  description?: string;
  transactionDate?: string;
}) {
  const result = await pool.query(
    `INSERT INTO finance_transactions (type, amount, method, description, transaction_date)
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE))
     RETURNING id, type, amount, method, description, transaction_date`,
    [
      data.type,
      data.amount,
      data.method ?? 'naxt',
      data.description ?? '',
      data.transactionDate ?? null,
    ]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    method: row.method,
    description: row.description ?? '',
    transactionDate: row.transaction_date,
  };
}
