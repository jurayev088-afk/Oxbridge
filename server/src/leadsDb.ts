import pool from './db';
import { nextLeadId } from './nextLeadId';
import { nextUserId } from './nextUserId';
import { ensureBillForNewStudent } from './monthlyBillsDb';

export type LeadStatus = 'new' | 'contacted' | 'trial' | 'converted' | 'lost';

const LEAD_SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  tavsiya: 'Tavsiya',
  reklama: 'Reklama',
  sayt: 'Sayt',
  boshqa: 'Boshqa',
};

function buildStudentNote(lead: { source: string; courseInterest: string; note: string }) {
  const parts: string[] = [];
  const sourceLabel = LEAD_SOURCE_LABELS[lead.source] ?? lead.source;
  if (sourceLabel) parts.push(`Manba: ${sourceLabel}`);
  if (lead.courseInterest) parts.push(`Kurs: ${lead.courseInterest}`);
  if (lead.note) parts.push(lead.note);
  return parts.join(' | ');
}

function mapLeadRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: (row.phone as string) ?? '',
    source: (row.source as string) ?? 'boshqa',
    status: row.status as LeadStatus,
    courseInterest: (row.course_interest as string) ?? '',
    note: (row.note as string) ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLeads() {
  const result = await pool.query(
    `SELECT id, name, phone, source, status, course_interest, note, created_at, updated_at
     FROM leads
     ORDER BY updated_at DESC`
  );
  return result.rows.map(mapLeadRow);
}

export async function createLead(data: {
  name: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  courseInterest?: string;
  note?: string;
}) {
  const id = await nextLeadId(pool);
  const result = await pool.query(
    `INSERT INTO leads (id, name, phone, source, status, course_interest, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, phone, source, status, course_interest, note, created_at, updated_at`,
    [
      id,
      data.name.trim(),
      data.phone?.trim() ?? '',
      data.source ?? 'boshqa',
      data.status ?? 'new',
      data.courseInterest?.trim() ?? '',
      data.note?.trim() ?? '',
    ]
  );
  return mapLeadRow(result.rows[0]);
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
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const mapping: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    source: 'source',
    status: 'status',
    courseInterest: 'course_interest',
    note: 'note',
  };

  for (const [key, col] of Object.entries(mapping)) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(data[key as keyof typeof data]);
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE leads SET ${fields.join(', ')}
     WHERE id = $${i}
     RETURNING id, name, phone, source, status, course_interest, note, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) return null;
  return mapLeadRow(result.rows[0]);
}

export async function deleteLead(id: string) {
  const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING id', [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function convertLeadToStudent(
  leadId: string,
  options: { groupId?: string; paymentDue?: number; email?: string } = {}
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const leadResult = await client.query(
      `SELECT id, name, phone, source, course_interest, note
       FROM leads WHERE id = $1 FOR UPDATE`,
      [leadId]
    );
    if (leadResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const lead = leadResult.rows[0];
    const phone = (lead.phone as string)?.trim() ?? '';

    if (phone) {
      const dup = await client.query(
        `SELECT id FROM users WHERE role = 'student' AND phone = $1 LIMIT 1`,
        [phone]
      );
      if (dup.rows.length > 0) {
        await client.query('ROLLBACK');
        throw new Error('DUPLICATE_PHONE');
      }
    }

    const studentId = await nextUserId(client, 'student');
    const address = buildStudentNote({
      source: (lead.source as string) ?? 'boshqa',
      courseInterest: (lead.course_interest as string) ?? '',
      note: (lead.note as string) ?? '',
    });

    await client.query(
      `INSERT INTO users (id, name, role, phone, email, group_id, payment_due, monthly_fee, address)
       VALUES ($1, $2, 'student', $3, $4, $5, $6, $6, $7)`,
      [
        studentId,
        lead.name,
        phone,
        options.email?.trim() ?? '',
        options.groupId || null,
        options.paymentDue ?? 0,
        address,
      ]
    );

    await client.query('DELETE FROM leads WHERE id = $1', [leadId]);

    let groupName: string | undefined;
    if (options.groupId) {
      const groupResult = await client.query('SELECT name FROM groups WHERE id = $1', [options.groupId]);
      groupName = groupResult.rows[0]?.name;
    }

    await client.query('COMMIT');

    await ensureBillForNewStudent(studentId);

    return {
      student: {
        id: studentId,
        name: lead.name as string,
        phone,
        email: options.email?.trim() ?? '',
        photoUrl: '',
        groupId: options.groupId || undefined,
        groupName,
        paymentDue: Number(options.paymentDue ?? 0),
      },
      removedLeadId: leadId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function countActiveLeads() {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM leads WHERE status NOT IN ('converted', 'lost')`
  );
  return Number(result.rows[0]?.count ?? 0);
}
