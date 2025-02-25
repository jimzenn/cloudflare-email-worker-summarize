export interface VerificationCode {
  service: string; // e.g. "Google"
  code: string; // e.g. "123456"
  accountName: string; // e.g. "jimzenn0@gmail.com"
  additionalNotes: string[]; // e.g. ["requires opening a link", "additional manual steps required"]
} 