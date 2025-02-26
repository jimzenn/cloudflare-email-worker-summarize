import { PROMPT_TRIAGE } from "@/prompts/triage";
import TriageSchema from "@/schemas/TriageSchema.json";
import { queryLLM } from "@/services/llm";
import { Env } from "@/types/env";
import { TriageInfo } from "@/types/triage";
import { createEmailPrompt } from "@/utils/email";
import { Email } from "postal-mime";

export async function triageEmail(email: Email, env: Env): Promise<TriageInfo> {
    const userPrompt = await createEmailPrompt(email, env);
    const triageResponse = await queryLLM(
      PROMPT_TRIAGE,
      userPrompt,
      env,
      TriageSchema,
      "TriageInfo"
    );

    try {
      return JSON.parse(triageResponse);
    } catch (parseError) {
      console.error('Failed to parse triage response:', triageResponse);
      throw new Error('Failed to parse triage response');
    }
  }
  