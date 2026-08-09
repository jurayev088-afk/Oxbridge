export const mockStats = {
  activeLeads: 0,
  groupsCount: 0,
  remainingDebts: 0,
  debtors: 0,
  paymentNear: 0,
  activeStudents: 0,
  trialStudents: 0,
  leftStudents: 0,
  teachersCount: 0,
};

const studentDefaults = {
  address: '',
  paymentDue: 0,
  photoUrl: '',
  fatherName: '',
  fatherPhone: '',
  motherName: '',
  motherPhone: '',
  telegramChatId: '',
  fatherTelegramChatId: '',
  motherTelegramChatId: '',
};

export const mockUsers = [
  {
    id: 'admin',
    name: 'Admin',
    role: 'admin' as const,
    phone: '+998 90 000 00 00',
    email: 'admin@oxbridge.uz',
    address: 'Toshkent, Oxbridge academy',
    photoUrl: '',
  },
];

export const mockGroups: Array<{
  id: string;
  code: string;
  name: string;
  teacherId: string;
  teacherName: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  dayType: 'even' | 'odd';
  color: string;
  students: { id: string; name: string }[];
}> = [];

export const mockSchedule: Array<{
  id: number;
  groupId: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  groupCode: string;
  teacherName: string;
  teacherId: string;
  color: string;
  dayType: 'even' | 'odd';
}> = [];

export function filterSchedule(dayType: string) {
  if (dayType === 'other') return mockSchedule;
  return mockSchedule.filter((s) => s.dayType === dayType);
}

export function syncScheduleFromGroup(group: (typeof mockGroups)[0]) {
  const entry = mockSchedule.find((s) => s.groupId === group.id);
  if (entry) {
    entry.roomNumber = group.roomNumber;
    entry.startTime = group.startTime;
    entry.endTime = group.endTime;
    entry.color = group.color;
    entry.dayType = group.dayType;
    entry.teacherId = group.teacherId;
    entry.teacherName = group.teacherName;
  }
}

const DEFAULT_COLORS = ['#d4b896', '#e57373', '#81c784', '#64b5f6', '#ffb74d', '#ba68c8'];

function nextGroupCode() {
  const nums = mockGroups.map((g) => parseInt(g.code, 10)).filter((n) => !Number.isNaN(n));
  return String(Math.max(0, ...nums) + 1).padStart(3, '0');
}

export function createMockGroup(data: {
  name: string;
  code?: string;
  teacherId: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  dayType: 'even' | 'odd';
  color?: string;
}) {
  const teacher = mockUsers.find((u) => u.id === data.teacherId);
  if (!teacher) return null;

  const code = data.code?.trim() || nextGroupCode();
  const id = code;

  const group = {
    id,
    code,
    name: data.name.startsWith('Guruh') ? data.name : `Guruh ${code} — ${data.name}`,
    teacherId: teacher.id,
    teacherName: teacher.name,
    roomNumber: data.roomNumber,
    startTime: data.startTime,
    endTime: data.endTime,
    dayType: data.dayType,
    color: data.color || DEFAULT_COLORS[mockGroups.length % DEFAULT_COLORS.length],
    students: [] as { id: string; name: string }[],
  };

  mockGroups.push(group);
  mockSchedule.push({
    id: mockSchedule.length + 1,
    groupId: group.id,
    roomNumber: group.roomNumber,
    startTime: group.startTime,
    endTime: group.endTime,
    groupCode: group.code,
    teacherName: group.teacherName,
    teacherId: group.teacherId,
    color: group.color,
    dayType: group.dayType,
  });

  mockStats.groupsCount = mockGroups.length;
  return group;
}

export function deleteMockGroup(id: string) {
  const index = mockGroups.findIndex((g) => g.id === id || g.code === id);
  if (index === -1) return false;

  const group = mockGroups[index];
  mockUsers.forEach((u) => {
    if (u.groupId === group.id) {
      u.groupId = undefined;
      u.groupName = undefined;
    }
  });

  mockGroups.splice(index, 1);
  const schedIdx = mockSchedule.findIndex((s) => s.groupId === group.id);
  if (schedIdx !== -1) mockSchedule.splice(schedIdx, 1);
  clearGroupAttendance(group.id);
  mockStats.groupsCount = mockGroups.length;
  return true;
}

