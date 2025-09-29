import { Email } from "postal-mime";
import { FlightHandler } from "@/handlers/flight";
import { VerificationHandler } from "@/handlers/verification";
import { Env } from "@/types/env";
import { SummarizeHandler } from "./handlers/summarize";
import { BillHandler } from "./handlers/bill";
import { HotelHandler } from "@/handlers/hotel";
import { NotificationHandler } from "@/handlers/notification";
import { PromotionHandler } from "@/handlers/promotion";
import { DebugInfo } from "@/types/debug";
import { HandlerConstructor } from "@/types/handler";
import { LegalHandler } from "@/handlers/legal";

const handlerMap: Record<string, HandlerConstructor[]> = {
  flight: [FlightHandler],
  bill: [BillHandler],
  verification: [VerificationHandler],
  hotel: [HotelHandler],
  promotion: [PromotionHandler],
  notification: [NotificationHandler],
  legal: [LegalHandler],
  default: [SummarizeHandler],
} as const;

export async function dispatchToHandler(email: Email, category: string, domainKnowledges: string[], debugInfo: DebugInfo, env: Env) {
  console.log(`[📨Dispatcher] Dispatching to handlers for category: ${category}`);
  
  const handlers = handlerMap[category] || handlerMap.default;
  
  await Promise.all(handlers.map(async (HandlerClass) => {
    const handler = new HandlerClass(email, domainKnowledges, debugInfo, env);
    await handler.handle();
  }));
}
