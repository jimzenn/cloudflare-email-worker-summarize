import { Env } from "../types/env";
import { replaceWithShortenedUrls } from "./link";
import { ForwardableEmailMessage } from "postal-mime";

export function removeRepeatedEmptyLines(text: string): string {
    return text.replace(/(\n\s*){3,}/g, '\n\n');
  }
  

export async function createEmailPrompt(email: ForwardableEmailMessage, env: Env): Promise<string> {
  const cleanText = removeRepeatedEmptyLines(email.text || '');
  const shortenedText = await replaceWithShortenedUrls(cleanText, env);
  const userPrompt = [
    `Subject: ${email.subject}`,
    `From: ${email.from.name} <${email.from.address}>`,
    `To: ${email.to.map((to: { name: string, address: string }) => `${to.name} <${to.address}>`).join(', ')}`,
    shortenedText
  ].join('\n');

  return userPrompt;
}
