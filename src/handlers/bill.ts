import { formatBillMessage } from "@/formatters/bill";
import { PROMPT_EXTRACT_BILL_INFO } from "@/prompts/bill";
import { createCalendarEvent } from "@/services/calendar";
import { BillInfo, BillInfoSchema } from "@/types/zod/bill";
import { BaseHandler } from "./base";

export class BillHandler extends BaseHandler<BillInfo> {
  protected schema = BillInfoSchema;
  protected systemPrompt = PROMPT_EXTRACT_BILL_INFO;
  protected handlerName = "Bill";
  protected actionName = "BillInfo";

  async formatMessage(billInfo: BillInfo) {
    const { title, message } = formatBillMessage(billInfo);
    let finalMessage = message;

    if (billInfo.calendar_event) {
      await createCalendarEvent(billInfo.calendar_event, this.env);
      finalMessage += '\n\nReminder added to the Calendar.';
    }

    return {
      title,
      message: finalMessage,
    };
  }
}
