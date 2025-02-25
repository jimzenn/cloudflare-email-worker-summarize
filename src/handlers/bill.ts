import { queryOpenAI } from "@/services/openai";
import { Env } from "@/types/env";
import { createEmailPrompt, fullSender } from "@/utils/email";
import { Email } from "postal-mime";
import BillSchema from "@/schemas/BillSchema.json";
import { createCalendarEvent } from "@/services/calendar";
import { BillInfo } from "@/types/bill";
import { sendTelegramMessage } from "@/services/telegram";
import { markdownv2 as format } from 'telegram-format';
import { currencySymbol } from "@/utils/currency";

const PROMPT_EXTRACT_BILL_INFO = `
You are my personal assistant, and you are given an email related to bill, help me extract key information.

bill status should be one of the following:
- pending
- paid
- failed
- refunded
- requested (venmo, zelle, etc.)

- bill account should be the account name that the bill is for, it could be an ID, my name, or an account number or email.
- If the bill account has multiple value: name, email, ID, format it as "name (email, ID)".
_ bill date should be the date of the bill in TypeScript ISO format e.g. 2024-01-01T00:00:00.000Z.
- If the bill is for a company, the to_whom should be the company name, e.g. "OpenAI", "USPS", "Amazon", "Citi Bank", etc.
- If the bill is pending / upcoming, the bill_date should be the due date of the bill.
- If the bill is already paid, the bill_date should be the date of the payment.
- If the bill is a credit card bill, and there is statement balance and minimum payment, the bill_amount should be the statement balance. Put the minimum payment in the additional_notes field.
- Bill currency should be in the format of "USD", "CNY", "EUR", "GBP", etc.

For each email extract bill information and return it in a structured format. If a field is not present, return an empty string.
In addition, if the bill is an upcoming bill, fill the calendar_event field with the bill occurrence in the future to help me remind myself.
The calendar title should be in the format of "[💸 {to_whom}|{for what, abbreviated}] {bill_amount} {bill_currency}".
The reminder should be set to 8PM the day before the bill is due via popup, don't send email reminder.
The bill event should always be all day event.

The calendar event fields follows that of Google Calendar API v3.

Ensure your response matches the provided JSON schema structure exactly.`;

const DIVIDER = "—————————————————————";

async function extractBillInfo(email: Email, domainKnowledges: string[], env: Env): Promise<BillInfo> {
  const prompt = PROMPT_EXTRACT_BILL_INFO;
  const response = await queryOpenAI(
    prompt, 
    await createEmailPrompt(email, env), 
    env, 
    BillSchema,
    "BillInfo"
  );
  const billInfo: BillInfo = JSON.parse(response);
  return billInfo;
}

export class BillHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Bill] Handling ${this.email.subject || '(No subject)'}`);

    const billInfo = await extractBillInfo(this.email, this.domainKnowledges, this.env);

    const title = `💸 ${billInfo.to_whom}: ${billInfo.what_for}`;
    const message = [
      format.bold(billInfo.bill_status),
      billInfo.bill_date,
      format.monospace(billInfo.bill_account),
      `${currencySymbol(billInfo.bill_currency)}${billInfo.bill_amount}`,
      DIVIDER,
      format.bold('Additional Notes:'),
      ...billInfo.additional_notes.map(note => `- ${note}`),
      `Reminder added to the Calendar.`
    ].join('\n');

    await sendTelegramMessage(fullSender(this.email), title, message, this.env);

    if (billInfo.calendar_event) {
      await createCalendarEvent(billInfo.calendar_event, this.env);
    }
  }
}