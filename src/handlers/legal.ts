import { formatLegalMessage } from "@/formatters/legal";
import { PROMPT_ANALYZE_LEGAL } from "@/prompts/legal";
import LegalSchema from "@/schemas/LegalSchema.json";
import { queryLLM } from "@/services/llm";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { LegalDetails } from "@/types/legal";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { Email } from "postal-mime";

export class LegalHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  private async analyzeLegal(): Promise<LegalDetails> {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Legal] Analyzing email: "${subject}"`);

    const prompt = await createEmailPrompt(this.email, this.env);
    const contextEnhancedPrompt = `
      You are my legal advisor.
      You have expertise in the following areas:
      ${this.domainKnowledges.join('\n')}
      ${prompt}
    `;

    const { response, model } = await queryLLM(
      PROMPT_ANALYZE_LEGAL,
      contextEnhancedPrompt,
      this.env,
      LegalSchema,
      "LegalDetails",
      true
    );

    this.debugInfo.llmModel = model;

    try {
      const parsed = JSON.parse(response);
      console.log('[Legal] Successfully parsed legal analysis');
      return parsed;
    } catch (error) {
      console.error('[Legal] Error parsing response:', error);
      throw error;
    }
  }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Legal] Handling email: "${subject}"`);

    try {
      const analysis = await this.analyzeLegal();
      const message = formatLegalMessage(analysis);
      const title = `⚖️ Legal Update: ${analysis.documentType}`;

      await Promise.all([
        sendPushoverNotification(title, message, this.env),
        sendTelegramMessage(
          stylizedFullSender(this.email),
          title,
          message,
          this.debugInfo,
          this.env
        ),
      ]);

      console.log(`[Legal] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Legal] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
}