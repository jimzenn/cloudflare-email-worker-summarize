import { PROMPT_EXTRACT_VERIFICATION_CODE } from "@/prompts/verification";
import { sendPushoverNotification } from "@/services/pushover";
import { sendTelegramBrief } from "@/services/telegram";
import { VerificationCode, VerificationCodeSchema } from "@/types/zod/verification";
import { BaseHandler } from "./base";

export class VerificationHandler extends BaseHandler<VerificationCode> {
  protected schema = VerificationCodeSchema;
  protected systemPrompt = PROMPT_EXTRACT_VERIFICATION_CODE;
  protected handlerName = "Verification";
  protected actionName = "VerificationCode";

  protected async sendMessage(verificationCode: VerificationCode) {
    const { title, message } = await this.formatMessage(verificationCode);

    await Promise.all([
      sendPushoverNotification(title, message, this.env),
      sendTelegramBrief(
        message,
        this.debugInfo,
        this.env
      ),
    ]);
  }

  protected async formatMessage(verificationCode: VerificationCode) {
    const service = verificationCode.service;
    const accountName = verificationCode.accountName;
    const code = verificationCode.code;
    const title = `🔑 ${service}` + (accountName ? `: ${accountName}` : '');
    const message = `*${title}* \`${code}\``;

    return {
      title,
      message,
    };
  }
}
