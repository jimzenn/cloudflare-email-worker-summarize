import VerificationSchema from "@/schemas/VerificationSchema.json";
import { queryOpenAI } from "@/services/openai";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramMessage } from "@/services/telegram";
import { Env } from "@/types/env";
import { VerificationCode } from "@/types/verification";
import { createEmailPrompt } from "@/utils/email";
import { Email } from "postal-mime";

const PROMPT_EXTRACT_VERIFICATION_CODE = `
You are my personal assistant, and you are given an email related to verification, help me extract key information.

For each email extract verification code information and return it in a structured format. If a field is not present, return an empty string.

Ensure your response matches the provided JSON schema structure exactly.`;

async function extractVerificationCode(email: Email, env: Env): Promise<VerificationCode> {
  console.log('[Verification] Sending email text to OpenAI:', email.text?.substring(0, 200) + '...');

  const response = await queryOpenAI(
    PROMPT_EXTRACT_VERIFICATION_CODE,
    await createEmailPrompt(email, env),
    env,
    VerificationSchema,
    "VerificationCode"
  );

  try {
    const parsed = JSON.parse(response);
    console.log('[Verification] Successfully parsed response into VerificationCode');
    return parsed;
  } catch (error) {
    console.error('[Verification] Error parsing response:', error);
    throw error;
  }
}

export class VerificationHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) { }

  async handle() {
    console.log(`[Verification] Handling ${this.email.subject || '(No subject)'}`);
    const verificationCode = await extractVerificationCode(this.email, this.env);
    const service = verificationCode.service;
    const accountName = verificationCode.account_name;
    const code = verificationCode.code;
    const title = `[${service}]` + (accountName ? ` ${accountName}` : '');
    const message = `*${title}* \`${code}\``;
    await Promise.all([
      sendPushoverNotification(title, message, this.env),
      sendTelegramMessage(this.email.from.address || 'unknown', this.email.subject || '(No subject)', message, this.env)
    ]);
  }
}
