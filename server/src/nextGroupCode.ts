import type pg from 'pg';

export async function nextGroupCode(pool: pg.Pool | pg.PoolClient): Promise<string> {
  const result = await pool.query<{ max_code: string | null }>(
    `SELECT MAX(CAST(code AS INTEGER)) AS max_code
     FROM groups
     WHERE code ~ '^[0-9]+$'`
  );
  const next = Number(result.rows[0]?.max_code ?? 0) + 1;
  return String(next).padStart(3, '0');
}

export function normalizeGroupCode(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(3, '0');
  return trimmed.slice(0, 10);
}
