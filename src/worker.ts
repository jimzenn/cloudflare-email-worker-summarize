import PostalMime from 'postal-mime';
import { dispatchToHandler } from '@/dispatch';
import { Env } from '@/types/env';
import { triageEmail } from '@/triage';

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const email = await PostalMime.parse(message.raw);

      console.log(`📥 From: ${email.from.address}, Subject: "${email.subject}"`);

      const triageInfo = await triageEmail(email, env);
      const category = triageInfo.category;
      const domainKnowledges = triageInfo.domain_knowledge;

      console.log(`[Triage] ${email.subject || '(No subject)'} → ${JSON.stringify(triageInfo)}`);

      dispatchToHandler(email, category, domainKnowledges, env);
    } catch (error) {
      console.error('Email processing failed:', error);
      throw error;
    }
  },
};