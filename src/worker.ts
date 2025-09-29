import PostalMime from 'postal-mime';
import { dispatchToHandler } from '@/dispatch';
import { TriageError, triageEmail } from '@/triage';
import { type DebugInfo } from '@/types/debug';
import { type Env } from '@/types/env';

export default {
  /**
   * Handles incoming email messages.
   *
   * @param message The incoming email message.
   * @param env The environment variables.
   * @param ctx The execution context.
   */
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now();
    let debugInfo: DebugInfo = {};

    try {
      const email = await PostalMime.parse(message.raw);
      const subject = email.subject || '(No subject)';

      console.log(`📥 From: ${email.from.address}, Subject: "${subject}"`);

      const { triageInfo, debugInfo: triageDebugInfo } = await triageEmail(email, env);
      debugInfo = {
        ...triageDebugInfo,
        startTime,
        messageId: message.headers.get('Message-ID') ?? undefined,
      };

      if (triageInfo.shouldDrop) {
        console.log(`[Worker] Dropping email: ${subject}`);
        return;
      }

      const { category, domainKnowledge, cleanedEmailBody } = triageInfo;

      console.log(`[Triage] ${subject} → ${JSON.stringify(triageInfo)}`);

      // Use the cleaned email body from the triage result.
      email.text = cleanedEmailBody;

      await dispatchToHandler(email, category, domainKnowledge, debugInfo, env);
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      const endTime = Date.now();
      console.log(`[Worker] Processing finished in ${endTime - startTime}ms`);
    }
  },

  /**
   * Handles errors that occur during email processing.
   * @param error The error that occurred.
   */
  handleError(error: unknown): void {
    if (error instanceof TriageError) {
      console.error('Triage failed:', {
        message: error.message,
        response: error.response,
        stack: error.stack,
      });
    } else if (error instanceof Error) {
      console.error('Email processing failed:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });
    } else {
      console.error('Email processing failed with an unknown error type:', error);
    }
  },
};