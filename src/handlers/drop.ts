import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { Email } from "postal-mime";

export class DropHandler implements Handler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Drop] Dropping email with subject: ${this.email.subject || '(No subject)'}`);
    return Promise.resolve();
  }
}
