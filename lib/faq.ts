import fs from "fs";
import path from "path";
import type { Locale } from "@/lib/language";
import type { Citation } from "@/lib/prototype-types";

export type AnswerDisposition =
  | "answer"
  | "clarify"
  | "portal"
  | "handoff"
  | "urgent";

export type FaqEntry = {
  id: string;
  category: string;
  questions: string[];
  matchPhrases?: string[];
  excludePhrases?: string[];
  answer_en: string;
  answer_ar?: string;
  disposition?: AnswerDisposition;
  citations: Citation[];
};

type AnswerFile = {
  schemaVersion: number;
  entries: FaqEntry[];
};

const EXPECTED_ANSWER_PACKS = [
  { filename: "academic.json", minimumEntries: 62 },
  { filename: "student-services.json", minimumEntries: 43 },
] as const;
const CITATION_FRESHNESS_MS = 180 * 24 * 60 * 60 * 1000;

const ANSWER_DIR = path.join(process.cwd(), "data", "verified-answers");

const MATCH_STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "any",
  "are",
  "ar",
  "at",
  "be",
  "can",
  "check",
  "could",
  "currently",
  "do",
  "does",
  "for",
  "find",
  "from",
  "get",
  "how",
  "holding",
  "i",
  "explain",
  "in",
  "is",
  "it",
  "just",
  "kindly",
  "friday",
  "me",
  "my",
  "need",
  "monday",
  "of",
  "offer",
  "offering",
  "official",
  "online",
  "on",
  "or",
  "page",
  "please",
  "running",
  "right",
  "saturday",
  "sunday",
  "show",
  "the",
  "they",
  "them",
  "these",
  "those",
  "tell",
  "today",
  "thursday",
  "this",
  "to",
  "tuesday",
  "uaeu",
  "university",
  "univeristy",
  "univesity",
  "what",
  "when",
  "where",
  "which",
  "with",
  "use",
  "urgently",
  "would",
  "want",
  "was",
  "wednesday",
  "wondering",
  "now",
  "available",
  "you",
  "your",
  "أنا",
  "إلى",
  "التي",
  "الذي",
  "الجامعة",
  "جامعة",
  "عن",
  "في",
  "كيف",
  "ما",
  "من",
  "هل",
  "لو",
  "سمحت",
  "وضح",
]);

const GENERIC_SINGLE_PHRASES = new Set([
  "admission",
  "application",
  "calendar",
  "certificate",
  "contact",
  "course",
  "deadline",
  "document",
  "email",
  "exam",
  "fee",
  "fees",
  "letter",
  "official",
  "phone",
  "policy",
  "service",
  "support",
  "transcript",
]);

// These utterances only make sense with a subject from the preceding turn.
// Keeping them out of direct FAQ scoring prevents "How long does visa renewal
// take?" from matching a generic document-processing answer, for example.
const CONTEXT_ONLY_QUESTIONS = new Set([
  "am i eligible",
  "how long does it take",
  "what are the prerequisites for this course",
  "what is the application deadline",
]);

let answerCache: FaqEntry[] | null = null;

export function normalizeAnswerText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTokens(value: string): string[] {
  return normalizeAnswerText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !MATCH_STOP_WORDS.has(token))
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

function isSingleEditVariant(left: string, right: string): boolean {
  if (
    left === right ||
    left.length < 5 ||
    right.length < 5 ||
    !/^[a-z]+$/.test(left) ||
    !/^[a-z]+$/.test(right) ||
    Math.abs(left.length - right.length) > 1
  ) {
    return false;
  }

  if (left.length === right.length) {
    const differences: number[] = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) differences.push(index);
      if (differences.length > 2) return false;
    }
    if (differences.length === 1) return true;
    return (
      differences.length === 2 &&
      differences[1] === differences[0] + 1 &&
      left[differences[0]] === right[differences[1]] &&
      left[differences[1]] === right[differences[0]]
    );
  }

  const [shorter, longer] = left.length < right.length ? [left, right] : [right, left];
  let shortIndex = 0;
  let longIndex = 0;
  let edits = 0;
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
      continue;
    }
    edits += 1;
    longIndex += 1;
    if (edits > 1) return false;
  }
  return true;
}

