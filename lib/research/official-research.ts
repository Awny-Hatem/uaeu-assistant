import { createHash } from "node:crypto";
import { retrieveVerifiedEvidence } from "@/lib/knowledge-files";
import { normalizeQuery } from "@/lib/query-understanding";
import type { EvidenceItem, EvidenceQuery } from "@/lib/v3/contracts";

const UAEU_SITEMAP = "https://www.uaeu.ac.ae/en/website/index.shtml";
const MAX_PAGE_BYTES = 1_000_000;
const MAX_CANDIDATES = 5;
const MAX_EXCERPT_CHARS = 8_000;
const REQUEST_TIMEOUT_MS = 8_000;
const DOMAIN_TERMS: Record<string, string[]> = {
  admissions: ["admission", "application", "applicant"],
  calendar: ["calendar", "semester", "registration", "examination", "exam"],
  registration: ["registration", "course", "enrollment", "enrolment"],
  academics: ["academic", "course", "program", "programme", "curriculum"],
  financial_aid: ["scholarship", "financial aid", "award"],
  finance: ["tuition", "payment", "fee", "refund"],
  graduation: ["graduation", "degree completion", "graduate"],
};
const STOP_WORDS = new Set(["where", "when", "what", "how", "can", "could", "check", "find", "see", "the", "for", "from", "uaeu", "university", "official", "please", "tell", "me", "about", "is", "are", "do", "does", "i", "my", "in", "on", "to", "of", "a", "an", "and", "or", "it"]);

export type OfficialResearchOptions = {
  fetcher?: typeof fetch;
  now?: () => Date;
  seedUrls?: string[];
};

function allowedOfficialUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || !(host === "uaeu.ac.ae" || host.endsWith(".uaeu.ac.ae"))) return null;
    return url;
  } catch {
    return null;
  }
}

function words(value: string): string[] {
  return [...new Set(normalizeQuery(value).toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word)))];
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function plainText(html: string): string {
  const main = html.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1] ?? html;
  return decodeHtml(main.replace(/<(script|style|noscript|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section|br)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

async function readLimited(response: Response, limit: number): Promise<string | null> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > limit) return null;
  if (!response.body) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= limit ? text : null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(joined);
}

async function fetchOfficialPage(urlValue: string, fetcher: typeof fetch): Promise<{ url: string; title: string; text: string; html: string } | null> {
  let url = allowedOfficialUrl(urlValue);
  if (!url) return null;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9", "user-agent": "UAEU-Student-Assistant/1.0 (+official-source research)" },
      });
    } catch { return null; }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) return null;
      url = allowedOfficialUrl(new URL(location, url).toString());
      if (!url) return null;
      continue;
    }
    if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") ?? "")) return null;
    const html = await readLimited(response, MAX_PAGE_BYTES);
    if (!html) return null;
    const title = decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? url.hostname).replace(/\s+/g, " ").trim();
    const text = plainText(html);
    return text.length >= 120 ? { url: url.toString(), title: title.slice(0, 240), text: text.slice(0, MAX_EXCERPT_CHARS), html } : null;
  }
  return null;
}

