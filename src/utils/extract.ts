import { Email } from "postal-mime";
import { Env } from "@/types/env";
import { createEmailPrompt } from "@/utils/email";
import { queryLLM } from "@/services/llm";

export class ExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export async function extractInformation<T>(
  email: Email,
  systemPrompt: string,
  schema: any,
  schemaName: string,
  env: Env
): Promise<{ data: T, model: string }> {
  const prompt = await createEmailPrompt(email, env);
  const { response, model } = await queryLLM(systemPrompt, prompt, env, schema, schemaName);

  try {
    const data = JSON.parse(response);
    return { data, model };
  } catch (error) {
    throw new ExtractionError('Failed to parse LLM response as JSON', {
      response,
      cause: error,
    });
  }
}