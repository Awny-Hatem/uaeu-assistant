import crypto from "crypto";
import fs from "fs";
import path from "path";
import { faqScope, faqScopeAllows, loadFaqEntries } from "@/lib/faq";
import type { Citation } from "@/lib/prototype-types";
import { courseCodes, normalizeQuery, scopeAllows, understandQuery, type EvidenceScope, type FactIntent } from "@/lib/query-understanding";

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");

export type KnowledgeDocument = {
  filename: string;
  content: string;
  title: string;
  sourceUrl: string;
  lastVerified: string;
  scope?: EvidenceScope;
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
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    date.getTime() <= Date.now() + 86_400_000 && Date.now() - date.getTime() <= 180 * 86_400_000;
}

export function parseApprovedDocument(
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
    !validIsoDate(metadata.lastverified ?? "") ||
    (metadata.applicantcategory !== undefined && !["national", "international"].includes(metadata.applicantcategory)) ||
    (metadata.degreelevel !== undefined && !["undergraduate", "postgraduate"].includes(metadata.degreelevel)) ||
    (metadata.temporalcoverage !== undefined && !["procedural", "dated"].includes(metadata.temporalcoverage))
  ) {
    return null;
  }

  // Git checkouts may use CRLF on Windows and LF in deployment. They represent
  // identical evidence; normalize before retrieval and content fingerprinting.
  const content = match[2].replace(/\r\n?/g, "\n").trim();
  if (!content) return null;
  return {
    filename,
    content,
    title: metadata.title,
    sourceUrl: metadata.sourceurl,
    lastVerified: metadata.lastverified,
    scope: {
      courseCodes: metadata.coursecodes?.split(",").map((code) => code.trim().toUpperCase()),
      subjects: metadata.subjects?.split(",").map((subject) => subject.trim()),
      years: metadata.academicyears?.split(",").map(Number).filter(Number.isFinite),
      degreeLevel: metadata.degreelevel === "undergraduate" || metadata.degreelevel === "postgraduate" ? metadata.degreelevel : undefined,
      applicantCategory: metadata.applicantcategory as EvidenceScope["applicantCategory"],
      temporalCoverage: metadata.temporalcoverage as EvidenceScope["temporalCoverage"],
    },
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
    hash.update(JSON.stringify({ content: document.content, title: document.title, sourceUrl: document.sourceUrl, lastVerified: document.lastVerified, scope: document.scope }));
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
  return normalizeQuery(text);
}

function tokens(text: string): string[] {
  return normalizeForLexical(text)
    .split(/\s+/)
    .filter((token) => token.length > 1)
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
    }).filter((token) => !STOP.has(token) && !["uaeu", "university", "follow", "up", "question", "requested", "fact"].includes(token));
}

export type EvidenceRow = {
  text: string;
  score: number;
  source: string;
  citations?: Citation[];
  scope?: EvidenceScope;
  title?: string;
};

const FACT_EVIDENCE: Partial<Record<FactIntent, RegExp>> = {
  prerequisites: /prerequisite|corequisite|متطلب.*(?:سابق|متزامن)/iu,
  fees: /\b(?:fee|fees|tuition|charge|cost|aed|free|no charge|price|payment)\b|رسوم|تكلفة|مجاني/iu,
  duration: /\b(?:minutes?|hours?|days?|weeks?|processing|delivery)\b|دقائق|ساعات|ايام|مدة|دقيق[ةه]|ساع[ةه]/iu,
  gpa: /\b(?:gpa|cgpa|grade.point.average)\b|معدل.*تراكمي/iu,
  deadline: /\b(?:deadlines?|last (?:day|date|add|drop|withdraw)|closing|close|due dates?|application period|announced period)\b|اخر موعد|موعد نهائي|فتر[ةه] التقديم/iu,
  eligibility: /\b(?:eligible|eligibility|criteria|requirements?|prerequisites?|enrolled|condition)\b|مؤهل|اهلي[ةه]|شروط|مقيد/iu,
  status: /\b(?:status|track|portal|record|confirmation)\b|حال[ةه]|متابع[ةه]|بواب[ةه]/iu,
  hours: /\b(?:hours?|open|closed|monday|tuesday|schedule)\b|دوام|ساعات|مفتوح|مغلق/iu,
  start: /\b(?:begin|start|commence|first day)\b|بداي[ةه]|يبدا/iu,
};

export function hasRequestedFactEvidence(query: string, text: string): boolean {
  const intent = understandQuery(query).intents;
  return intent.filter((item) => FACT_EVIDENCE[item]).every((item) => FACT_EVIDENCE[item]!.test(normalizeQuery(text)));
}

