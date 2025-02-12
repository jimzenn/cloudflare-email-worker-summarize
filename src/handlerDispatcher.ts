import { ForwardableEmailMessage } from "postal-mime";
import { Env } from "./types/env";
import { FlightHandler } from "./handlers/flight";

export async function emailHandlerDispatcher(email: ForwardableEmailMessage, category: string, domainKnowledges: string[], env: Env) {
  if (category === "flight") {
    const flightHandler = new FlightHandler(email, domainKnowledges, env);
    await flightHandler.handle();
  }
}