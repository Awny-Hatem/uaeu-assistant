import { createHash } from "node:crypto";
import { loadFaqEntries } from "@/lib/faq";
import { loadKnowledgeMarkdown, retrieveVerifiedEvidence, type EvidenceRow } from "@/lib/knowledge-files";
import { understandQuery } from "@/lib/query-understanding";
import type { EvidenceFreshness, EvidenceItem, EvidenceQuery, EvidenceResult, EvidenceScopeV3 } from "@/lib/v3/contracts";

const MAX_EVIDENCE_AGE_MS = 180 * 24 * 60 * 60 * 1000;

const DOMAIN_ALIASES: Record<string, string> = {
  admission: "admissions", admissions: "admissions",
  calendar: "calendar", "academic-calendar": "calendar",
  registration: "registration", "course-registration": "registration",
  scholarship: "financial_aid", scholarships: "financial_aid", "financial-aid": "financial_aid", financial_aid: "financial_aid",
  tuition: "finance", fees: "finance", finance: "finance",
  academic: "academics", academics: "academics", course: "academics", courses: "academics",
  graduation: "graduation", housing: "housing", visa: "visa", library: "library", it: "it",
  wellbeing: "wellbeing", careers: "careers", campus: "campus", "student-services": "student_services",
  student_services: "student_services", "student-services-general": "student_services",
};

function canonicalDomain(value: string): string | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, "-");
  return DOMAIN_ALIASES[key] ?? null;
}

function sourceAuthority(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "uaeu.ac.ae" || host.endsWith(".uaeu.ac.ae") ? "UAEU" : host;
  } catch {
    return undefined;
  }
}

function freshness(lastVerified: string | undefined, now: Date): EvidenceFreshness {
  if (!lastVerified) return "unknown";
  const timestamp = Date.parse(lastVerified);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() || now.getTime() - timestamp > MAX_EVIDENCE_AGE_MS) return "stale";
  return "current";
}

function metadataForRow(row: EvidenceRow, faqIndex: Map<string, ReturnType<typeof loadFaqEntries>[number]>, documentIndex: Map<string, ReturnType<typeof loadKnowledgeMarkdown>[number]>) {
  const faqId = row.source.startsWith("answer:") ? row.source.slice("answer:".length) : "";
  const faq = faqId ? faqIndex.get(faqId) : undefined;
  const document = !faq && row.source.endsWith(".md")
    ? documentIndex.get(row.source)
    : undefined;
  const categoryDomain = faq ? canonicalDomain(faq.category) : null;
  const scopedDomains = (row.scope?.subjects ?? document?.scope?.subjects ?? [])
    .map(canonicalDomain).filter((domain): domain is string => Boolean(domain));
  const title = row.title ?? document?.title ?? faq?.answer_en.split("\n")[0].replace(/\*/g, "") ?? row.source;
  const titleDomains = title.split(/[|/]/).flatMap((part) =>
    understandQuery(part).subjects.map(canonicalDomain).filter((domain): domain is string => Boolean(domain)));
  const inferredDomains = [...new Set(scopedDomains.length ? scopedDomains : titleDomains)];
  const domain = categoryDomain ?? (inferredDomains.length === 1 ? inferredDomains[0] : null);
  const citations = row.citations?.length ? row.citations : document ? [{ title: document.title, url: document.sourceUrl, lastVerified: document.lastVerified }] : [];
  return { faq, document, title, domain, citations };
}

function evidenceId(source: string, excerpt: string, citationIndex: number): string {
  const digest = createHash("sha256").update(`${source}\0${citationIndex}\0${excerpt}`).digest("hex").slice(0, 16);
  return `evidence:${digest}`;
}

function itemScope(row: EvidenceRow, domain: string | null): EvidenceScopeV3 | undefined {
  const scope = row.scope;
  if (!scope && !domain) return undefined;
  return {
    ...(domain ? { domain } : {}),
    ...(scope?.courseCodes?.length ? { courseCodes: scope.courseCodes } : {}),
    ...(scope?.applicantCategory ? { applicantCategory: scope.applicantCategory } : {}),
    ...(scope?.degreeLevel ? { degreeLevel: scope.degreeLevel } : {}),
    ...(scope?.years?.length === 1 ? { year: scope.years[0] } : {}),
    ...(scope?.effectiveFrom ? { effectiveFrom: scope.effectiveFrom } : {}),
    ...(scope?.effectiveTo ? { effectiveTo: scope.effectiveTo } : {}),
  };
}

