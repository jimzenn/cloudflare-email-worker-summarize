import { formatHotelStay } from "@/formatters/hotel";
import { PROMPT_EXTRACT_HOTEL_INFO } from "@/prompts/hotel";
import HotelSchema from "@/schemas/HotelSchema.json";
import { sendTelegramMessage } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { HotelStay } from "@/types/hotel";
import { stylizedFullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export class HotelHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Hotel] Handling email: "${subject}"`);

    try {
      const { data: hotelStay, model } = await extractInformation<HotelStay>(
        this.email,
        PROMPT_EXTRACT_HOTEL_INFO,
        HotelSchema,
        "HotelStay",
        this.env
      );
      this.debugInfo.llmModel = model;

      const message = formatHotelStay(hotelStay);
      const title = `🏨 ${hotelStay.guestName}: ${hotelStay.hotelName}`;

      console.log('[Hotel] Formatted hotel stay:', message);

      await sendTelegramMessage(
        stylizedFullSender(this.email),
        title,
        message,
        this.debugInfo,
        this.env
      );

      console.log(`[Hotel] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Hotel] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
}
