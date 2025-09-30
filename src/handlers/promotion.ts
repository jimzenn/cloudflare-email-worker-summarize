import { formatPromotionMessage } from "@/formatters/promotion";
import { PROMPT_ANALYZE_PROMOTION } from "@/prompts/promotion";
import PromotionSchema from "@/schemas/PromotionSchema.json";
import { queryLLM } from "@/services/llm";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { PromotionDetails } from "@/types/promotion";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { Email } from "postal-mime";

export class PromotionHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  private async analyzePromotion(): Promise<PromotionDetails> {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Promotion] Analyzing email: "${subject}"`);

    const prompt = await createEmailPrompt(this.email, this.env);
    const contextEnhancedPrompt = `
      You are my personal financial advisor and shopping assistant.
      You know about the following things especially well; not only do you work in related fields, but you also have a strong interest in them.
      ${this.domainKnowledges.join('\n')}
      ${prompt}
    `;

    const { response, model } = await queryLLM(
      PROMPT_ANALYZE_PROMOTION,
      contextEnhancedPrompt,
      this.env,
      PromotionSchema,
      "PromotionDetails",
      true
    );

    this.debugInfo.llmModel = model;

    try {
      const parsed = JSON.parse(response);
      console.log('[Promotion] Successfully parsed promotion analysis');
      return parsed;
    } catch (error) {
      console.error('[Promotion] Error parsing response:', error);
      throw error;
    }
  }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Promotion] Handling email: "${subject}"`);

    try {
      const analysis = await this.analyzePromotion();
      const message = formatPromotionMessage(analysis);
      const title = `💰 Promotion from ${analysis.vendor}`;

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

      console.log(`[Promotion] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Promotion] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
} 