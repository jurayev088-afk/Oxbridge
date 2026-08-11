import type { AuthTokenPayload } from './auth';
import pool from './db';
import { hasAdminAccess } from './roles';
import { isTeacherOfGroup } from './authDb';

export async function canViewGroup(auth: AuthTokenPayload, groupId: string) {
  if (hasAdminAccess(auth.role)) return true;
  if (auth.role === 'teacher') return isTeacherOfGroup(auth.userId, groupId);
  return false;
}

export async function canEditGroup(auth: AuthTokenPayload, groupId: string) {
  if (hasAdminAccess(auth.role)) return true;
  if (auth.role === 'teacher') return isTeacherOfGroup(auth.userId, groupId);
  return false;
}

export async function canViewUser(auth: AuthTokenPayload, targetUserId: string) {
  if (auth.userId === targetUserId) return true;
  if (hasAdminAccess(auth.role)) return true;

  if (auth.role === 'teacher') {
    const result = await pool.query<{ group_id: string | null }>(
      `SELECT group_id FROM users WHERE id = $1 AND role = 'student'`,
      [targetUserId]
    );
    const groupId = result.rows[0]?.group_id;
    if (!groupId) return false;
    return isTeacherOfGroup(auth.userId, groupId);
  }

  return false;
}

export async function canEditUser(auth: AuthTokenPayload, targetUserId: string) {
  if (hasAdminAccess(auth.role)) return true;
  return auth.userId === targetUserId && auth.role === 'student';
}

const STUDENT_SELF_FIELDS = new Set([
  'name',
  'phone',
  'email',
  'address',
  'photoUrl',
  'fatherName',
  'fatherPhone',
  'motherName',
  'motherPhone',
]);

export function filterStudentSelfUpdate(body: Record<string, unknown>) {
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (STUDENT_SELF_FIELDS.has(key)) filtered[key] = body[key];
  }
  return filtered;
}

export async function resolveGroupId(idOrCode: string) {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM groups WHERE id = $1 OR code = $1 LIMIT 1',
    [idOrCode]
  );
  return result.rows[0]?.id ?? null;
}
