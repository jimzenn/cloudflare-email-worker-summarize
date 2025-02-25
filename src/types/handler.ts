import { Email } from "postal-mime";
import { Env } from "./env";

export interface Handler {
  handle(): Promise<void>;
}

export interface HandlerConstructor {
  new (email: Email, domainKnowledges: string[], env: Env): Handler;
} 