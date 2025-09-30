import { BasicCalendarEvent } from "./basicCalendarEvent";

export type BillInfo = {
  to_whom: string;
  bill_account: string;
  bill_status: string;
  bill_date: string;
  bill_amount: number;
  bill_currency: string;
  what_for: string;
  card_last4?: string;
  additional_notes?: string[];
  calendar_event?: BasicCalendarEvent;
};