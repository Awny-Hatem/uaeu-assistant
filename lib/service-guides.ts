import fs from "fs";
import path from "path";
import type { EvidenceRow } from "@/lib/knowledge-files";
import type { Locale } from "@/lib/language";
import type { LocalizedWorkflowFact, ServiceGuide, ServiceRequestDetails } from "@/lib/prototype-types";
import { normalizeQuery } from "@/lib/query-understanding";

const SERVICE_GUIDE_DIR = path.join(process.cwd(), "data", "service-guides");
const SERVICE_WORKFLOW_DETAILS_PATH = path.join(process.cwd(), "data", "service-workflow-details.json");

function normalize(text: string): string {
  return normalizeQuery(text);
}

function officialUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "uaeu.ac.ae" || url.hostname.endsWith(".uaeu.ac.ae")); }
  catch { return false; }
}

function nonEmpty(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }

export function isServiceGuideCurrent(lastVerified: string, now = new Date()): boolean {
  const verifiedAt = Date.parse(lastVerified);
  const age = now.getTime() - verifiedAt;
  return Number.isFinite(verifiedAt) && age >= -86_400_000 && age <= 180 * 86_400_000;
}

function looksLikeGuide(value: unknown, requireCurrentSource = true): value is ServiceGuide {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<ServiceGuide>;
  return Boolean(
    nonEmpty(maybe.id) &&
      nonEmpty(maybe.title) &&
      nonEmpty(maybe.description) &&
      officialUrl(maybe.officialUrl) &&
      typeof maybe.lastVerified === "string" && /^\d{4}-\d{2}-\d{2}$/.test(maybe.lastVerified) &&
      (!requireCurrentSource || isServiceGuideCurrent(maybe.lastVerified)) &&
      Array.isArray(maybe.keywords) &&
      maybe.keywords.every(nonEmpty) &&
      (maybe.sources === undefined || (Array.isArray(maybe.sources) && maybe.sources.length > 0 && maybe.sources.every(source => officialUrl(source.url) && nonEmpty(source.title) && nonEmpty(source.evidenceText) && nonEmpty(source.lastVerified)))) &&
      (maybe.excludeKeywords === undefined || (Array.isArray(maybe.excludeKeywords) && maybe.excludeKeywords.every(nonEmpty))) &&
      Array.isArray(maybe.audience) && maybe.audience.every(nonEmpty) &&
      maybe.requestDetails !== undefined &&
      [maybe.requestDetails.documents, maybe.requestDetails.deadline, maybe.requestDetails.handoff].every(
        (fact) => fact && nonEmpty(fact.en) && nonEmpty(fact.ar),
      ) &&
      Array.isArray(maybe.steps) && maybe.steps.length > 0 && maybe.steps.every((step) => step && nonEmpty(step.title) && nonEmpty(step.instruction) && (step.url === undefined || officialUrl(step.url))),
  );
}

let guideCache: { signature: string; guides: ServiceGuide[] } | null = null;

function serviceGuideSourceSnapshot(): { signature: string; files: string[] } | null {
  if (!fs.existsSync(SERVICE_GUIDE_DIR)) return null;
  const files = fs.readdirSync(SERVICE_GUIDE_DIR).filter((name) => name.endsWith(".json")).sort();
  const signature = [SERVICE_WORKFLOW_DETAILS_PATH, ...files.map((name) => path.join(SERVICE_GUIDE_DIR, name))]
    .map((file) => {
      try {
        const stat = fs.statSync(file);
        return `${file}:${stat.size}:${stat.mtimeMs}`;
      } catch {
        return `${file}:missing`;
      }
    }).join("|");
  return { signature, files };
}

function loadRequestDetails(): Map<string, ServiceRequestDetails> {
  try {
    const rows = JSON.parse(fs.readFileSync(SERVICE_WORKFLOW_DETAILS_PATH, "utf-8")) as unknown;
    if (!Array.isArray(rows)) return new Map();
    return new Map(rows.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const value = row as Record<string, unknown>;
      const pairs = [
        ["documents", "documentsEn", "documentsAr"],
        ["deadline", "deadlineEn", "deadlineAr"],
        ["handoff", "handoffEn", "handoffAr"],
      ] as const;
      const details = Object.fromEntries(pairs.map(([key, en, ar]) => [key, { en: value[en], ar: value[ar] }])) as ServiceRequestDetails;
      const valid = nonEmpty(value.id) && pairs.every(([key]) => {
        const fact = details[key] as LocalizedWorkflowFact;
        return nonEmpty(fact.en) && nonEmpty(fact.ar);
      });
      return valid ? [[value.id as string, details]] : [];
    }));
  } catch {
    return new Map();
  }
}

export function loadServiceGuides(): ServiceGuide[] {
  const snapshot = serviceGuideSourceSnapshot();
  if (!snapshot) return [];
  if (!guideCache || guideCache.signature !== snapshot.signature) {
    const requestDetails = loadRequestDetails();
    const guides = snapshot.files.flatMap((name) => {
      try {
        const raw = fs.readFileSync(path.join(SERVICE_GUIDE_DIR, name), "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") return [];
        const guide = parsed as Record<string, unknown>;
        const enriched = { ...guide, requestDetails: requestDetails.get(String(guide.id)) };
        return looksLikeGuide(enriched, false) ? [enriched] : [];
      } catch {
        return [];
      }
    });
    guideCache = { signature: snapshot.signature, guides };
  }
  // Keep source freshness time-dependent even when immutable file parsing is cached.
  return guideCache.guides.filter((guide) => isServiceGuideCurrent(guide.lastVerified));
}

