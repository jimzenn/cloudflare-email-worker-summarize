import { formatTrackingMessage } from "@/formatters/tracking";
import { PROMPT_EXTRACT_TRACKING_INFO } from "@/prompts/tracking";
import TrackingSchema from "@/schemas/TrackingSchema.json";
import { sendTelegramMessage } from "@/services/telegram";
import { TrackingInfo } from "@/types/tracking";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { stylizedFullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export class TrackingHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Tracking] Handling email: "${subject}"`);

    try {
      const { data: trackingInfo, model } = await extractInformation<TrackingInfo>(
        this.email,
        PROMPT_EXTRACT_TRACKING_INFO,
        TrackingSchema,
        "TrackingInfo",
        this.env
      );
      this.debugInfo.llmModel = model;

      const { title, message } = formatTrackingMessage(trackingInfo);

      await sendTelegramMessage(
        stylizedFullSender(this.email),
        title,
        message,
        this.debugInfo,
        this.env
      );
      console.log(`[Tracking] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Tracking] Error handling email: "${subject}"`, error);
    }
  }
}
