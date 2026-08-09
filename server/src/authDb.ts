import pool from './db';
import { normalizeDateString } from './dates';
import { hashPassword, verifyPassword } from './auth';

export interface AuthUser {
  id: string;
  name: string;
  role: 'director' | 'admin' | 'teacher' | 'student';
  login: string;
  phone: string;
  email: string;
  photoUrl: string;
  groupId?: string;
  groupName?: string;
}

export async function authenticateUser(login: string, password: string): Promise<AuthUser | null> {
  const result = await pool.query(
    `SELECT u.id, u.name, u.role, u.login, u.password_hash, u.phone, u.email,
            COALESCE(u.photo_url, '') AS photo_url, u.group_id, g.name AS group_name
     FROM users u
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE LOWER(u.login) = LOWER($1)`,
    [login.trim()]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (!row.password_hash || !verifyPassword(password, row.password_hash)) return null;

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    login: row.login,
    phone: row.phone ?? '',
    email: row.email ?? '',
    photoUrl: row.photo_url ?? '',
    groupId: row.group_id ?? undefined,
    groupName: row.group_name ?? undefined,
  };
}

export async function getAuthUserById(id: string): Promise<AuthUser | null> {
  const result = await pool.query(
    `SELECT u.id, u.name, u.role, u.login, u.phone, u.email,
            COALESCE(u.photo_url, '') AS photo_url, u.group_id, g.name AS group_name
     FROM users u
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE u.id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    login: row.login ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    photoUrl: row.photo_url ?? '',
    groupId: row.group_id ?? undefined,
    groupName: row.group_name ?? undefined,
  };
}

export async function setUserCredentials(
  userId: string,
  login: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedLogin = login.trim().toLowerCase();
  if (!trimmedLogin || trimmedLogin.length < 3) {
    return { ok: false, error: 'Login kamida 3 ta belgidan iborat bo\'lishi kerak' };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak' };
  }

  const dup = await pool.query(
    `SELECT id FROM users WHERE LOWER(login) = $1 AND id <> $2`,
    [trimmedLogin, userId]
  );
  if (dup.rows.length > 0) {
    return { ok: false, error: 'Bu login allaqachon band' };
  }

  await pool.query(
    `UPDATE users SET login = $2, password_hash = $3 WHERE id = $1`,
    [userId, trimmedLogin, hashPassword(password)]
  );

  return { ok: true };
}

export async function fetchTeacherGroups(teacherId: string) {
  const result = await pool.query(
    `SELECT id, code, name, room_number, start_time, end_time, day_type, color,
            (SELECT COUNT(*)::int FROM users WHERE group_id = groups.id AND role = 'student') AS students_count
     FROM groups
     WHERE teacher_id = $1
     ORDER BY name ASC`,
    [teacherId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    roomNumber: row.room_number,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    dayType: row.day_type,
    color: row.color,
    studentsCount: row.students_count,
  }));
}

export async function fetchStudentAttendanceHistory(studentId: string, limit = 60) {
  const result = await pool.query(
    `SELECT a.date, a.status, g.name AS group_name,
            to_char(g.start_time, 'HH24:MI') AS class_time
     FROM attendance a
     JOIN groups g ON g.id = a.group_id
     WHERE a.student_id = $1
     ORDER BY a.date DESC
     LIMIT $2`,
    [studentId, limit]
  );

  return result.rows.map((row) => ({
    date: normalizeDateString(row.date),
    status: row.status,
    groupName: row.group_name,
    classTime: String(row.class_time ?? '').slice(0, 5),
  }));
}

export async function isTeacherOfGroup(teacherId: string, groupId: string) {
  const result = await pool.query(
    `SELECT id FROM groups WHERE id = $1 AND teacher_id = $2`,
    [groupId, teacherId]
  );
  return result.rows.length > 0;
}
