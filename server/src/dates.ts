/** YYYY-MM-DD — server mahalliy vaqti bo'yicha bugun */
export function todayISO(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function normalizeDateString(value: unknown): string {
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

export function isTodayDate(value: unknown, now = new Date()) {
  const normalized = normalizeDateString(value);
  return normalized !== '' && normalized === todayISO(now);
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes = '0'] = time.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function formatClassTimeRange(startTime: string, endTime: string) {
  return `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}`;
}

export function isWithinClassTime(startTime: string, endTime: string, now = new Date()) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return current >= start && current <= end;
}

export function getClassTimeBlockedMessage(startTime: string, endTime: string, now = new Date()) {
  if (isWithinClassTime(startTime, endTime, now)) return '';
  const range = formatClassTimeRange(startTime, endTime);
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(startTime);
  if (current < start) {
    return `Davomat hali ochilmagan — dars ${range} da boshlanadi`;
  }
  return `Dars vaqti tugadi (${range}) — bugun davomat qo'yib bo'lmaydi`;
}

export { getAttendanceBlockedMessage, isGroupClassDay, type GroupDayType } from './groupDayTypes';
