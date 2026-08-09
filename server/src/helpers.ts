import { mockStats, mockSchedule, mockBranch, mockGroups, mockUsers, filterSchedule, syncScheduleFromGroup, createMockGroup, deleteMockGroup, listAvailableStudents, addStudentToGroup, createStudentForGroup, listTeachers, listAllStudents, createTeacher, updateTeacher, deleteTeacher, createStudent, updateStudent, deleteStudent, getGroupAttendance, saveGroupAttendance, clearGroupAttendance } from './mockData';

function mapUserRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    paymentDue: row.payment_due != null ? Number(row.payment_due) : 0,
    monthlyFee: row.monthly_fee != null ? Number(row.monthly_fee) : 0,
    login: row.login ?? '',
    photoUrl: row.photo_url ?? '',
    fatherName: row.father_name ?? '',
    fatherPhone: row.father_phone ?? '',
    motherName: row.mother_name ?? '',
    motherPhone: row.mother_phone ?? '',
    telegramChatId: row.telegram_chat_id ?? '',
    fatherTelegramChatId: row.father_telegram_chat_id ?? '',
    motherTelegramChatId: row.mother_telegram_chat_id ?? '',
    groupId: row.group_id ?? undefined,
    groupName: row.group_name ?? undefined,
  };
}

function mapMockUser(user: (typeof mockUsers)[0]) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    phone: user.phone,
    email: user.email,
    address: user.address ?? '',
    paymentDue: user.paymentDue ?? 0,
    photoUrl: user.photoUrl ?? '',
    fatherName: user.fatherName ?? '',
    fatherPhone: user.fatherPhone ?? '',
    motherName: user.motherName ?? '',
    motherPhone: user.motherPhone ?? '',
    telegramChatId: user.telegramChatId ?? '',
    fatherTelegramChatId: user.fatherTelegramChatId ?? '',
    motherTelegramChatId: user.motherTelegramChatId ?? '',
    groupId: user.groupId,
    groupName: user.groupName,
  };
}

function mapGroupListItem(group: (typeof mockGroups)[0]) {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    teacherId: group.teacherId,
    teacherName: group.teacherName,
    roomNumber: group.roomNumber,
    startTime: group.startTime,
    endTime: group.endTime,
    dayType: group.dayType,
    color: group.color,
    studentsCount: group.students.length,
  };
}

function mapGroupResponse(group: (typeof mockGroups)[0]) {
  return {
    ...group,
    students: group.students.map((student) => {
      const user = mockUsers.find((u) => u.id === student.id);
      return {
        id: student.id,
        name: user?.name ?? student.name,
        photoUrl: user?.photoUrl ?? '',
      };
    }),
  };
}

function mapGroupRow(row: Record<string, unknown>) {
  const students = row.students as Array<{ id: string; name: string; photoUrl?: string }> | null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    roomNumber: row.room_number,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    dayType: row.day_type,
    color: row.color,
    students: students?.[0]?.id ? students : [],
  };
}

export {
  mockStats,
  mockSchedule,
  mockBranch,
  mockGroups,
  mockUsers,
  filterSchedule,
  syncScheduleFromGroup,
  mapUserRow,
  mapMockUser,
  mapGroupResponse,
  mapGroupRow,
  mapGroupListItem,
  createMockGroup,
  deleteMockGroup,
  listAvailableStudents,
  addStudentToGroup,
  createStudentForGroup,
  listTeachers,
  listAllStudents,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  createStudent,
  updateStudent,
  deleteStudent,
  getGroupAttendance,
  saveGroupAttendance,
  clearGroupAttendance,
};
