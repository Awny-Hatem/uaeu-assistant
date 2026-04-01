import faqData from "@/data/faq.json";
import type { Locale } from "@/lib/language";

export type FaqEntry = {
  id: string;
  keywords: string[];
  answer_en: string;
  answer_ar: string;
};

const faq = faqData as FaqEntry[];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchFaq(userMessage: string): { entry: FaqEntry; score: number } | null {
  const q = normalize(userMessage);
  if (!q) return null;

  let best: { entry: FaqEntry; score: number } | null = null;

  for (const entry of faq) {
    let score = 0;
    for (const kw of entry.keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (q.includes(k)) score += k.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  if (!best || best.score < 3) return null;
  return best;
}

export function faqAnswer(entry: FaqEntry, locale: Locale): string {
  return locale === "ar" ? entry.answer_ar : entry.answer_en;
}
