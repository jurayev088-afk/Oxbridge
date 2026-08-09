import type pg from 'pg';

export async function nextUserId(
  pool: pg.Pool | pg.PoolClient,
  role: 'teacher' | 'student' | 'admin'
): Promise<string> {
  const prefix = role === 'teacher' ? 't' : role === 'student' ? 's' : 'a';
  const result = await pool.query<{ max_num: string | null }>(
    `SELECT MAX(CAST(SUBSTRING(id FROM 2) AS INTEGER)) AS max_num
     FROM users
     WHERE role = $1 AND id ~ $2`,
    [role, `^${prefix}[0-9]+$`]
  );
  const next = Number(result.rows[0]?.max_num ?? 0) + 1;
  return `${prefix}${next}`;
}