function correctedQueryTokens(query: string, entries: FaqEntry[]): Set<string> {
  const vocabulary = new Set<string>();
  for (const entry of entries) {
    for (const text of [...entry.questions, ...(entry.matchPhrases ?? [])]) {
      for (const token of contentTokens(text)) {
        if (/^[a-z]+$/.test(token) && token.length >= 5) vocabulary.add(token);
      }
    }
  }

  return new Set(
    contentTokens(query).map((token) => {
      if (vocabulary.has(token) || !/^[a-z]+$/.test(token) || token.length < 5) {
        return token;
      }
      const candidates = [...vocabulary].filter((candidate) =>
        isSingleEditVariant(token, candidate),
      );
      return candidates.length === 1 ? candidates[0] : token;
    }),
  );
}

function validVerificationDate(value: unknown, now = Date.now()): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value &&
    timestamp <= now + 24 * 60 * 60 * 1000
  );
}

function isCitation(value: unknown): value is Citation {
  if (!value || typeof value !== "object") return false;
  const citation = value as Partial<Citation>;
  return Boolean(
    typeof citation.title === "string" &&
      citation.title.trim() &&
      validVerificationDate(citation.lastVerified) &&
      ((typeof citation.url === "string" && citation.url.trim()) ||
        (typeof citation.document === "string" && citation.document.trim())),
  );
}

function isAnswerEntry(value: unknown): value is FaqEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<FaqEntry>;
  return Boolean(
    typeof entry.id === "string" &&
      entry.id.trim() &&
      typeof entry.category === "string" &&
      entry.category.trim() &&
      Array.isArray(entry.questions) &&
      entry.questions.length > 0 &&
      entry.questions.every((question) => typeof question === "string" && question.trim()) &&
      (entry.matchPhrases === undefined ||
        (Array.isArray(entry.matchPhrases) &&
          entry.matchPhrases.every((phrase) => typeof phrase === "string" && phrase.trim()))) &&
      (entry.excludePhrases === undefined ||
        (Array.isArray(entry.excludePhrases) &&
          entry.excludePhrases.every((phrase) => typeof phrase === "string" && phrase.trim()))) &&
      typeof entry.answer_en === "string" &&
      entry.answer_en.trim() &&
      (entry.answer_ar === undefined ||
        (typeof entry.answer_ar === "string" && entry.answer_ar.trim())) &&
      (entry.disposition === undefined ||
        ["answer", "clarify", "portal", "handoff", "urgent"].includes(entry.disposition)) &&
      Array.isArray(entry.citations) &&
      entry.citations.length > 0 &&
      entry.citations.every(isCitation),
  );
}

