import PostalMime from 'postal-mime';
import { emailHandlerDispatcher } from './handlerDispatcher';
import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from './prompts/actions';
import { PROMPT_TRIAGE } from './prompts/triage';
import { queryOpenAI } from './services/openai';
import { sendPushoverNotification } from './services/pushover';
import { sendTelegramMessage } from './services/telegram';
import { Env } from './types/env';
import { TriageResponse as TriageInfo } from './types/triageResponse';
import { replaceWithShortenedUrls } from './utils/link';

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

      const triageResponse = await queryOpenAI(
        PROMPT_TRIAGE,
        userPrompt,
        env
      );

      let triageInfo: TriageInfo;
      try {
        triageInfo = JSON.parse(triageResponse);
        const category = triageInfo.category;
        const domainKnowledges = triageInfo.domain_knowledge;
        sendPushoverNotification(email.subject, JSON.stringify(triageInfo), env);
        console.log(`[Triage] ${email.subject} → ${JSON.stringify(triageInfo)}`);
        emailHandlerDispatcher(email, category, domainKnowledges, env);
      } catch (parseError) {
        console.error('Failed to parse triage response:', triageResponse);
      }

      const summary = await queryOpenAI(
        PROMPT_SUMMARIZE_MARKDOWN_V2,
        userPrompt,
        env
      );

      await sendTelegramMessage(sender, email.subject, summary, env);

    } catch (error) {
      console.error('Email processing failed:', error);
      throw error;
    }
  },
};