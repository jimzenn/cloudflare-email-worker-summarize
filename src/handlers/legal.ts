import { formatLegalMessage } from "@/formatters/legal";
import { PROMPT_ANALYZE_LEGAL } from "@/prompts/legal";
import { sendPushoverNotification } from "@/services/pushover";
import { LegalDetails, LegalDetailsSchema } from "@/types/zod/legal";
import { createEmailPrompt } from "@/utils/email";
import { BaseHandler } from "./base";

export class LegalHandler extends BaseHandler<LegalDetails> {
  protected schema = LegalDetailsSchema;
  protected systemPrompt = PROMPT_ANALYZE_LEGAL;
  protected handlerName = "Legal";
  protected actionName = "LegalDetails";

  protected async getUserPrompt(): Promise<string> {
    const prompt = await createEmailPrompt(this.email, this.env);
    return `
      You are my legal advisor.
      You have expertise in the following areas:
      ${this.domainKnowledges.join("\n")}
      ${prompt}
    `;
  }

  async formatMessage(analysis: LegalDetails) {
    const message = formatLegalMessage(analysis);
    const title = `⚖️ Legal Update: ${analysis.documentType}`;

    await sendPushoverNotification(title, message, this.env);

    return {
      title,
      message,
    };
  }
}
