export type AppRole = 'director' | 'admin' | 'teacher' | 'student';

export function hasAdminAccess(role?: AppRole | null) {
  return role === 'director' || role === 'admin';
}

export function canManageCredentials(
  actorRole?: AppRole | null,
  targetRole?: AppRole | null
) {
  if (actorRole === 'director') {
    return targetRole === 'admin' || targetRole === 'teacher' || targetRole === 'student';
  }
  if (actorRole === 'admin') {
    return targetRole === 'teacher' || targetRole === 'student';
  }
  return false;
}

export function canCreateRole(
  actorRole?: AppRole | null,
  targetRole?: AppRole | null
) {
  if (actorRole === 'director') {
    return targetRole === 'admin' || targetRole === 'teacher' || targetRole === 'student';
  }
  if (actorRole === 'admin') {
    return targetRole === 'teacher' || targetRole === 'student';
  }
  return false;
}
