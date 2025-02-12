export enum EmailCategory {
  EVENT = "event",
  TRANSACTION = "transaction",
  PROMOTION = "promotion",
  POLICY_CHANGE = "policy_change",
  VERIFICATION = "verification",
  NEWSLETTER = "newsletter",
  TRACKING = "tracking",
  NOTIFICATION = "notification",
  CYBER_SECURITY = "cyber_security",
  SCAM = "scam",
  OFFER = "offer",
  ACTIONABLE = "actionable",
  OTHER = "other"
}

export enum AssistantAction {
  ONE_TIME_CODE = "one_time_code",
  NOTIFY = "notify",
  REPLY = "reply",
  CREATE_CALENDAR_EVENT = "create_calendar_event",
  UPDATE_CALENDAR_EVENT = "update_calendar_event",
  SUBSCRIBE_TRACKING = "subscribe_tracking",
  RESEARCH = "research",
  ESTIMATE_TIME_TO_COMPLETE = "estimate_time_to_complete",
  SUMMARIZE = "summarize",
  NONE = "none"
}

export type TriageResponse = {
  category: EmailCategory;
  assistant_actions: AssistantAction[];
  domain_knowledge: string[];
};

