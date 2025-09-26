import { PROMPT_TRIAGE } from "@/prompts/triage";
import TriageSchema from "@/schemas/TriageSchema.json";
import { queryLLM } from "@/services/llm";
import { DebugInfo } from "@/types/debug";
import { Env } from "@/types/env";
import { TriageInfo } from "@/types/triage";
import { createEmailPrompt } from "@/utils/email";
import { Email } from "postal-mime";

export async function triageEmail(email: Email, env: Env): Promise<{ triageInfo: TriageInfo; debugInfo: DebugInfo }> {
    const userPrompt = await createEmailPrompt(email, env);
    const { response, model } = await queryLLM(
      PROMPT_TRIAGE,
      userPrompt,
      env,
      TriageSchema,
      "TriageInfo"
    );

    try {
      const triageInfo = JSON.parse(response);
      const debugInfo: DebugInfo = {
        llmModel: model,
        category: triageInfo.category,
      };
      return { triageInfo, debugInfo };
    } catch (parseError) {
      console.error('Failed to parse triage response:', response);
      throw parseError;
    }
  }
  