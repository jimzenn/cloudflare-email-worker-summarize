import HotelSchema from "@/schemas/HotelSchema.json";
import { queryOpenAI } from "@/services/openai";
import { sendTelegramMessage } from "@/services/telegram";
import { Env } from "@/types/env";
import { HotelStay } from "@/types/hotel";
import { createEmailPrompt, fullSender } from "@/utils/email";
import { Email } from "postal-mime";
import { formatHotelStay } from "@/formatters/hotel";

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


async function extractHotelStay(email: Email, env: Env): Promise<HotelStay> {
  console.log('[Hotel] Sending email text to OpenAI:', email.text?.substring(0, 200) + '...');

  const response = await queryOpenAI(
    PROMPT_EXTRACT_HOTEL_INFO,
    await createEmailPrompt(email, env),
    env,
    HotelSchema,
    "HotelStay"
  );

  try {
    const parsed = JSON.parse(response);
    console.log('[Hotel] Successfully parsed response into HotelStay');
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[Hotel] JSON parsing error:', error.message);
    } else {
      console.error('[Hotel] Unexpected error during hotel extraction:', error);
      if (error instanceof Error) {
        console.error('[Hotel] Error stack:', error.stack);
      }
    }
    throw error;
  }
}

export class HotelHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Hotel] Handling ${this.email.subject || '(No subject)'}`);
    const hotelStay = await extractHotelStay(this.email, this.env);
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
