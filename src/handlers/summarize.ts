import { PROMPT_SUMMARIZE_MARKDOWN_V2 } from "@/prompts/actions";
import { queryLLM } from "@/services/llm";
import { SummarizeResponse, SummarizeResponseSchema } from "@/types/zod/summarize";
import { BaseHandler } from "./base";

export class SummarizeHandler extends BaseHandler<SummarizeResponse> {
  protected schema = SummarizeResponseSchema;
  protected systemPrompt = PROMPT_SUMMARIZE_MARKDOWN_V2;
  protected handlerName = "Summarize";
  protected actionName = "SummarizeResponse";

  protected async extractData(): Promise<{ data: SummarizeResponse; model: string; }> {
    const { response, model } = await queryLLM(
      this.systemPrompt,
      await this.getUserPrompt(),
      this.env,
      this.schema,
      this.actionName,
      false, // reasoning
      'gemini' // provider
    );
    const data = JSON.parse(response);
    return { data, model };
  }

  protected async formatMessage(data: SummarizeResponse) {
    return {
      title: data.summarized_title,
      message: data.summary,
    };
  }
}
