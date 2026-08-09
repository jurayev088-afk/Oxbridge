import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type AuthTokenPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function extractToken(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.auth = payload;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Kirish talab qilinadi' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Sessiya muddati tugagan' });

  req.auth = payload;
  next();
}

export function requireRole(...roles: Array<'director' | 'admin' | 'teacher' | 'student'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Kirish talab qilinadi' });
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    next();
  };
}
