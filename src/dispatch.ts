import { Email } from "postal-mime";
import { FlightHandler } from "@/handlers/flight";
import { VerificationHandler } from "@/handlers/verification";
import { Env } from "@/types/env";
import { SummarizeHandler } from "./handlers/summarize";
import { BillHandler } from "./handlers/bill";

export async function dispatchToHandler(email: Email, category: string, domainKnowledges: string[], env: Env) {
  console.log(`[📨Dispatcher] Dispatching to handler: ${category}`);
  if (category === "flight") {
    const flightHandler = new FlightHandler(email, domainKnowledges, env);
    await flightHandler.handle();
  }
  else if (category === "bill") {
    const billHandler = new BillHandler(email, domainKnowledges, env);
    await billHandler.handle();
  }
  else if (category === "verification") {
    const verificationHandler = new VerificationHandler(email, domainKnowledges, env);
    await verificationHandler.handle();
  }
  else {
    const summarizeHandler = new SummarizeHandler(email, domainKnowledges, env);
    await summarizeHandler.handle();
  }
}
