import type { Lead, LeadStatus, StudentListItem } from '../types';
import { authHeaders } from './auth';

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch('/api/leads', { headers: authHeaders() });
  if (!res.ok) throw new Error(await readError(res, 'Lidlarni yuklab bo\'lmadi'));
  return res.json();
}

export async function createLead(data: {
  name: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  courseInterest?: string;
  note?: string;
}): Promise<Lead | null> {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error('[createLead]', await readError(res, 'Xatolik'));
    return null;
  }
  return res.json();
}

export async function updateLead(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    source: string;
    status: LeadStatus;
    courseInterest: string;
    note: string;
  }>
): Promise<Lead | null> {
  const res = await fetch(`/api/leads/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteLead(id: string): Promise<boolean> {
  const res = await fetch(`/api/leads/${id}`, { method: 'DELETE', headers: authHeaders() });
  return res.ok;
}

export async function convertLeadToStudentWithError(
  id: string,
  data: { groupId?: string; paymentDue?: number; email?: string } = {}
): Promise<{ ok: true; result: { student: StudentListItem; removedLeadId: string } } | { ok: false; error: string }> {
  const res = await fetch(`/api/leads/${id}/convert`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    return { ok: false, error: await readError(res, 'O\'quvchiga aylantirishda xatolik') };
  }
  const result = await res.json();
  return { ok: true, result };
}
