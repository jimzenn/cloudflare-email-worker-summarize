import { markdownv2 as format } from 'telegram-format';
import { BillInfo } from "@/types/bill";
import { currencySymbol } from "@/utils/currency";
import { DIVIDER } from "@/formatters/common";

export function formatBillMessage(billInfo: BillInfo): { title: string, message: string } {
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

  return { title, message };
}
