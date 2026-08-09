import type pg from 'pg';

export async function nextLeadId(pool: pg.Pool | pg.PoolClient): Promise<string> {
  const result = await pool.query<{ max_num: string | null }>(
    `SELECT MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)) AS max_num
     FROM leads
     WHERE id ~ '^l[0-9]+$'`
  );
  const next = Number(result.rows[0]?.max_num ?? 0) + 1;
  return `l${next}`;
}
