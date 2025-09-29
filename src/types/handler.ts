import { type Email } from 'postal-mime';
import { type DebugInfo } from './debug';
import { type Env } from './env';

export interface Handler {
  handle(): Promise<void>;
}

export interface HandlerConstructor {
  new (email: Email, domainKnowledge: string[], debugInfo: DebugInfo, env: Env): Handler;
}