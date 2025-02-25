import { PromotionDetails } from "@/types/promotion";
import { markdownv2 as format } from 'telegram-format';
import { formatList, DIVIDER } from "@/formatters/common";
function formatPromotionItem(item: PromotionDetails['items'][0]): string {
  return [
    `*${item.promotedItem}*`,
    '',
    item.promotionTerms
      .map(term => `• ${term}`)
      .join('\n'),
    '',
    format.bold('Pros'),
    item.pros
      .map(pro => `${format.bold('✓')} ${pro}`)
      .join('\n'),
    '',
    format.bold('Cons'),
    item.cons
      .map(con => `${format.bold('✗')} ${con}`)
      .join('\n'),
    '',
    `*Verdict* ${format.bold(item.recommendation)}`
  ].join('\n');
}

export function formatPromotionMessage(analysis: PromotionDetails, title: string): string {
  const formattedItems = analysis.items.map(formatPromotionItem).join('\n');

  const generalTermsSection = analysis.generalTerms.length
    ? `*General Terms*\n${formatList(analysis.generalTerms)}`
    : '';

  const additionalNotesSection = analysis.additionalNotes.length
    ? `*Additional Notes*\n${formatList(analysis.additionalNotes)}`
    : '';

  return [
    `*${title}*`,
    DIVIDER,
    formattedItems,
    DIVIDER,
    generalTermsSection,
    DIVIDER,
    additionalNotesSection
  ].join('\n');
}