import { normalizeQuery } from "@/lib/query-understanding";

export type DeadlineDomain = "admissions" | "scholarship" | "calendar" | "registration" | "graduation" | "housing" | "visa" | "tuition";
export type DeadlineScope =
  | { kind: "not-a-deadline" }
  | { kind: "missing-domain" }
  | { kind: "ambiguous-domain"; domains: DeadlineDomain[] }
  | { kind: "scoped"; domain: DeadlineDomain };

const DOMAIN_SIGNALS: Array<[DeadlineDomain, RegExp]> = [
  ["scholarship", /\b(?:scholarships?|financial aid|student funding)\b|منح|مساعدة مالية/u],
  ["admissions", /\b(?:admissions?|applicants?|application to (?:uaeu|the university)|apply to (?:uaeu|the university))\b|القبول|المتقدمين/u],
  ["registration", /\b(?:course registration|register(?:ing)? for courses|add(?:ing)? courses|drop(?:ping)? courses|withdraw(?:al|ing)? from (?:a )?course)\b|تسجيل المقررات|حذف مقرر/u],
  ["graduation", /\b(?:graduation|degree completion)\b|التخرج/u],
  ["housing", /\b(?:housing|accommodation|dorm(?:itory)?|residence application)\b|السكن/u],
  ["visa", /\b(?:student )?visa|residence permit\b|التأشيرة|الإقامة/u],
  ["tuition", /\b(?:tuition|fee payment|payment deadline)\b|الرسوم الدراسية|سداد الرسوم/u],
  ["calendar", /\b(?:academic calendar|semester dates?|term dates?|final exams?|academic year)\b|التقويم الأكاديمي|الامتحانات النهائية/u],
];

const DEADLINE_SIGNAL = /\b(?:deadline|due date|closing date|last day|application period|when (?:does|do|is|are).*close|when.*due)\b|الموعد النهائي|آخر موعد|متى.*(?:ينتهي|يغلق)/u;

/**
 * Resolve the event whose date the student is asking for from the latest turn.
 * Old conversation turns are deliberately excluded: history is context, not
 * permission to substitute one university process for another.
 */
export function classifyDeadlineScope(latestMessage: string): DeadlineScope {
  const text = normalizeQuery(latestMessage);
  if (!DEADLINE_SIGNAL.test(text)) return { kind: "not-a-deadline" };
  const domains = DOMAIN_SIGNALS.filter(([, signal]) => signal.test(text)).map(([domain]) => domain);
  if (!domains.length) return { kind: "missing-domain" };
  if (domains.length > 1) return { kind: "ambiguous-domain", domains };
  return { kind: "scoped", domain: domains[0] };
}

export function deadlineRecordMatches(domain: DeadlineDomain, recordId: string, category: string, questionText = ""): boolean {
  const content = normalizeQuery(`${recordId} ${category} ${questionText}`);
  const domainAliases: Record<DeadlineDomain, RegExp> = {
    admissions: /\badmissions?\b|\bapplication to (?:uaeu|the university)\b/u,
    scholarship: /\bscholarships?\b|\bfinancial aid\b/u,
    calendar: /\bacademic calendar\b|\bsemester dates?\b|\bterm dates?\b/u,
    registration: /\bregistration\b|\badd drop\b|\bcourse withdrawal\b/u,
    graduation: /\bgraduation\b|\bdegree completion\b/u,
    housing: /\bhousing\b|\baccommodation\b/u,
    visa: /\bvisa\b|\bresidence permit\b/u,
    tuition: /\btuition\b|\bfee payment\b/u,
  };
  return domainAliases[domain].test(content);
}
