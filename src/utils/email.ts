import { Address, Email } from "postal-mime";
import { Env } from "@/types/env";
import { replaceWithShortenedUrls } from "@/utils/link";

export function removeRepeatedEmptyLines(text: string): string {
  return text.replace(/(\n\s*){3,}/g, '\n\n');
}

export async function createEmailPrompt(email: Email, env: Env): Promise<string> {
  const cleanText = removeRepeatedEmptyLines(email.text || '');
  const shortenedText = await replaceWithShortenedUrls(cleanText, env);
  const userPrompt = [
    `Subject: ${email.subject}`,
    `From: ${fullSender(email)}`,
    `To: ${email.to?.map((to: Address) => `${to.name} <${to.address}>`).join(', ')}`,
    shortenedText
  ].join('\n');

  return userPrompt;
}

export function fullSender(email: Email): string {
  return `${email.from.name} <${email.from.address}>`;
}
