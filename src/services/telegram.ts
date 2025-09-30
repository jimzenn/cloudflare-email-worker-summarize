import { Env } from '@/types/env';
import { DebugInfo } from '@/types/debug';
import { markdownv2 as format } from 'telegram-format';

const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export class TelegramError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TelegramError';
  }
}

function escapeParenthesesAndBrackets(text: string): string {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: string[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(linkPattern)) {
    const beforeLink = text.slice(lastIndex, match.index).replace(/(?<!\\)[\[\]()]/g, '\\$&');
    parts.push(beforeLink);
    parts.push(match[0]);
    lastIndex = (match.index ?? 0) + match[0].length;
  }
  parts.push(text.slice(lastIndex).replace(/(?<!\\)[\[\]()]/g, '\\$&'));
  return parts.join('');
}

export function escapeMarkdownV2(text: string): string {
  const specialChars = /(?<!\\)[><#+={}.!\-|]/g;
  const escapedText = text
    .replace(/\|\|/g, '__TELEGRAM_DOUBLE_PIPE__')
    .replace(specialChars, '\\$&')
    .replace(/__TELEGRAM_DOUBLE_PIPE__/g, '||');
  return escapeParenthesesAndBrackets(escapedText);
}

function formatDebugInfo(debugInfo: DebugInfo): string {
  const { llmModel, category, startTime } = debugInfo;
  const executionTime = startTime ? `${(Date.now() - startTime) / 1000.0}s` : 'N/A';
  const parts = [`🤖 ${llmModel}`, `🏷️ ${category}`, `⏱️ ${executionTime}`];
  return format.italic(parts.map(escapeMarkdownV2).join(' \\| '));
}

function formatMarkdownBrief(text: string, debugInfo?: DebugInfo): string {
  const debugString = debugInfo ? formatDebugInfo(debugInfo) : '';
  return [text, debugString].join('\n\n');
}

function formatPlainBrief(text: string, debugInfo?: DebugInfo): string {
  const debugString = debugInfo
    ? `[Debug: LLM: ${debugInfo.llmModel}, Category: ${debugInfo.category}, Time: ${
        debugInfo.startTime ? (Date.now() - debugInfo.startTime) / 1000.0 : 'N/A'
      }s, MessageID: ${debugInfo.messageId}]`
    : '';
  return [text, '', debugString].join('\n');
}

function formatMarkdownMessage(subject: string, sender: string, text: string, debugInfo?: DebugInfo): string {
  const debugString = debugInfo ? formatDebugInfo(debugInfo) : '';
  return [
    format.blockquote([format.bold(escapeMarkdownV2(subject)), "from: " + sender].join('\n')),
    text,
    debugString,
  ].join('\n\n');
}

function formatPlainMessage(subject: string, sender: string, text: string, debugInfo?: DebugInfo): string {
  const debugString = debugInfo
    ? `[Debug: LLM: ${debugInfo.llmModel}, Category: ${debugInfo.category}, Time: ${
        debugInfo.startTime ? (Date.now() - debugInfo.startTime) / 1000.0 : 'N/A'
      }s, MessageID: ${debugInfo.messageId}]`
    : '';
  return [subject, `from: ${sender}`, '', text, '', debugString].join('\n');
}

async function send(
  env: Env,
  formattedMsg: string,
  plainMsg: string,
  logMessage: string
): Promise<void> {
  const apiUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  console.log(`[Telegram] Sending ${logMessage}:`, formattedMsg);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_TO_CHAT_ID, text: formattedMsg, parse_mode: 'MarkdownV2' }),
  });

  if (response.ok) {
    console.log(`[Telegram] Successfully sent ${logMessage}`);
    return;
  }

  const errorData = await response.json().catch(() => null);
  console.error(`[Telegram] API error for ${logMessage}:`, {
    status: response.status,
    statusText: response.statusText,
    errorData,
  });

  console.log(`[Telegram] Retrying with plain text for ${logMessage}...`);
  const retryResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_TO_CHAT_ID, text: plainMsg }),
  });

  if (!retryResponse.ok) {
    const retryErrorData = await retryResponse.json().catch(() => null);
    console.error(`[Telegram] API retry error for ${logMessage}:`, {
      status: retryResponse.status,
      statusText: retryResponse.statusText,
      errorData: retryErrorData,
    });
    throw new TelegramError(`Failed to send ${logMessage} after retry`, retryErrorData);
  }
  console.log(`[Telegram] Successfully sent ${logMessage} on retry`);
}

export async function sendTelegramBrief(text: string, debugInfo: DebugInfo, env: Env): Promise<void> {
  const escapedText = escapeMarkdownV2(text);
  const shortenedText = escapedText.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);
  const formattedMsg = formatMarkdownBrief(shortenedText, debugInfo);
  const plainMsg = formatPlainBrief(text.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH), debugInfo);
  await send(env, formattedMsg, plainMsg, 'brief');
}

export async function sendTelegramMessage(
  sender: string,
  subject: string,
  text: string,
  debugInfo: DebugInfo,
  env: Env
): Promise<void> {
  const escapedSubject = escapeMarkdownV2(subject);
  const escapedText = escapeMarkdownV2(text);
  const shortenedText = escapedText.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);
  const formattedMsg = formatMarkdownMessage(escapedSubject, sender, shortenedText, debugInfo);
  const plainMsg = formatPlainMessage(subject, sender, text.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH), debugInfo);
  await send(env, formattedMsg, plainMsg, `message "${subject}"`);
}
