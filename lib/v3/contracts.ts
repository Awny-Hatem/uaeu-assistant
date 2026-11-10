/**
 * Versioned contracts for the incremental V3 pipeline. These contracts are
 * intentionally separate from the existing UI AgentResponse payload so the
 * chat API can migrate without breaking current clients.
 */

export const EXECUTION_MODES = [
  "SIMPLE_CONVERSATION",
  "GENERAL_EXPLANATION",
  "UAEU_FACTUAL",
  "CURRENT_UAEU_RESEARCH",
  "PERSONALIZED_ACADEMIC",
  "COMPLEX_SCENARIO",
  "UNIVERSITY_TRANSACTION",
] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const RESOLUTION_STATES = [
  "VERIFIED",
  "CONDITIONAL",
  "MISSING_CONTEXT",
  "CONFLICTED",
  "STALE",
  "AUTHORIZATION_REQUIRED",
  "HUMAN_DECISION_REQUIRED",
  "UNSUPPORTED",
] as const;
export type ResolutionState = (typeof RESOLUTION_STATES)[number];

export type EvidenceSourceType =
  | "approved_rule"
  | "approved_document"
  | "verified_answer"
  | "official_web"
  | "official_external"
  | "general";
export type EvidenceFreshness = "current" | "stale" | "unknown";
export type EvidenceTrust = "approved" | "verified_official" | "discovered";

export type EvidenceScopeV3 = {
  domain?: string;
  eventType?: string;
  programId?: string;
  courseCodes?: string[];
  degreeLevel?: "undergraduate" | "postgraduate";
  cohort?: string;
  catalogYear?: number;
  term?: string;
  year?: number;
  audience?: string;
  applicantCategory?: "national" | "international";
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type EvidenceItem = {
  id: string;
  sourceType: EvidenceSourceType;
  title: string;
  excerpt: string;
  retrievedAt: string;
  url?: string;
  lastVerified?: string;
  authority?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  scope?: EvidenceScopeV3;
  freshnessStatus: EvidenceFreshness;
  trustStatus: EvidenceTrust;
};

export type ExecutionEntities = {
  courses?: string[];
  program?: string;
  cohort?: string;
  term?: string;
  year?: number;
  applicantCategory?: string;
};

export type ExecutionNeeds = {
  evidence: boolean;
  liveResearch: boolean;
  studentData: boolean;
  academicRules: boolean;
  planning: boolean;
  universityAction: boolean;
};

export type ExecutionPlan = {
  schemaVersion: 1;
  mode: ExecutionMode;
  normalizedRequest: string;
  requestedFacts: string[];
  entities: ExecutionEntities;
  needs: ExecutionNeeds;
  missingContext: string[];
};

export type EvidenceQuery = {
  request: string;
  requestedFacts: string[];
  scope: EvidenceScopeV3;
  freshnessRequirement: "normal" | "current";
  maxItems?: number;
};

export type EvidenceConflict = {
  id: string;
  evidenceIds: string[];
  description: string;
  resolution: "unresolved" | "precedence_applied";
};

export type EvidenceResult = {
  schemaVersion: 1;
  status: "FOUND" | "PARTIAL" | "NOT_FOUND" | "STALE" | "CONFLICTED";
  evidence: EvidenceItem[];
  missingFacts: string[];
  conflicts: EvidenceConflict[];
};

export type AnswerClaim = {
  id: string;
  text: string;
  type: "FACT" | "RULE" | "COMPUTED" | "PREDICTION" | "DECISION";
  evidenceIds: string[];
  ruleEvaluationId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isExecutionPlan(value: unknown): value is ExecutionPlan {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isOneOf(value.mode, EXECUTION_MODES)) return false;
  if (typeof value.normalizedRequest !== "string" || !isStringArray(value.requestedFacts) || !isStringArray(value.missingContext)) return false;
  if (!isRecord(value.entities) || !isRecord(value.needs)) return false;
  const needs = value.needs;
  return ["evidence", "liveResearch", "studentData", "academicRules", "planning", "universityAction"]
    .every((key) => typeof needs[key] === "boolean") &&
    isOptionalString(value.entities.program) && isOptionalString(value.entities.cohort) &&
    isOptionalString(value.entities.term) && isOptionalString(value.entities.applicantCategory) &&
    (value.entities.year === undefined || (typeof value.entities.year === "number" && Number.isInteger(value.entities.year))) &&
    (value.entities.courses === undefined || isStringArray(value.entities.courses));
}

export function isEvidenceItem(value: unknown): value is EvidenceItem {
  if (!isRecord(value)) return false;
  const scope = value.scope;
  const validScope = scope === undefined || (isRecord(scope) &&
    isOptionalString(scope.domain) && isOptionalString(scope.eventType) && isOptionalString(scope.programId) &&
    isOptionalString(scope.cohort) && isOptionalString(scope.term) && isOptionalString(scope.audience) &&
    (scope.degreeLevel === undefined || isOneOf(scope.degreeLevel, ["undergraduate", "postgraduate"] as const)) &&
    (scope.applicantCategory === undefined || isOneOf(scope.applicantCategory, ["national", "international"] as const)) &&
    (scope.catalogYear === undefined || (typeof scope.catalogYear === "number" && Number.isInteger(scope.catalogYear))) &&
    (scope.year === undefined || (typeof scope.year === "number" && Number.isInteger(scope.year))) &&
    (scope.effectiveFrom === undefined || isIsoDate(scope.effectiveFrom)) &&
    (scope.effectiveTo === undefined || isIsoDate(scope.effectiveTo)) &&
    (scope.courseCodes === undefined || isStringArray(scope.courseCodes)));
  return typeof value.id === "string" && value.id.length > 0 &&
    isOneOf(value.sourceType, ["approved_rule", "approved_document", "verified_answer", "official_web", "official_external", "general"] as const) &&
    typeof value.title === "string" && value.title.length > 0 && typeof value.excerpt === "string" &&
    isIsoDate(value.retrievedAt) && isOptionalString(value.url) && isOptionalString(value.authority) &&
    (value.lastVerified === undefined || isIsoDate(value.lastVerified)) &&
    (value.effectiveFrom === undefined || isIsoDate(value.effectiveFrom)) &&
    (value.effectiveTo === undefined || isIsoDate(value.effectiveTo)) && validScope &&
    isOneOf(value.freshnessStatus, ["current", "stale", "unknown"] as const) &&
    isOneOf(value.trustStatus, ["approved", "verified_official", "discovered"] as const);
}

export function isEvidenceResult(value: unknown): value is EvidenceResult {
  if (!isRecord(value) || value.schemaVersion !== 1 ||
    !isOneOf(value.status, ["FOUND", "PARTIAL", "NOT_FOUND", "STALE", "CONFLICTED"] as const) ||
    !Array.isArray(value.evidence) || !value.evidence.every(isEvidenceItem) ||
    !isStringArray(value.missingFacts) || !Array.isArray(value.conflicts)) return false;
  return value.conflicts.every((conflict) => isRecord(conflict) &&
    typeof conflict.id === "string" && isStringArray(conflict.evidenceIds) &&
    typeof conflict.description === "string" &&
    isOneOf(conflict.resolution, ["unresolved", "precedence_applied"] as const));
}