function findGroup(id: string) {
  return mockGroups.find((g) => g.id === id || g.code === id);
}

export function listAvailableStudents(excludeGroupId?: string) {
  return mockUsers
    .filter((u) => u.role === 'student' && u.groupId !== excludeGroupId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      photoUrl: u.photoUrl ?? '',
      groupId: u.groupId,
      groupName: u.groupName,
    }));
}

export function listTeachers() {
  return mockUsers
    .filter((u) => u.role === 'teacher')
    .map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      photoUrl: u.photoUrl ?? '',
      groupsCount: mockGroups.filter((g) => g.teacherId === u.id).length,
    }));
}

export function listAllStudents() {
  return mockUsers
    .filter((u) => u.role === 'student')
    .map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      photoUrl: u.photoUrl ?? '',
      groupId: u.groupId,
      groupName: u.groupName,
      paymentDue: u.paymentDue ?? 0,
    }));
}

function nextTeacherId() {
  const nums = mockUsers
    .filter((u) => u.role === 'teacher')
    .map((u) => parseInt(u.id.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  return `t${Math.max(0, ...nums) + 1}`;
}

function nextStudentId() {
  const nums = mockUsers
    .filter((u) => u.role === 'student')
    .map((u) => parseInt(u.id.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  return `s${Math.max(0, ...nums) + 1}`;
}

export function createTeacher(data: { name: string; phone?: string; email?: string }) {
  if (!data.name.trim()) return null;

  const teacher = {
    id: nextTeacherId(),
    name: data.name.trim(),
    role: 'teacher' as const,
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    address: '',
    photoUrl: '',
  };

  mockUsers.push(teacher);
  mockStats.teachersCount = mockUsers.filter((u) => u.role === 'teacher').length;
  return teacher;
}

export function updateTeacher(
  id: string,
  data: Partial<{ name: string; phone: string; email: string }>
) {
  const index = mockUsers.findIndex((u) => u.id === id && u.role === 'teacher');
  if (index === -1) return null;

  const updated = {
    ...mockUsers[index],
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
  };

  mockUsers[index] = updated;

  mockGroups.forEach((group) => {
    if (group.teacherId === id) {
      group.teacherName = updated.name;
      syncScheduleFromGroup(group);
    }
  });

  return updated;
}

export function deleteTeacher(id: string): { ok: true } | { ok: false; error: string } {
  if (mockGroups.some((g) => g.teacherId === id)) {
    return { ok: false, error: 'Guruhlari bor o\'qituvchini o\'chirib bo\'lmaydi' };
  }

  const index = mockUsers.findIndex((u) => u.id === id && u.role === 'teacher');
  if (index === -1) return { ok: false, error: 'O\'qituvchi topilmadi' };

  mockUsers.splice(index, 1);
  mockStats.teachersCount = mockUsers.filter((u) => u.role === 'teacher').length;
  return { ok: true };
}

export function createStudent(data: {
  name: string;
  phone?: string;
  email?: string;
  groupId?: string;
  paymentDue?: number;
}) {
  if (!data.name.trim()) return null;

  const student = {
    id: nextStudentId(),
    name: data.name.trim(),
    role: 'student' as const,
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    groupId: undefined as string | undefined,
    groupName: undefined as string | undefined,
    ...studentDefaults,
    ...(data.paymentDue !== undefined && { paymentDue: Number(data.paymentDue) }),
  };

  if (data.groupId) {
    const group = findGroup(data.groupId);
    if (group) {
      student.groupId = group.id;
      student.groupName = group.name;
      group.students.push({ id: student.id, name: student.name });
    }
  }

  mockUsers.push(student);
  mockStats.activeStudents = mockUsers.filter((u) => u.role === 'student').length;
  return student;
}

export function updateStudent(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    groupId: string | null;
    paymentDue: number;
  }>
) {
  const index = mockUsers.findIndex((u) => u.id === id && u.role === 'student');
  if (index === -1) return null;

  const current = mockUsers[index];

  if (data.groupId !== undefined) {
    const targetGroupId = data.groupId || null;
    const oldGroup = current.groupId ? mockGroups.find((g) => g.id === current.groupId) : undefined;
    if (oldGroup) {
      oldGroup.students = oldGroup.students.filter((s) => s.id !== id);
    }

    if (targetGroupId) {
      const newGroup = findGroup(targetGroupId);
      if (newGroup) {
        current.groupId = newGroup.id;
        current.groupName = newGroup.name;
        if (!newGroup.students.some((s) => s.id === id)) {
          newGroup.students.push({ id: current.id, name: current.name });
        }
      }
    } else {
      current.groupId = undefined;
      current.groupName = undefined;
    }
  }

  const updated = {
    ...current,
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.paymentDue !== undefined && { paymentDue: Number(data.paymentDue) }),
    groupId: current.groupId,
    groupName: current.groupName,
  };

  mockUsers[index] = updated;

  const group = mockGroups.find((g) => g.id === updated.groupId);
  if (group) {
    const student = group.students.find((s) => s.id === id);
    if (student) student.name = updated.name;
  }

  return updated;
}

export function deleteStudent(id: string) {
  const index = mockUsers.findIndex((u) => u.id === id && u.role === 'student');
  if (index === -1) return false;

  const student = mockUsers[index];
  if (student.groupId) {
    const group = mockGroups.find((g) => g.id === student.groupId);
    if (group) {
      group.students = group.students.filter((s) => s.id !== id);
    }
  }

  mockUsers.splice(index, 1);
  mockStats.activeStudents = mockUsers.filter((u) => u.role === 'student').length;
  return true;
}

export function addStudentToGroup(groupId: string, userId: string) {
  const group = findGroup(groupId);
  if (!group) return null;

  const user = mockUsers.find((u) => u.id === userId && u.role === 'student');
  if (!user) return null;

  if (user.groupId && user.groupId !== group.id) {
    const oldGroup = mockGroups.find((g) => g.id === user.groupId);
    if (oldGroup) {
      oldGroup.students = oldGroup.students.filter((s) => s.id !== userId);
    }
  }

  if (!group.students.some((s) => s.id === userId)) {
    group.students.push({ id: user.id, name: user.name });
  }

  user.groupId = group.id;
  user.groupName = group.name;

  return group;
}

export function createStudentForGroup(
  groupId: string,
  data: { name: string; phone?: string; email?: string }
) {
  const group = findGroup(groupId);
  if (!group || !data.name.trim()) return null;

  const nums = mockUsers
    .filter((u) => u.role === 'student')
    .map((u) => parseInt(u.id.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const nextNum = Math.max(0, ...nums) + 1;
  const id = `s${nextNum}`;

  const student = {
    id,
    name: data.name.trim(),
    role: 'student' as const,
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    groupId: group.id,
    groupName: group.name,
    ...studentDefaults,
  };

  mockUsers.push(student);
  group.students.push({ id: student.id, name: student.name });
  mockStats.activeStudents = mockUsers.filter((u) => u.role === 'student').length;

  return student;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const mockAttendance: Record<string, Record<string, AttendanceStatus>> = {};

function attendanceKey(groupId: string, date: string) {
  return `${groupId}:${date}`;
}

export function getGroupAttendance(groupId: string, date: string) {
  const group = findGroup(groupId);
  if (!group) return null;

  const key = attendanceKey(group.id, date);
  const saved = mockAttendance[key];
  const hasSaved = Boolean(saved);

  return {
    groupId: group.id,
    date,
    saved: hasSaved,
    students: group.students.map((student) => {
      const user = mockUsers.find((u) => u.id === student.id);
      return {
        id: student.id,
        name: user?.name ?? student.name,
        photoUrl: user?.photoUrl ?? '',
        status: (saved?.[student.id] ?? 'present') as AttendanceStatus,
      };
    }),
  };
}

export function saveGroupAttendance(
  groupId: string,
  date: string,
  records: { studentId: string; status: AttendanceStatus }[]
) {
  const group = findGroup(groupId);
  if (!group) return null;

  const key = attendanceKey(group.id, date);
  mockAttendance[key] = {};
  records.forEach(({ studentId, status }) => {
    if (group.students.some((s) => s.id === studentId)) {
      mockAttendance[key][studentId] = status;
    }
  });

  return getGroupAttendance(group.id, date);
}

export function clearGroupAttendance(groupId: string) {
  Object.keys(mockAttendance).forEach((key) => {
    if (key.startsWith(`${groupId}:`)) {
      delete mockAttendance[key];
    }
  });
}

export const mockBranch = 'Oxbridge academy';
