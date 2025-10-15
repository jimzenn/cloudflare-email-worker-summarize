import { formatEvent } from "@/formatters/event";
import { PROMPT_EXTRACT_EVENT_INFO } from "@/prompts/event";
import { Event, EventSchema } from "@/types/zod/event";
import { BaseHandler } from "./base";

export class EventHandler extends BaseHandler<Event> {
  protected schema = EventSchema;
  protected systemPrompt = PROMPT_EXTRACT_EVENT_INFO;
  protected handlerName = "Event";
  protected actionName = "Event";

  async formatMessage(event: Event) {
    const message = formatEvent(event);
    const title = `🗓️ ${event.name}`;

    const eventId = crypto.randomUUID();
    await this.env.EVENT_STORE.put(eventId, JSON.stringify(event));

    return {
      title,
      message,
      options: {
        inline_keyboard: [[{ text: "Add to Calendar", callback_data: `add_to_calendar:${eventId}` }]],
      },
    };
  }
}
