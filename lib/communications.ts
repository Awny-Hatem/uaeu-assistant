import communicationsData from "@/data/communications.json";
import type { UniversityCommunication } from "@/lib/prototype-types";

const communications = communicationsData as UniversityCommunication[];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCommunications(
  query: string,
  limit = 2,
): UniversityCommunication[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  return communications
    .map((item) => {
      let score = 0;
      for (const keyword of item.keywords) {
        const normalizedKeyword = normalize(keyword);
        if (normalizedKeyword && normalizedQuery.includes(normalizedKeyword)) {
          score += Math.max(2, normalizedKeyword.length);
        }
      }
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
