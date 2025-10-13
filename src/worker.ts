import PostalMime from 'postal-mime';
import { dispatchToHandler } from '@/dispatch';
import { formatEventToCalendarEvent } from '@/formatters/event';
import { createCalendarEvent } from '@/services/calendar';
import { answerCallbackQuery } from '@/services/telegram_answer';
import { TriageError, triageEmail } from '@/triage';
import { type DebugInfo } from '@/types/debug';
import { type Env } from '@/types/env';
import { Event } from '@/types/event';

export default {
  /**
   * Handles incoming email messages.
   *
   * @param message The incoming email message.
   * @param env The environment variables.
   * @param ctx The execution context.
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      try {
        const data: { callback_query?: { data: string, id: string } } = await request.json();
        if (data.callback_query && data.callback_query.data.startsWith('add_to_calendar:')) {
          await this.handleCallbackQuery(data.callback_query, env);
        }
      } catch (error) {
        console.error('Error processing Telegram callback:', error);
      }
    }
    return new Response('OK');
  },

  async handleCallbackQuery(callbackQuery: { data: string, id: string }, env: Env): Promise<void> {
    const eventId = callbackQuery.data.split(':')[1];
    const eventData = await env.EVENT_STORE.get(eventId);

    if (eventData) {
      try {
        const event: Event = JSON.parse(eventData);
        const calendarEvent = formatEventToCalendarEvent(event);
        await createCalendarEvent(calendarEvent, env);
        await answerCallbackQuery(callbackQuery.id, 'Event added to calendar!', env);
      } catch (error) {
        console.error('Error creating calendar event:', error);
        await answerCallbackQuery(callbackQuery.id, 'Error adding event to calendar.', env);
      }
    }
  },

  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now();

    try {
      await this.handleEmail(message, env, startTime);
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      const endTime = Date.now();
      console.log(`[Worker] Processing finished in ${endTime - startTime}ms`);
    }
  },

  async handleEmail(message: ForwardableEmailMessage, env: Env, startTime: number): Promise<void> {
    const email = await PostalMime.parse(message.raw);
    const subject = email.subject || '(No subject)';

    console.log(`📥 From: ${email.from.address}, Subject: "${subject}"`);

    const { triageInfo, debugInfo: triageDebugInfo } = await triageEmail(email, env);
    const debugInfo: DebugInfo = {
      ...triageDebugInfo,
      startTime,
      messageId: message.headers.get('Message-ID') ?? undefined,
    };

    if (triageInfo.shouldDrop) {
      console.log(`[Worker] Dropping email: ${subject}`);
      return;
    }

    const { category, domainKnowledge, cleanedEmailBody } = triageInfo;

    console.log(`[Triage] ${subject} → ${JSON.stringify(triageInfo)}`);

    // Use the cleaned email body from the triage result.
    email.text = cleanedEmailBody;

    await dispatchToHandler(email, category, domainKnowledge, debugInfo, env);
  },

  /**
   * Handles errors that occur during email processing.
   * @param error The error that occurred.
   */
  handleError(error: unknown): void {
    if (error instanceof TriageError) {
      console.error(`Triage failed: ${error.message}`, {
        response: error.response,
        stack: error.stack,
      });
    } else if (error instanceof Error) {
      console.error(`Email processing failed: ${error.message}`, {
        name: error.name,
        stack: error.stack,
        cause: error.cause,
      });
    } else {
      console.error('Email processing failed with an unknown error type:', error);
    }
  },
};