export function evidenceIsRelevant(query: string, text: string, identity: string, scope: EvidenceScope = {}): boolean {
  const wanted = understandQuery(query);
  const own = understandQuery(identity);
  if (!scopeAllows(query, text, scope)) return false;
  const ownCodes = scope.courseCodes?.length ? scope.courseCodes : own.codes;
  if (wanted.codes.length) {
    if (ownCodes.length && !wanted.codes.some((code) => ownCodes.includes(code))) return false;
    if (!wanted.codes.some((code) => courseCodes(text).includes(code))) return false;
  }
  const subjects = scope.subjects?.length ? scope.subjects : own.subjects;
  const primary = wanted.subjects.filter((subject) => !["calendar", "registration", "graduation", "admissions"].includes(subject));
  const relevantSubjects = primary.length ? primary : wanted.subjects;
  if (!wanted.codes.length && relevantSubjects.length && !relevantSubjects.some((subject) => subjects.includes(subject))) return false;
  // Explicit policy relationships must be evidenced together, not by separate unrelated words.
  for (const concept of ["violation", "suspension", "gpa", "professor", "library"]) {
    if (new RegExp(`\\b${concept}(?:s)?\\b`, "i").test(query) && !new RegExp(`\\b${concept}(?:s)?\\b`, "i").test(text)) return false;
  }
  if (wanted.intents.includes("deadline")) {
    const domain = wanted.subjects.filter((subject) => ["admissions", "graduation", "tuition", "scholarship", "visa", "housing"].includes(subject));
    if (domain.length && !domain.some((subject) => subjects.includes(subject))) return false;
  }
  return true;
}

export function lexicalRetrieve(
  query: string,
  topK: number,
): EvidenceRow[] {
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return [];

  const docs = loadKnowledgeMarkdown();
  const scored: EvidenceRow[] = [];

  for (const { filename, content, title, scope } of docs) {
    const titleTokens = tokens(title);
    for (const section of splitIntoSections(content)) {
      // Repeat the document title for every section when scoring. Markdown sections
      // after the first H1 often omit their subject (for example, a housing section
      // may be titled only "Eligibility and documents"). Without the title, natural
      // compound questions can miss an otherwise exact official excerpt.
      const contextualSection = `# ${title}\n${section}`;
      if (!evidenceIsRelevant(query, contextualSection, title, scope)) continue;
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
        scored.push({ text: contextualSection, score, source: filename, scope, title });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const out: EvidenceRow[] = [];
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

/** Verified answer bodies are evidence too, with exactly their own source citations. */
export function retrieveVerifiedEvidence(query: string, topK = 5): EvidenceRow[] {
  const qTokens = new Set(tokens(query));
  const meaning = understandQuery(query);
  const rows: EvidenceRow[] = [...lexicalRetrieve(query, topK * 2)];
  for (const entry of loadFaqEntries()) {
    if (!faqScopeAllows(query, entry)) continue;
    const title = entry.answer_en.split("\n")[0].replace(/\*\*/g, "");
    const identity = `${title}\n${entry.questions.join(" ")}\n${(entry.matchPhrases ?? []).join(" ")}`;
    const scope = faqScope(entry);
    const text = `${entry.answer_en}\n\n${entry.answer_ar ?? ""}`;
    if (!evidenceIsRelevant(query, text, identity, scope) || !hasRequestedFactEvidence(query, text)) continue;
    const contentTokens = new Set(tokens(`${identity}\n${text}`));
    const matched = [...qTokens].filter((token) => contentTokens.has(token));
    const topicMatch = meaning.subjects.some((subject) => understandQuery(identity).subjects.includes(subject));
    const codeMatch = meaning.codes.some((code) => scope.courseCodes?.includes(code));
    const coverage = matched.length / Math.max(1, qTokens.size);
    if (!codeMatch && (matched.length < 2 || coverage < (topicMatch ? 0.2 : 0.65))) continue;
    rows.push({ text, title, scope, source: `answer:${entry.id}`, score: matched.length * 2 + (codeMatch ? 8 : 0) + 4, citations: entry.citations });
  }
  rows.sort((a, b) => b.score - a.score);
  // The fact guard runs on the assembled relevant evidence so a compound request can
  // use multiple sections; unrelated records cannot supply the missing relationship.
  const selected = rows.slice(0, topK);
  return hasRequestedFactEvidence(query, selected.map((row) => row.text).join("\n")) ? selected : [];
}
