import { Env } from "@/types/env";
import { Email } from "postal-mime";
import { queryOpenAI } from "@/services/openai";
import { createEmailPrompt } from "@/utils/email";
import { sendTelegramMessage } from "@/services/telegram";
import { sendPushoverNotification } from "@/services/pushover";

const PROMPT_EXTRACT_VERIFICATION_CODE = `
You are my personal assistant, and you are given an email, help me extract key information.

You should respond directly with a parsable JSON object with the following Typescript interface.

interface VerificationCode {
  service: string; // e.g. "Google"
  code: string; // e.g. "123456"
  account_name?: string; // e.g. "jimzenn0@gmail.com"
  additional_notes?: string[]; // e.g. ["requires opening a link", "additional manual steps required"]
}
`

interface VerificationCode {
  service: string; // e.g. "Google"
  code: string; // e.g. "123456"
  account_name?: string; // e.g. "jimzenn0@gmail.com"
  additional_notes?: string[]; // e.g. ["requires opening a link", "additional manual steps required"]
}

async function extractVerificationCode(email: Email, env: Env): Promise<VerificationCode> {
  const systemPrompt = PROMPT_EXTRACT_VERIFICATION_CODE;
  const userPrompt = await createEmailPrompt(email, env);

  console.log('[Verification] Sending email text to OpenAI:', email.text?.substring(0, 200) + '...');

  const response = await queryOpenAI(systemPrompt, userPrompt, env);
  try {
    const parsed = JSON.parse(response);
    return parsed;
  } catch (error) {
    console.error('[Verification] Error parsing response:', error);
    throw error;
  }
}


export class VerificationHandler {
  constructor(private email: Email, private domainKnowledges: string[], private env: Env) {
  }

  async handle() {
    console.log(`[Verification] Handling ${this.email.subject || '(No subject)'}`);
    const verificationCode = await extractVerificationCode(this.email, this.env);
    const service = verificationCode.service;
    const accountName = verificationCode.account_name;
    const code = verificationCode.code;
    const title = `[${service}] ${accountName ? accountName : ''}`;
    const message = `[Verification] ${title} : ${code}`;
    console.log('[Verification] Sending message to Telegram:', message);    
    await sendPushoverNotification(title, message, this.env);
    await sendTelegramMessage(this.email.from.address || 'unknown', this.email.subject || '(No subject)', message, this.env);
  }
}
