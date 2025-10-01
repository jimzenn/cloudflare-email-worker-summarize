import { PROMPT_EXTRACT_VERIFICATION_CODE } from "@/prompts/verification";
import VerificationSchema from "@/schemas/VerificationSchema.json";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramBrief } from "@/services/telegram";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { Handler } from "@/types/handler";
import { VerificationCode } from "@/types/verification";
import { stylizedFullSender } from "@/utils/email";
import { extractInformation } from "@/utils/extract";
import { Email } from "postal-mime";

export class VerificationHandler implements Handler {
  constructor(
    private email: Email,
    private domainKnowledges: string[],
    private debugInfo: DebugInfo,
    private env: Env
  ) { }

  async handle() {
    const subject = this.email.subject || '(No subject)';
    console.log(`[Verification] Handling email: "${subject}"`);

    try {
      const { data: verificationCode, model } = await extractInformation<VerificationCode>(
        this.email,
        PROMPT_EXTRACT_VERIFICATION_CODE,
        VerificationSchema,
        "VerificationCode",
        this.env
      );
      this.debugInfo.llmModel = model;

      const service = verificationCode.service;
      const accountName = verificationCode.accountName;
      const code = verificationCode.code;
      const title = `🔑 ${service}` + (accountName ? `: ${accountName}` : '');
      const message = `*${title}* \`${code}\``;

      await Promise.all([
        sendPushoverNotification(title, message, this.env),
        sendTelegramBrief(
          message,
          this.debugInfo,
          this.env
        ),
      ]);

      console.log(`[Verification] Successfully handled email: "${subject}"`);
    } catch (error) {
      console.error(`[Verification] Error handling email: "${subject}"`, error);
      throw error;
    }
  }
}
