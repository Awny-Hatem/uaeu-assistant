export type AssistantSource =
  | "conversation"
  | "faq"
  | "rag"
  | "web"
  | "guide"
  | "error"
  | "escalated";

export type EscalationReason =
  | "low_confidence"
  | "sensitive_policy"
  | "requires_authorization"
  | "technical_support"
  | "student_requested_person";

export type Citation = {
  title: string;
  url?: string;
  document?: string;
  lastVerified?: string;
  evidenceText?: string;
  sourceSection?: string;
  sourceVersion?: string;
};

export const GROUNDING_REASON_CODES = [
  "unsupported_critical_token", "unsupported_detail", "scope_drift", "contradiction",
  "invalid_verification_contract", "verification_unavailable",
] as const;

export type AnswerGrounding = {
  status: "checked" | "rejected";
  rewriteCount: 0 | 1;
  reasonCodes: (typeof GROUNDING_REASON_CODES[number])[];
};

export type AnswerMetadata = {
  responseMode?: "canonical" | "grounded_generation";
  citations?: Citation[];
  communications?: UniversityCommunication[];
  guide?: ServiceGuide;
  escalationReason?: EscalationReason;
  provider?: string;
  model?: string;
  faqId?: string;
  topic?: string;
  evidenceIds?: string[];
  claims?: { text: string; evidenceIds: string[] }[];
  grounding?: AnswerGrounding;
  clarificationReason?: string;
  disposition?: "answer" | "clarify" | "portal" | "handoff" | "urgent";
};

export type GuideStep = {
  title: string;
  titleAr?: string;
  instruction: string;
  instructionAr?: string;
  note?: string;
  noteAr?: string;
  url?: string;
};

export type ServiceGuide = {
  id: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  officialUrl: string;
  lastVerified: string;
  audience: string[];
  keywords: string[];
  excludeKeywords?: string[];
  requiresVerification?: boolean;
  verificationNote?: string;
  verificationNoteAr?: string;
  steps: GuideStep[];
};

export type UniversityCommunication = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: "deadline" | "event" | "service" | "opportunity" | "announcement";
  keywords: string[];
  lastVerified: string;
  requiresVerification?: boolean;
};
