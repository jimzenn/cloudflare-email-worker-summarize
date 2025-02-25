import { formatHotelStay } from "@/formatters/hotel";
import HotelSchema from "@/schemas/HotelSchema.json";
import { sendTelegramMessage } from "@/services/telegram";
import { Env } from "@/types/env";
import { HotelStay } from "@/types/hotel";
import { fullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export const PROMPT_EXTRACT_HOTEL_INFO = `
You are my personal assistant, and you are given an email, help me extract key information about hotel bookings.

For each email extract hotel stay information and return it in a structured format.

- Timezone must be in the format of "America/New_York" or "Asia/Shanghai".
- Dates must be in ISO format (YYYY-MM-DD).
- Times must be in 24-hour format (HH:mm).
- Currency should be in the format of "USD", "CNY", "EUR", etc.
- Include all important unincluded information in the additional_notes field.
- Make sure to include any special requests, amenities, or important policies.

Ensure your response matches the provided JSON schema structure exactly.
`;



export class HotelHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Hotel] Handling ${this.email.subject || '(No subject)'}`);
    const hotelStay: HotelStay = await extractInformation(this.email, PROMPT_EXTRACT_HOTEL_INFO, HotelSchema, "HotelStay", this.env);
    try {
      const message = formatHotelStay(hotelStay);
      const title = `🏨 ${hotelStay.guestName}: ${hotelStay.hotelName}`;
      console.log('[Hotel] Formatted hotel stay:', message);
      await sendTelegramMessage(fullSender(this.email), title, message, this.env);
    } catch (error) {
      console.error('[Hotel] Error processing hotel:', error);
      throw error;
    }
  }
}
