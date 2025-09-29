import LegalSchema from "@/schemas/LegalSchema.json";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { LegalDetails } from "@/types/legal";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { Email } from "postal-mime";
import { formatLegalMessage } from "@/formatters/legal";
import { Handler } from "@/types/handler";
import { queryLLM } from "@/services/llm";

const PROMPT_ANALYZE_LEGAL = `
You are a lawyer and my legal advisor. Your task is to analyze legal documents sent via email, such as updates to terms of service or privacy policies.

- Identify the type of legal document.
- Summarize the key points and any changes from previous versions.
- Assess the potential impact of these changes on me, the user.
- Provide a clear recommendation on what action, if any, I should take.
- Think like a lawyer and provide a professional analysis.
`;

async function analyzeLegal(
  email: Email,
  domainKnowledges: string[],
  debugInfo: DebugInfo,
  env: Env
): Promise<LegalDetails> {
  console.log('[Legal] Analyzing email:', email.subject);

  const prompt = await createEmailPrompt(email, env);
  const contextEnhancedPrompt = `
  You are my legal advisor.

  You have expertise in the following areas:
  ${domainKnowledges.join('\n')}

  ${prompt}
`;

  const { response, model } = await queryLLM(
    PROMPT_ANALYZE_LEGAL,
    contextEnhancedPrompt,
    env,
    LegalSchema,
    "LegalDetails",
    true,
  );

  debugInfo.llmModel = model;

  try {
    const parsed = JSON.parse(response);
    console.log('[Legal] Successfully parsed legal analysis');
    return parsed;
  } catch (error) {
    console.error('[Legal] Error parsing response:', error);
    throw error;
  }
}

export class LegalHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }


  async handle() {
    console.log(`[Legal] Handling ${this.email.subject || '(No subject)'}`);
    const analysis = await analyzeLegal(this.email, this.domainKnowledges, this.debugInfo, this.env);

    const message = formatLegalMessage(analysis);

    const title = `⚖️ Legal Update: ${analysis.documentType}`;
    await Promise.all([
      sendPushoverNotification(title, message, this.env),
      sendTelegramMessage(stylizedFullSender(this.email), title, message, this.debugInfo, this.env)
    ]);
  }
}