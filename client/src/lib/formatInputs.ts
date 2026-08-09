export const UZ_PHONE_PREFIX = '+998';

export const MONTHLY_FEE_PRESETS = [500000, 650000, 750000, 850000, 950000, 1200000] as const;

export function parsePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('8')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 9);
}

export function formatUzPhoneDisplay(value: string): string {
  if (!value) return '';

  const digits = parsePhoneDigits(value);
  if (!digits) {
    return value.startsWith('+') ? `${UZ_PHONE_PREFIX} ` : '';
  }

  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 5));
  if (digits.length > 5) parts.push(digits.slice(5, 7));
  if (digits.length > 7) parts.push(digits.slice(7, 9));

  return `${UZ_PHONE_PREFIX} ${parts.join(' ')}`;
}

export function normalizeUzPhone(value: string): string {
  const digits = parsePhoneDigits(value);
  if (!digits) {
    return value.replace(/\D/g, '').length > 0 || value.includes('+') ? UZ_PHONE_PREFIX : '';
  }
  return `${UZ_PHONE_PREFIX}${digits}`;
}

export function getPhoneForSubmit(value: string): string {
  const digits = parsePhoneDigits(value);
  if (!digits) return '';
  return `${UZ_PHONE_PREFIX}${digits}`;
}

export function formatAmountDisplay(value: string | number | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function parseAmountDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function parseAmountNumber(value: string | number | null | undefined): number {
  const digits = parseAmountDigits(String(value ?? ''));
  if (!digits) return 0;
  return Number(digits);
}

export function formatPresetAmount(preset: number): string {
  return `${formatAmountDisplay(preset)} so'm`;
}

export function isMonthlyFeePreset(value: string | number): boolean {
  const num = Number(value);
  return MONTHLY_FEE_PRESETS.includes(num as (typeof MONTHLY_FEE_PRESETS)[number]);
}
