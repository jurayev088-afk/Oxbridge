let cachedToken: { token: string; expiresAt: number } | null = null;

export function isEskizConfigured() {
  return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

export function normalizeUzPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

async function getEskizToken(): Promise<string | null> {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({ email, password });
  const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    console.error('[Eskiz] login xatolik:', res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { data?: { token?: string }; token?: string; message?: string };
  const token = data.data?.token ?? data.token;
  if (!token) {
    console.error('[Eskiz] token topilmadi:', data);
    return null;
  }

  cachedToken = { token, expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000 };
  return token;
}

export async function sendEskizSms(
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const token = await getEskizToken();
  if (!token) {
    return { ok: false, error: 'Eskiz login xatolik — email/parolni tekshiring' };
  }

  const mobile = normalizeUzPhone(phone);
  if (mobile.length < 12) {
    return { ok: false, error: `Noto'g'ri telefon: ${phone}` };
  }

  const from = process.env.ESKIZ_FROM || '4546';
  const body = new URLSearchParams({
    mobile_phone: mobile,
    message,
    from,
  });

  const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await res.text();
  let data: { status?: string; message?: string; id?: string } = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    console.error('[Eskiz] SMS xatolik:', res.status, text);
    return { ok: false, error: data.message || text || 'SMS yuborilmadi' };
  }

  if (data.status === 'error') {
    return { ok: false, error: data.message || 'SMS yuborilmadi' };
  }

  console.log(`[Eskiz] SMS yuborildi -> ${mobile}`);
  return { ok: true };
}
