import fs from "fs";
import path from "path";
import type { Locale } from "@/lib/language";
import type { ServiceGuide } from "@/lib/prototype-types";
import { normalizeQuery } from "@/lib/query-understanding";

const SERVICE_GUIDE_DIR = path.join(process.cwd(), "data", "service-guides");

function normalize(text: string): string {
  return normalizeQuery(text);
}

function officialUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "uaeu.ac.ae" || url.hostname.endsWith(".uaeu.ac.ae")); }
  catch { return false; }
}

function nonEmpty(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }

function looksLikeGuide(value: unknown): value is ServiceGuide {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<ServiceGuide>;
  return Boolean(
    nonEmpty(maybe.id) &&
      nonEmpty(maybe.title) &&
      nonEmpty(maybe.description) &&
      officialUrl(maybe.officialUrl) &&
      typeof maybe.lastVerified === "string" && /^\d{4}-\d{2}-\d{2}$/.test(maybe.lastVerified) &&
      Date.parse(maybe.lastVerified) <= Date.now() + 86_400_000 && Date.now() - Date.parse(maybe.lastVerified) <= 180 * 86_400_000 &&
      Array.isArray(maybe.keywords) &&
      maybe.keywords.every(nonEmpty) &&
      (maybe.excludeKeywords === undefined || (Array.isArray(maybe.excludeKeywords) && maybe.excludeKeywords.every(nonEmpty))) &&
      Array.isArray(maybe.audience) && maybe.audience.every(nonEmpty) &&
      Array.isArray(maybe.steps) && maybe.steps.length > 0 && maybe.steps.every((step) => step && nonEmpty(step.title) && nonEmpty(step.instruction) && (step.url === undefined || officialUrl(step.url))),
  );
}

export function loadServiceGuides(): ServiceGuide[] {
  if (!fs.existsSync(SERVICE_GUIDE_DIR)) return [];

  return fs
    .readdirSync(SERVICE_GUIDE_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .flatMap((name) => {
      try {
        const raw = fs.readFileSync(path.join(SERVICE_GUIDE_DIR, name), "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        return looksLikeGuide(parsed) ? [parsed] : [];
      } catch {
        return [];
      }
    });
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

  if (` ${normalizedQuery} `.includes(` ${normalize(guide.title)} `)) {
    score += 20;
    strongMatches += 1;
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
  const verification = guide.requiresVerification
    ? locale === "ar"
      ? `\n\n**ملاحظة تحقق**\n- ${localized.verificationNote || "قد تتغير مسميات البوابة ومتطلباتها؛ تحقق من الخطوة النهائية في صفحة الخدمة الرسمية لجامعة الإمارات."}`
      : `\n\n**Verification Note**\n- ${localized.verificationNote || "Portal labels and requirements can change, so confirm the final step on the official UAEU service page."}`
    : "";

  if (locale === "ar") {
    return `**${localized.title}**\n- ${localized.description}\n- سأرشدك عبر الخطوات، وسيبقى إرسال الطلب النهائي في صفحة الخدمة الرسمية لجامعة الإمارات.${verification}`;
  }

  return `**${localized.title}**\n- ${localized.description}\n- I can walk you through this as a guided checklist, while keeping the final submission on the official UAEU service page.${verification}`;
}
