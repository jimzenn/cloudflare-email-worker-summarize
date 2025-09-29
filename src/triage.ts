import { PROMPT_TRIAGE } from '@/prompts/triage';
import TriageSchema from '@/schemas/TriageSchema.json';
import { queryLLM } from '@/services/llm';
import { type DebugInfo } from '@/types/debug';
import { type Env } from '@/types/env';
import { type TriageInfo } from '@/types/triage';
import { createEmailPrompt } from '@/utils/email';
import { type Email } from 'postal-mime';

export class TriageError extends Error {
  constructor(
    message: string,
    public readonly response: string,
  ) {
    super(message);
    this.name = 'TriageError';
  }
}

/**
 * Triages an email by querying an LLM to categorize it and extract relevant information.
 *
 * @param email The email object to triage.
 * @param env The environment variables.
 * @returns A promise that resolves to an object containing the triage information and debug information.
 * @throws {TriageError} If the LLM response cannot be parsed.
 */
export async function triageEmail(
  email: Email,
  env: Env,
): Promise<{ triageInfo: TriageInfo; debugInfo: DebugInfo }> {
  const userPrompt = await createEmailPrompt(email, env);
  const { response, model } = await queryLLM(PROMPT_TRIAGE, userPrompt, env, TriageSchema, 'TriageInfo');

  try {
    const triageInfo: TriageInfo = JSON.parse(response);
    const debugInfo: DebugInfo = {
      llmModel: model,
      category: triageInfo.category,
    };
    return { triageInfo, debugInfo };
  } catch (parseError) {
    console.error('Failed to parse triage response:', response, parseError);
    throw new TriageError('Failed to parse triage response from LLM.', response);
  }
}