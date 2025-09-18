import { Env } from "@/types/env";
import { Email } from "postal-mime";
import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from "@/prompts/actions";
import { queryGemini } from "@/services/gemini";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { sendTelegramMessage } from "@/services/telegram";
import SummarizeSchema from "@/schemas/SummarizeSchema.json";
import { Handler } from "@/types/handler";

export class SummarizeHandler implements Handler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Summarize] Handling ${this.email.subject || '(No subject)'}`);
    
    const summaryResponse = await queryGemini(
      PROMPT_SUMMARIZE_MARKDOWN_V2,
      await createEmailPrompt(this.email, this.env),
      this.env,
      SummarizeSchema,
      "SummarizeResponse"
    );

    const parsed = JSON.parse(summaryResponse);
    const summary = parsed.summary;
    const additionalNotes = parsed.additional_notes;

    await sendTelegramMessage(stylizedFullSender(this.email), this.email.subject || '(No subject)', summary, this.env);
  }
}