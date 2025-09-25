import PromotionSchema from "@/schemas/PromotionSchema.json";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { PromotionDetails } from "@/types/promotion";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { Email } from "postal-mime";
import { formatPromotionMessage } from "@/formatters/promotion";
import { Handler } from "@/types/handler";
import { queryLLM } from "@/services/llm";
const PROMPT_ANALYZE_PROMOTION = `
Analyze the promotional email and extract key information.

- Identify the type of promotion (credit card offer, product discount, service subscription, etc.)
- Extract all relevant details including prices, terms, and conditions
- Compare with typical market rates or prices using the provided domain knowledge
- Provide a clear verdict on whether this is a good deal
- Your recommendation should be one of the following: "RECOMMENDED", "NEUTRAL", "NOT_RECOMMENDED", "NOT_INFORMATIVE"
- The promotionItem should be a descriptive formal product name: "CitiBank Premier Credit Card", "Amazon Prime Membership", "Apple AirPods Pro", "Disney+ Subscription", etc.
- The itemDescription should be a concise description of the item being promoted, e.g. "A credit card that focuses on travel and dining.", "A membership that offers free shipping and streaming services.", "A pair of headphones with noise cancellation.", "A streaming service that offers a free trial.", etc.
- The deal should follow the following format:
    - "~" surrounded text means strikethrough formatted text, e.g. "~$100~$90 (-$10)" means "instead of $100, it is now $90". Don't use "~" for other purposes.
    - Use "≈" to indicate approximate value. e.g. "≈$100" means "approximately $100".
    - "~$100~$90 (-$10)" (i.e. $100 before deal, $90 after deal).
    - "~$100~$80/year (-$20/year)" (i.e. $100/year before deal, $80/year after deal).
    - Always convert recurring price to yearly price. For example, "~$10~$8/month (-$2/month)" should be "~$120~$96/year (-$24/year, billed annually)".
    - If the deal is a percentage off, e.g. "10% off", "20% off", etc., the deal should be formatted as "~$100~$90 (-$10)".
    - It could be also a more complex deal, e.g. "Deposit $30k & maintain 45 days, get $1000 bonus (beats x.x% APY which yields $xxx over 45 days, which means you gain $xxx compared to the market rate)".
    - If there are multiple types of deals, format them as a list. For example, montly rate and annual rate.
    - If there is no deal or no price, return an empty string.
- The pros and cons are not descriptions of the deal, but rather, you should be a financial advisor and shopping assistant, and decide whether the deal is good or not based on the features, user reviews, and the deal itself. e.g.
    - Chase Sapphire Reserve Card:
        - Pros:
            - 3x points on travel
            - 2x points on dining
            - 1x points on all other purchases
            - DoorDash credits $10/month
            - Credit card bonus points for spending $4,000 on purchases in the first 3 months
            - etc.
        - Cons:
            - $95 annual fee
            - $550 annual fee for the first year
        - thoughts:
            - The Chase Sapphire Reserve Card is a good deal for frequent travelers and dining enthusiasts.
            - The $550 annual fee for the first year is a bit high, but the deal is still good.
            - The Citi Premier Card has a lower annual fee, but it doesn't have the DoorDash credits. It offers 2x points on all purchases, which is higher than the Chase Sapphire Reserve Card.
            - Overall, the Citi Custom Cash Card + Citi Premier Card is a better deal than the Chase Sapphire Reserve Card.
        - Verdict:
            - NOT_RECOMMENDED

If any field is not applicable, return an empty string or empty array as appropriate.`;

async function analyzePromotion(
  email: Email,
  domainKnowledges: string[],
  debugInfo: DebugInfo,
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

  const { response, model } = await queryLLM(
    PROMPT_ANALYZE_PROMOTION,
    contextEnhancedPrompt,
    env,
    PromotionSchema,
    "PromotionDetails",
    true,
  );

  debugInfo.llmModel = model;

  try {
    const parsed = JSON.parse(response);
    console.log('[Promotion] Successfully parsed promotion analysis');
    return parsed;
  } catch (error) {
    console.error('[Promotion] Error parsing response:', error);
    throw error;
  }
}

export class PromotionHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }


  async handle() {
    console.log(`[Promotion] Handling ${this.email.subject || '(No subject)'}`);
    const analysis = await analyzePromotion(this.email, this.domainKnowledges, this.debugInfo, this.env);

    const message = formatPromotionMessage(analysis);

    const title = `💰 Promotion from ${analysis.vendor}`;
    await Promise.all([
      sendPushoverNotification(title, message, this.env),
      sendTelegramMessage(stylizedFullSender(this.email), title, message, this.debugInfo, this.env)
    ]);
  }
} 