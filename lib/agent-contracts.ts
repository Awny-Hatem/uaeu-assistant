export const AGENT_MODES = [
  "explain",
  "decide",
  "plan",
  "navigate",
  "act",
  "handoff",
] as const;

export type AgentMode = (typeof AGENT_MODES)[number];

export const AGENT_ANSWER_STATUSES = [
  "verified",
  "computed",
  "partially_verified",
  "needs_input",
  "unavailable",
  "blocked",
] as const;

export type AgentAnswerStatus = (typeof AGENT_ANSWER_STATUSES)[number];

export const PORTAL_STATES = [
  "not_connected",
  "read_only",
  "draft",
  "awaiting_confirmation",
  "submitted",
  "failed",
] as const;

export type PortalState = (typeof PORTAL_STATES)[number];

export const AGENT_CLAIM_TYPES = [
  "institutional_fact",
  "computed_result",
  "student_provided",
  "unverified",
] as const;

export type AgentClaimType = (typeof AGENT_CLAIM_TYPES)[number];

export const AGENT_ACTION_KINDS = [
  "navigate",
  "draft",
  "submit",
  "handoff",
] as const;

export type AgentActionKind = (typeof AGENT_ACTION_KINDS)[number];
export type AgentActionRisk = "none" | "reversible" | "consequential" | "restricted";
export type AgentActionStatus = "available" | "awaiting_confirmation" | "completed" | "cancelled" | "failed";

export type AgentEvidence = {
  id: string;
  sourceType: "verified_answer" | "approved_document" | "official_web" | "portal" | "computed";
  title: string;
  url?: string;
  sourceSection?: string;
  lastVerified?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type AgentClaim = {
  id: string;
  text: string;
  type: AgentClaimType;
  evidenceIds: string[];
  scope?: {
    programId?: string;
    courseCodes?: string[];
    catalogYear?: number;
    term?: string;
    audience?: string;
  };
};

export type AgentAction = {
  id: string;
  kind: AgentActionKind;
  label: string;
  risk: AgentActionRisk;
  requiresConfirmation: boolean;
  status: AgentActionStatus;
  officialUrl?: string;
  draftId?: string;
};

export type AgentHandoff = {
  office: string;
  reason: string;
  officialUrl?: string;
  contextSummary?: string;
};

export type AgentResponse = {
  schemaVersion: 1;
  taskId: string;
  mode: AgentMode;
  answerStatus: AgentAnswerStatus;
  content: string;
  claims: AgentClaim[];
  evidence: AgentEvidence[];
  assumptions: string[];
  missingInputs: string[];
  actions: AgentAction[];
  portalState: PortalState;
  riskFlags: string[];
  handoff?: AgentHandoff;
};

export type AgentResponseInput = Omit<AgentResponse, "schemaVersion">;

export function createAgentResponse(input: AgentResponseInput): AgentResponse {
  return {
    schemaVersion: 1,
    taskId: input.taskId,
    mode: input.mode,
    answerStatus: input.answerStatus,
    content: input.content,
    claims: input.claims,
    evidence: input.evidence,
    assumptions: input.assumptions,
    missingInputs: input.missingInputs,
    actions: input.actions,
    portalState: input.portalState,
    riskFlags: input.riskFlags,
    ...(input.handoff ? { handoff: input.handoff } : {}),
  };
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

export function isAgentResponse(value: unknown): value is AgentResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Partial<AgentResponse>;
  return response.schemaVersion === 1 &&
    typeof response.taskId === "string" && response.taskId.trim().length > 0 &&
    oneOf(response.mode, AGENT_MODES) &&
    oneOf(response.answerStatus, AGENT_ANSWER_STATUSES) &&
    typeof response.content === "string" &&
    Array.isArray(response.claims) &&
    Array.isArray(response.evidence) &&
    stringArray(response.assumptions) &&
    stringArray(response.missingInputs) &&
    Array.isArray(response.actions) &&
    oneOf(response.portalState, PORTAL_STATES) &&
    stringArray(response.riskFlags);
}

export function actionRequiresConfirmation(action: AgentAction): boolean {
  return action.requiresConfirmation || action.risk === "consequential" || action.risk === "restricted";
}
