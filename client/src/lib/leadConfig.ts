import type { LeadStatus } from '../types';

export const LEAD_STATUSES: Array<{
  id: LeadStatus;
  label: string;
  color: string;
  glow: string;
}> = [
  { id: 'new', label: 'Yangi', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.15)' },
  { id: 'contacted', label: "Bog'lanildi", color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.15)' },
  { id: 'trial', label: 'Sinov darsi', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)' },
  { id: 'converted', label: "O'quvchi", color: '#22c55e', glow: 'rgba(34, 197, 94, 0.15)' },
  { id: 'lost', label: 'Rad etildi', color: '#64748b', glow: 'rgba(100, 116, 139, 0.15)' },
];

/** Kanban ustunlari — o'quvchi bo'lgan lid alohida o'tkaziladi */
export const KANBAN_STATUSES = LEAD_STATUSES.filter((s) => s.id !== 'converted');

export const LEAD_SOURCES: Array<{ id: string; label: string }> = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'tavsiya', label: 'Tavsiya' },
  { id: 'reklama', label: 'Reklama' },
  { id: 'sayt', label: 'Sayt' },
  { id: 'boshqa', label: 'Boshqa' },
];

export function getLeadStatusMeta(status: LeadStatus) {
  return LEAD_STATUSES.find((s) => s.id === status) ?? LEAD_STATUSES[0];
}

export function getLeadSourceLabel(source: string) {
  return LEAD_SOURCES.find((s) => s.id === source)?.label ?? source;
}
