import { handleTelegramUpdate, isTelegramConfigured } from './telegramBot';

let offset = 0;
let polling = false;

export function startTelegramPolling() {
  if (!isTelegramConfigured() || process.env.TELEGRAM_POLLING === 'false') return;
  if (polling) return;
  polling = true;

  const token = process.env.TELEGRAM_BOT_TOKEN!;

  async function poll() {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`
      );
      const data = (await res.json()) as {
        ok?: boolean;
        result?: Array<{ update_id: number; message?: unknown }>;
      };

      if (data.ok && data.result?.length) {
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
