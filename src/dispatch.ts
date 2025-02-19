import { Email } from "postal-mime";
import { FlightHandler } from "@/handlers/flight";
import { VerificationHandler } from "@/handlers/verification";
import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from "@/prompts/actions";
import { queryOpenAI } from "@/services/openai";
import { sendTelegramMessage } from "@/services/telegram";
import { Env } from "@/types/env";
import { createEmailPrompt } from "@/utils/email";

export async function dispatchToHandler(email: Email, category: string, domainKnowledges: string[], env: Env) {
  console.log(`[📨Dispatcher] Dispatching to handler: ${category}`);
  if (category === "flight") {
    const flightHandler = new FlightHandler(email, domainKnowledges, env);
    await flightHandler.handle();
  }
  else if (category === "verification") {
    const verificationHandler = new VerificationHandler(email, domainKnowledges, env);
    await verificationHandler.handle();
  }
  else {
    const sender = email.from.address || 'unknown';
    const userPrompt = await createEmailPrompt(email, env);
    const summary = await queryOpenAI(
      PROMPT_SUMMARIZE_MARKDOWN_V2,
      userPrompt,
      env
    );

    await sendTelegramMessage(sender, email.subject || '(No subject)', summary, env);
  }
}
