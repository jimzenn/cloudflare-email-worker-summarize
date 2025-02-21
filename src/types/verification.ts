export interface VerificationCode {
  service: string; // e.g. "Google"
  code: string; // e.g. "123456"
  account_name: string; // e.g. "jimzenn0@gmail.com"
  additional_notes: string[]; // e.g. ["requires opening a link", "additional manual steps required"]
} 