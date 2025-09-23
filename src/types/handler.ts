import { Email } from "postal-mime";
import { DebugInfo } from "./debug";
import { Env } from "./env";

export interface Handler {
  handle(): Promise<void>;
}

export interface HandlerConstructor {
  new (email: Email, domainKnowledges: string[], debugInfo: DebugInfo, env: Env): Handler;
} 