import { Env } from "../types/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}

interface ChatCompletionResponseChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  choices: ChatCompletionResponseChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Queries the OpenAI ChatGPT API with a system prompt and a user prompt.
 *
 * Environment Variables:
 * - OPENAI_API_KEY: Your OpenAI API key.
 * - OPENAI_MODEL: The model to use.
 *
 * @param systemPrompt - The system-level prompt that sets the context.
 * @param userPrompt - The user's query or prompt.
 * @returns The assistant's response as a string.
 */
export async function queryOpenAI(
  systemPrompt: string,
  userPrompt: string,
  env: Env
): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in the environment variables.");
  }

  const model = env.OPENAI_MODEL;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const requestBody: ChatCompletionRequest = {
    model,
    messages,
    temperature: 0.7,
  };

  console.log(`[OpenAI | ${model}] Request body:`, JSON.stringify(requestBody));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[OpenAI | ${model}] Response status:`, response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OpenAI | ${model}] Error: ${errorText}`);
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data: ChatCompletionResponse = await response.json();

  console.log(`[OpenAI | ${model}] Response data:`, JSON.stringify(data));

  if (!data.choices || data.choices.length === 0) {
    const error = new Error('OpenAI API returned no choices');
    console.error('[OpenAI] Error:', error, 'Full response:', data);
    throw error;
  }

  if (!data.choices[0].message?.content) {
    const error = new Error('OpenAI API response missing message content');
    console.error('[OpenAI] Error:', error, 'First choice:', data.choices[0]);
    throw error;
  }

  const text = data.choices[0].message.content.trim();
  console.log(`[OpenAI | ${model}] ${text}`);
  return text;
}
