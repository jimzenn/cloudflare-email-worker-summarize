import { Env } from "@/types/env";
import { LLMError, makeAPIRequest } from "@/services/llm";

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface DeepSeekResponse {
  choices: {
    message: ChatMessage;
    finish_reason: string;
  }[];
}

interface DeepSeekRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  response_format?: {
    type: 'json_object';
  };
}

class DeepSeekError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DeepSeekError';
  }
}

class DeepSeekConfigError extends DeepSeekError {
  constructor(message: string) {
    super(message);
    this.name = 'DeepSeekConfigError';
  }
}

class DeepSeekResponseError extends DeepSeekError {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'DeepSeekResponseError';
  }
}

async function makeDeepSeekRequest(
  url: string,
  body: DeepSeekRequest,
  apiKey: string,
): Promise<DeepSeekResponse> {
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  };

  try {
    return await makeAPIRequest<DeepSeekResponse>("DeepSeek", url, requestOptions);
  } catch (error) {
    if (error instanceof LLMError) {
      throw new DeepSeekError(error.message, error.cause);
    }
    throw new DeepSeekError('Request failed', error);
  }
}

export async function queryDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  env: Env,
  schema: object,
  schemaName: string,
  reasoning: boolean = false,
  temperature: number = 0,
): Promise<string> {
  try {
    const apiKey = env.DEEPSEEK_API_KEY;
    const model = reasoning ? env.DEEPSEEK_REASONING_MODEL : env.DEEPSEEK_MODEL;
    
    if (!apiKey) {
      throw new DeepSeekConfigError("DEEPSEEK_API_KEY is not set");
    }

    // Add JSON format instruction to system prompt
    const jsonInstruction = `\nPlease provide your response in JSON format following this schema: ${JSON.stringify(schema)}`;
    const enhancedSystemPrompt = systemPrompt + jsonInstruction;

    const body: DeepSeekRequest = {
      model,
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temperature,
      response_format: {
        type: 'json_object'
      }
    };

    console.log(`[🤖DeepSeek|${model}] Request:`, JSON.stringify(body));

    const response = await makeDeepSeekRequest(
      "https://api.deepseek.com/v1/chat/completions",
      body,
      apiKey,
    );

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new DeepSeekResponseError("Invalid API response - missing content");
    }

    const result = content.trim();
    console.log(`[🤖DeepSeek|${model}] Response: ${result}`);
    
    return result;

  } catch (error) {
    if (error instanceof DeepSeekError) {
      console.error(`[🤖DeepSeek] ${error.name}: ${error.message}`);
      throw error;
    }
    console.error('[🤖DeepSeek] Unexpected error:', error);
    throw new DeepSeekError('Unexpected error occurred', error);
  }
}
