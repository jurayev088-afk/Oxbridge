import { formatAmountDisplay, formatUzPhoneDisplay } from './formatInputs';

export function formatPhone(value?: string | null): string {
  if (!value?.trim()) return '';
  return formatUzPhoneDisplay(value) || value.trim();
}

export function formatPhoneOrDash(value?: string | null): string {
  return formatPhone(value) || '—';
}

export function formatMoney(amount: number | null | undefined): string {
  const formatted = formatAmountDisplay(amount ?? 0);
  return `${formatted || '0'} so'm`;
}

export function formatNumber(amount: number | null | undefined): string {
  return formatAmountDisplay(amount ?? 0) || '0';
}

export function normalizePhoneForSearch(value: string): string {
  return value.replace(/\D/g, '');
}
