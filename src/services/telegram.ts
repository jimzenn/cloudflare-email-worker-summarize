import { Env } from '@/types/env';
import { DebugInfo } from '@/types/debug';

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

export function escapeMarkdownV2(text: string): string {
  // Added '<' to the list of special characters
  const specialChars = /(?<!\\)[><#+={}.!\-|]/g; 
  
  const escapedText = text
    .replace(/\|\|/g, '{{DOUBLEPIPE}}') // Temporarily replace || with placeholder
    .replace(specialChars, '\\$&')
    .replace(/{{DOUBLEPIPE}}/g, '||'); // Restore || without escaping
    
  return escapeParenthesesAndBrackets(escapedText);
}

function formatDebugInfo(debugInfo: DebugInfo): string {
  const { llmModel, category, startTime } = debugInfo;
  const executionTime = startTime ? `${Date.now() - startTime}ms` : 'N/A';

  const parts = [
    `🤖 ${llmModel}`,
    `🏷️ ${category}`,
    `⏱️ ${executionTime}`,
  ];

  return format.italic(parts.map(escapeMarkdownV2).join(' | '));
}

function formatMarkdownMessage(subject: string, sender: string, text: string, debugInfo?: DebugInfo): string {
  const debugString = debugInfo ? formatDebugInfo(debugInfo) : '';
  return [
    format.blockquote([
      format.bold(escapeMarkdownV2(subject)),
      "from: " + sender,
    ].join('\n')),
    text,
    debugString,
  ].join('\n\n');
}

function formatPlainMessage(subject: string, sender: string, text: string, debugInfo?: DebugInfo): string {
  const debugString = debugInfo ? escapeMarkdownV2(`[Debug: LLM: ${debugInfo.llmModel}, Category: ${debugInfo.category}, Time: ${debugInfo.startTime ? Date.now() - debugInfo.startTime/1000.0 : 'N/A'}s, MessageID: ${debugInfo.messageId}]`) : '';
  return [
    `${subject}`,
    `from: ${sender}`,
    '',
    text,
    '',
    debugString,
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
  debugInfo: DebugInfo,
  env: Env
): Promise<void> {
  const apiUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const escapedSubject = escapeMarkdownV2(subject);
  const escapedText = escapeMarkdownV2(text);
  const shortenedText = escapedText.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);

  // Try sending formatted message first
  const formattedMsg = formatMarkdownMessage(escapedSubject, sender, shortenedText, debugInfo);
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

    const plainMsg = formatPlainMessage(subject, sender, shortenedText, debugInfo);
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