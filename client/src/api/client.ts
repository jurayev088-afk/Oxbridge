import type {
  DashboardStats,
  ScheduleEntry,
  Branch,
  DayType,
  Group,
  GroupDayType,
  GroupListItem,
  User,
  UserUpdatePayload,
  GroupUpdatePayload,
  StudentOption,
  TeacherListItem,
  StudentListItem,
  AdminListItem,
  GroupAttendance,
  AttendanceStatus,
  LessonGrade,
  SmsTarget,
  NotifyTarget,
  SmsStatus,
  TelegramStatus,
} from '../types';
import { getStoredToken } from './auth';

function authHeaders(extra?: Record<string, string>) {
  const token = getStoredToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error(await readError(res, 'Statistikani yuklab bo\'lmadi'));
  return res.json();
}

export async function fetchSchedule(dayType: DayType): Promise<ScheduleEntry[]> {
  const res = await fetch(`/api/dashboard/schedule?dayType=${dayType}`);
  if (!res.ok) throw new Error(await readError(res, 'Jadvalni yuklab bo\'lmadi'));
  return res.json();
}

export async function fetchGroups(): Promise<GroupListItem[]> {
  const res = await fetch('/api/groups');
  if (!res.ok) throw new Error(await readError(res, 'Guruhlarni yuklab bo\'lmadi'));
  return res.json();
}

export async function fetchTeachers(): Promise<TeacherListItem[]> {
  const res = await fetch('/api/teachers');
  if (!res.ok) throw new Error(await readError(res, 'O\'qituvchilarni yuklab bo\'lmadi'));
  return res.json();
}

export async function createTeacher(data: {
  name: string;
  phone?: string;
  email?: string;
  login?: string;
  password?: string;
}): Promise<TeacherListItem> {
  const res = await fetch('/api/teachers', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await readError(res, "O'qituvchi qo'shishda xatolik"));
  }
  return res.json();
}

export async function updateTeacher(
  id: string,
  data: Partial<{ name: string; phone: string; email: string }>
): Promise<TeacherListItem | null> {
  const res = await fetch(`/api/teachers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteTeacher(id: string): Promise<boolean> {
  const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function fetchAdmins(): Promise<AdminListItem[]> {
  const res = await fetch('/api/admins', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, 'Adminlarni yuklab bo\'lmadi'));
  return res.json();
}

export async function createAdmin(data: {
  name: string;
  phone?: string;
  email?: string;
  login?: string;
  password?: string;
}): Promise<AdminListItem> {
  const res = await fetch('/api/admins', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'Admin qo\'shishda xatolik'));
  }
  return res.json();
}

export async function deleteAdmin(id: string): Promise<boolean> {
  const res = await fetch(`/api/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.ok;
}

export async function fetchStudentsList(year?: number, month?: number): Promise<StudentListItem[]> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const query = params.toString();
  const res = await fetch(`/api/students/list${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(await readError(res, 'O\'quvchilarni yuklab bo\'lmadi'));
  return res.json();
}

export async function createStudentRecord(data: {
  name: string;
  phone?: string;
  email?: string;
  groupId?: string;
  paymentDue?: number;
  monthlyFee?: number;
  login?: string;
  password?: string;
}): Promise<StudentListItem> {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await readError(res, "O'quvchi qo'shishda xatolik"));
  }
  return res.json();
}

export async function updateStudentRecord(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    groupId: string;
    paymentDue: number;
    monthlyFee: number;
  }>
): Promise<StudentListItem | null> {
  const res = await fetch(`/api/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteStudent(id: string): Promise<boolean> {
  const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function createGroup(data: {
  name: string;
  code?: string;
  teacherId: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  dayType: GroupDayType;
  color: string;
}): Promise<{ group: GroupListItem | null; error?: string }> {
  const payload = {
    ...data,
    code: data.code?.trim() || undefined,
  };
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { group: null, error: (body as { error?: string }).error || 'Guruh qo\'shishda xatolik' };
  }
  return { group: body as GroupListItem };
}

export async function fetchGroup(id: string): Promise<Group | null> {
  const res = await fetch(`/api/groups/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchUser(id: string): Promise<User | null> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateUser(id: string, data: UserUpdatePayload): Promise<User | null> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateGroup(id: string, data: GroupUpdatePayload): Promise<Group | null> {
  const res = await fetch(`/api/groups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteGroup(id: string): Promise<boolean> {
  const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function fetchAvailableStudents(excludeGroupId?: string): Promise<StudentOption[]> {
  const query = excludeGroupId ? `?excludeGroup=${encodeURIComponent(excludeGroupId)}` : '';
  const res = await fetch(`/api/students${query}`);
  if (!res.ok) return [];
  return res.json();
}

export async function addStudentToGroup(
  groupId: string,
  payload: { userId?: string; name?: string; phone?: string; email?: string }
): Promise<Group | null> {
  const res = await fetch(`/api/groups/${groupId}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTelegramStatus(): Promise<TelegramStatus> {
  const res = await fetch('/api/telegram/status');
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export async function fetchSmsStatus(): Promise<SmsStatus> {
  const res = await fetch('/api/sms/status');
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export async function fetchGroupAttendance(groupId: string, date: string): Promise<GroupAttendance | null> {
  const res = await fetch(`/api/groups/${groupId}/attendance?date=${encodeURIComponent(date)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveGroupAttendance(
  groupId: string,
  date: string,
  records: { studentId: string; status: AttendanceStatus; grade?: LessonGrade | null }[],
  options?: {
    sendTelegram?: boolean;
    telegramTarget?: NotifyTarget;
    sendSms?: boolean;
    smsTarget?: SmsTarget;
  }
): Promise<GroupAttendance | { error: string } | null> {
  const res = await fetch(`/api/groups/${groupId}/attendance`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      date,
      records,
      sendTelegram: options?.sendTelegram ?? true,
      telegramTarget: options?.telegramTarget ?? 'parents',
      sendSms: options?.sendSms ?? false,
      smsTarget: options?.smsTarget ?? 'parents',
    }),
  });
  if (!res.ok) {
    return { error: await readError(res, 'Davomat saqlanmadi') };
  }
  return res.json();
}

export async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch('/api/branches');
  if (!res.ok) throw new Error(await readError(res, 'Filiallarni yuklab bo\'lmadi'));
  return res.json();
}
