export type EmailCategory =
  | 'flight'
  | 'stay'
  | 'train'
  | 'transportation'
  | 'experience'
  | 'event'
  | 'bill'
  | 'promotion'
  | 'legal'
  | 'verification'
  | 'newsletter'
  | 'tracking'
  | 'notification'
  | 'scam'
  | 'offer'
  | 'actionable'
  | 'other';

export interface TriageInfo {
  category: EmailCategory;
  domainKnowledge: string[];
  cleanedEmailBody: string;
  shouldDrop: boolean;
}

