export const MONTH_LABELS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'] as const;

export const MONTH_LABELS_FULL = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
] as const;

export function getMonthPeriodLabel(year: number, month: number) {
  const name = MONTH_LABELS_FULL[month - 1] ?? String(month);
  return `${name} ${year}`;
}

export function getFinanceStartMonth(year: number, now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year > currentYear) return 1;
  if (year < currentYear) return 1;
  return currentMonth;
}

export function isFinanceMonthAvailable(year: number, month: number, now = new Date()) {
  return month >= getFinanceStartMonth(year, now);
}
