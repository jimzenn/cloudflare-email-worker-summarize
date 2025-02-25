import { Email } from "postal-mime";
import { FlightHandler } from "@/handlers/flight";
import { VerificationHandler } from "@/handlers/verification";
import { Env } from "@/types/env";
import { SummarizeHandler } from "./handlers/summarize";
import { BillHandler } from "./handlers/bill";
import { HotelHandler } from "@/handlers/hotel";
import { PromotionHandler } from "@/handlers/promotion";
import { HandlerConstructor } from "@/types/handler";

const handlerMap: Record<string, HandlerConstructor[]> = {
  flight: [FlightHandler],
  bill: [BillHandler],
  verification: [VerificationHandler],
  hotel: [HotelHandler],
  promotion: [PromotionHandler],
  default: [SummarizeHandler],
} as const;

export async function dispatchToHandler(email: Email, category: string, domainKnowledges: string[], env: Env) {
  console.log(`[📨Dispatcher] Dispatching to handlers for category: ${category}`);
  
  const handlers = handlerMap[category] || handlerMap.default;
  
  await Promise.all(handlers.map(async (HandlerClass) => {
    const handler = new HandlerClass(email, domainKnowledges, env);
    await handler.handle();
  }));
}
