import { formatTrackingMessage } from "@/formatters/tracking";
import { PROMPT_EXTRACT_TRACKING_INFO } from "@/prompts/tracking";
import { TrackingInfo, TrackingInfoSchema } from "@/types/zod/tracking";
import { BaseHandler } from "./base";

export class TrackingHandler extends BaseHandler<TrackingInfo> {
  protected schema = TrackingInfoSchema;
  protected systemPrompt = PROMPT_EXTRACT_TRACKING_INFO;
  protected handlerName = "Tracking";
  protected actionName = "TrackingInfo";

  async formatMessage(trackingInfo: TrackingInfo) {
    return formatTrackingMessage(trackingInfo);
  }
}
