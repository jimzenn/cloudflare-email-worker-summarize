import { ForwardableEmailMessage } from "postal-mime";
import { Env } from "./types/env";
import { FlightHandler } from "./handlers/flight";
import { queryOpenAI } from "./services/openai";
import { sendTelegramMessage } from "./services/telegram";
import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from "./prompts/actions";
import { createEmailPrompt } from "./utils/email";

export async function dispatchToHandler(email: ForwardableEmailMessage, category: string, domainKnowledges: string[], env: Env) {
  if (category === "flight") {
    const flightHandler = new FlightHandler(email, domainKnowledges, env);
    await flightHandler.handle();
  } else {
    const sender = email.from.address || 'unknown';
    const userPrompt = await createEmailPrompt(email, env);
    const summary = await queryOpenAI(
      PROMPT_SUMMARIZE_MARKDOWN_V2,
      userPrompt,
      env
    );

    await sendTelegramMessage(sender, email.subject, summary, env);
  }
}