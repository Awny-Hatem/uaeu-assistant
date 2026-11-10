import { loadFaqEntries } from "@/lib/faq";
import { loadKnowledgeMarkdown } from "@/lib/knowledge-files";
import { loadServiceGuides } from "@/lib/service-guides";

export const SOURCE_COVERAGE_DOMAINS = [
  "admissions",
  "academics",
  "registration",
  "graduation",
  "finance",
  "financial_aid",
  "student_services",
  "housing",
  "visa",
  "library",
  "it",
  "wellbeing",
  "careers",
  "campus",
  "general",
] as const;

export type SourceCoverageDomain = (typeof SOURCE_COVERAGE_DOMAINS)[number];

export type SourceCoverageDomainSnapshot = {
  records: number;
  reviewedRecords: number;
  latestVerification: string | null;
};

export type SourceCoverageSnapshot = {
  schemaVersion: 1;
  status: "seed-corpus";
  generatedAt: string;
  totalRecords: number;
  domains: Record<SourceCoverageDomain, SourceCoverageDomainSnapshot>;
  unclassifiedRecords: number;
};

const DOMAIN_ALIASES: Record<string, SourceCoverageDomain> = {
  academic: "academics",
  academics: "academics",
  advising: "academics",
  courses: "academics",
  programs: "academics",
  registration: "registration",
  graduation: "graduation",
  admissions: "admissions",
  fees: "finance",
  finance: "finance",
  "financial-aid": "financial_aid",
  "financial aid": "financial_aid",
  scholarships: "financial_aid",
  housing: "housing",
  international: "visa",
  visa: "visa",
  library: "library",
  it: "it",
  "it-support": "it",
  wellbeing: "wellbeing",
  health: "wellbeing",
  careers: "careers",
  campus: "campus",
  "campus-services": "campus",
  transport: "campus",
};

function emptyDomains(): Record<SourceCoverageDomain, SourceCoverageDomainSnapshot> {
  return Object.fromEntries(
    SOURCE_COVERAGE_DOMAINS.map((domain) => [domain, { records: 0, reviewedRecords: 0, latestVerification: null }]),
  ) as Record<SourceCoverageDomain, SourceCoverageDomainSnapshot>;
}

function resolveDomain(values: string[]): SourceCoverageDomain | null {
  for (const value of values) {
    const domain = DOMAIN_ALIASES[value.trim().toLowerCase()];
    if (domain) return domain;
  }
  return null;
}

function addRecord(
  domains: Record<SourceCoverageDomain, SourceCoverageDomainSnapshot>,
  domain: SourceCoverageDomain,
  lastVerified?: string,
): void {
  const current = domains[domain];
  const latest = lastVerified && (!current.latestVerification || lastVerified > current.latestVerification)
    ? lastVerified
    : current.latestVerification;
  domains[domain] = {
    records: current.records + 1,
    reviewedRecords: current.reviewedRecords + 1,
    latestVerification: latest,
  };
}

export function sourceCoverageSnapshot(now = new Date()): SourceCoverageSnapshot {
  const domains = emptyDomains();
  let totalRecords = 0;
  let unclassifiedRecords = 0;

  for (const entry of loadFaqEntries()) {
    const domain = resolveDomain([entry.category]);
    if (!domain) unclassifiedRecords += 1;
    else addRecord(domains, domain, entry.citations.map(({ lastVerified }) => lastVerified ?? "").sort().at(-1));
    totalRecords += 1;
  }

  for (const document of loadKnowledgeMarkdown()) {
    const domain = resolveDomain(document.scope?.subjects ?? []);
    if (!domain) unclassifiedRecords += 1;
    else addRecord(domains, domain, document.lastVerified);
    totalRecords += 1;
  }

  for (const guide of loadServiceGuides()) {
    const domain = resolveDomain(guide.audience) ?? "student_services";
    addRecord(domains, domain, guide.lastVerified);
    totalRecords += 1;
  }

  return {
    schemaVersion: 1,
    status: "seed-corpus",
    generatedAt: now.toISOString(),
    totalRecords,
    domains,
    unclassifiedRecords,
  };
}
