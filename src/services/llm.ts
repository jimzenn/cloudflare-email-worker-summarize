import { Env } from '@/types/env';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatDeepSeek } from '@langchain/deepseek';
import { type JsonSchema } from '@langchain/core/utils/json_schema';

export class LLMError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

export async function queryLLM(
  systemPrompt: string,
  userPrompt: string,
  env: Env,
  schema: JsonSchema,
  schemaName: string,
  reasoning: boolean = false,
  provider: 'openai' | 'gemini' | 'deepseek' = 'gemini',
  temperature: number = 0.7
): Promise<{ response: string; model: string }> {
  let model: BaseChatModel;
  let modelName: string;

  try {
    switch (provider) {
      case 'openai':
        modelName = reasoning ? env.OPENAI_REASONING_MODEL : env.OPENAI_MODEL;
        if (!env.OPENAI_API_KEY) throw new LLMError('OPENAI_API_KEY is not set');
        model = new ChatOpenAI({
          apiKey: env.OPENAI_API_KEY,
          model: modelName,
          temperature,
        });
        break;
      case 'gemini':
        modelName = reasoning ? env.GEMINI_REASONING_MODEL : env.GEMINI_MODEL;
        if (!env.GEMINI_API_KEY) throw new LLMError('GEMINI_API_KEY is not set');
        model = new ChatGoogleGenerativeAI({
          apiKey: env.GEMINI_API_KEY,
          model: modelName,
          temperature,
        });
        break;
      case 'deepseek':
        modelName = reasoning ? env.DEEPSEEK_REASONING_MODEL : env.DEEPSEEK_MODEL;
        if (!env.DEEPSEEK_API_KEY) throw new LLMError('DEEPSEEK_API_KEY is not set');
        model = new ChatDeepSeek({
          apiKey: env.DEEPSEEK_API_KEY,
          model: modelName,
          temperature,
        });
        break;
      default:
        const exhaustiveCheck: never = provider;
        throw new LLMError(`Unsupported provider: ${exhaustiveCheck}`);
    }

    const structuredModel = model.withStructuredOutput(schema, {
      name: schemaName,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", "{input}"],
    ]);

    const chain = prompt.pipe(structuredModel);

    console.log(`[🤖${provider}|${modelName}] Request starting...`);
    const startTime = Date.now();

    const response = await chain.invoke({ input: userPrompt });

    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`[🤖${provider}|${modelName}] Request completed in ${elapsedTime.toFixed(2)}s`);

    const result = JSON.stringify(response);
    console.log(`[🤖${provider}|${modelName}] Response: ${result}`);

    return { response: result, model: modelName };

  } catch (error) {
    const modelNameForError = provider ? (reasoning ? env[`${provider.toUpperCase()}_REASONING_MODEL` as keyof Env] : env[`${provider.toUpperCase()}_MODEL` as keyof Env]) || 'unknown' : 'unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[🤖${provider}|${modelNameForError}] LLMError: ${errorMessage}`, error);
    throw new LLMError(`[${provider}] ${errorMessage}`, error);
  }
}