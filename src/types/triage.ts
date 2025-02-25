export type EmailCategory = 'flight' | 'train' | 'transportation' | 'hotel' | 'show' | 'event' |
  'transaction' | 'promotion' | 'policy_change' | 'verification' | 'newsletter' |
  'tracking' | 'notification' | 'cyber_security' | 'scam' | 'offer' |
  'actionable' | 'other';

export interface TriageInfo {
  category: EmailCategory;
  domainKnowledge: string[];
  cleaneEmailBody: string;
}

