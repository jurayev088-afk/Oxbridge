import { handleTelegramUpdate, isTelegramConfigured } from './telegramBot';

let offset = 0;
let polling = false;

async function ensurePollingMode(token: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.warn('[Telegram polling] webhook o\'chirilmadi:', data.description);
    }
  } catch (err) {
    console.error('[Telegram polling] deleteWebhook xatolik:', err);
  }
}

export async function startTelegramPolling() {
  if (!isTelegramConfigured() || process.env.TELEGRAM_POLLING === 'false') return;
  if (polling) return;
  polling = true;

  const token = process.env.TELEGRAM_BOT_TOKEN!;
  await ensurePollingMode(token);

  async function poll() {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`
      );
      const data = (await res.json()) as {
        ok?: boolean;
        description?: string;
        result?: Array<{ update_id: number; message?: unknown }>;
      };

      if (!data.ok) {
        console.error('[Telegram polling] getUpdates xato:', data.description);
        if (data.description?.includes('Conflict')) {
          console.error(
            '[Telegram polling] Boshqa joy (masalan local npm run dev) ham shu botni tinglayapti. Local serverni o\'chiring yoki TELEGRAM_POLLING=false qiling.'
          );
        }
      } else if (data.result?.length) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleTelegramUpdate(update as Record<string, unknown>);
        }
      }
    } catch (err) {
      console.error('[Telegram polling]', err);
    }

    if (polling) setTimeout(poll, 1000);
  }

  console.log('Telegram polling yoqildi — bot /start ishlaydi');
  poll();
}
