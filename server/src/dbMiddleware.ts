import type { Request, Response, NextFunction } from 'express';

let connected = false;

export function setDbConnected(value: boolean) {
  connected = value;
}

export function isDbConnected() {
  return connected;
}

const PUBLIC_PATHS = ['/health', '/sms/status', '/telegram/status'];

export function requireDatabase(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.includes(req.path) || req.path.startsWith('/telegram/webhook')) {
    return next();
  }

  if (!connected) {
    return res.status(503).json({
      error:
        'PostgreSQL ulanmagan. Ma\'lumotlar saqlanmaydi — PostgreSQL ishlayotganini va server/.env faylini tekshiring.',
    });
  }

  next();
}

export function dbError(res: Response, context: string, err?: unknown) {
  if (err) console.error(`[${context}]`, err);
  return res.status(500).json({ error: `${context} da xatolik` });
}
