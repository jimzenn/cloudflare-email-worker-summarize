import { PromotionDetails } from "@/types/promotion";

export function formatPromotionMessage(analysis: PromotionDetails, title: string): string {
  return `*${title}*\n\n` +
    analysis.items.map(item => {
      return `*${item.promotedItem}*\n` +
        `${item.promotionTerms.map(term => `• ${term}`).join('\n')}\n` +
        `Pros:\n${item.pros.map(pro => `✓ ${pro}`).join('\n')}\n` +
        `Cons:\n${item.cons.map(con => `✗ ${con}`).join('\n')}\n` +
        `*Verdict:* ${item.recommendation}\n`;
    }).join('\n') +
    (analysis.generalTerms.length ? `\n*General Terms:*\n${analysis.generalTerms.map(term => `• ${term}`).join('\n')}\n` : '') +
    (analysis.additionalNotes.length ? `\n*Additional Notes:*\n${analysis.additionalNotes.map(note => `• ${note}`).join('\n')}` : '');
}