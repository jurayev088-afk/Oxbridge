import type { NotifyPayload } from '../types/notifications';
import { formatMoney } from './formatDisplay';

export const notificationMessages = {
  studentAdded: (name: string, groupName?: string): NotifyPayload => ({
    kind: 'student_add',
    title: "O'quvchi qo'shildi",
    message: groupName ? `${name} — ${groupName} guruhiga qo'shildi` : `${name} ro'yxatga qo'shildi`,
    link: groupName ? undefined : '/oquvchilar',
  }),

  studentUpdated: (name: string): NotifyPayload => ({
    kind: 'student_edit',
    title: "O'quvchi yangilandi",
    message: `${name} ma'lumotlari saqlandi`,
    link: '/oquvchilar',
  }),

  studentDeleted: (name: string): NotifyPayload => ({
    kind: 'student_delete',
    title: "O'quvchi o'chirildi",
    message: `${name} ro'yxatdan olib tashlandi`,
  }),

  teacherAdded: (name: string): NotifyPayload => ({
    kind: 'teacher_add',
    title: "O'qituvchi qo'shildi",
    message: `${name} jamoaga qo'shildi`,
    link: '/oqituvchilar',
  }),

  teacherUpdated: (name: string): NotifyPayload => ({
    kind: 'teacher_edit',
    title: "O'qituvchi yangilandi",
    message: `${name} ma'lumotlari saqlandi`,
    link: '/oqituvchilar',
  }),

  teacherDeleted: (name: string): NotifyPayload => ({
    kind: 'teacher_delete',
    title: "O'qituvchi o'chirildi",
    message: `${name} ro'yxatdan olib tashlandi`,
  }),

  groupAdded: (name: string, code: string): NotifyPayload => ({
    kind: 'group_add',
    title: 'Yangi guruh',
    message: `${name} (${code}) muvaffaqiyatli yaratildi`,
    link: `/guruh/${code}`,
  }),

  groupUpdated: (name: string): NotifyPayload => ({
    kind: 'group_edit',
    title: 'Guruh yangilandi',
    message: `${name} ma'lumotlari saqlandi`,
  }),

  groupDeleted: (name: string): NotifyPayload => ({
    kind: 'group_delete',
    title: "Guruh o'chirildi",
    message: `${name} o'chirildi`,
  }),

  studentAddedToGroup: (studentName: string, groupName: string, groupId: string): NotifyPayload => ({
    kind: 'student_add',
    title: "Guruhga o'quvchi",
    message: `${studentName} — ${groupName} guruhiga qo'shildi`,
    link: `/guruh/${groupId}`,
  }),

  attendanceSaved: (groupName: string, date: string, telegramSent?: number): NotifyPayload => ({
    kind: 'attendance',
    title: 'Davomat saqlandi',
    message:
      telegramSent && telegramSent > 0
        ? `${groupName} — ${formatDateLabel(date)}. ${telegramSent} ta Telegram xabar yuborildi`
        : `${groupName} — ${formatDateLabel(date)} davomati saqlandi`,
  }),

  profileUpdated: (name: string): NotifyPayload => ({
    kind: 'profile',
    title: 'Profil yangilandi',
    message: `${name} akkaunt ma'lumotlari saqlandi`,
  }),

  groupProfileUpdated: (name: string): NotifyPayload => ({
    kind: 'group_edit',
    title: 'Guruh saqlandi',
    message: `${name} guruh ma'lumotlari yangilandi`,
  }),

  leadAdded: (name: string): NotifyPayload => ({
    kind: 'lead_add',
    title: 'Yangi lid',
    message: `${name} lidlar ro'yxatiga qo'shildi`,
    link: '/lidlar',
  }),

  leadUpdated: (name: string): NotifyPayload => ({
    kind: 'lead_edit',
    title: 'Lid yangilandi',
    message: `${name} ma'lumotlari saqlandi`,
    link: '/lidlar',
  }),

  leadDeleted: (name: string): NotifyPayload => ({
    kind: 'lead_delete',
    title: "Lid o'chirildi",
    message: `${name} ro'yxatdan olib tashlandi`,
  }),

  leadConvertedToStudent: (name: string, groupName?: string): NotifyPayload => ({
    kind: 'student_add',
    title: "Lid o'quvchi bo'ldi",
    message: groupName
      ? `${name} o'quvchilar ro'yxatiga qo'shildi (${groupName})`
      : `${name} o'quvchilar ro'yxatiga qo'shildi`,
    link: '/oquvchilar',
  }),

  paymentRecorded: (studentName: string, amount: number): NotifyPayload => ({
    kind: 'success',
    title: "To'lov qabul qilindi",
    message: `${studentName} — ${formatMoney(amount)}`,
    link: '/moliya',
  }),
};

function formatDateLabel(date: string) {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}
