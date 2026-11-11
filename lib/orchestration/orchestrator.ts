import { courseCodes, namedSubjects, normalizeQuery, resolveConversation, understandQuery } from "@/lib/query-understanding";
import { programIdInText } from "@/lib/academic/program-curricula";
import type { EvidenceQuery, ExecutionMode, ExecutionPlan } from "@/lib/v3/contracts";

export type OrchestratorMessage = { role: "user" | "assistant"; content: string };

export type OrchestratorInput = {
  conversation: OrchestratorMessage[];
  latest: string;
  /** Context-resolved request assembled by the API; latest explicit topic still wins. */
  resolvedRequest?: string;
  authenticatedScopes?: string[];
};

const UAEU_TERMS = /\b(?:uaeu|university|college|admissions?|applications?|registration|semester|courses?|degree|scholarships?|housing|transcript|graduation|portal|student services|academic calendar|credits?|credit hours?|curricul(?:um|a)|study plans?|majors?|engineering)\b|جامعة|الجامعة|كلية|الكلية|القبول|التسجيل|الفصل الدراسي|مساق|مقرر|مادة|منحة|منح|السكن|كشف الدرجات|التخرج|البوابة|الخدمات الطلابية|التقويم الأكاديمي/u;
const CURRENT_TERMS = /\b(?:current|currently|today|latest|upcoming|this (?:term|semester|year)|deadlines?|due dates?|last days?|closing dates?|when does .* open|when does .* close|start dates?|exam dates?)\b|حالي(?:اً|ا)?|اليوم|احدث|القادم|هذا الفصل|المواعيد النهائية|الموعد النهائي|اخر موعد|مواعيد التقديم|موعد الاغلاق|متى يبدأ|متى ينتهي|تاريخ البدء|مواعيد الاختبارات/u;
const ACTION_TERMS = /\b(?:submit|withdraw|drop|register me|enroll me|pay this|apply for me|change my major for me|switch my major for me|cancel my course)\b|قدّم(?:ي)? طلب(?:ي)?|انسحب لي|سجلني|سجّلني|ادفع لي|غيّر تخصصي لي|بدّل تخصصي لي|ألغِ مساقي|احذف مساقي/u;
const COMPLEX_TERMS = /\b(?:failed|fail(?:ed|ing)?|twice|third time|blocked|delay(?:ed)?|graduate|graduation plan|what should i do|options|scenario|because|although|but)\b|رسبت|يرسب|رسوب|مرتين|للمرة الثالثة|متأخر|خطة التخرج|ماذا أفعل|ما الحل|خيارات|سيناريو|بسبب|رغم|لكن/u;
const PERSONALIZED_TERMS = /\b(?:can i|am i|do i|my (?:degree|major|courses|gpa|record|progress|graduation)|i have completed|i failed|i passed|i am a student)\b|هل أستطيع|هل استطيع|هل يمكنني|هل أقدر|هل انا|مقرراتي|مساقاتي|معدلي|سجلي|تقدمي|تخرجي|أكملت|اكملت|رسبت|نجحت|أنا طالب|انا طالب/u;
const DEADLINE_TERMS = /\b(?:deadline|due date|last day|closing date|application period|when .* close|when .* due)\b|الموعد النهائي|آخر موعد|اخر موعد|مواعيد التقديم|موعد الإغلاق|موعد الاغلاق/u;
const LOCATION_LOOKUP = /\bwhere (?:can|do) i (?:check|find|see)|\bwhere is (?:the )?(?:academic )?calendar\b|اين (?:اجد|اتحقق من)|وين (?:القى|اتحقق)|اين التقويم الاكاديمي/u;
const SCOPE_ONLY_FOLLOW_UP = /^(?:(?:the\s+)?(?:year\s*)?20\d{2}(?:\s+(?:fall|spring|summer|winter))?|(?:fall|spring|summer|winter)\s+20\d{2})[.! ]*$/i;
const ACADEMIC_PROGRAM_REQUEST = /\b(?:degrees?|majors?|programmes?|programs?|curricul(?:um|a)|study plans?|concentrations?|electives?|course requirements|courses? required|credit requirements|graduation requirements|prerequisites?)\b/i;
const PROGRAM_KEYS = new Set(["computer-engineering", "computer-ai-engineering", "information-security", "information-technology", "mechanical-engineering", "computer-science", "medicine"]);

const SUBJECT_TO_DOMAIN: Record<string, string> = {
  admissions: "admissions", calendar: "calendar", registration: "registration",
  scholarship: "financial_aid", tuition: "finance", housing: "housing", visa: "visa",
  graduation: "graduation", medicine: "academics", library: "library", password: "it", wifi: "it", parking: "campus",
  counseling: "wellbeing", medical: "wellbeing", internship: "careers", "student-document": "student_services",
  "major-change": "academics", "computer-engineering": "academics", "computer-ai-engineering": "academics", "information-security": "academics",
  "information-technology": "academics", "mechanical-engineering": "academics", "computer-science": "academics", "data-structures": "academics",
};