function linkCandidates(html: string, base: string, query: EvidenceQuery): { url: string; label: string }[] {
  const anchors = [...html.matchAll(/<a\b([^>]*?)href\s*=\s*(["'])(.*?)\2[^>]*>([\s\S]*?)<\/a>/gi)];
  const queryWords = words(`${query.request} ${query.requestedFacts.join(" ")}`);
  const domainTerms = query.scope.domain ? DOMAIN_TERMS[query.scope.domain] ?? [query.scope.domain.replace(/_/g, " ")] : [];
  const candidates = anchors.flatMap((match) => {
    let url: URL | null;
    try { url = allowedOfficialUrl(new URL(decodeHtml(match[3]), base).toString()); } catch { return []; }
    if (!url || /\.(?:pdf|zip|docx?)(?:$|\?)/i.test(url.pathname)) return [];
    const label = decodeHtml(match[4].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const searchable = normalizeQuery(`${label} ${url.pathname}`).toLowerCase();
    if (domainTerms.length && !domainTerms.some((term) => searchable.includes(term))) return [];
    const matches = queryWords.filter((word) => searchable.includes(word)).length;
    return matches >= 1 ? [{ url: url.toString(), label, score: matches }] : [];
  });
  return [...new Map(candidates.sort((a, b) => b.score - a.score).map(({ url, label }) => [url, { url, label }])).values()].slice(0, MAX_CANDIDATES);
}

function excerptFor(text: string, query: EvidenceQuery): string | null {
  const normalized = normalizeQuery(text).toLowerCase();
  const queryWords = words(`${query.request} ${query.requestedFacts.join(" ")}`);
  const domainTerms = query.scope.domain ? DOMAIN_TERMS[query.scope.domain] ?? [query.scope.domain.replace(/_/g, " ")] : [];
  const domainMatch = domainTerms.some((term) => normalized.includes(term));
  const matched = queryWords.filter((word) => normalized.includes(word));
  if (!domainMatch || matched.length < Math.min(2, queryWords.length)) return null;
  if (query.scope.year !== undefined && !new RegExp(`\\b${query.scope.year}\\b`).test(text)) return null;
  if (query.scope.term && !new RegExp(`\\b${query.scope.term}\\b`, "i").test(normalized)) return null;
  const excerpt = text.slice(0, MAX_EXCERPT_CHARS).trim();
  return excerpt.length >= 80 ? excerpt : null;
}

function supportsEventType(text: string, eventType: string): boolean {
  const normalized = normalizeQuery(text).toLowerCase();
  if (eventType === "calendar_deadline") return /\b(?:deadline|last day|registration|add.drop|withdraw|examination|exam)\b/.test(normalized);
  if (eventType.includes("admission")) return /\b(?:admission|application)\b/.test(normalized) && /\b(?:deadline|closing|close|apply|application period)\b/.test(normalized);
  if (eventType.includes("scholarship")) return /\bscholarship\b/.test(normalized) && /\b(?:deadline|closing|close|apply|application period)\b/.test(normalized);
  const domain = eventType.replace(/_deadline$/, "").replace(/_/g, " ");
  return normalized.includes(domain) && /\b(?:deadline|last day|closing|due)\b/.test(normalized);
}

function uniqueId(url: string, excerpt: string): string {
  return `web:${createHash("sha256").update(`${url}\0${excerpt}`).digest("hex").slice(0, 16)}`;
}

/**
 * Search only UAEU-owned HTML pages: known official citations first, then
 * relevant links on UAEU's published sitemap. Discovered pages remain
 * unapproved evidence and never update the governed corpus automatically.
 */
export async function researchOfficialUaeu(query: EvidenceQuery, options: OfficialResearchOptions = {}): Promise<EvidenceItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const seeds = options.seedUrls ?? retrieveVerifiedEvidence(query.request, 12).flatMap((row) => (row.citations ?? []).map((citation) => citation.url).filter((url): url is string => Boolean(url)));
  const seedCandidates = seeds.flatMap((seed) => {
    const url = allowedOfficialUrl(seed);
    return url ? [{ url: url.toString(), label: url.pathname }] : [];
  });
  const sitemap = await fetchOfficialPage(UAEU_SITEMAP, fetcher);
  const discovered = sitemap ? linkCandidates(sitemap.html, UAEU_SITEMAP, query) : [];
  const candidates = [...new Map([...seedCandidates, ...discovered].map((item) => [item.url, item])).values()].slice(0, MAX_CANDIDATES);
  const now = (options.now ?? (() => new Date()))().toISOString();
  const results = await Promise.all(candidates.map(async (candidate): Promise<EvidenceItem | null> => {
    const page = await fetchOfficialPage(candidate.url, fetcher);
    if (!page) return null;
    const excerpt = excerptFor(page.text, query);
    if (!excerpt) return null;
    if (query.scope.eventType && !supportsEventType(page.text, query.scope.eventType)) return null;
    const scope = {
      ...(query.scope.domain ? { domain: query.scope.domain } : {}),
      ...(query.scope.programId ? { programId: query.scope.programId } : {}),
      ...(query.scope.courseCodes?.length && query.scope.courseCodes.every((code) => page.text.includes(code)) ? { courseCodes: query.scope.courseCodes } : {}),
      ...(query.scope.year !== undefined ? { year: query.scope.year } : {}),
      ...(query.scope.term ? { term: query.scope.term } : {}),
      ...(query.scope.eventType ? { eventType: query.scope.eventType } : {}),
    };
    return {
      id: uniqueId(page.url, excerpt),
      sourceType: "official_web",
      title: page.title || candidate.label || page.url,
      excerpt,
      url: page.url,
      retrievedAt: now,
      authority: "UAEU",
      scope,
      freshnessStatus: "current",
      trustStatus: "discovered",
    } satisfies EvidenceItem;
  }));
  return results.filter((item): item is EvidenceItem => item !== null);
}
