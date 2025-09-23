import { Env } from "@/types/env";
import { Email } from "postal-mime";
import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from "@/prompts/actions";
import { queryGemini } from "@/services/gemini";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { sendTelegramMessage } from "@/services/telegram";
import SummarizeSchema from "@/schemas/SummarizeSchema.json";
import { Handler } from "@/types/handler";
import { SummarizeResponse } from "@/types/summarize";
import { DebugInfo } from "@/types/debug";

export class SummarizeHandler implements Handler {
  constructor(private email: Email, private domainKnowledges: string[], private debugInfo: DebugInfo, private env: Env) { }

  async handle() {
    console.log(`[Summarize] Handling ${this.email.subject || '(No subject)'}`);
    
    const { response, model } = await queryGemini(
      PROMPT_SUMMARIZE_MARKDOWN_V2,
      await createEmailPrompt(this.email, this.env),
      this.env,
      SummarizeSchema,
      "SummarizeResponse"
    );

    const parsed: SummarizeResponse = JSON.parse(response);
    const summary = parsed.summary;
    const summarizedTitle = parsed.summarized_title;

    this.debugInfo.llmModel = model;

    await sendTelegramMessage(stylizedFullSender(this.email), summarizedTitle, summary, this.debugInfo, this.env);
  }
}