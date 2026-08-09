import { getMonthPeriodLabel } from './monthLabels';

export function getMockStudentPayments(_year: number, _month: number) {
  return [];
}

export function getMockMonthlyExpenses(year: number, month: number) {
  return {
    year,
    month,
    periodLabel: getMonthPeriodLabel(year, month),
    teacherSalaries: [],
    electricity: 0,
    electricityNote: '',
    totalTeacherSalaries: 0,
    totalExpenses: 0,
  };
}
