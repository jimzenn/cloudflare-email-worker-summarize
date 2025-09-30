import { PROMPT_EXTRACT_NOTIFICATION_INFO } from "@/prompts/notification";
import NotificationSchema from "@/schemas/NotificationSchema.json";
import { sendTelegramBrief } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { NotificationInfo } from "@/types/notification";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export class NotificationHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Notification] Handling email: "${subject}"`);

    try {
      const { data: notificationInfo, model } = await extractInformation<NotificationInfo>(
        this.email,
        PROMPT_EXTRACT_NOTIFICATION_INFO,
        NotificationSchema,
        "NotificationInfo",
        this.env
      );
      this.debugInfo.llmModel = model;

      await sendTelegramBrief(notificationInfo.summary, this.debugInfo, this.env);

      console.log(`[Notification] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Notification] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
}