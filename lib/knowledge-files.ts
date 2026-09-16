import crypto from "crypto";
import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");

export type KnowledgeDocument = {
  filename: string;
  content: string;
  title: string;
  sourceUrl: string;
  lastVerified: string;
};

type Frontmatter = Record<string, string>;

function officialUaeuUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (host === "uaeu.ac.ae" || host.endsWith(".uaeu.ac.ae"))
    );
  } catch {
    return false;
  }
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseApprovedDocument(
  filename: string,
  raw: string,
): KnowledgeDocument | null {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return null;

  const metadata: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && value) metadata[key] = value;
  }

  if (
    metadata.status !== "approved" ||
    !metadata.title ||
    !metadata.sourceurl ||
    !officialUaeuUrl(metadata.sourceurl) ||
    !validIsoDate(metadata.lastverified ?? "")
  ) {
    return null;
  }

  const content = match[2].trim();
  if (!content) return null;
  return {
    filename,
    content,
    title: metadata.title,
    sourceUrl: metadata.sourceurl,
    lastVerified: metadata.lastverified,
  };
}

export function loadKnowledgeMarkdown(): KnowledgeDocument[] {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return [];
  const names = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  return names.flatMap((filename) => {
    const raw = fs.readFileSync(path.join(KNOWLEDGE_DIR, filename), "utf-8");
    const document = parseApprovedDocument(filename, raw);
    return document ? [document] : [];
  });
}

export function knowledgeFingerprint(): string {
  const hash = crypto.createHash("sha256");
  for (const document of loadKnowledgeMarkdown()) {
    hash.update(document.filename);
    hash.update("\0");
    hash.update(document.content);
    hash.update("\0");
  }
  return hash.digest("hex");
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
  "as",
  "at",
  "be",
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
  "do",
  "does",
  "will",
  "about",
  "into",
  "in",
  "is",
  "of",
  "on",
  "to",
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
  "according",
  "compare",
  "compared",
  "information",
  "listed",
  "official",
  "source",
  "sources",
  "summarize",
  "summary",
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
    .filter((token) => token.length > 1 && !STOP.has(token))
    .map((token) => {
      if (!/^[a-z]+$/.test(token) || token.length <= 3) return token;
      if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
      if (/(?:sses|shes|ches|xes|zes)$/.test(token)) return token.slice(0, -2);
      if (
        token.endsWith("s") &&
        !token.endsWith("ss") &&
        !token.endsWith("us") &&
        !token.endsWith("is")
      ) {
        return token.slice(0, -1);
      }
      return token;
    });
}

export function lexicalRetrieve(
  query: string,
  topK: number,
): { text: string; score: number; source: string }[] {
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return [];

  const docs = loadKnowledgeMarkdown();
  const scored: { text: string; score: number; source: string }[] = [];

  for (const { filename, content, title } of docs) {
    const titleTokens = tokens(title);
    for (const section of splitIntoSections(content)) {
      // Repeat the document title for every section when scoring. Markdown sections
      // after the first H1 often omit their subject (for example, a housing section
      // may be titled only "Eligibility and documents"). Without the title, natural
      // compound questions can miss an otherwise exact official excerpt.
      const contextualSection = `# ${title}\n${section}`;
      const sectionTokens = new Set([...titleTokens, ...tokens(section)]);
      let matches = 0;

      for (const token of qTokens) {
        if (sectionTokens.has(token)) matches += 1;
      }

      const normalizedQuery = normalizeForLexical(query);
      const exactPhrase =
        normalizedQuery.length >= 6 && normalizeForLexical(contextualSection).includes(normalizedQuery);
      const hasExactIdentifier = [...qTokens].some(
        (token) => /^(?=.*[a-z])(?=.*\d)[a-z\d-]{4,}$/i.test(token) && sectionTokens.has(token),
      );
      const coverage = matches / qTokens.size;
      const enoughEvidence =
        exactPhrase || hasExactIdentifier || (matches >= 2 && coverage >= 0.25);
      if (!enoughEvidence) continue;

      const score = matches * 2 + coverage * 4 + (exactPhrase ? 4 : 0) + (hasExactIdentifier ? 5 : 0);

      if (score > 0) {
        scored.push({ text: contextualSection, score, source: filename });
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
