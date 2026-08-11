export interface DashboardStats {
  activeLeads: number;
  groupsCount: number;
  remainingDebts: number;
  debtors: number;
  paymentNear: number;
  activeStudents: number;
  trialStudents: number;
  leftStudents: number;
  teachersCount: number;
}

export type GroupDayType = 'even' | 'odd' | 'weekdays' | 'daily';

export type DayType = 'even' | 'odd' | 'other';

export interface ScheduleEntry {
  id: number;
  groupId: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  groupCode: string;
  groupName?: string;
  teacherName: string;
  teacherId: string;
  color: string;
  dayType: GroupDayType;
}

export interface GroupStudent {
  id: string;
  name: string;
  photoUrl?: string;
}

export interface StudentOption {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  groupId?: string;
  groupName?: string;
}

export interface AdminListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl?: string;
  login?: string;
  hasLogin?: boolean;
}

export interface TeacherListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl?: string;
  login?: string;
  hasLogin?: boolean;
  groupsCount: number;
}

export interface StudentListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl?: string;
  login?: string;
  hasLogin?: boolean;
  groupId?: string;
  groupName?: string;
  paymentDue: number;
  monthlyFee: number;
  currentBillAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  paymentDate?: string | null;
}

export type LeadStatus = 'new' | 'contacted' | 'trial' | 'converted' | 'lost';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: LeadStatus;
  courseInterest: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupListItem {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  teacherName: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  dayType: GroupDayType;
  color: string;
  studentsCount: number;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  teacherName: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  dayType: GroupDayType;
  color: string;
  students: GroupStudent[];
}

export interface User {
  id: string;
  name: string;
  role: 'director' | 'teacher' | 'student' | 'admin';
  phone: string;
  email: string;
  address?: string;
  paymentDue?: number;
  monthlyFee?: number;
  currentBillAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  paymentDate?: string | null;
  photoUrl?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  telegramChatId?: string;
  fatherTelegramChatId?: string;
  motherTelegramChatId?: string;
  groupId?: string;
  groupName?: string;
  login?: string;
}

export type UserUpdatePayload = Partial<
  Pick<
    User,
    | 'name'
    | 'phone'
    | 'email'
    | 'address'
    | 'paymentDue'
    | 'monthlyFee'
    | 'photoUrl'
    | 'fatherName'
    | 'fatherPhone'
    | 'motherName'
    | 'motherPhone'
    | 'telegramChatId'
    | 'fatherTelegramChatId'
    | 'motherTelegramChatId'
  >
>;

export type GroupUpdatePayload = Partial<
  Pick<Group, 'name' | 'roomNumber' | 'startTime' | 'endTime' | 'dayType' | 'color' | 'teacherId'>
>;

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type LessonGrade = 'excellent' | 'good' | 'no_homework';
export type SmsTarget = 'parents' | 'student' | 'both';
export type NotifyTarget = SmsTarget;

export interface AttendanceStudent {
  id: string;
  name: string;
  photoUrl?: string;
  status: AttendanceStatus;
  grade?: LessonGrade | null;
}

export interface AttendanceTelegramResult {
  sent: number;
  failed: number;
  target: NotifyTarget;
  configured: boolean;
  messages: { chatId: string; studentName: string; ok: boolean; error?: string }[];
}

export interface AttendanceSmsResult {
  sent: number;
  failed: number;
  target: SmsTarget;
  mode: 'eskiz' | 'custom' | 'mock';
  messages: { phone: string; studentName: string; ok: boolean; error?: string }[];
}

export interface SmsStatus {
  configured: boolean;
  mode: 'eskiz' | 'custom' | 'mock';
  message: string;
}

export interface TelegramStatus {
  configured: boolean;
  botUsername: string;
  message: string;
}

export interface GroupAttendance {
  groupId: string;
  date: string;
  saved: boolean;
  locked?: boolean;
  students: AttendanceStudent[];
  telegram?: AttendanceTelegramResult;
  sms?: AttendanceSmsResult;
}

export interface Branch {
  id: number;
  name: string;
}
