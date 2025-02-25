import PromotionSchema from "@/schemas/PromotionSchema.json";
import { queryOpenAI } from "@/services/openai";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { Env } from "@/types/env";
import { PromotionDetails } from "@/types/promotion";
import { createEmailPrompt, fullSender } from "@/utils/email";
import { Email } from "postal-mime";

const PROMPT_ANALYZE_PROMOTION = `
Analyze the promotional email and extract key information.

1. Identify the type of promotion (credit card offer, product discount, service subscription, etc.)
2. Extract all relevant details including prices, terms, and conditions
3. Compare with typical market rates or prices using the provided domain knowledge
4. Provide a clear verdict on whether this is a good deal
5. Your recommendation should be one of the following: "RECOMMENDED", "NEUTRAL", "NOT_RECOMMENDED"

If any field is not applicable, return an empty string or empty array as appropriate.`;

async function analyzePromotion(
  email: Email,
  domainKnowledges: string[],
  env: Env
): Promise<PromotionDetails> {
  console.log('[Promotion] Analyzing email:', email.subject);

  const prompt = await createEmailPrompt(email, env);
  const contextEnhancedPrompt = `
  You are my personal financial advisor and shopping assistant.

  You know about the following things especially well; not only do you work in related fields, but you also have a strong interest in them.
  ${domainKnowledges.join('\n')}

  ${prompt}
`;

  const response = await queryOpenAI(
    PROMPT_ANALYZE_PROMOTION,
    contextEnhancedPrompt,
    env,
    PromotionSchema,
    "PromotionDetails"
  );

  try {
    const parsed = JSON.parse(response);
    console.log('[Promotion] Successfully parsed promotion analysis');
    return parsed;
  } catch (error) {
    console.error('[Promotion] Error parsing response:', error);
    throw error;
  }
}

export class PromotionHandler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private env: Env
  ) {}

  async handle() {
    console.log(`[Promotion] Handling ${this.email.subject || '(No subject)'}`);
    const analysis = await analyzePromotion(this.email, this.domainKnowledges, this.env);
    
    const title = `💰 ${analysis.promotionType}: ${analysis.vendor}`;
    const verdict = analysis.recommendation === "RECOMMENDED" ? "✅" : 
                   analysis.recommendation === "NOT_RECOMMENDED" ? "❌" : "⚖️";
    
    const message = `*${title}*\n\n` +
      `${analysis.items.map(item => `• ${item}`).join('\n')}\n\n` +
      `*Verdict:* ${verdict} ${analysis.verdict}`;

    await Promise.all([
      sendPushoverNotification(title, message, this.env),
      sendTelegramMessage(fullSender(this.email), title, message, this.env)
    ]);
  }
} 