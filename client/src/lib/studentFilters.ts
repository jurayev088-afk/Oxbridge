import type { StudentListItem } from '../types';

export type StudentListFilter = 'active' | 'unpaid' | 'debtors' | 'payment-near';

export const studentFilterLabels: Record<StudentListFilter, string> = {
  active: "Faol o'quvchilar",
  unpaid: 'Qarzdor o\'quvchilar',
  debtors: 'Qarzdorlar',
  'payment-near': "To'lov yaqin",
};

export function isStudentListFilter(value: string | null): value is StudentListFilter {
  return value === 'active' || value === 'unpaid' || value === 'debtors' || value === 'payment-near';
}

export function applyStudentFilter(
  students: StudentListItem[],
  filter: StudentListFilter | null
): StudentListItem[] {
  if (!filter) return students;

  switch (filter) {
    case 'active':
      return students.filter((s) => Boolean(s.groupId));
    case 'unpaid':
    case 'debtors':
      return students.filter((s) => s.paymentStatus !== 'paid');
    case 'payment-near': {
      const day = new Date().getDate();
      return students.filter((s) => s.paymentStatus !== 'paid' && day >= 20);
    }
    default:
      return students;
  }
}

export function getStudentDebtAmount(student: StudentListItem) {
  if (student.remainingAmount != null && student.remainingAmount > 0) {
    return student.remainingAmount;
  }
  if (student.paymentStatus === 'paid') return 0;
  return student.currentBillAmount ?? student.monthlyFee ?? student.paymentDue ?? 0;
}
