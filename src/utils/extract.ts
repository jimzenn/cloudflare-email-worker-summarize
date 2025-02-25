import { Email } from "postal-mime";
import { Env } from "@/types/env";
import { createEmailPrompt } from "@/utils/email";
import { queryOpenAI } from "@/services/openai";

export async function extractInformation(email: Email, systemPrompt: string, schema: any, schemaName: string, env: Env) {
  const prompt = await createEmailPrompt(email, env);
  const response = await queryOpenAI(systemPrompt, prompt, env, schema, schemaName);
  return JSON.parse(response);
}