function toEvidenceItems(row: EvidenceRow, now: Date, faqIndex: Map<string, ReturnType<typeof loadFaqEntries>[number]>, documentIndex: Map<string, ReturnType<typeof loadKnowledgeMarkdown>[number]>): EvidenceItem[] {
  const metadata = metadataForRow(row, faqIndex, documentIndex);
  const citations = metadata.citations;
  const sourceType = row.source.startsWith("answer:") ? "verified_answer" : "approved_document";
  const verifiedDates = citations.map(({ lastVerified }) => lastVerified).filter((date): date is string => Boolean(date));
  const baseFreshness = freshness(verifiedDates.sort().at(-1), now);
  const evidenceScope = itemScope(row, metadata.domain);
  const text = row.text.trim();
  const refs = citations.length ? citations : [{ title: metadata.title }];
  return refs.map((citation, index) => {
    const lastVerified = citation.lastVerified ?? verifiedDates[index];
    return {
      id: evidenceId(row.source, text, index),
      sourceType,
      title: citation.title || metadata.title,
      excerpt: text,
      ...(citation.url ? { url: citation.url } : {}),
      retrievedAt: now.toISOString(),
      ...(lastVerified ? { lastVerified } : {}),
      ...(sourceAuthority(citation.url) ? { authority: sourceAuthority(citation.url) } : {}),
      ...(evidenceScope ? { scope: evidenceScope } : {}),
      freshnessStatus: freshness(lastVerified, now) === "unknown" ? baseFreshness : freshness(lastVerified, now),
      trustStatus: "approved",
    } satisfies EvidenceItem;
  });
}

function matchesHardScope(item: EvidenceItem, required: EvidenceScopeV3): boolean {
  const actual = item.scope;
  if (required.domain) {
    const expectedDomain = canonicalDomain(required.domain);
    const actualDomain = actual?.domain ? canonicalDomain(actual.domain) : null;
    if (!expectedDomain || actualDomain !== expectedDomain) return false;
  }
  // Legacy records do not yet carry an eventType; a date-specific query must
  // wait for reviewed metadata rather than borrowing a same-domain but different event.
  if (required.eventType && actual?.eventType !== required.eventType) return false;
  if (required.programId && actual?.programId !== required.programId) return false;
  if (required.cohort && actual?.cohort !== required.cohort) return false;
  if (required.degreeLevel && actual?.degreeLevel !== required.degreeLevel) return false;
  if (required.catalogYear !== undefined && actual?.catalogYear !== required.catalogYear) return false;
  if (required.term && actual?.term !== required.term) return false;
  if (required.year !== undefined && actual?.year !== required.year) return false;
  if (required.audience && actual?.audience !== required.audience) return false;
  if (required.applicantCategory && actual?.applicantCategory !== required.applicantCategory) return false;
  if (required.courseCodes?.length && !required.courseCodes.every((code) => actual?.courseCodes?.includes(code))) return false;
  return true;
}

export type EvidenceRetriever = (request: string, topK: number) => EvidenceRow[];

export type EvidenceService = {
  search(query: EvidenceQuery): EvidenceResult;
};

/** Local approved-corpus adapter. Ranking is recall only; scope is a hard filter. */
export function createEvidenceService(options: { retrieve?: EvidenceRetriever; now?: () => Date } = {}): EvidenceService {
  const retrieve = options.retrieve ?? retrieveVerifiedEvidence;
  const now = options.now ?? (() => new Date());
  const faqIndex = new Map(loadFaqEntries().map((entry) => [entry.id, entry]));
  const documentIndex = new Map(loadKnowledgeMarkdown().map((document) => [document.filename, document]));

  return {
    search(query) {
      const capturedAt = now();
      const rows = retrieve(query.request, Math.max(1, Math.min(query.maxItems ?? 6, 20)));
      const candidates = rows.flatMap((row) => toEvidenceItems(row, capturedAt, faqIndex, documentIndex));
      const inScope = candidates.filter((item) => matchesHardScope(item, query.scope));
      const current = inScope.filter((item) => item.freshnessStatus === "current");
      const unknown = inScope.filter((item) => item.freshnessStatus === "unknown");
      const usable = query.freshnessRequirement === "current"
        ? current
        : [...current, ...unknown];
      const unique = [...new Map(usable.map((item) => [item.id, item])).values()].slice(0, query.maxItems ?? 6);
      const missingFacts = unique.length ? [] : [...query.requestedFacts];
      const status: EvidenceResult["status"] = unique.length
        ? "FOUND"
        : inScope.length > 0 && inScope.every((item) => item.freshnessStatus !== "current")
          ? "STALE"
          : "NOT_FOUND";
      return { schemaVersion: 1, status, evidence: unique, missingFacts, conflicts: [] };
    },
  };
}
