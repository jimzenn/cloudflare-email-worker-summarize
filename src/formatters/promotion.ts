import { PromotionDetails } from "@/types/promotion";
import { markdownv2 as format } from 'telegram-format';
import { formatList, DIVIDER } from "@/formatters/common";
function formatPromotionItem(item: PromotionDetails['items'][0]): string {
  return [
    format.bold(item.promotedItem),
    '',
    formatList(item.deal),
    '',
    format.bold('Pros'),
    formatList(item.pros, '✓'),
    '',
    format.bold('Cons'),
    formatList(item.cons, '✗'),
    '',
    format.bold('Thoughts'),
    formatList(item.thoughts),
    '',
    `*Verdict* ${format.bold(item.verdict)}`
  ].join('\n');
}

export function formatPromotionMessage(analysis: PromotionDetails): string {
  const formattedItems = analysis.items.map(formatPromotionItem).join(`\n${DIVIDER}\n`);

  const generalTermsSection = analysis.generalTerms.length
    ? `*General Terms*\n${formatList(analysis.generalTerms)}`
    : '';

  const additionalNotesSection = analysis.additionalNotes.length
    ? `*Additional Notes*\n${formatList(analysis.additionalNotes)}`
    : '';

  return [
    formattedItems,
    DIVIDER,
    generalTermsSection,
    DIVIDER,
    additionalNotesSection
  ].join('\n');
}