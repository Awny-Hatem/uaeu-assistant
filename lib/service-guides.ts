import fs from "fs";
import path from "path";
import type { ServiceGuide } from "@/lib/prototype-types";

const SERVICE_GUIDE_DIR = path.join(process.cwd(), "data", "service-guides");

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeGuide(value: unknown): value is ServiceGuide {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<ServiceGuide>;
  return Boolean(
    maybe.id &&
      maybe.title &&
      maybe.description &&
      maybe.officialUrl &&
      maybe.lastVerified &&
      Array.isArray(maybe.keywords) &&
      Array.isArray(maybe.steps),
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

  let score = 0;
  for (const keyword of guide.keywords) {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword) continue;
    if (normalizedQuery.includes(normalizedKeyword)) {
      score += Math.max(3, normalizedKeyword.length);
    }
  }

  if (normalizedQuery.includes(normalize(guide.title))) score += 20;
  return score;
}

export function findServiceGuide(query: string): ServiceGuide | null {
  const ranked = loadServiceGuides()
    .map((guide) => ({ guide, score: scoreGuide(query, guide) }))
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.guide ?? null;
}

export function guideIntro(guide: ServiceGuide): string {
  const verification = guide.requiresVerification
    ? "\n\n**Verification Note**\n- Portal labels and requirements can change, so confirm the final step on the official UAEU service page."
    : "";

  return `**${guide.title}**\n- ${guide.description}\n- I can walk you through this as a guided checklist, while keeping the final submission on the official UAEU service page.${verification}`;
}
