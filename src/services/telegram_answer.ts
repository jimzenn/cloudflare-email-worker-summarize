import { Env } from '@/types/env';

export async function answerCallbackQuery(callbackQueryId: string, text: string, env: Env): Promise<void> {
  const apiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('[Telegram] API error for answerCallbackQuery:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
  }
}
