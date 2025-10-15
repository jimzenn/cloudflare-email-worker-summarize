import { PROMPT_EXTRACT_NOTIFICATION_INFO } from "@/prompts/notification";
import { sendTelegramBrief } from "@/services/telegram";
import { NotificationInfo, NotificationInfoSchema } from "@/types/zod/notification";
import { BaseHandler } from "./base";

export class NotificationHandler extends BaseHandler<NotificationInfo> {
  protected schema = NotificationInfoSchema;
  protected systemPrompt = PROMPT_EXTRACT_NOTIFICATION_INFO;
  protected handlerName = "Notification";
  protected actionName = "NotificationInfo";

  protected async sendMessage(data: NotificationInfo) {
    await sendTelegramBrief(data.summary, this.debugInfo, this.env);
  }

  protected async formatMessage(data: NotificationInfo) {
    return {
      title: "",
      message: data.summary,
    };
  }
}
