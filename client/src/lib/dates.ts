import { MONTH_LABELS_FULL } from './monthLabels';
import type { GroupDayType } from './groupDayTypes';
import { getAttendanceBlockedMessage as getGroupAttendanceBlockedMessage, isGroupClassDay as isGroupClassDayForType } from './groupDayTypes';
import { getAppMinutes, getAppWeekday, todayISO as todayISOInAppTimezone } from './timezone';

export type { GroupDayType } from './groupDayTypes';
export { GROUP_DAY_TYPE_OPTIONS, GROUP_DAY_TYPE_LABELS, GROUP_DAY_TYPE_SHORT } from './groupDayTypes';

/** YYYY-MM-DD — Toshkent vaqti bo'yicha bugun */
export function todayISO(now = new Date()) {
  return todayISOInAppTimezone(now);
}

/** Dushanba=1 ... Yakshanba=0 */
export function getWeekday(now = new Date()) {
  return getAppWeekday(now);
}

export function isSchoolDay(now = new Date()) {
  return getWeekday(now) !== 0;
}

export function isGroupClassDay(groupDayType: GroupDayType, now = new Date()) {
  return isGroupClassDayForType(groupDayType, now);
}

export function canMarkAttendanceToday(groupDayType: GroupDayType, now = new Date()) {
  return isTodayDate(todayISO(now), now) && isGroupClassDay(groupDayType, now);
}

export function getAttendanceBlockedMessage(groupDayType: GroupDayType, now = new Date()) {
  return getGroupAttendanceBlockedMessage(groupDayType, now);
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes = '0'] = time.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function formatClassTimeRange(startTime: string, endTime: string) {
  return `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}`;
}

export function isWithinClassTime(startTime: string, endTime: string, now = new Date()) {
  const current = getAppMinutes(now);
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return current >= start && current <= end;
}

export function getClassTimeBlockedMessage(startTime: string, endTime: string, now = new Date()) {
  if (isWithinClassTime(startTime, endTime, now)) return '';
  const range = formatClassTimeRange(startTime, endTime);
  const current = getAppMinutes(now);
  const start = parseTimeToMinutes(startTime);
  if (current < start) {
    return `Davomat hali ochilmagan — dars ${range} da boshlanadi`;
  }
  return `Dars vaqti tugadi (${range}) — bugun davomat qo'yib bo'lmaydi`;
}

/** API yoki PostgreSQL dan kelgan sanani YYYY-MM-DD ga keltiradi */
export function normalizeDateString(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw.slice(0, 10);
}

export function isTodayDate(value: string | Date | null | undefined, now = new Date()) {
  const normalized = normalizeDateString(value);
  return normalized !== '' && normalized === todayISO(now);
}

/** "2026 9-avgust 14:00" */
export function formatAttendanceDateLabel(
  value: string | Date | null | undefined,
  classTime?: string
) {
  const iso = normalizeDateString(value);
  if (!iso) return '—';

  const [year, month, day] = iso.split('-').map(Number);
  const monthName = (MONTH_LABELS_FULL[month - 1] ?? String(month)).toLowerCase();
  const timePart = classTime ? ` ${classTime.slice(0, 5)}` : '';
  return `${year} ${day}-${monthName}${timePart}`;
}

/** "8 avgust 2026" */
export function formatDateUz(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
) {
  const iso = normalizeDateString(value);
  if (!iso) return '—';

  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  });
}

/** "shanba, 8 avgust 2026" */
export function formatWeekdayDateUz(value: string | Date | null | undefined) {
  return formatDateUz(value, { weekday: 'long' });
}
