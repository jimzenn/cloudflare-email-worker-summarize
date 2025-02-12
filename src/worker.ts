import PostalMime from 'postal-mime';
import { dispatchToHandler } from './handlerDispatcher';
import { PROMPT_TRIAGE } from './prompts/triage';
import { queryOpenAI } from './services/openai';
import { sendPushoverNotification } from './services/pushover';
import { Env } from './types/env';
import { TriageResponse as TriageInfo } from './types/triageResponse';
import { createEmailPrompt } from './utils/email';

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const email = await PostalMime.parse(message.raw);

      console.log(`📥 From: ${email.from.address}, Subject: "${email.subject}"`);

      const triageResponse = await queryOpenAI(
        PROMPT_TRIAGE,
        await createEmailPrompt(email, env),
        env
      );

      let triageInfo: TriageInfo;
      try {
        triageInfo = JSON.parse(triageResponse);
        
        const category = triageInfo.category;
        const domainKnowledges = triageInfo.domain_knowledge;

        console.log(`[Triage] ${email.subject} → ${JSON.stringify(triageInfo)}`);

        dispatchToHandler(email, category, domainKnowledges, env);
      } catch (parseError) {
        console.error('Failed to parse triage response:', triageResponse);
      }


    } catch (error) {
      console.error('Email processing failed:', error);
      throw error;
    }
  },
};