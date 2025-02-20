import { Env } from "@/types/env";
import { Email } from "postal-mime";
import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from "@/prompts/actions";
import { queryOpenAI } from "@/services/openai";
import { createEmailPrompt } from "@/utils/email";
import { sendTelegramMessage } from "@/services/telegram";
import SummarizeSchema from "@/schemas/SummarizeSchema.json";

export class SummarizeHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Summarize] Handling ${this.email.subject || '(No subject)'}`);
    
    const summaryResponse = await queryOpenAI(
      PROMPT_SUMMARIZE_MARKDOWN_V2,
      await createEmailPrompt(this.email, this.env),
      this.env,
      SummarizeSchema,
      "SummarizeResponse"
    );

    const parsed = JSON.parse(summaryResponse);
    const summary = parsed.summary;
    const additionalNotes = parsed.additional_notes;

    await sendTelegramMessage(this.email.from.address || 'unknown', this.email.subject || '(No subject)', summary, this.env);
  }
}