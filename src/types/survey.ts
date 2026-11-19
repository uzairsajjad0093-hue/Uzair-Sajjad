export type QuestionId =
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'Q5'
  | 'Q6'
  | 'Q7'
  | 'Q8'
  | 'Q9'
  | 'Q10'
  | 'Q11'
  | 'Q12'
  | 'Q13'
  | 'Q14'
  | 'Q15'
  | 'Q16'
  | 'Q17'
  | 'Q18'
  | 'Q19'
  | 'Q20'
  | 'Q21';

export type SurveyAnswers = Partial<Record<QuestionId, string>>;

export interface SurveyQuestion {
  id: QuestionId;
  number: number;
  text: string;
  options: readonly string[];
  sheetColumn: string;
  conditionalOptionalOnQ10?: boolean;
}

export interface SurveySection {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  questions: readonly SurveyQuestion[];
}

export interface SurveySubmissionPayload {
  participantName?: string;
  consentConfirmed: boolean;
  minorAcknowledged?: boolean;
  answers: SurveyAnswers;
  idempotencyKey: string;
  surveyVersion: string;
}

export interface StoredSurveyResponse {
  responseId: string;
  submittedAt: string;
  participantName: string;
  answers: Record<QuestionId, string>;
  consentConfirmed: string;
  surveyVersion: string;
}

export interface IntegrationStatus {
  configured: boolean;
  source: 'env' | 'runtime-config' | 'none';
  hasSecret: boolean;
  maskedUrl: string;
  contactEmail: string;
  retentionDays: number;
  lastCheckedOk?: boolean;
  lastCheckedMessage?: string;
}

export interface PublicPolicyConfig {
  contactEmail: string;
  retentionDays: number;
  sheetsConfigured: boolean;
}
