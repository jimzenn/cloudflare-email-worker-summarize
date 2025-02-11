import PostalMime from 'postal-mime';
import { replaceWithShortenedUrls } from './utils/link';
import { sendPushoverNotification } from './utils/pushover';
import { sendTelegramMessage } from './utils/telegram';
import { Env } from './types/env';
import { isEmailAllowed } from './utils/email';

export function removeRepeatedEmptyLines(text: string): string {
  return text.replace(/(\n\s*){3,}/g, '\n\n');
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const email = await PostalMime.parse(message.raw);

      const sender = email.from.address || 'unknown';

      const validation = isEmailAllowed(sender, env);
      if (!validation.allowed) {
        console.log(`Blocked email from: ${validation.originalSender}, Subject: "${email.subject}"`);
        return;
      }

      const cleanText = removeRepeatedEmptyLines(email.text || '');
      const shortenedText = await replaceWithShortenedUrls(cleanText, env);

      await Promise.all([
        sendPushoverNotification(email.subject, shortenedText, env),
        sendTelegramMessage(shortenedText, env),
      ]);

    } catch (error) {
      console.error('Email processing failed:', error);
      throw error;
    }
  },
};