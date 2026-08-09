export interface FinanceSummary {
  income: number;
  expense: number;
  profit: number;
  yearToDateIncome: number;
}

export interface FinancePeriod {
  year: number;
  month: number;
  label: string;
}

export interface PaymentMethodStat {
  method: 'naxt' | 'click' | 'payme' | 'uzum' | string;
  label: string;
  count: number;
  amount: number;
  color: string;
}

export interface MonthlyTurnover {
  month: string;
  monthNum: number;
  income: number;
  expense: number;
  profit: number;
}

export interface FinanceOverview {
  selectedPeriod: FinancePeriod;
  summary: FinanceSummary;
  paymentMethods: PaymentMethodStat[];
  monthlyTurnover: MonthlyTurnover[];
}

export interface StudentPayment {
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

export interface TeacherSalaryEntry {
  teacherId: string;
  teacherName: string;
  amount: number;
  note: string;
}

export interface MonthlyExpenses {
  year: number;
  month: number;
  periodLabel: string;
  teacherSalaries: TeacherSalaryEntry[];
  electricity: number;
  electricityNote: string;
  totalTeacherSalaries: number;
  totalExpenses: number;
}

export interface MonthlyStudentBill {
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
