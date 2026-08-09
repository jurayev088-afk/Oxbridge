import { sendSms, getSmsMode } from './smsService';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type SmsTarget = 'parents' | 'student' | 'both';

export interface StudentContact {
  id: string;
  name: string;
  phone?: string;
  fatherPhone?: string;
  motherPhone?: string;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export function collectPhones(student: StudentContact, target: SmsTarget): string[] {
  const phones: string[] = [];
  const seen = new Set<string>();

  const add = (value?: string) => {
    if (!value?.trim()) return;
    const key = normalizePhone(value);
    if (key.length < 9 || seen.has(key)) return;
    seen.add(key);
    phones.push(value.trim());
  };

  if (target === 'student' || target === 'both') add(student.phone);
  if (target === 'parents' || target === 'both') {
    add(student.fatherPhone);
    add(student.motherPhone);
  }

  if (phones.length === 0 && target === 'parents') add(student.phone);

  return phones;
}

export function buildAttendanceMessage(
  studentName: string,
  groupName: string,
  date: string,
  status: AttendanceStatus
) {
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const statusText = {
    present: 'darsga keldi',
    absent: 'darsga kelmadi',
    late: 'darsga kechikib keldi',
    excused: 'sababli kelmadi',
  };

  return `Oxbridge academy: ${studentName} ${formatted} kuni "${groupName}" guruhida ${statusText[status]}.`;
}

export async function sendAttendanceNotifications(
  groupName: string,
  date: string,
  records: { studentId: string; status: AttendanceStatus }[],
  students: StudentContact[],
  target: SmsTarget,
  enabled: boolean
) {
  if (!enabled) {
    return {
      sent: 0,
      failed: 0,
      target,
      mode: getSmsMode(),
      messages: [] as { phone: string; studentName: string; ok: boolean; error?: string }[],
    };
  }

  let sent = 0;
  let failed = 0;
  const messages: { phone: string; studentName: string; ok: boolean; error?: string }[] = [];

  for (const record of records) {
    const student = students.find((s) => s.id === record.studentId);
    if (!student) continue;

    const phones = collectPhones(student, target);
    const text = buildAttendanceMessage(student.name, groupName, date, record.status);

    for (const phone of phones) {
      const result = await sendSms(phone, text);
      messages.push({
        phone,
        studentName: student.name,
        ok: result.ok,
        error: result.error,
      });
      if (result.ok) sent += 1;
      else failed += 1;
    }
  }

  const mode = messages[0] ? getSmsMode() : getSmsMode();
  return { sent, failed, target, mode, messages };
}
