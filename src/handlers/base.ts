import { sendTelegramBrief, sendTelegramMessage, TelegramMessageOptions } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { createEmailPrompt, stylizedFullSender } from "@/utils/email";
import { queryLLM } from "@/services/llm";
import { Email } from "postal-mime";
import { z } from "zod";

export abstract class BaseHandler<T> implements Handler {
  protected abstract schema: z.ZodType<T>;
  protected abstract systemPrompt: string;
  protected abstract handlerName: string;
  protected abstract actionName: string;

  constructor(
    protected email: Email,
    protected domainKnowledges: string[],
    protected debugInfo: DebugInfo,
    protected env: Env
  ) {}

  protected async getUserPrompt(): Promise<string> {
    return createEmailPrompt(this.email, this.env);
  }

  protected async extractData(): Promise<{ data: T; model: string }> {
    const userPrompt = await this.getUserPrompt();
    const systemPrompt = `
      ${this.systemPrompt}

      You have expertise in the following areas:
      ${this.domainKnowledges.join("\n")}
    `;

    const { response, model } = await queryLLM(
      systemPrompt,
      userPrompt,
      this.env,
      this.schema,
      this.actionName
    );
    const data = JSON.parse(response);
    return { data, model };
  }

  async handle() {
    const subject = this.email.subject || "(No subject)";
    console.log(`[${this.handlerName}] Handling email: "${subject}"`);

    try {
      const { data, model } = await this.extractData();
      this.debugInfo.llmModel = model;

      await this.sendMessage(data);

      console.log(
        `[${this.handlerName}] Successfully handled email: "${subject}"`
      );
    } catch (error) {
      console.error(
        `[${this.handlerName}] Error handling email: "${subject}"`,
        error
      );
    }
  }

  protected async sendMessage(data: T) {
    const { title, message, options } = await this.formatMessage(data);

    await sendTelegramMessage(
      stylizedFullSender(this.email),
      title,
      message,
      this.debugInfo,
      this.env,
      options
    );
  }

  protected abstract formatMessage(data: T): Promise<{
    title: string;
    message: string;
    options?: TelegramMessageOptions;
  }>;
}
