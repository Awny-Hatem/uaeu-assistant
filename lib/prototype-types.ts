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
