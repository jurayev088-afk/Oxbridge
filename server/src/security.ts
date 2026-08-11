import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';

const DEFAULT_AUTH_SECRET = 'oxbridge-crm-dev-secret-change-in-production';
const MIN_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 12;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

export function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
}

export function validateProductionSecrets() {
  const authSecret = process.env.AUTH_SECRET ?? DEFAULT_AUTH_SECRET;

  if (!isProduction()) {
    if (authSecret === DEFAULT_AUTH_SECRET) {
      console.warn('[Security] Dev rejimida AUTH_SECRET default — production uchun o\'zgartiring');
    }
    return;
  }

  if (!process.env.AUTH_SECRET || authSecret === DEFAULT_AUTH_SECRET) {
    throw new Error(
      'Production: AUTH_SECRET o\'rnatilmagan yoki default. Render Environment ga kamida 32 belgili tasodifiy qiymat qo\'ying.'
    );
  }

  if (authSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(`Production: AUTH_SECRET kamida ${MIN_SECRET_LENGTH} belgi bo\'lishi kerak.`);
  }
}

export function resolveBootstrapPassword(envKey: 'DIRECTOR_PASSWORD' | 'ADMIN_PASSWORD', fallback: string) {
  const value = process.env[envKey] ?? fallback;

  if (isProduction() && (!process.env[envKey] || value.length < MIN_PASSWORD_LENGTH)) {
    throw new Error(
      `Production: ${envKey} o\'rnatilmagan yoki juda qisqa (kamida ${MIN_PASSWORD_LENGTH} belgi). Render Environment ga qo\'ying.`
    );
  }

  return value;
}

export function createCorsMiddleware() {
  const allowed = new Set<string>();

  for (const origin of process.env.CORS_ORIGINS?.split(',').map((v) => v.trim()).filter(Boolean) ?? []) {
    allowed.add(origin);
  }

  if (!isProduction()) {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
    allowed.add('http://localhost:3001');
  }

  const renderUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  if (renderUrl) allowed.add(renderUrl);

  return cors({
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS ruxsati yo\'q'));
    },
    credentials: true,
  });
}

function loginAttemptKey(req: Request, login: string) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `${ip}:${login.trim().toLowerCase()}`;
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const login = typeof req.body?.login === 'string' ? req.body.login : '';
  if (!login.trim()) return next();

  const key = loginAttemptKey(req, login);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return next();
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    const retryMinutes = Math.ceil((entry.resetAt - now) / 60000);
    return res.status(429).json({
      error: `Juda ko\'p urinish. ${retryMinutes} daqiqadan keyin qayta urinib ko\'ring.`,
    });
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
  next();
}

export function clearLoginAttempts(req: Request, login: string) {
  loginAttempts.delete(loginAttemptKey(req, login));
}

export function verifyTelegramWebhook(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return next();

  const header = req.headers['x-telegram-bot-api-secret-token'];
  if (header !== secret) {
    return res.status(403).json({ error: 'Webhook ruxsati yo\'q' });
  }

  next();
}
