import { PromotionDetails } from "@/types/promotion";
import { markdownv2 as format } from 'telegram-format';
import { formatList, DIVIDER } from "@/formatters/common";

function formatPromotionItem(item: PromotionDetails['items'][0]): string {

  let verdict = item.verdict;
  if (item.verdict === 'NOT_INFORMATIVE') {
    verdict = '⚠ ' + verdict;
  } else if (item.verdict === 'NOT_RECOMMENDED') {
    verdict = '✗ ' + verdict;
  } else if (item.verdict === 'RECOMMENDED') {
    verdict = '✓ ' + verdict;
  } else {
    verdict = '⍻ ' + verdict;
  }

  const dealSection = item.deal.length ? formatList(item.deal) : null;
  const prosSection = item.pros.length ? `${format.bold('Pros')}\n${formatList(item.pros, '✓')}` : null;
  const consSection = item.cons.length ? `${format.bold('Cons')}\n${formatList(item.cons, '✗')}` : null;
  const thoughtsSection = item.thoughts.length ? `${format.bold('Thoughts')}\n${formatList(item.thoughts)}` : null;


  return [
    '◎ ' + format.bold(item.promotedItem),
    dealSection,
    prosSection,
    consSection,
    thoughtsSection,
    `*Verdict:* ${format.bold(verdict)}`
  ].filter(Boolean).join('\n\n');
}

export function formatPromotionMessage(analysis: PromotionDetails): string {
  const formattedItems = analysis.items.map(formatPromotionItem).join(`\n${DIVIDER}\n`);
  const parts = [formattedItems];

  if (analysis.generalTerms.length) {
    const generalTermsSection = `*General Terms*\n${formatList(analysis.generalTerms)}`;
    parts.push(DIVIDER, generalTermsSection);
  }

  if (analysis.additionalNotes.length) {
    const additionalNotesSection = `*Additional Notes*\n${formatList(analysis.additionalNotes)}`;
    parts.push(DIVIDER, additionalNotesSection);
  }

  return parts.join('\n\n');
}