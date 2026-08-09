import { linkPhoneToChat } from './telegramPhoneMap';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || '';
}

function formatDateShort(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
}

export function buildTelegramAttendanceMessage(
  studentName: string,
  groupName: string,
  date: string,
  status: AttendanceStatus
) {
  const statusLine = {
    present: '🟢 Keldi',
    absent: '🔴 Kelmadi',
    late: '🟡 Kechikdi',
    excused: '🔵 Sababli',
  }[status];

  return `${formatDateShort(date)}\n\n${studentName}\n${statusLine}\n\n📌 Guruh: ${groupName}\n📍 Oxbridge academy`;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode?: 'HTML' | 'Markdown'
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: 'Telegram bot sozlanmagan' };
  }

  try {
    const body: Record<string, unknown> = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || 'Telegram xabar yuborilmadi' };
    }

    console.log(`[Telegram] xabar yuborildi -> ${chatId}`);
    return { ok: true };
  } catch (err) {
    console.error('[Telegram] xatolik:', err);
    return { ok: false, error: 'Telegram tarmoq xatolik' };
  }
}

export async function sendTelegramMessageWithContactKeyboard(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        keyboard: [[{ text: '📱 Telefon raqamini ulashish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }),
  });
}

export async function handleTelegramUpdate(update: Record<string, unknown>) {
  const message = update.message as {
    chat?: { id: number };
    text?: string;
    contact?: { phone_number?: string; user_id?: number };
  } | undefined;

  if (!message?.chat?.id) return;

  const chatId = String(message.chat.id);

  if (message.contact?.phone_number) {
    await linkPhoneToChat(message.contact.phone_number, chatId);
    await sendTelegramMessage(
      chatId,
      '✅ Rahmat! Telefon raqamingiz bog\'landi.\n\nEndi CRM dagi shu raqam bo\'yicha davomat xabarlari avtomatik keladi.\n\n🟢 Keldi · 🔴 Kelmadi · 🔵 Sababli · 🟡 Kechikdi'
    );
    return;
  }

  if (!message.text) return;

  const text = message.text.trim();

  if (text === '/start' || text.startsWith('/start ')) {
    await sendTelegramMessageWithContactKeyboard(
      chatId,
      'Oxbridge academy bot\n\nDavomat xabarlarini olish uchun telefon raqamingizni ulashing.\n\nCRM dagi ota-ona telefon raqami bilan mos kelishi kerak.'
    );
    return;
  }

  if (text === '/help') {
    await sendTelegramMessage(
      chatId,
      'Oxbridge academy davomat boti.\n\n/start — telefon raqamini ulashish\n\nChat ID kerak emas — faqat telefon ulang.'
    );
  }
}
