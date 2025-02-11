import { Env } from '../types/env';
import { markdownv2 as format } from 'telegram-format';

const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function escapeMarkdownV2(text: string): string {
  const specialChars = /[>#+={}.!-]/g;
  return text.replace(specialChars, '\\$&');
}

export async function sendTelegramMessage(sender: string, subject: string, text: string, env: Env): Promise<void> {
  const apiUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const escapedText = escapeMarkdownV2(text);
  const shortenedText = escapedText.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);


  const msg = [
    format.blockquote([
      format.bold(escapeMarkdownV2(subject)),
      "from: " + format.code(escapeMarkdownV2(sender))
    ].join('\n')),
    shortenedText
  ].join('\n\n');

  console.log('Sending Telegram message:', msg);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_TO_CHAT_ID,
        text: msg,
        parse_mode: 'MarkdownV2'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Telegram API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Telegram message sent successfully.', {
      messageId: data.result?.message_id,
      chatId: data.result?.chat?.id,
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}