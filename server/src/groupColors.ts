export const GROUP_COLOR_PALETTE = [
  '#c4a882',
  '#64b5f6',
  '#81c784',
  '#e57373',
  '#ba68c8',
  '#4db6ac',
  '#ffb74d',
  '#7986cb',
  '#f06292',
  '#aed581',
  '#4dd0e1',
  '#ff8a65',
] as const;

export function normalizeGroupColor(color: string) {
  return color.trim().toLowerCase();
}

export function pickGroupColor(usedColors: string[] = []) {
  const used = new Set(usedColors.map(normalizeGroupColor));

  const available = GROUP_COLOR_PALETTE.find((color) => !used.has(normalizeGroupColor(color)));
  if (available) return available;

  return GROUP_COLOR_PALETTE[usedColors.length % GROUP_COLOR_PALETTE.length];
}

export async function pickGroupColorFromDb(
  pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ color: string }> }> }
) {
  const { rows } = await pool.query(`SELECT color FROM groups`);
  return pickGroupColor(rows.map((row) => row.color));
}