function scoreGuide(query: string, guide: ServiceGuide): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;
  if (
    guide.excludeKeywords?.some((keyword) =>
      ` ${normalizedQuery} `.includes(` ${normalize(keyword)} `),
    )
  ) {
    return 0;
  }

  let score = 0;
  let strongMatches = 0;
  for (const keyword of guide.keywords) {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword) continue;
    const tokenCount = normalizedKeyword.split(" ").filter(Boolean).length;
    const matches = ` ${normalizedQuery} `.includes(` ${normalizedKeyword} `);
    if (matches && (tokenCount > 1 || normalizedQuery === normalizedKeyword)) {
      score += Math.max(6, normalizedKeyword.length);
      if (tokenCount > 1) strongMatches += 1;
    }
  }

  for (const title of [guide.title, guide.titleAr].filter(nonEmpty)) {
    if (` ${normalizedQuery} `.includes(` ${normalize(title)} `)) {
      score += 20;
      strongMatches += 1;
    }
  }
  return strongMatches > 0 ? score : 0;
}

export function findServiceGuide(query: string): ServiceGuide | null {
  const ranked = loadServiceGuides()
    .map((guide) => ({ guide, score: scoreGuide(query, guide) }))
    .filter((item) => item.score >= 12)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.guide ?? null;
}

export function localizeServiceGuide(
  guide: ServiceGuide,
  locale: Locale,
): ServiceGuide {
  if (locale !== "ar") return guide;
  return {
    ...guide,
    title: guide.titleAr ?? guide.title,
    description: guide.descriptionAr ?? guide.description,
    verificationNote: guide.verificationNoteAr ?? guide.verificationNote,
    requestDetails: guide.requestDetails,
    steps: guide.steps.map((step) => ({
      ...step,
      title: step.titleAr ?? step.title,
      instruction: step.instructionAr ?? step.instruction,
      note: step.noteAr ?? step.note,
    })),
  };
}

export function guideIntro(guide: ServiceGuide, locale: Locale): string {
  const localized = localizeServiceGuide(guide, locale);
  const steps = localized.steps.map((step, index) => {
    const note = step.note ? `\n   - ${step.note}` : "";
    const link = step.url ? `\n   - ${step.url}` : "";
    return `${index + 1}. **${step.title}**\n   - ${step.instruction}${note}${link}`;
  }).join("\n");
  const stepSection = `\n\n**${locale === "ar" ? "\u0627\u0644\u062e\u0637\u0648\u0627\u062a" : "Steps"}**\n${steps}`;
  const detail = (fact: LocalizedWorkflowFact) => locale === "ar" ? fact.ar : fact.en;
  const requestSection = locale === "ar"
    ? `\n\n**\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a**\n- ${detail(guide.requestDetails.documents)}\n\n**\u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f**\n- ${detail(guide.requestDetails.deadline)}\n\n**\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0648\u0627\u0644\u062a\u0648\u0627\u0635\u0644**\n- ${detail(guide.requestDetails.handoff)}`
    : `\n\n**Documents**\n- ${detail(guide.requestDetails.documents)}\n\n**Deadline**\n- ${detail(guide.requestDetails.deadline)}\n\n**Where to continue**\n- ${detail(guide.requestDetails.handoff)}`;
  const verification = guide.requiresVerification
    ? locale === "ar"
      ? `\n\n**\u0645\u0644\u0627\u062d\u0638\u0629 \u062a\u062d\u0642\u0642**\n- ${localized.verificationNote || "\u0642\u062f \u062a\u062a\u063a\u064a\u0631 \u0645\u0633\u0645\u064a\u0627\u062a \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0648\u0645\u062a\u0637\u0644\u0628\u0627\u062a\u0647\u0627\u061b \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629 \u0641\u064a \u0635\u0641\u062d\u0629 \u0627\u0644\u062e\u062f\u0645\u0629 \u0627\u0644\u0631\u0633\u0645\u064a\u0629 \u0644\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a."}`
      : `\n\n**Verification Note**\n- ${localized.verificationNote || "Portal labels and requirements can change, so confirm the final step on the official UAEU service page."}`
    : "";
  if (locale === "ar") {
    return `**${localized.title}**\n- ${localized.description}${stepSection}${requestSection}\n\n- \u064a\u0645\u0643\u0646\u0646\u064a \u0625\u0631\u0634\u0627\u062f\u0643 \u0639\u0628\u0631 \u0627\u0644\u062e\u0637\u0648\u0627\u062a\u060c \u0645\u0639 \u0625\u0628\u0642\u0627\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0646\u0647\u0627\u0626\u064a \u0641\u064a \u0635\u0641\u062d\u0629 \u0627\u0644\u062e\u062f\u0645\u0629 \u0627\u0644\u0631\u0633\u0645\u064a\u0629 \u0644\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a.${verification}`;
  }
  return `**${localized.title}**\n- ${localized.description}${stepSection}${requestSection}\n\n- I can walk you through this as a guided checklist, while keeping the final submission on the official UAEU service page.${verification}`;
}

/** Reviewed workflow facts remain tied to their individual official references.
 * The UI checklist is optional; factual answers still use the AI writer/checker. */
export function serviceGuideEvidence(guide: ServiceGuide): EvidenceRow[] {
  if (guide.sources?.length) return guide.sources.filter(source => source.evidenceText && guide.steps.some(step => (step.url ?? guide.officialUrl) === source.url)).map((citation,index) => ({
    source: `guide:${guide.id}:${index}`, title: guide.title, score: 100,
    text: citation.evidenceText!, citations: [citation],
  }));
  return [{ source: `guide:${guide.id}`, title: guide.title, score: 100,
    text: [guide.description, guide.verificationNote ?? "", ...guide.steps.map(step => step.instruction)].join("\n"),
    citations: [{title:guide.title,url:guide.officialUrl,lastVerified:guide.lastVerified}],
  }];
}
