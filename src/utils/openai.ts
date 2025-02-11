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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data: ChatCompletionResponse = await response.json();

  // Assuming at least one completion is returned
  return data.choices[0].message.content.trim();
}
