import fs from 'fs';
import path from 'path';
import pool from './db';

const phoneToChatId = new Map<string, string>();
const mapFile = path.join(__dirname, '..', 'data', 'telegram-phones.json');

export function normalizePhoneKey(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

async function migrateFileToDb() {
  try {
    if (!fs.existsSync(mapFile)) return;

    const raw = JSON.parse(fs.readFileSync(mapFile, 'utf-8')) as Record<string, string>;
    let migrated = 0;

    for (const [phone, chatId] of Object.entries(raw)) {
      const key = normalizePhoneKey(phone);
      if (key.length < 9 || !chatId) continue;

      await pool.query(
        `INSERT INTO telegram_phone_links (phone, chat_id)
         VALUES ($1, $2)
         ON CONFLICT (phone) DO UPDATE
           SET chat_id = EXCLUDED.chat_id,
               linked_at = NOW()`,
        [key, chatId]
      );
      migrated += 1;
    }

    if (migrated > 0) {
      const backup = `${mapFile}.migrated`;
      if (!fs.existsSync(backup)) {
        fs.renameSync(mapFile, backup);
      }
      console.log(`[Telegram] ${migrated} ta telefon JSON dan bazaga ko'chirildi`);
    }
  } catch (err) {
    console.error('[Telegram] JSON migratsiya xatolik:', err);
  }
}

async function loadPhoneMapFromDb() {
  phoneToChatId.clear();

  const result = await pool.query<{ phone: string; chat_id: string }>(
    'SELECT phone, chat_id FROM telegram_phone_links'
  );

  for (const row of result.rows) {
    phoneToChatId.set(row.phone, row.chat_id);
  }

  console.log(`[Telegram] ${phoneToChatId.size} ta telefon bazadan yuklandi`);
}

export async function initTelegramPhoneMap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_phone_links (
      phone VARCHAR(20) PRIMARY KEY,
      chat_id VARCHAR(32) NOT NULL,
      linked_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await migrateFileToDb();
  await loadPhoneMapFromDb();
}

export async function linkPhoneToChat(phone: string, chatId: string) {
  const key = normalizePhoneKey(phone);
  if (key.length < 9) return;

  await pool.query(
    `INSERT INTO telegram_phone_links (phone, chat_id)
     VALUES ($1, $2)
     ON CONFLICT (phone) DO UPDATE
       SET chat_id = EXCLUDED.chat_id,
           linked_at = NOW()`,
    [key, chatId]
  );

  phoneToChatId.set(key, chatId);
  console.log(`[Telegram] telefon bog'landi: ${key} -> ${chatId}`);
}

export function getChatIdByPhone(phone?: string): string | undefined {
  if (!phone?.trim()) return undefined;
  return phoneToChatId.get(normalizePhoneKey(phone));
}

export function getLinkedPhonesCount() {
  return phoneToChatId.size;
}
