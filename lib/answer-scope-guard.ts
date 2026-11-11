import type { ExecutionPlan } from "@/lib/v3/contracts";
import type { GroundedAnswer } from "@/lib/provider-response";

type DeadlineDomain = "admissions" | "scholarships" | "financial_aid" | "calendar" | "registration";

const DOMAIN_TERMS: Record<DeadlineDomain, RegExp> = {
  admissions: /\b(admissions?|applicants?|admission application|apply for admission|intake|undergraduate application|graduate application)\b/i,
  scholarships: /\b(scholarships?|financial aid|funding|grant)\b/i,
  financial_aid: /\b(financial aid|funding|grant|scholarships?)\b/i,
  calendar: /\b(academic calendar|semester|term|registration|classes|exams?|drop|withdraw|deadline)\b/i,
  registration: /\b(registration|register|enrol(?:l)?ment|add(?:ing)?|drop(?:ping)?|withdraw(?:al)?)\b/i,
};

const DOMAIN_ALIASES: Record<string, DeadlineDomain> = {
  admissions: "admissions",
  scholarships: "scholarships",
  financial_aid: "financial_aid",
  calendar: "calendar",
  registration: "registration",
};

/**
 * Cheap, deterministic relevance guard for high-risk deadline topic swaps.
 * This supplements source support; it does not claim general semantic review.
 */
export function answerScopeViolations(plan: ExecutionPlan, answer: GroundedAnswer): string[] {
  const eventType = plan.entities.eventType;
  const domain = plan.entities.domain ? DOMAIN_ALIASES[plan.entities.domain] : undefined;
  if (!eventType?.endsWith("_deadline") || !domain || answer.claims.length === 0) return [];

  const expected = DOMAIN_TERMS[domain];
  return answer.claims.flatMap((claim, index) => {
    if (expected.test(claim.text)) return [];
    const incompatible = domain === "admissions" && /\b(scholarships?|financial aid|funding|grant)\b/i.test(claim.text)
      ? " It discusses scholarship or funding deadlines instead of admissions."
      : "";
    return [`Claim ${index + 1} does not address the requested ${domain} deadline.${incompatible} Keep the response within the requested deadline process or clarify if the evidence cannot answer it.`];
  });
}