function executionMode(latest: string, query: string): ExecutionMode {
  const text = normalizeQuery(latest);
  const request = normalizeQuery(query);
  if (/^(?:hi|hello|hey|thanks|thank you|good morning|good afternoon|مرحبا|شكرا)[!. ]*$/u.test(text)) return "SIMPLE_CONVERSATION";
  if (ACTION_TERMS.test(text)) return "UNIVERSITY_TRANSACTION";
  if (COMPLEX_TERMS.test(text) && (UAEU_TERMS.test(request) || courseCodes(query).length > 0)) return "COMPLEX_SCENARIO";
  const subjects = namedSubjects(query).map(({ key }) => key);
  const academicProgramRequest = Boolean(programIdInText(query)) || ACADEMIC_PROGRAM_REQUEST.test(request);
  // Any recognized UAEU subject belongs to the evidence-first path. Keeping
  // this allowlist narrow sent ordinary university questions back to the legacy
  // answer selector even though they had already been identified as UAEU topics.
  const academicOrServiceTarget = courseCodes(query).length > 0 || subjects.length > 0 || academicProgramRequest;
  const processQuestion = /^(?:how (?:do|can) i|where can i|where do i)\b/u.test(text);
  if (PERSONALIZED_TERMS.test(text) && academicOrServiceTarget && !LOCATION_LOOKUP.test(request) && !processQuestion) return "PERSONALIZED_ACADEMIC";
  if (CURRENT_TERMS.test(request) && UAEU_TERMS.test(request) && !LOCATION_LOOKUP.test(request)) return "CURRENT_UAEU_RESEARCH";
  if (academicProgramRequest) return "UAEU_FACTUAL";
  if (UAEU_TERMS.test(request) || courseCodes(query).length > 0 || subjects.length > 0) return "UAEU_FACTUAL";
  return "GENERAL_EXPLANATION";
}

