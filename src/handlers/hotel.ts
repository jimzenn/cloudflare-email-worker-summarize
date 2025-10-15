import { formatHotelStay } from "@/formatters/hotel";
import { PROMPT_EXTRACT_HOTEL_INFO } from "@/prompts/hotel";
import { HotelStay, HotelStaySchema } from "@/types/zod/hotel";
import { BaseHandler } from "./base";

export class HotelHandler extends BaseHandler<HotelStay> {
  protected schema = HotelStaySchema;
  protected systemPrompt = PROMPT_EXTRACT_HOTEL_INFO;
  protected handlerName = "Hotel";
  protected actionName = "HotelStay";

  async formatMessage(hotelStay: HotelStay) {
    const message = formatHotelStay(hotelStay);
    const title = `🏨 ${hotelStay.guestName}: ${hotelStay.hotelName}`;

    return {
      title,
      message,
    };
  }
}
