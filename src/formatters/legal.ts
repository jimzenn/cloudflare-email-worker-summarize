import { formatList } from "@/formatters/common";
import { LegalDetails } from "@/types/legal";
import { markdownv2 as format } from "telegram-format";

export function formatLegalMessage(analysis: LegalDetails): string {
  const messageParts = [
    `${format.bold("Document Type:")} ${analysis.documentType}`,
    `${format.bold("Summary:")}\n${analysis.summary}`,
  ];

  if (analysis.changes && analysis.changes.length > 0) {
    messageParts.push(
      `${format.bold("Key Changes:")}\n${formatList(analysis.changes)}`
    );
  }

  messageParts.push(`${format.bold("Potential Impact:")}\n${analysis.impact}`);
  messageParts.push(
    `${format.bold("Recommendation:")}\n${analysis.recommendation}`
  );

  return messageParts.join("\n\n");
}