function requestedDomain(latest: string, resolvedQuery: string, contextUsed: boolean, previousUserRequest: string): { domain?: string; ambiguous: boolean } {
  const asksCrossSubjectApplicability = contextUsed && /\b(?:would|does|do|is) (?:that|it|the same (?:rule|requirement))\b[^.!?]{0,100}\b(?:also )?(?:apply|hold|be the rule)\b|\bsame (?:rule|requirement) for\b/i.test(latest);
  if (asksCrossSubjectApplicability) {
    const priorDomains = [...new Set(namedSubjects(previousUserRequest)
      .map(({ key }) => SUBJECT_TO_DOMAIN[key]).filter((domain): domain is string => Boolean(domain)))];
    if (priorDomains.length === 1) return { domain: priorDomains[0], ambiguous: false };
    if (priorDomains.length > 1) return { ambiguous: true };
  }
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
  const priorUserMessages = input.conversation.filter((message) => message.role === "user").slice(0, -1);
  const previousUserRequest = priorUserMessages.at(-1)?.content ?? "";
  const continuesCalendarLocation = SCOPE_ONLY_FOLLOW_UP.test(normalizeQuery(latest)) && LOCATION_LOOKUP.test(normalizeQuery(previousUserRequest));
  const normalizedRequest = continuesCalendarLocation
    ? `${previousUserRequest}\nFollow-up detail: ${latest}`
    : input.resolvedRequest?.trim() || (resolution.usedContext ? resolution.query : latest);
  const meaning = understandQuery(normalizedRequest);
  const latestMeaning = understandQuery(latest);
  const mode = executionMode(latest, normalizedRequest);
  const hasResolvedContext = Boolean(input.resolvedRequest && input.resolvedRequest.trim() !== latest) || resolution.usedContext;
  const explicitCourseCodes = latest.match(/\b[A-Z]{2,5}\d{3,4}\b/gi) ?? [];
  const failedCourseMention = /\b(?:fail(?:ed|ing)?|repeat(?:ed|ing)?|retake)\b|رسبت|يرسب|رسوب|إعادة(?:\s+المساق)?|اعادة(?:\s+المساق)?/iu.test(normalizedRequest);
  const courseMention = /\bdata structures?\b|مساق|مادة|مقرر|المقررات|المواد/iu.test(normalizedRequest);
  const ambiguousFailedCourse = failedCourseMention && /\bdata structures?\b|هياكل البيانات/iu.test(normalizedRequest) && explicitCourseCodes.length === 0;
  const resolvedDomain = requestedDomain(latest, normalizedRequest, hasResolvedContext, previousUserRequest);
  const domain = ambiguousFailedCourse ? { domain: "academics", ambiguous: false } : resolvedDomain;
  const missingContext: string[] = [];
  const isLocationLookup = LOCATION_LOOKUP.test(normalizeQuery(normalizedRequest));
  const deadlineQuestion = DEADLINE_TERMS.test(normalizeQuery(normalizedRequest)) || latestMeaning.intents.includes("deadline");
  const asksDeadlineValue = deadlineQuestion && !isLocationLookup;

  if (deadlineQuestion && domain.ambiguous) missingContext.push("which deadline process you mean");
  else if (deadlineQuestion && !domain.domain) missingContext.push("the program or service whose deadline you need");
  if (asksDeadlineValue && !meaning.years.length && !meaning.terms.length) missingContext.push("the intake or academic year");
  if (asksDeadlineValue && domain.domain === "admissions" && !meaning.applicantCategory && !meaning.applicantCategories.length) missingContext.push("your applicant category");
  if (meaning.intents.includes("prerequisites") && !explicitCourseCodes.length) missingContext.push("the exact course code or degree program");
  if (ambiguousFailedCourse) missingContext.push("the exact course code or degree program to check course-specific rules");
  if (meaning.intents.includes("courses") && /\b(?:degree plan|study plan|graduation plan|plan my courses)\b/u.test(meaning.normalized) && !resolution.subject) missingContext.push("your degree program");
  // Personal phrasing does not itself require a portal record. Ask for
  // authenticated access only when the answer depends on private account data.
  const requiresPersonalRecord = /\b(?:my (?:gpa|cgpa|record|transcript|degree audit|completed courses|holds?|registration status)|am i eligible based on my record|can i register right now|can i graduate now|what is my academic standing)\b/i.test(normalizedRequest);
  const asksRepeatPolicy = failedCourseMention && (courseMention || /\b[A-Z]{2,5}\d{3,4}\b/i.test(normalizedRequest));
  if (requiresPersonalRecord && !input.authenticatedScopes?.includes("student-record:read")) {
    missingContext.push("authenticated access to your student record for a personal eligibility decision");
  }
  if (mode === "UNIVERSITY_TRANSACTION") missingContext.push("an approved UAEU portal integration and your explicit confirmation before any submission");

  const codes = [...new Set(explicitCourseCodes.map((code) => code.toUpperCase()))];
  const subjects = namedSubjects(normalizedRequest);
  const programSubject = subjects.find(({ key }) => PROGRAM_KEYS.has(key));
  const recognizedProgram = programIdInText(normalizedRequest);
  const needs = {
    evidence: mode === "UAEU_FACTUAL" || mode === "CURRENT_UAEU_RESEARCH" || mode === "PERSONALIZED_ACADEMIC" || mode === "COMPLEX_SCENARIO",
    liveResearch: mode === "CURRENT_UAEU_RESEARCH",
    studentData: requiresPersonalRecord,
    academicRules: mode === "PERSONALIZED_ACADEMIC" || mode === "COMPLEX_SCENARIO",
    planning: mode === "COMPLEX_SCENARIO" || /\b(?:degree plan|study plan|graduation plan|plan my courses)\b/u.test(meaning.normalized),
    universityAction: mode === "UNIVERSITY_TRANSACTION",
  };

  return {
    schemaVersion: 1,
    mode,
    normalizedRequest,
    requestedFacts: [...(asksRepeatPolicy ? ["undergraduate failed course repeat policy"] : []), ...(meaning.intents.length ? meaning.intents : ["answer the user's question"])],
    entities: {
      ...(codes.length ? { courses: codes } : {}),
      ...(recognizedProgram ? { program: recognizedProgram } : programSubject ? { program: programSubject.key } : resolution.subject && PROGRAM_KEYS.has(resolution.subject.key) ? { program: resolution.subject.key } : {}),
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
  const isLocationLookup = LOCATION_LOOKUP.test(normalizeQuery(plan.normalizedRequest));
  return {
    request: isLocationLookup ? "Where can I check the official UAEU academic calendar webpage?" : plan.normalizedRequest,
    requestedFacts: isLocationLookup ? ["official academic calendar location and URL"] : plan.requestedFacts,
    scope: {
      ...(entities.domain ? { domain: entities.domain } : {}),
      ...(entities.eventType ? { eventType: entities.eventType } : {}),
      ...(entities.program ? { programId: entities.program } : {}),
      ...(entities.courses?.length ? { courseCodes: entities.courses } : {}),
      ...(entities.cohort ? { cohort: entities.cohort } : {}),
      ...(entities.degreeLevel ? { degreeLevel: entities.degreeLevel } : {}),
      ...(!isLocationLookup && entities.term ? { term: entities.term } : {}),
      ...(!isLocationLookup && entities.year !== undefined ? { year: entities.year } : {}),
      ...(entities.applicantCategory === "national" || entities.applicantCategory === "international"
        ? { applicantCategory: entities.applicantCategory }
        : {}),
    },
    freshnessRequirement: plan.needs.liveResearch && !isLocationLookup ? "current" : "normal",
    maxItems: 6,
  };
}
