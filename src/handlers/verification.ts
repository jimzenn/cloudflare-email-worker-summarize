import VerificationSchema from "@/schemas/VerificationSchema.json";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { Env } from "@/types/env";
import { VerificationCode } from "@/types/verification";
import { fullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";
import { Handler } from "@/types/handler";

const PROMPT_EXTRACT_VERIFICATION_CODE = `
You are my personal assistant, and you are given an email related to verification, help me extract key information.

For each email extract verification code information and return it in a structured format. If a field is not present, return an empty string.

Ensure your response matches the provided JSON schema structure exactly.`;

export class VerificationHandler implements Handler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Verification] Handling ${this.email.subject || '(No subject)'}`);
    const verificationCode: VerificationCode = await extractInformation(this.email, PROMPT_EXTRACT_VERIFICATION_CODE, VerificationSchema, "VerificationCode", this.env);
    const service = verificationCode.service;
    const accountName = verificationCode.accountName;
    const code = verificationCode.code;
    const title = `🔑 ${service}` + (accountName ? `: ${accountName}` : '');
    const message = `*${title}* \`${code}\``;
    await Promise.all([
      sendPushoverNotification(title, message, this.env),
      sendTelegramMessage(fullSender(this.email), title, message, this.env)
    ]);
  }
}
