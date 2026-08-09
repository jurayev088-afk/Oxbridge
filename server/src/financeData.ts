import { MONTH_LABELS_SHORT, getMonthPeriodLabel, getFinanceStartMonth } from './monthLabels';

function buildEmptyMonthlyTurnover(year?: number) {
  const now = new Date();
  const selectedYear = year ?? now.getFullYear();
  const startMonth = getFinanceStartMonth(selectedYear, now);

  return MONTH_LABELS_SHORT.map((label, index) => ({
    month: label,
    monthNum: index + 1,
    income: 0,
    expense: 0,
    profit: 0,
  })).filter((row) => row.monthNum >= startMonth);
}

export function getEmptyFinanceOverview(year?: number, month?: number) {
  const now = new Date();
  const selectedYear = year ?? now.getFullYear();
  const selectedMonth = month ?? now.getMonth() + 1;
  const monthlyTurnover = buildEmptyMonthlyTurnover(selectedYear);

  return {
    selectedPeriod: {
      year: selectedYear,
      month: selectedMonth,
      label: getMonthPeriodLabel(selectedYear, selectedMonth),
    },
    summary: {
      income: 0,
      expense: 0,
      profit: 0,
      yearToDateIncome: 0,
    },
    paymentMethods: [],
    monthlyTurnover,
  };
}

/** @deprecated use getEmptyFinanceOverview */
export function getMockFinanceOverview(year?: number, month?: number) {
  return getEmptyFinanceOverview(year, month);
}

export const mockFinanceOverview = getEmptyFinanceOverview();
