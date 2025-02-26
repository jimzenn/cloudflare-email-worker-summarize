import { queryOpenAI } from '@/services/openai';
import { queryGemini } from '@/services/gemini';
import { Env } from '@/types/env';

export class LLMError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'LLMTimeoutError';
  }
}

export async function makeAPIRequest<T>(
  provider: string,
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  console.log(`[🤖${provider}] Request starting...`);

  const heartbeatInterval = setInterval(() => {
    const elapsedTime = Date.now() - startTime;
    console.log(`[🤖${provider}] Request in progress... ${elapsedTime / 1000}s elapsed`);
  }, 5000);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMTimeoutError(timeoutMs);
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new LLMError(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  } finally {
    clearInterval(heartbeatInterval);
    clearTimeout(timeoutId);
    console.log(`[🤖${provider}] Request completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  }
}

export async function queryLLM(
  systemPrompt: string,
  userPrompt: string,
  env: Env,
  schema: object,
  schemaName: string,
  reasoning: boolean = false,
  provider: 'openai' | 'gemini' = 'gemini',
  temperature: number = 0,
): Promise<string> {
  if (provider === 'openai') {
    return queryOpenAI(systemPrompt, userPrompt, env, schema, schemaName, reasoning, temperature);
  } else if (provider === 'gemini') {
    return queryGemini(systemPrompt, userPrompt, env, schema, schemaName, reasoning, temperature);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}
