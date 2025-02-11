import { Env } from '../types/env';
const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function escapeMarkdownV2(text: string): string {
  const specialChars = /[`>#+={}.!-]/g;
  // First escape all backslashes
  let escaped = text.replace(/\\/g, '\\\\');
  // Then escape all special characters
  escaped = escaped.replace(specialChars, '\\$&');
  
  return escaped;
}

export async function sendTelegramMessage(text: string, env: Env): Promise<void> {
  const apiUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const escapedText = escapeMarkdownV2(text);
  const shortenedText = escapedText.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);

  console.log('Sending Telegram message:', shortenedText);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_TO_CHAT_ID,
        text: shortenedText,
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
    console.log('Telegram message sent successfully:', {
      messageId: data.result?.message_id,
      chatId: data.result?.chat?.id,
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}