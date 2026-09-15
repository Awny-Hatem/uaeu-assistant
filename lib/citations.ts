import type { Citation, ServiceGuide } from "@/lib/prototype-types";

const VERIFIED_ON = "2026-09-15";

const FAQ_CITATIONS: Record<string, Citation[]> = {
  "hours-contact": [
    {
      title: "UAEU Contact Us",
      url: "https://www.uaeu.ac.ae/en/contact/index.shtml",
      lastVerified: VERIFIED_ON,
    },
  ],
  "where-official-info": [
    {
      title: "UAEU Official Website",
      url: "https://www.uaeu.ac.ae/",
      lastVerified: VERIFIED_ON,
    },
  ],
  "academic-calendar": [
    {
      title: "UAEU Academic Calendar",
      url: "https://www.uaeu.ac.ae/ar/calendar/",
      lastVerified: VERIFIED_ON,
    },
  ],
  library: [
    {
      title: "UAEU Library Services",
      url: "https://www.uaeu.ac.ae/",
      lastVerified: VERIFIED_ON,
    },
  ],
  "student-documents": [
    {
      title: "UAEU Enrolled Students Documents Service",
      url: "https://www.uaeu.ac.ae/ar/eservices/details.shtml?serviceId=92",
      lastVerified: VERIFIED_ON,
    },
  ],
};

const KNOWLEDGE_CITATIONS: Record<string, Citation> = {
  "00-overview.md": {
    title: "UAEU Assistant Prototype Knowledge Overview",
    document: "data/knowledge/00-overview.md",
    lastVerified: VERIFIED_ON,
  },
  "01-admissions-placeholder.md": {
    title: "Admissions Content Placeholder",
    document: "data/knowledge/01-admissions-placeholder.md",
    lastVerified: "Requires UAEU content-owner verification",
  },
};

export const CONTACT_CITATION: Citation = {
  title: "UAEU Contact Us",
  url: "https://www.uaeu.ac.ae/en/contact/index.shtml",
  lastVerified: VERIFIED_ON,
};

export function citationsForFaq(faqId: string): Citation[] {
  return FAQ_CITATIONS[faqId] ?? [CONTACT_CITATION];
}

export function citationForGuide(guide: ServiceGuide): Citation {
  return {
    title: guide.title,
    url: guide.officialUrl,
    lastVerified: guide.lastVerified,
  };
}

export function citationsFromRows(
  rows: { source: string }[],
): Citation[] {
  return uniqueCitations(
    rows.map((row) => {
      const known = KNOWLEDGE_CITATIONS[row.source];
      if (known) return known;
      return {
        title: row.source,
        document: `data/knowledge/${row.source}`,
        lastVerified: "Requires verification",
      };
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
