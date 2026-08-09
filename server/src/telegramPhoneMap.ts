import fs from 'fs';
import path from 'path';

const phoneToChatId = new Map<string, string>();
const mapFile = path.join(__dirname, '..', 'data', 'telegram-phones.json');

function loadPhoneMap() {
  try {
    if (!fs.existsSync(mapFile)) return;
    const raw = JSON.parse(fs.readFileSync(mapFile, 'utf-8')) as Record<string, string>;
    for (const [phone, chatId] of Object.entries(raw)) {
      phoneToChatId.set(phone, chatId);
    }
    console.log(`[Telegram] ${phoneToChatId.size} ta telefon yuklandi`);
  } catch (err) {
    console.error('[Telegram] telefon xaritasi yuklanmadi:', err);
  }
}

function savePhoneMap() {
  try {
    const dir = path.dirname(mapFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mapFile, JSON.stringify(Object.fromEntries(phoneToChatId), null, 2));
  } catch (err) {
    console.error('[Telegram] telefon xaritasi saqlanmadi:', err);
  }
}

loadPhoneMap();

export function normalizePhoneKey(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

export function linkPhoneToChat(phone: string, chatId: string) {
  const key = normalizePhoneKey(phone);
  if (key.length < 9) return;
  phoneToChatId.set(key, chatId);
  savePhoneMap();
  console.log(`[Telegram] telefon bog'landi: ${key} -> ${chatId}`);
}

export function getChatIdByPhone(phone?: string): string | undefined {
  if (!phone?.trim()) return undefined;
  return phoneToChatId.get(normalizePhoneKey(phone));
}

export function getLinkedPhonesCount() {
  return phoneToChatId.size;
}
