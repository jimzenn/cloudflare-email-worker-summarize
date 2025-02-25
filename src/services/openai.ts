import { Env } from "@/types/env";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: ChatMessage;
    finish_reason: string;
  }[];
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  response_format?: {
    type: "json_schema";
    json_schema?: {
      name?: string;
      schema: object;
      strict?: boolean;
    };
  };
}

class OpenAIError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'OpenAIError';
  }
}

class OpenAITimeoutError extends OpenAIError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'OpenAITimeoutError';
  }
}

class OpenAIConfigError extends OpenAIError {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIConfigError';
  }
}

class OpenAIResponseError extends OpenAIError {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'OpenAIResponseError';
  }
}

async function makeOpenAIRequest(
  url: string,
  body: ChatCompletionRequest,
  apiKey: string,
  timeoutMs: number
): Promise<ChatCompletionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  console.log(`[🤖OpenAI] Request starting...`);

  const heartbeatInterval = setInterval(() => {
    const elapsedTime = Date.now() - startTime;
    console.log(`[🤖OpenAI] Request in progress... ${elapsedTime / 1000}s elapsed`);
  }, 5000); // Log every 5 seconds

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  };

  try {
    let response: Response;
    try {
      response = await fetch(url, requestOptions);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenAITimeoutError(timeoutMs);
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new OpenAIResponseError(
        `API returned ${response.status}: ${errorText}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError('Request failed', error);
  } finally {
    clearInterval(heartbeatInterval);
    clearTimeout(timeoutId);
    console.log(`[🤖OpenAI] Request completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  }
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
  env: Env,
  schema: object,
  schemaName: string,
  model: string = env.OPENAI_MODEL
): Promise<string> {

  try {
    const { OPENAI_API_KEY: apiKey } = env;
    if (!apiKey) {
      throw new OpenAIConfigError("OPENAI_API_KEY is not set");
    }

    const body: ChatCompletionRequest = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    };

    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        schema,
        strict: true
      }
    };

    console.log(`[🤖OpenAI|${model}] Request:`, JSON.stringify(body));

    const response = await makeOpenAIRequest(
      "https://api.openai.com/v1/chat/completions",
      body,
      apiKey,
      60000
    );

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new OpenAIResponseError("Invalid API response - missing content");
    }

    const result = content.trim();
    console.log(`[🤖OpenAI|${model}] Response: ${result}`);
    return result;

  } catch (error) {
    if (error instanceof OpenAIError) {
      console.error(`[🤖OpenAI] ${error.name}: ${error.message}`);
      throw error;
    }
    console.error('[🤖OpenAI] Unexpected error:', error);
    throw new OpenAIError('Unexpected error occurred', error);
  }
}
