import { Env } from '../types/env';
const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export async function sendTelegramMessage(text: string, env: Env): Promise<void> {
  const apiUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const shortenedText = text.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);

  await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_TO_CHAT_ID,
      text: shortenedText,
    }),
  });
}