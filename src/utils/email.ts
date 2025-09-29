import { type Address, type Email } from 'postal-mime';
import { type Env } from '@/types/env';
import { replaceWithShortenedUrls } from '@/utils/link';
import { markdownv2 as format } from 'telegram-format';
import { escapeMarkdownV2 } from '@/services/telegram';

/**
 * Removes repeated empty lines from a string, keeping a maximum of one empty line.
 * @param text The input string.
 * @returns The string with repeated empty lines removed.
 */
export function removeRepeatedEmptyLines(text: string): string {
  return text.replace(/(\n\s*){3,}/g, '\n\n');
}

export async function createEmailPrompt(email: Email, env: Env): Promise<string> {
  const cleanText = removeRepeatedEmptyLines(email.text || '');
  const shortenedText = await replaceWithShortenedUrls(cleanText, env);

  const userPromptLines = [`Subject: ${email.subject}`, `From: ${stylizedFullSender(email)}`];

  if (email.to && email.to.length > 0) {
    const toRecipients = email.to.map((to: Address) => `${to.name} <${to.address}>`).join(', ');
    userPromptLines.push(`To: ${toRecipients}`);
  }

  userPromptLines.push(shortenedText);

  return userPromptLines.join('\n');
}

export function stylizedFullSender(email: Email): string {
  const { name, address } = email.from;

  if (!address) {
    return '(Unknown Sender)';
  }
  if (!name) {
    return format.monospace(address);
  }
  return `${format.bold(escapeMarkdownV2(name))} \\<${format.monospace(address)}\\>`;
}
