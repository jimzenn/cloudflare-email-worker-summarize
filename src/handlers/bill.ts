import { formatBillMessage } from "@/formatters/bill";
import { PROMPT_EXTRACT_BILL_INFO } from "@/prompts/bill";
import BillSchema from "@/schemas/BillSchema.json";
import { createCalendarEvent } from "@/services/calendar";
import { sendTelegramMessage } from "@/services/telegram";
import { BillInfo } from "@/types/bill";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { stylizedFullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export class BillHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Bill] Handling email: "${subject}"`);

    try {
      const { data: billInfo, model } = await extractInformation<BillInfo>(
        this.email,
        PROMPT_EXTRACT_BILL_INFO,
        BillSchema,
        "BillInfo",
        this.env
      );
      this.debugInfo.llmModel = model;

      const { title, message } = formatBillMessage(billInfo);
      let finalMessage = message;

      if (billInfo.calendar_event) {
        await createCalendarEvent(billInfo.calendar_event, this.env);
        finalMessage += '\n\nReminder added to the Calendar.';
      }

      await sendTelegramMessage(
        stylizedFullSender(this.email),
        title,
        finalMessage,
        this.debugInfo,
        this.env
      );
      console.log(`[Bill] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Bill] Error handling email: "${subject}"`, error);
    }
  }
}