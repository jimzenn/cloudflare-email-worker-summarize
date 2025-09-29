import { LegalDetails } from "@/types/legal";

export function formatLegalMessage(analysis: LegalDetails): string {
  let message = `**Document Type:** ${analysis.documentType}\n\n`;
  message += `**Summary:**\n${analysis.summary}\n\n`;

  if (analysis.changes.length > 0) {
    message += "**Key Changes:**\n";
    analysis.changes.forEach(change => {
      message += `- ${change}\n`;
    });
    message += "\n";
  }

  message += `**Potential Impact:**\n${analysis.impact}\n\n`;
  message += `**Recommendation:**\n${analysis.recommendation}`;

  return message;
}