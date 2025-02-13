export enum EmailCategory {
  FLIGHT = "flight",
  TRAIN = "train",
  TRANSPORTATION = "transportation",
  HOTEL = "hotel",
  SHOW = "show",
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

export type TriageInfo = {
  category: EmailCategory;
  domain_knowledge: string[];
};

