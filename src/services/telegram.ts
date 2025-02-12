import { Env } from '../types/env';
import { markdownv2 as format } from 'telegram-format';

const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function escapeParenthesesAndBrackets(text: string): string {
  // Match markdown links pattern: [text](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Split text into links and non-links
  const parts: string[] = [];
  let lastIndex = 0;
  
  for (const match of text.matchAll(linkPattern)) {
    // Add text before the link, escaping unescaped brackets/parentheses
    const beforeLink = text.slice(lastIndex, match.index)
      .replace(/(?<!\\)[\[\]()]/g, '\\$&');
    parts.push(beforeLink);
    
    // Add the link unchanged
    parts.push(match[0]);
    lastIndex = (match.index ?? 0) + match[0].length;
  }
  
  // Add remaining text, escaping unescaped brackets/parentheses
  parts.push(text.slice(lastIndex).replace(/(?<!\\)[\[\]()]/g, '\\$&'));
  
  return parts.join('');
}

function escapeMarkdownV2(text: string): string {
  const specialChars = /(?<!\\)[>#+={}.!\-|]/g;
  const escapedText = text
    .replace(/\|\|/g, '{{DOUBLEPIPE}}') // Temporarily replace || with placeholder
    .replace(specialChars, '\\$&')
    .replace(/{{DOUBLEPIPE}}/g, '||'); // Restore || without escaping
  return escapeParenthesesAndBrackets(escapedText);
}

function formatMarkdownMessage(subject: string, sender: string, text: string): string {
  return [
    format.blockquote([
      format.bold(escapeMarkdownV2(subject)),
      "from: " + format.monospace(sender),
    ].join('\n')),
    text
  ].join('\n\n');
}

function formatPlainMessage(subject: string, sender: string, text: string): string {
  return [
    `${subject}`,
    `from: ${sender}`,
    '',
    text
  ].join('\n');
}

async function sendTelegramRequest(
  apiUrl: string, 
  chatId: string, 
  text: string, 
  parseMode?: 'MarkdownV2'
): Promise<Response> {
  return fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(parseMode && { parse_mode: parseMode })
    }),
  });
}

export async function sendTelegramMessage(
  sender: string, 
  subject: string, 
  text: string, 
  env: Env
): Promise<void> {
  const apiUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const escapedText = escapeMarkdownV2(text);
  const shortenedText = escapedText.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);

  // Try sending formatted message first
  const formattedMsg = formatMarkdownMessage(subject, sender, shortenedText);
  console.log('Sending Telegram message:', formattedMsg);
  
  const response = await sendTelegramRequest(
    apiUrl, 
    env.TELEGRAM_TO_CHAT_ID, 
    formattedMsg, 
    'MarkdownV2'
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('Telegram API error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });

    const plainMsg = formatPlainMessage(subject, sender, shortenedText);
    const retryResponse = await sendTelegramRequest(
      apiUrl, 
      env.TELEGRAM_TO_CHAT_ID, 
      plainMsg
    );

    if (!retryResponse.ok) {
      const retryErrorData = await retryResponse.json().catch(() => null);
      console.error('Telegram API retry error:', {
        status: retryResponse.status,
        statusText: retryResponse.statusText,
        errorData: retryErrorData,
      });
      throw new Error('Failed to send Telegram message after retry');
    }
  }
}