import { formatEvent } from "@/formatters/event";
import { PROMPT_EXTRACT_EVENT_INFO } from "@/prompts/event";
import EventSchema from "@/schemas/EventSchema.json";
import { sendTelegramMessage } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Event } from "@/types/event";
import { Handler } from "@/types/handler";
import { stylizedFullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export class EventHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Event] Handling email: "${subject}"`);

    try {
      const { data: event, model } = await extractInformation<Event>(
        this.email,
        PROMPT_EXTRACT_EVENT_INFO,
        EventSchema,
        "Event",
        this.env
      );
      this.debugInfo.llmModel = model;

      const message = formatEvent(event);
      const title = `🗓️ ${event.name}`;

      console.log('[Event] Formatted event:', message);

      const eventId = crypto.randomUUID();
      await this.env.EVENT_STORE.put(eventId, JSON.stringify(event));

      await sendTelegramMessage(
        stylizedFullSender(this.email),
        title,
        message,
        this.debugInfo,
        this.env,
        [{ text: "Add to Calendar", callback_data: `add_to_calendar:${eventId}` }]
      );

      console.log(`[Event] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Event] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
}