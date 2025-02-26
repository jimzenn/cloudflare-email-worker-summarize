import { Env } from "@/types/env";
import { makeAPIRequest } from "@/services/llm";
import { LLMError } from "@/services/llm";

type ChatRole = "user" | "model";

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role?: ChatRole;
    };
    finishReason: string;
  }[];
}

interface GeminiRequest {
  contents: {
    role: ChatRole;
    parts: { text: string }[];
  }[];
  generationConfig?: {
    temperature?: number;
    stopSequences?: string[];
    responseMimeType?: string;
    responseSchema?: object;
  };
}

class GeminiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GeminiError';
  }
}

class GeminiConfigError extends GeminiError {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

class GeminiResponseError extends GeminiError {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'GeminiResponseError';
  }
}

async function makeGeminiRequest(
  url: string,
  body: GeminiRequest,
  apiKey: string,
): Promise<GeminiResponse> {
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  };

  try {
    return await makeAPIRequest<GeminiResponse>("Gemini", url, requestOptions);
  } catch (error) {
    if (error instanceof LLMError) {
      throw new GeminiError(error.message, error.cause);
    }
    throw new GeminiError('Request failed', error);
  }
}

function stripSchemaMetadata(schema: any): any {
  const { 
    properties, 
    required, 
    type, 
    items,
    format,
    enum: enumValues,
    description,
    nullable,
    maxItems,
    minItems,
    propertyOrdering,
    // Explicitly remove unsupported properties
    $schema,
    additionalProperties,
    ...rest 
  } = schema;
  
  const cleanedSchema: any = {
    // Convert type to uppercase as required by Gemini API
    ...(type && { type: type.toUpperCase() }),
    ...(format && { format }),
    ...(enumValues && { enum: enumValues }),
    ...(description && { description }),
    ...(nullable && { nullable }),
    ...(maxItems && { maxItems }),
    ...(minItems && { minItems }),
    ...(propertyOrdering && { propertyOrdering }),
    ...(properties && { 
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, stripSchemaMetadata(value)])
      )
    }),
    ...(items && { items: stripSchemaMetadata(items) }),
    ...(required && { required })
  };

  return cleanedSchema;
}

/**
 * Queries the Google Gemini API with a system prompt and a user prompt.
 *
 * Environment Variables:
 * - GEMINI_API_KEY: Your Google API key
 * - GEMINI_MODEL: The model to use
 * - GEMINI_REASONING_MODEL: The reasoning model to use
 *
 * @param systemPrompt - The system-level prompt that sets the context
 * @param userPrompt - The user's query or prompt
 * @returns The model's response as a string
 */
export async function queryGemini(
  systemPrompt: string,
  userPrompt: string,
  env: Env,
  schema: object,
  schemaName: string,
  reasoning: boolean = false,
  temperature: number = 0,
): Promise<string> {
  try {
    const apiKey = env.GEMINI_API_KEY;
    const model = reasoning ? env.GEMINI_REASONING_MODEL : env.GEMINI_MODEL;
    
    if (!apiKey) {
      throw new GeminiConfigError("GEMINI_API_KEY is not set");
    }

    const cleanedSchema = stripSchemaMetadata(schema);

    const body: GeminiRequest = {
      contents: [
        {
          role: "model",
          parts: [{ text: "Here is my job description: " + systemPrompt }]
        },
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: temperature,
        responseMimeType: "application/json",
        responseSchema: cleanedSchema
      }
    };

    console.log(`[🤖Gemini|${model}] Request:`, JSON.stringify(body));

    const response = await makeGeminiRequest(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      body,
      apiKey,
    );

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new GeminiResponseError("Invalid API response - missing content");
    }

    const result = content.trim();
    console.log(`[🤖Gemini|${model}] Response: ${result}`);
    return result;

  } catch (error) {
    if (error instanceof GeminiError) {
      console.error(`[🤖Gemini] ${error.name}: ${error.message}`);
      throw error;
    }
    console.error('[🤖Gemini] Unexpected error:', error);
    throw new GeminiError('Unexpected error occurred', error);
  }
}
