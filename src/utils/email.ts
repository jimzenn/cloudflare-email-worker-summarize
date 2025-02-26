import { Address, Email } from "postal-mime";
import { Env } from "@/types/env";
import { replaceWithShortenedUrls } from "@/utils/link";
import { markdownv2 as format } from "telegram-format";

export function removeRepeatedEmptyLines(text: string): string {
  return text.replace(/(\n\s*){3,}/g, '\n\n');
}

export async function createEmailPrompt(email: Email, env: Env): Promise<string> {
  const cleanText = removeRepeatedEmptyLines(email.text || '');
  const shortenedText = await replaceWithShortenedUrls(cleanText, env);
  const userPrompt = [
    `Subject: ${email.subject}`,
    `From: ${stylizedFullSender(email)}`,
    `To: ${email.to?.map((to: Address) => `${to.name} <${to.address}>`).join(', ')}`,
    shortenedText
  ].join('\n');

  return userPrompt;
}

export function stylizedFullSender(email: Email): string {
  if (!email.from.address) {
    return '(Unknown Sender)';
  }
  if (!email.from.name) { 
    return format.monospace(email.from.address);
  }
  return `${format.bold(email.from.name)} \<${format.monospace(email.from.address)}\>`;
}
