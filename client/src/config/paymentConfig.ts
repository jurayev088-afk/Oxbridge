export const MONTHLY_FEE_PRESETS = [500000, 650000, 750000, 850000, 950000, 1200000];

export const PAYMENT_METHODS = [
  { id: 'naxt', label: 'Naqt' },
  { id: 'click', label: 'Click' },
  { id: 'payme', label: 'Payme' },
  { id: 'uzum', label: 'Uzum' },
] as const;

/** Onlayn to'lov havolalari — kerak bo'lsa o'zgartiring */
export const ONLINE_PAYMENT_LINKS = {
  payme: 'https://payme.uz/fallback/merchant/?id=oxbridgeacademy',
  click: 'https://my.click.uz/services/pay?service_id=oxbridgeacademy',
};

export function buildStudentProfileUrl(studentId: string) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/foydalanuvchi/${studentId}`;
  }
  return `/foydalanuvchi/${studentId}`;
}

export function parseStudentIdFromQrValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const profileMatch = trimmed.match(/\/foydalanuvchi\/([a-zA-Z0-9_-]+)/);
  if (profileMatch) return profileMatch[1];

  if (/^s\d+$/i.test(trimmed)) return trimmed.toLowerCase();

  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(/\/foydalanuvchi\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];
  } catch {
    // not a URL
  }

  return null;
}
