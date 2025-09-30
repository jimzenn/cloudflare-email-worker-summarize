import { BillHandler } from '@/handlers/bill';
import { FlightHandler } from '@/handlers/flight';
import { HotelHandler } from '@/handlers/hotel';
import { LegalHandler } from '@/handlers/legal';
import { NotificationHandler } from '@/handlers/notification';
import { PromotionHandler } from '@/handlers/promotion';
import { SummarizeHandler } from '@/handlers/summarize';
import { VerificationHandler } from '@/handlers/verification';
import { type DebugInfo } from '@/types/debug';
import { type Env } from '@/types/env';
import { type HandlerConstructor } from '@/types/handler';
import { type Email } from 'postal-mime';

const handlerMap: Record<string, readonly HandlerConstructor[]> = {
  flight: [FlightHandler],
  bill: [BillHandler],
  verification: [VerificationHandler],
  hotel: [HotelHandler],
  stay: [HotelHandler],
  experience: [SummarizeHandler],
  promotion: [PromotionHandler],
  notification: [NotificationHandler],
  legal: [LegalHandler],
  default: [SummarizeHandler],
};

/**
 * Dispatches an email to the appropriate handler based on its category.
 *
 * @param email The email to dispatch.
 * @param category The category of the email.
 * @param domainKnowledge An array of domain-specific knowledge related to the email.
 * @param debugInfo Debug information for the email.
 * @param env The environment variables.
 */
export async function dispatchToHandler(
  email: Email,
  category: string,
  domainKnowledge: string[],
  debugInfo: DebugInfo,
  env: Env,
) {
  console.log(`[📨Dispatcher] Dispatching to handlers for category: ${category}`);

  const handlers = handlerMap[category] ?? handlerMap.default;

  console.log(`[📨Dispatcher] Using handlers: ${handlers.map((h) => h.name).join(', ')}`);

  await Promise.all(
    handlers.map(async (HandlerClass) => {
      const handler = new HandlerClass(email, domainKnowledge, debugInfo, env);
      await handler.handle();
    }),
  );
}
