import { courseCodes, namedSubjects, normalizeQuery, resolveConversation, understandQuery } from "@/lib/query-understanding";
import type { EvidenceQuery, ExecutionMode, ExecutionPlan } from "@/lib/v3/contracts";

export type OrchestratorMessage = { role: "user" | "assistant"; content: string };

export type OrchestratorInput = {
  conversation: OrchestratorMessage[];
  latest: string;
  authenticatedScopes?: string[];
};

const UAEU_TERMS = /\b(?:uaeu|university|college|admissions?|applications?|registration|semester|course|degree|scholarships?|housing|transcript|graduation|portal|student services|academic calendar)\b|Ø¬Ø§Ù…Ø¹[Ø©Ù‡]|Ø§Ù„ÙƒÙ„ÙŠ[Ø©Ù‡]|Ø§Ù„ØªØ³Ø¬ÙŠÙ„|Ø§Ù„Ù‚Ø¨ÙˆÙ„|Ø§Ù„ØªØ®Ø±Ø¬/u;
const CURRENT_TERMS = /\b(?:current|currently|today|latest|upcoming|this (?:term|semester|year)|deadlines?|due dates?|last days?|closing dates?|when does .* open|when does .* close|start dates?|exam dates?)\b/u;
const ACTION_TERMS = /\b(?:submit|withdraw|drop|register me|enroll me|pay this|apply for me|change my major|cancel my course)\b|Ù‚Ø¯Ù‘Ù… Ø·Ù„Ø¨ÙŠ|Ø§Ù†Ø³Ø­Ø¨ Ù„ÙŠ|Ø³Ø¬Ù„Ù†ÙŠ|Ø§Ø¯ÙØ¹ Ù„ÙŠ/u;
const COMPLEX_TERMS = /\b(?:failed|fail(?:ed|ing)?|twice|third time|blocked|delay(?:ed)?|graduate|graduation plan|what should i do|options|scenario|because|although|but)\b|Ø±Ø³Ø¨Øª|Ø§Ù„ØªØ®Ø±Ø¬|ØªØ£Ø®Ø±|Ù…Ø±ØªÙŠÙ†|Ù…Ø§Ø°Ø§ Ø£ÙØ¹Ù„/u;
const PERSONALIZED_TERMS = /\b(?:can i|am i|do i|my (?:degree|major|courses|gpa|record|progress|graduation)|i have completed|i failed|i passed|i am a student)\b|Ù‡Ù„ Ø£Ø³ØªØ·ÙŠØ¹|Ù‡Ù„ Ø£Ù†Ø§|Ù…Ù‚Ø±Ø±Ø§ØªÙŠ|Ù…Ø¹Ø¯Ù„ÙŠ/u;
const DEADLINE_TERMS = /\b(?:deadline|due date|last day|closing date|application period|when .* close|when .* due)\b|Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ|Ø¢Ø®Ø± Ù…ÙˆØ¹Ø¯/u;
const LOCATION_LOOKUP = /\bwhere (?:can|do) i (?:check|find|see)|\bwhere is (?:the )?(?:academic )?calendar\b/u;
const PROGRAM_KEYS = new Set(["computer-engineering", "information-security", "information-technology", "mechanical-engineering", "computer-science"]);

const SUBJECT_TO_DOMAIN: Record<string, string> = {
  admissions: "admissions", calendar: "calendar", registration: "registration",
  scholarship: "financial_aid", tuition: "finance", housing: "housing", visa: "visa",
  graduation: "graduation", library: "library", password: "it", wifi: "it", parking: "campus",
  counseling: "wellbeing", medical: "wellbeing", internship: "careers", "student-document": "student_services",
  "major-change": "academics", "computer-engineering": "academics", "information-security": "academics",
  "information-technology": "academics", "mechanical-engineering": "academics", "computer-science": "academics",
};

function executionMode(latest: string, query: string): ExecutionMode {
  const text = normalizeQuery(latest);
  if (/^(?:hi|hello|hey|thanks|thank you|good morning|good afternoon|مرحبا|شكرا)[!. ]*$/u.test(text)) return "SIMPLE_CONVERSATION";
  if (ACTION_TERMS.test(text)) return "UNIVERSITY_TRANSACTION";
  if (COMPLEX_TERMS.test(text) && (UAEU_TERMS.test(text) || courseCodes(query).length > 0)) return "COMPLEX_SCENARIO";
  const subjects = namedSubjects(query).map(({ key }) => key);
  const academicOrServiceTarget = courseCodes(query).length > 0 || subjects.some((subject) =>
    ["admissions", "registration", "graduation", "major-change", ...PROGRAM_KEYS, "scholarship", "housing"].includes(subject));
  if (PERSONALIZED_TERMS.test(text) && academicOrServiceTarget) return "PERSONALIZED_ACADEMIC";
  if (CURRENT_TERMS.test(text) && UAEU_TERMS.test(text) && !LOCATION_LOOKUP.test(text)) return "CURRENT_UAEU_RESEARCH";
  if (UAEU_TERMS.test(text) || courseCodes(query).length > 0) return "UAEU_FACTUAL";
  return "GENERAL_EXPLANATION";
}

function requestedDomain(latest: string, resolvedQuery: string, contextUsed: boolean): { domain?: string; ambiguous: boolean } {
  const latestSubjects = namedSubjects(latest).map(({ key }) => key);
  const resolvedSubjects = namedSubjects(resolvedQuery).map(({ key }) => key);
  const relevantLatest = [...new Set(latestSubjects.map((subject) => SUBJECT_TO_DOMAIN[subject]).filter(Boolean))];
  if (relevantLatest.length === 1) return { domain: relevantLatest[0], ambiguous: false };
  if (relevantLatest.length > 1) return { ambiguous: true };
  if (!contextUsed) return { ambiguous: false };
  const relevantResolved = [...new Set(resolvedSubjects.map((subject) => SUBJECT_TO_DOMAIN[subject]).filter(Boolean))];
  if (relevantResolved.length === 1) return { domain: relevantResolved[0], ambiguous: false };
  return { ambiguous: relevantResolved.length > 1 };
}

