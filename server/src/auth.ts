import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET ?? 'oxbridge-crm-dev-secret-change-in-production';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthTokenPayload {
  userId: string;
  role: 'director' | 'admin' | 'teacher' | 'student';
  exp: number;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
}

export function signToken(payload: Omit<AuthTokenPayload, 'exp'>) {
  const full: AuthTokenPayload = {
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as AuthTokenPayload;
    if (!payload.userId || !payload.role || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
