export interface PromotionItem {
  promotedItem: string;
  promotionTerms: string[];
  pros: string[];
  cons: string[];
  recommendation: "RECOMMENDED" | "NEUTRAL" | "NOT_RECOMMENDED";
}

export interface PromotionDetails {
  vendor: string;
  items: PromotionItem[];
  generalTerms: string[];
  additionalNotes: string[];
} 