import PostalMime from 'postal-mime';
import { replaceWithShortenedUrls } from './utils/link';
import { sendPushoverNotification } from './utils/pushover';
import { sendTelegramMessage } from './utils/telegram';
import { Env } from './types/env';
import { PROMPT_MARKDOWN_V2_SUMMARIZE } from './prompts/emailBulter';
import { queryOpenAI } from './utils/openai';

export function removeRepeatedEmptyLines(text: string): string {
  return text.replace(/(\n\s*){3,}/g, '\n\n');
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const email = await PostalMime.parse(message.raw);

      console.log(`📥 From: ${email.from.address}, Subject: "${email.subject}"`);

      const sender = email.from.address || 'unknown';

      const cleanText = removeRepeatedEmptyLines(email.text || '');
      const shortenedText = await replaceWithShortenedUrls(cleanText, env);
      const userPrompt = [
        `Subject: ${email.subject}`,
        `From: ${email.from.name} <${email.from.address}>`,
        `To: ${email.to.map((to: { name: string, address: string }) => `${to.name} <${to.address}>`).join(', ')}`,
        shortenedText
      ].join('\n');
      const summary = await queryOpenAI(
        PROMPT_MARKDOWN_V2_SUMMARIZE,
        userPrompt,
        env
      );

      await Promise.all([
        sendPushoverNotification(email.subject, summary, env),
        sendTelegramMessage(sender, email.subject, summary, env),
      ]);

    } catch (error) {
      console.error('Email processing failed:', error);
      throw error;
    }
  },
};