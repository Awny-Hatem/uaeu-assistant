import type { Citation, ServiceGuide } from "@/lib/prototype-types";
import type { FaqEntry } from "@/lib/faq";
import { loadKnowledgeMarkdown } from "@/lib/knowledge-files";

const VERIFIED_ON = "2026-09-16";

export const CONTACT_CITATION: Citation = {
  title: "UAEU Contact Us",
  url: "https://www.uaeu.ac.ae/en/contact/index.shtml",
  lastVerified: VERIFIED_ON,
};

function isApprovedOfficialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "uaeu.ac.ae" ||
      host.endsWith(".uaeu.ac.ae") ||
      host === "mohesr.gov.ae" ||
      host.endsWith(".mohesr.gov.ae") ||
      host === "moe.gov.ae" ||
      host.endsWith(".moe.gov.ae") ||
      host === "u.ae" ||
      host.endsWith(".u.ae")
    );
  } catch {
    return false;
  }
}

export function citationsForFaq(entry: Pick<FaqEntry, "citations">): Citation[] {
  const approved = entry.citations.filter(
    (citation) => citation.url && isApprovedOfficialUrl(citation.url),
  );
  return approved.length ? uniqueCitations(approved) : [CONTACT_CITATION];
}

export function citationForGuide(guide: ServiceGuide): Citation {
  return {
    title: guide.title,
    url: guide.officialUrl,
    lastVerified: guide.lastVerified,
  };
}

export function citationsFromRows(
  rows: { source: string; score?: number }[],
  query = "",
): Citation[] {
  const approvedDocuments = new Map(
    loadKnowledgeMarkdown().map((document) => [document.filename, document]),
  );
  const topScore = Math.max(0, ...rows.map((row) => row.score ?? 0));
  const identifiers = new Set(
    query
      .toLowerCase()
      .match(/\b(?=[a-z\d-]*[a-z])(?=[a-z\d-]*\d)[a-z\d-]{4,}\b/g) ?? [],
  );
  const bestScoreBySource = new Map<string, number>();
  for (const row of rows) {
    bestScoreBySource.set(
      row.source,
      Math.max(bestScoreBySource.get(row.source) ?? 0, row.score ?? 0),
    );
  }

  const relevantSources = new Set(
    [...bestScoreBySource].flatMap(([source, score]) => {
      const document = approvedDocuments.get(source);
      if (!document) return [];
      const title = document.title.toLowerCase();
      const titleNamesRequestedIdentifier = [...identifiers].some((identifier) =>
        title.includes(identifier),
      );
      const nearTop = topScore === 0 || score >= topScore * 0.75;
      return nearTop || titleNamesRequestedIdentifier ? [source] : [];
    }),
  );

  return uniqueCitations(
    rows.flatMap((row) => {
      if (!relevantSources.has(row.source)) return [];
      const document = approvedDocuments.get(row.source);
      if (!document) return [];
      return [
        {
          title: document.title,
          url: document.sourceUrl,
          lastVerified: document.lastVerified,
        },
      ];
    }),
  );
}

export function uniqueCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];

  for (const citation of citations) {
    const key = citation.url || citation.document || citation.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(citation);
  }

  return out;
}
