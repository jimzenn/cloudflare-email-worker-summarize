import { markdownv2 as format } from 'telegram-format';
import { BillInfo } from "@/types/bill";
import { currencySymbol } from "@/utils/currency";
import { DIVIDER } from "@/formatters/common";

export function formatBillMessage(billInfo: BillInfo): { title: string, message: string } {
  const title = `💸 ${billInfo.to_whom}: ${billInfo.what_for}`;
  const messageParts = [
    format.bold(billInfo.bill_status),
    billInfo.bill_date,
    format.monospace(billInfo.bill_account),
    `${currencySymbol(billInfo.bill_currency)}${billInfo.bill_amount}`,
  ];

  if (billInfo.additional_notes && billInfo.additional_notes.length > 0) {
    messageParts.push(DIVIDER);
    messageParts.push(format.bold('Additional Notes:'));
    messageParts.push(...billInfo.additional_notes.map(note => `• ${note}`));
  }

  return { title, message: messageParts.join('\n') };
}
