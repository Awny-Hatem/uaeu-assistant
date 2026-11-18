import type { EvidenceQuery, ExecutionPlan } from "@/lib/v3/contracts";
import { evidenceQueryForPlan } from "@/lib/orchestration/orchestrator";

const DOMAIN_LABELS: Record<string, string> = {
  admissions: "admissions applications",
  academics: "academic programs and courses",
  registration: "course registration",
  calendar: "academic calendar",
  financial_aid: "scholarships and financial aid",
  finance: "tuition fees and refunds",
  graduation: "degree completion and graduation",
  housing: "student housing",
  visa: "student visas and residence permits",
  library: "library and research support",
  it: "student IT accounts and services",
  campus: "campus services",
  wellbeing: "student wellbeing and health services",
  student_services: "student services and documents",
  careers: "internships and career services",
};

const FACT_LABELS: Record<string, string> = {
  eligibility: "eligibility criteria",
  requirements: "requirements and conditions",
  prerequisites: "course prerequisites",
  deadline: "deadlines and dates",
  courses: "courses and study plan",
  documents: "required documents and application process",
  apply: "application and request procedure",
  fees: "fees and payment rules",
  status: "application status process",
  location: "official service page and contact details",
  hours: "service hours",
  credit_load: "credit load rules",
};

/** Build a minimized public query. Do not forward a student's raw conversation to web discovery. */
export function officialResearchQueryForPlan(plan: ExecutionPlan): EvidenceQuery | null {
  // UAEU factual questions reach this fallback only after a confident reviewed
  // answer did not resolve them. Search the official site for the missing fact;
  // don't limit web research to questions phrased as "current".
  if (!(plan.mode === "CURRENT_UAEU_RESEARCH" || plan.mode === "UAEU_FACTUAL") || !plan.entities.domain) return null;
  const label = DOMAIN_LABELS[plan.entities.domain];
  if (!label) return null;
  const intent = plan.entities.eventType?.endsWith("_deadline") ? "deadline" : plan.requestedFacts.find((item) => FACT_LABELS[item]);
  const fact = intent ? FACT_LABELS[intent] : "official information";
  const timeframe = [plan.entities.term, plan.entities.year].filter(Boolean).join(" ");
  const query = evidenceQueryForPlan(plan);
  return {
    ...query,
    request: `UAEU official ${label} ${fact} ${timeframe}`.trim(),
    requestedFacts: [fact],
    freshnessRequirement: plan.mode === "CURRENT_UAEU_RESEARCH" ? "current" : "normal",
    maxItems: 3,
  };
}
