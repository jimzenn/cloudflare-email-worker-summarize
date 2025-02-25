export interface PromotionItem {
  promotedItem: string;
  itemDescription: string;
  deal: string[];
  pros: string[];
  cons: string[];
  thoughts: string[];
  verdict: string;
}

export interface PromotionDetails {
  vendor: string;
  items: PromotionItem[];
  generalTerms: string[];
  additionalNotes: string[];
} 