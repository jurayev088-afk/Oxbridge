import {
  buildTelegramAttendanceMessage,
  isTelegramConfigured,
  sendTelegramMessage,
  type AttendanceStatus,
  type LessonGrade,
} from './telegramBot';
import { getChatIdByPhone } from './telegramPhoneMap';

export type NotifyTarget = 'parents' | 'student' | 'both';

export interface StudentTelegramContact {
  id: string;
  name: string;
  phone?: string;
  fatherPhone?: string;
  motherPhone?: string;
  telegramChatId?: string;
  fatherTelegramChatId?: string;
  motherTelegramChatId?: string;
}

function collectChatIdsByPhone(student: StudentTelegramContact, target: NotifyTarget): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  const addChatId = (chatId?: string) => {
    if (!chatId || seen.has(chatId)) return;
    seen.add(chatId);
    ids.push(chatId);
  };

  const addPhone = (phone?: string) => {
    const chatId = getChatIdByPhone(phone);
    if (chatId) addChatId(chatId);
  };

  if (target === 'student' || target === 'both') {
    addChatId(student.telegramChatId);
    addPhone(student.phone);
  }

  if (target === 'parents' || target === 'both') {
    addChatId(student.fatherTelegramChatId);
    addChatId(student.motherTelegramChatId);
    addPhone(student.fatherPhone);
    addPhone(student.motherPhone);
  }

  if (ids.length === 0 && target === 'parents') {
    addPhone(student.phone);
    addChatId(student.telegramChatId);
  }

  const defaultChat = process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (ids.length === 0 && defaultChat) addChatId(defaultChat);

  return ids;
}

export async function sendAttendanceTelegramNotifications(
  groupName: string,
  date: string,
  records: { studentId: string; status: AttendanceStatus; grade?: LessonGrade | null }[],
  students: StudentTelegramContact[],
  target: NotifyTarget,
  enabled: boolean
) {
  if (!enabled) {
    return {
      sent: 0,
      failed: 0,
      target,
      configured: isTelegramConfigured(),
      messages: [] as { chatId: string; studentName: string; ok: boolean; error?: string }[],
    };
  }

  let sent = 0;
  let failed = 0;
  const messages: { chatId: string; studentName: string; ok: boolean; error?: string }[] = [];

  if (!isTelegramConfigured()) {
    return {
      sent: 0,
      failed: records.length,
      target,
      configured: false,
      messages: records.map((r) => {
        const student = students.find((s) => s.id === r.studentId);
        return {
          chatId: '',
          studentName: student?.name ?? r.studentId,
          ok: false,
          error: 'Telegram bot sozlanmagan',
        };
      }),
    };
  }

  for (const record of records) {
    const student = students.find((s) => s.id === record.studentId);
    if (!student) continue;

    const chatIds = collectChatIdsByPhone(student, target);
    const text = buildTelegramAttendanceMessage(
      student.name,
      groupName,
      date,
      record.status,
      record.grade
    );

    if (chatIds.length === 0) {
      messages.push({
        chatId: '',
        studentName: student.name,
        ok: false,
        error:
          'Telefon botga ulanmagan. @oxbridgeacademy_bot da /start bosing va telefon raqamini ulashing.',
      });
      failed += 1;
      continue;
    }

    for (const chatId of chatIds) {
      const result = await sendTelegramMessage(chatId, text);
      messages.push({
        chatId,
        studentName: student.name,
        ok: result.ok,
        error: result.error,
      });
      if (result.ok) sent += 1;
      else failed += 1;
    }
  }

  return { sent, failed, target, configured: true, messages };
}