/**
 * Build a conservative plan from the latest turn plus explicit conversation
 * resolution. This plans work only; it cannot authorize portal actions or
 * manufacture missing academic facts.
 */
export function createExecutionPlan(input: OrchestratorInput): ExecutionPlan {
  const latest = input.latest.trim();
  const resolution = resolveConversation(input.conversation, latest);
  const normalizedRequest = resolution.usedContext ? resolution.query : latest;
  const meaning = understandQuery(normalizedRequest);
  const latestMeaning = understandQuery(latest);
  const mode = executionMode(latest, normalizedRequest);
  const domain = requestedDomain(latest, normalizedRequest, resolution.usedContext);
  const missingContext: string[] = [];
  const isLocationLookup = LOCATION_LOOKUP.test(normalizeQuery(latest));
  const deadlineQuestion = DEADLINE_TERMS.test(normalizeQuery(normalizedRequest)) || latestMeaning.intents.includes("deadline");
  const asksDeadlineValue = deadlineQuestion && !isLocationLookup;

  if (deadlineQuestion && domain.ambiguous) missingContext.push("which deadline process you mean");
  else if (deadlineQuestion && !domain.domain) missingContext.push("the program or service whose deadline you need");
  if (asksDeadlineValue && !meaning.years.length && !meaning.terms.length) missingContext.push("the intake or academic year");
  if (asksDeadlineValue && domain.domain === "admissions" && !meaning.applicantCategory && !meaning.applicantCategories.length) missingContext.push("your applicant category");
  if (meaning.intents.includes("prerequisites") && !meaning.codes.length && !resolution.subject) missingContext.push("the course code");
  if (meaning.intents.includes("courses") && /\b(?:degree plan|study plan|graduation plan|plan my courses)\b/u.test(meaning.normalized) && !resolution.subject) missingContext.push("your degree program");
  if (["PERSONALIZED_ACADEMIC", "COMPLEX_SCENARIO"].includes(mode) && !input.authenticatedScopes?.includes("student-record:read")) {
    missingContext.push("authenticated access to your student record for a personal eligibility decision");
  }
  if (mode === "UNIVERSITY_TRANSACTION") missingContext.push("an approved UAEU portal integration and your explicit confirmation before any submission");

  const codes = [...new Set([...meaning.codes, ...latestMeaning.codes])];
  const subjects = namedSubjects(normalizedRequest);
  const programSubject = subjects.find(({ key }) => PROGRAM_KEYS.has(key));
  const needs = {
    evidence: mode === "UAEU_FACTUAL" || mode === "CURRENT_UAEU_RESEARCH" || mode === "PERSONALIZED_ACADEMIC" || mode === "COMPLEX_SCENARIO",
    liveResearch: mode === "CURRENT_UAEU_RESEARCH",
    studentData: mode === "PERSONALIZED_ACADEMIC" || mode === "COMPLEX_SCENARIO",
    academicRules: mode === "PERSONALIZED_ACADEMIC" || mode === "COMPLEX_SCENARIO",
    planning: mode === "COMPLEX_SCENARIO" || /\b(?:degree plan|study plan|graduation plan|plan my courses)\b/u.test(meaning.normalized),
    universityAction: mode === "UNIVERSITY_TRANSACTION",
  };

  return {
    schemaVersion: 1,
    mode,
    normalizedRequest,
    requestedFacts: meaning.intents.length ? meaning.intents : ["answer the user's question"],
    entities: {
      ...(codes.length ? { courses: codes } : {}),
      ...(programSubject ? { program: programSubject.key } : resolution.subject && PROGRAM_KEYS.has(resolution.subject.key) ? { program: resolution.subject.key } : {}),
      ...(meaning.degreeLevel ? { degreeLevel: meaning.degreeLevel } : {}),
      ...(meaning.terms.length === 1 ? { term: meaning.terms[0] } : {}),
      ...(meaning.years.length === 1 ? { year: meaning.years[0] } : {}),
      ...(meaning.applicantCategory ? { applicantCategory: meaning.applicantCategory } : {}),
      ...(domain.domain ? { domain: domain.domain } : {}),
      ...(asksDeadlineValue && domain.domain ? { eventType: `${domain.domain}_deadline` } : {}),
    },
    needs,
    missingContext: [...new Set(missingContext)],
  };
}

export function evidenceQueryForPlan(plan: ExecutionPlan): EvidenceQuery {
  const { entities } = plan;
  return {
    request: plan.normalizedRequest,
    requestedFacts: plan.requestedFacts,
    scope: {
      ...(entities.domain ? { domain: entities.domain } : {}),
      ...(entities.eventType ? { eventType: entities.eventType } : {}),
      ...(entities.program ? { programId: entities.program } : {}),
      ...(entities.courses?.length ? { courseCodes: entities.courses } : {}),
      ...(entities.cohort ? { cohort: entities.cohort } : {}),
      ...(entities.degreeLevel ? { degreeLevel: entities.degreeLevel } : {}),
      ...(entities.term ? { term: entities.term } : {}),
      ...(entities.year !== undefined ? { year: entities.year } : {}),
      ...(entities.applicantCategory === "national" || entities.applicantCategory === "international"
        ? { applicantCategory: entities.applicantCategory }
        : {}),
    },
    freshnessRequirement: plan.needs.liveResearch ? "current" : "normal",
    maxItems: 6,
  };
}
