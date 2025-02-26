import { queryOpenAI } from '@/services/openai';
import { queryGemini } from '@/services/gemini';
import { queryDeepSeek } from '@/services/deepseek';
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
  timeoutMs: number = 600000 // 10 minutes
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`[🤖${provider}] Request timed out after ${timeoutMs}ms`);
    controller.abort();
    throw new LLMTimeoutError(timeoutMs);
  }, timeoutMs);
  const startTime = Date.now();

  console.log(`[🤖${provider}] Request starting...`);

  const heartbeatInterval = setInterval(() => {
    const elapsedTime = Date.now() - startTime;
    console.log(`[🤖${provider}] Request in progress... ${elapsedTime / 1000}s elapsed`);
  }, 5000);

  try {
    let response: Response;
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

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
  provider: 'openai' | 'gemini' | 'deepseek' = 'openai',
  temperature: number = 0.7,
): Promise<string> {
  if (provider === 'openai') {
    return queryOpenAI(systemPrompt, userPrompt, env, schema, schemaName, reasoning, temperature);
  } else if (provider === 'gemini') {
    return queryGemini(systemPrompt, userPrompt, env, schema, schemaName, reasoning, temperature);
  } else if (provider === 'deepseek') {
    return queryDeepSeek(systemPrompt, userPrompt, env, schema, schemaName, reasoning, temperature);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}