export function loadFaqEntries(): FaqEntry[] {
  if (answerCache) return answerCache;
  if (!fs.existsSync(ANSWER_DIR)) return [];

  const entries = fs
    .readdirSync(ANSWER_DIR)
    .filter((filename) => filename.endsWith(".json"))
    .sort()
    .flatMap((filename) => {
      try {
        const raw = fs.readFileSync(path.join(ANSWER_DIR, filename), "utf-8");
        const parsed = JSON.parse(raw) as AnswerFile;
        if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) return [];
        return parsed.entries.filter(isAnswerEntry);
      } catch (error) {
        console.warn(
          `Unable to load verified answer file ${filename}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
        return [];
      }
    });

  const seen = new Set<string>();
  answerCache = entries.filter((entry) => {
    if (seen.has(entry.id)) {
      console.warn(`Ignoring duplicate verified answer id: ${entry.id}`);
      return false;
    }
    seen.add(entry.id);
    return true;
  });
  return answerCache;
}

export function clearFaqCacheForTests() {
  answerCache = null;
}

export function faqHealthSnapshot(now = Date.now()) {
  const packs = EXPECTED_ANSWER_PACKS.map(({ filename, minimumEntries }) => {
    const filePath = path.join(ANSWER_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return {
        filename,
        minimumEntries,
        validEntries: 0,
        invalidEntries: 0,
        staleCitations: 0,
        latestVerification: null,
        error: "missing",
      };
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<AnswerFile>;
      const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const validEntries = rawEntries.filter(isAnswerEntry);
      const verificationTimes = validEntries.flatMap((entry) =>
        entry.citations.flatMap((citation) => {
          const value = citation.lastVerified;
          if (!validVerificationDate(value, now)) return [];
          const timestamp = Date.parse(`${value}T00:00:00Z`);
          return Number.isFinite(timestamp) ? [timestamp] : [];
        }),
      );
      const staleCitations = verificationTimes.filter(
        (timestamp) => now - timestamp > CITATION_FRESHNESS_MS,
      ).length;
      return {
        filename,
        minimumEntries,
        validEntries: validEntries.length,
        invalidEntries: rawEntries.length - validEntries.length,
        staleCitations,
        latestVerification: verificationTimes.length
          ? new Date(Math.max(...verificationTimes)).toISOString().slice(0, 10)
          : null,
        error: parsed.schemaVersion === 1 ? null : "invalid_schema",
      };
    } catch {
      return {
        filename,
        minimumEntries,
        validEntries: 0,
        invalidEntries: 0,
        staleCitations: 0,
        latestVerification: null,
        error: "invalid_json",
      };
    }
  });

  return {
    complete: packs.every(
      (pack) =>
        !pack.error &&
        pack.validEntries >= pack.minimumEntries &&
        pack.invalidEntries === 0 &&
        pack.staleCitations === 0,
    ),
    freshnessDays: CITATION_FRESHNESS_MS / (24 * 60 * 60 * 1000),
    packs,
  };
}

function containsPhrase(query: string, phrase: string): boolean {
  const normalizedPhrase = normalizeAnswerText(phrase);
  if (!normalizedPhrase) return false;
  return ` ${query} `.includes(` ${normalizedPhrase} `);
}

function similarityScore(
  query: string,
  candidate: string,
  queryTokens: Set<string>,
): number {
  const normalizedCandidate = normalizeAnswerText(candidate);
  if (!normalizedCandidate) return 0;
  if (query === normalizedCandidate) return 10_000 + normalizedCandidate.length;

  const candidateTokens = [...new Set(contentTokens(normalizedCandidate))];
  if (!candidateTokens.length || !queryTokens.size) return 0;

  const matching = candidateTokens.filter((token) => queryTokens.has(token)).length;
  const requiredMatches = candidateTokens.length === 1
    ? 1
    : Math.max(2, Math.ceil(candidateTokens.length * 0.6));
  if (matching < requiredMatches) return 0;

  const coverage = matching / candidateTokens.length;
  const queryCoverage = matching / queryTokens.size;
  const union = new Set([...candidateTokens, ...queryTokens]).size;
  const jaccard = matching / union;
  const contextualQuery = query.includes("follow up question");
  if (coverage < 0.7 || (!contextualQuery && queryCoverage < 0.7)) return 0;

  return Math.round(coverage * 1_000 + jaccard * 250 + matching * 20);
}

function phraseScore(
  query: string,
  phrase: string,
  queryTokens: Set<string>,
): number {
  const normalizedPhrase = normalizeAnswerText(phrase);
  if (!normalizedPhrase || !containsPhrase(query, normalizedPhrase)) return 0;

  const tokenCount = contentTokens(normalizedPhrase).length;
  if (tokenCount === 0) return 0;
  if (tokenCount === 1 && GENERIC_SINGLE_PHRASES.has(normalizedPhrase)) return 0;
  if (tokenCount === 1 && normalizedPhrase.length < 5 && !/\d/.test(normalizedPhrase)) return 0;
  if (!query.includes("follow up question") && tokenCount / queryTokens.size < 0.7) return 0;

  return 2_000 + normalizedPhrase.length;
}

function scoreEntry(query: string, queryTokens: Set<string>, entry: FaqEntry): number {
  if (entry.excludePhrases?.some((phrase) => containsPhrase(query, phrase))) {
    return 0;
  }

  let score = 0;
  for (const question of entry.questions) {
    if (CONTEXT_ONLY_QUESTIONS.has(normalizeAnswerText(question))) continue;
    score = Math.max(score, similarityScore(query, question, queryTokens));
  }
  for (const phrase of entry.matchPhrases ?? []) {
    const tokenCount = contentTokens(phrase).length;
    score = Math.max(
      score,
      phraseScore(query, phrase, queryTokens),
      tokenCount >= 2 ? similarityScore(query, phrase, queryTokens) : 0,
    );
  }
  return score;
}

export function matchFaq(
  userMessage: string,
): { entry: FaqEntry; score: number } | null {
  const query = normalizeAnswerText(userMessage);
  if (!query) return null;
  const entries = loadFaqEntries();
  const queryTokens = correctedQueryTokens(query, entries);
  if (!queryTokens.size) return null;

  let best: { entry: FaqEntry; score: number } | null = null;
  for (const entry of entries) {
    const score = scoreEntry(query, queryTokens, entry);
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  return best && best.score >= 700 ? best : null;
}

export function faqAnswer(entry: FaqEntry, locale: Locale): string {
  if (locale === "ar" && entry.answer_ar?.trim()) return entry.answer_ar;
  return entry.answer_en;
}
