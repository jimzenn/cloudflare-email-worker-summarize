import { Env } from "@/types/env";
import { Email } from "postal-mime";
import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from "@/prompts/actions";
import { queryLLM } from "@/services/llm";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { sendTelegramMessage } from "@/services/telegram";
import SummarizeSchema from "@/schemas/SummarizeSchema.json";
import { Handler } from "@/types/handler";
import { SummarizeResponse } from "@/types/summarize";
import { DebugInfo } from "@/types/debug";

export class SummarizeHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Summarize] Handling email: "${subject}"`);

    try {
      const { response, model } = await queryLLM(
        PROMPT_SUMMARIZE_MARKDOWN_V2,
        await createEmailPrompt(this.email, this.env),
        this.env,
        SummarizeSchema,
        "SummarizeResponse",
        false, // reasoning
        'gemini' // provider
      );

      const parsed: SummarizeResponse = JSON.parse(response);
      const summary = parsed.summary;
      const summarizedTitle = parsed.summarized_title;

      this.debugInfo.llmModel = model;

      await sendTelegramMessage(
        stylizedFullSender(this.email),
        summarizedTitle,
        summary,
        this.debugInfo,
        this.env
      );

      console.log(`[Summarize] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Summarize] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
}