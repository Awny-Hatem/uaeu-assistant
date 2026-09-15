import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");

export function loadKnowledgeMarkdown(): { filename: string; content: string }[] {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return [];
  const names = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  return names.map((filename) => ({
    filename,
    content: fs.readFileSync(path.join(KNOWLEDGE_DIR, filename), "utf-8"),
  }));
}

export function splitIntoSections(md: string): string[] {
  const parts = md.split(/\n(?=## )/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "you",
  "are",
  "this",
  "that",
  "with",
  "from",
  "have",
  "what",
  "how",
  "when",
  "can",
  "does",
  "did",
  "will",
  "about",
  "into",
  "your",
  "any",
  "not",
  "but",
  "was",
  "its",
  "our",
  "they",
  "them",
  "who",
  "why",
  "where",
  "which",
  "also",
  "more",
  "some",
  "than",
  "then",
  "there",
  "these",
  "those",
  "very",
  "just",
  "like",
  "such",
  "other",
  "only",
  "been",
  "would",
  "could",
  "should",
  "please",
  "help",
  "need",
  "want",
  "know",
  "tell",
  "give",
  "get",
  "use",
  "using",
  "used",
  "student",
  "university",
  // Arabic common particles; Arabic keyword matching still works via substring in FAQ.
  "في",
  "من",
  "على",
  "إلى",
  "عن",
  "هل",
  "ما",
  "كيف",
  "أنا",
  "أريد",
]);

function normalizeForLexical(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalizeForLexical(text)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

export function lexicalRetrieve(
  query: string,
  topK: number,
): { text: string; score: number; source: string }[] {
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return [];

  const docs = loadKnowledgeMarkdown();
  const scored: { text: string; score: number; source: string }[] = [];

  for (const { filename, content } of docs) {
    for (const section of splitIntoSections(content)) {
      const sectionTokens = new Set(tokens(section));
      let score = 0;

      for (const token of qTokens) {
        if (sectionTokens.has(token)) score += 1;
      }

      const normalizedQuery = normalizeForLexical(query);
      if (normalizedQuery.length >= 3 && normalizeForLexical(section).includes(normalizedQuery)) {
        score += 3;
      }

      if (score > 0) {
        scored.push({ text: section, score, source: filename });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const out: { text: string; score: number; source: string }[] = [];
  const seen = new Set<string>();

  for (const row of scored) {
    const key = row.text.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= topK) break;
  }

  return out;
}
