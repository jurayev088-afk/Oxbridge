import { isEskizConfigured, sendEskizSms } from './eskizSms';

export type SmsMode = 'eskiz' | 'custom' | 'mock';

export const smsLog: {
  phone: string;
  message: string;
  sentAt: string;
  mode: SmsMode;
  ok: boolean;
  error?: string;
}[] = [];

export function getSmsMode(): SmsMode {
  if (isEskizConfigured()) return 'eskiz';
  if (process.env.SMS_API_URL && process.env.SMS_API_TOKEN) return 'custom';
  return 'mock';
}

export async function sendSms(
  phone: string,
  message: string
): Promise<{ ok: boolean; mode: SmsMode; error?: string }> {
  const trimmed = phone.trim();
  if (!trimmed) return { ok: false, mode: getSmsMode(), error: 'Telefon raqam bo\'sh' };

  const mode = getSmsMode();

  try {
    if (mode === 'eskiz') {
      const result = await sendEskizSms(trimmed, message);
      smsLog.unshift({
        phone: trimmed,
        message,
        sentAt: new Date().toISOString(),
        mode: 'eskiz',
        ok: result.ok,
        error: result.error,
      });
      if (smsLog.length > 100) smsLog.pop();
      return { ok: result.ok, mode: 'eskiz', error: result.error };
    }

    if (mode === 'custom') {
      const res = await fetch(process.env.SMS_API_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SMS_API_TOKEN}`,
        },
        body: JSON.stringify({ phone: trimmed, message }),
      });
      const ok = res.ok;
      smsLog.unshift({ phone: trimmed, message, sentAt: new Date().toISOString(), mode: 'custom', ok });
      if (smsLog.length > 100) smsLog.pop();
      return { ok, mode: 'custom', error: ok ? undefined : 'SMS API xatolik' };
    }

    console.log(`[SMS MOCK] ${trimmed} -> ${message}`);
    smsLog.unshift({
      phone: trimmed,
      message,
      sentAt: new Date().toISOString(),
      mode: 'mock',
      ok: false,
      error: 'Haqiqiy SMS yuborilmadi — Eskiz sozlanmagan',
    });
    if (smsLog.length > 100) smsLog.pop();
    return {
      ok: false,
      mode: 'mock',
      error: 'Haqiqiy SMS yuborilmadi. server/.env faylida ESKIZ_EMAIL va ESKIZ_PASSWORD sozlang',
    };
  } catch (err) {
    console.error('[SMS] yuborishda xatolik:', err);
    return { ok: false, mode, error: 'SMS yuborishda tarmoq xatolik' };
  }
}
