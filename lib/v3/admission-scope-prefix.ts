import type { ExecutionEntities } from "@/lib/v3/contracts";

/** Echo the resolved intake scope when a reviewed admissions answer is partial. */
export function admissionScopePrefix(entities: ExecutionEntities, locale: "ar" | "en"): string {
  const term = entities.term?.toLowerCase();
  const year = entities.year;
  if (!term && !year) return "";
  const englishTerm = term ? `${term[0].toUpperCase()}${term.slice(1)}` : "";
  const arabicTerm: Record<string, string> = { fall: "خريف", autumn: "خريف", spring: "ربيع", summer: "صيف", winter: "شتاء" };
  const scope = [locale === "ar" ? (term ? arabicTerm[term] ?? term : "") : englishTerm, year].filter(Boolean).join(" ");
  const degree = entities.degreeLevel === "undergraduate" ? (locale === "ar" ? "لبكالوريوس" : "undergraduate") :
    entities.degreeLevel === "postgraduate" ? (locale === "ar" ? "للدراسات العليا" : "postgraduate") : "";
  return locale === "ar"
    ? `**النطاق المطلوب: القبول ${degree} ${scope}.**\n\n`
    : `**Requested scope: ${scope} ${degree} admission.**\n\n`;
}
