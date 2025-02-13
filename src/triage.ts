import { Email } from "postal-mime";
import { PROMPT_TRIAGE } from "@/prompts/triage";
import { queryOpenAI } from "@/services/openai";
import { createEmailPrompt } from "@/utils/email";
import { Env } from "@/types/env";
import { TriageInfo } from "@/types/triageResponse";

export async function triageEmail(email: Email, env: Env): Promise<TriageInfo> {
    const triageResponse = await queryOpenAI(
      PROMPT_TRIAGE,
      await createEmailPrompt(email, env),
      env
    );
  
    try {
      return JSON.parse(triageResponse);
    } catch (parseError) {
      console.error('Failed to parse triage response:', triageResponse);
      throw new Error('Failed to parse triage response');
    }
  }
  