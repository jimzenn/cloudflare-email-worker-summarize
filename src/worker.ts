import PostalMime from 'postal-mime';
import { dispatchToHandler } from '@/dispatch';
import { Env } from '@/types/env';
import { triageEmail } from '@/triage';
import { DebugInfo } from './types/debug';

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now();
    let debugInfo: DebugInfo = {};

    try {
      const email = await PostalMime.parse(message.raw);

      console.log(`📥 From: ${email.from.address}, Subject: "${email.subject}"`);

      const { triageInfo, debugInfo: triageDebugInfo } = await triageEmail(email, env);
      debugInfo = { ...triageDebugInfo, startTime };

      const category = triageInfo.category;
      const domainKnowledges = triageInfo.domainKnowledge;

      console.log(`[Triage] ${email.subject || '(No subject)'} → ${JSON.stringify(triageInfo)}`);

      email.text = triageInfo.cleaneEmailBody;

      await dispatchToHandler(email, category, domainKnowledges, debugInfo, env);
    } catch (error) {
      console.error('Email processing failed:', error);
      throw error;
    } finally {
      const endTime = Date.now();
      console.log(`[Worker] Processing finished in ${endTime - startTime}ms`);
    }
  },
};