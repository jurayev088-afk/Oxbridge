import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/crm_demo';
const adminUrl = url.replace(/\/[^/]+$/, '/postgres');

async function main() {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  const dbName = new URL(url).pathname.slice(1) || 'crm_demo';
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${dbName}`);
    console.log(`Baza yaratildi: ${dbName}`);
  } else {
    console.log(`Baza mavjud: ${dbName}`);
  }
  await admin.end();

  const app = new pg.Client({ connectionString: url });
  await app.connect();
  await app.query('SELECT 1');
  await app.end();
  console.log('Ulanish muvaffaqiyatli:', url);
}

main().catch((err) => {
  console.error('Xatolik:', err.message);
  process.exit(1);
});
