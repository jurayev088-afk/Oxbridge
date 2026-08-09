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

const TOKEN_KEY = 'crm_auth_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function loginRequest(login: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? 'Kirishda xatolik');
  return body as { token: string; user: AuthUser };
}

export async function fetchMe(token: string) {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Sessiya tugagan');
  return res.json() as Promise<AuthUser>;
}

export async function fetchMyGroups(token: string) {
  const res = await fetch('/api/me/groups', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Guruhlarni yuklab bo\'lmadi');
  return res.json();
}

export async function fetchMyAttendance(token: string) {
  const res = await fetch('/api/me/attendance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Davomatni yuklab bo\'lmadi');
  return res.json() as Promise<Array<{ date: string; status: string; groupName: string }>>;
}

export async function setUserCredentials(
  userId: string,
  login: string,
  password: string,
  token: string
) {
  const res = await fetch(`/api/users/${userId}/credentials`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? 'Saqlashda xatolik');
  return body;
}

export function getHomePath(role: AuthUser['role']) {
  if (role === 'teacher') return '/oqituvchi-kabinet';
  if (role === 'student') return '/mening-kabinetim';
  return '/';
}

export function getPostLoginPath(role: AuthUser['role'], from?: string) {
  const home = getHomePath(role);
  if (!from || from === '/login') return home;

  if (role === 'director' || role === 'admin') {
    if (from === '/' || /^\/(moliya|guruhlar|oqituvchilar|lidlar|oquvchilar|guruh|foydalanuvchi)(\/|$)/.test(from)) {
      return from;
    }
    return home;
  }

  if (role === 'teacher') {
    if (/^\/(oqituvchi-kabinet|guruh|foydalanuvchi)(\/|$)/.test(from)) return from;
    return home;
  }

  if (/^\/(mening-kabinetim|foydalanuvchi)(\/|$)/.test(from)) return from;
  return home;
}
