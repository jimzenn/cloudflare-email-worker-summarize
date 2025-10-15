import { formatPromotionMessage } from "@/formatters/promotion";
import { PROMPT_ANALYZE_PROMOTION } from "@/prompts/promotion";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { PromotionDetails, PromotionDetailsSchema } from "@/types/zod/promotion";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { BaseHandler } from "./base";

export class PromotionHandler extends BaseHandler<PromotionDetails> {
  protected schema = PromotionDetailsSchema;
  protected systemPrompt = PROMPT_ANALYZE_PROMOTION;
  protected handlerName = "Promotion";
  protected actionName = "PromotionDetails";

  protected async getUserPrompt(): Promise<string> {
    const prompt = await createEmailPrompt(this.email, this.env);
    return `
      You are my personal financial advisor and shopping assistant.
      You know about the following things especially well; not only do you work in related fields, but you also have a strong interest in them.
      ${this.domainKnowledges.join("\n")}
      ${prompt}
    `;
  }

  protected async sendMessage(analysis: PromotionDetails) {
    const { title, message } = await this.formatMessage(analysis);

    const notificationPromises = [
      sendPushoverNotification(title, message, this.env),
    ];

    const shouldSendTelegram = analysis.items.some(
      (item) => item.verdict === 'RECOMMENDED' || item.verdict === 'NEUTRAL'
    );

    if (shouldSendTelegram) {
      console.log(
        '[Promotion] Sending Telegram message because at least one item is RECOMMENDED or NEUTRAL'
      );
      notificationPromises.push(
        sendTelegramMessage(
          stylizedFullSender(this.email),
          title,
          message,
          this.debugInfo,
          this.env
        )
      );
    } else {
      console.log(
        '[Promotion] Not sending Telegram message because no items are RECOMMENDED or NEUTRAL'
      );
    }

    await Promise.all(notificationPromises);
  }

  protected async formatMessage(analysis: PromotionDetails) {
    const message = formatPromotionMessage(analysis);
    const title = `💰 Promotion from ${analysis.vendor}`;

    return {
      title,
      message,
    };
  }
}
