import fs from "node:fs";
import path from "node:path";

type VerifiedAnswer = {
  id: string;
  category: string;
  questions?: string[];
  matchPhrases?: string[];
  answer_en: string;
  answer_ar: string;
  citations: { title?: string; url?: string; document?: string }[];
};
type Payload = {
  content?: string;
  source?: string;
  disposition?: string;
  stateLabel?: string;
  answerId?: string;
  faqId?: string;
  citations?: { title?: string; url?: string; document?: string }[];
  guide?: { id?: string; steps?: unknown[] };
};

const root = process.cwd();
const answerFiles = ["data/verified-answers/academic.json", "data/verified-answers/student-services.json"];
const entries = answerFiles.flatMap((file) =>
  (JSON.parse(fs.readFileSync(path.join(root, file), "utf8")).entries as VerifiedAnswer[]));
const outputDir = path.join(root, "reports/coverage");
const date = new Date().toISOString().slice(0, 10);
const outputPath = path.join(outputDir, `v3-verified-answer-coverage-${date}.jsonl`);
const summaryPath = path.join(outputDir, `v3-verified-answer-coverage-${date}.json`);

function hasArabic(text: string): boolean {
  return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(text);
}

function choosePrompt(entry: VerifiedAnswer, language: "en" | "ar"): string | undefined {
  const candidates = [...(entry.questions ?? []), ...(entry.matchPhrases ?? [])]
    .filter((text) => hasArabic(text) === (language === "ar"));
  const specificity = (text: string) => {
    let score = text.length;
    if (/\b(?:this|that)\s+(?:course|program|degree|application|service|request)\b|\bthe same\b/iu.test(text)) score -= 100;
    if (/\b(?:19|20)\d{2}\b|\b[A-Z]{2,8}\d{3,4}[A-Z]?\b/u.test(text)) score += 200;
    if (/[\u0640-\u064a]/u.test(text) && /\u0647\u0630\u0627|\u0647\u0630\u0647|\u0630\u0644\u0643/u.test(text)) score -= 100;
    return score;
  };
  return candidates.sort((left, right) => specificity(right) - specificity(left))[0];
}

const cases = entries.flatMap((entry) => {
  const englishQuestion = choosePrompt(entry, "en");
  const arabicQuestion = choosePrompt(entry, "ar");
  return [
    ...(englishQuestion ? [{ entry, language: "en" as const, question: englishQuestion }] : []),
    ...(arabicQuestion ? [{ entry, language: "ar" as const, question: arabicQuestion }] : []),
  ];
});
if (cases.length !== new Set(cases.map(({ entry, language }) => `${entry.id}:${language}`)).size) {
  throw new Error("Duplicate verified-answer coverage case.");
}

async function main(): Promise<void> {
  process.env.AI_PROVIDER = "mock";
  process.env.UAEU_AGENT_V3_ENABLED = "enabled";
  process.env.GEMINI_EMBEDDING_SEARCH = "";
  process.env.SERVER_CHAT_HISTORY = "";
  process.env.CHATBOT_DB_PATH = ":memory:";
  process.env.TRUST_PROXY_HEADERS = "enabled";
  const { POST } = await import("../app/api/chat/route");
  const results: Record<string, unknown>[] = [];
  fs.mkdirSync(outputDir, { recursive: true });
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  const concurrency = 8;
  for (let offset = 0; offset < cases.length; offset += concurrency) {
    const batch = cases.slice(offset, offset + concurrency);
    const rows = await Promise.all(batch.map(async ({ entry, language, question }, batchIndex) => {
      const index = offset + batchIndex;
      const response = await POST(new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", "x-forwarded-for": `198.19.${Math.floor(index / 254)}.${(index % 254) + 1}` },
        body: JSON.stringify({ locale: "auto", messages: [{ role: "user", content: question }] }),
      }));
      const payload = await response.json() as Payload;
      const actualId = payload.answerId ?? payload.faqId ?? null;
      const citations = payload.citations ?? [];
      const errors: string[] = [];
      if (response.status !== 200) errors.push(`HTTP ${response.status}`);
      if (!payload.content?.trim()) errors.push("empty response");
      const exactReviewedAnswer = ["faq", "rag"].includes(payload.source ?? "") && actualId === entry.id;
      const structuredGuideAlternative = payload.source === "guide" && Boolean(payload.guide?.id) && (payload.guide?.steps?.length ?? 0) > 0;
      const expectedUrls = entry.citations.map(({ url }) => url).filter((url): url is string => Boolean(url));
      const expectedCourseCode = expectedUrls.map((url) => {
        try { return new URL(url).searchParams.get("id"); } catch { return null; }
      }).find(Boolean);
      const citedCatalogAlternative = entry.category === "courses" &&
        payload.source === "rag" && payload.stateLabel === "v3_official_course_catalog_lookup" &&
        citations.some((citation) => Boolean(citation.url && new URL(citation.url).hostname.endsWith("uaeu.ac.ae"))) &&
        Boolean(expectedCourseCode && payload.content?.includes(expectedCourseCode));
      const prerequisiteCatalogAlternative = entry.id === "course-prerequisites-data-structures" &&
        payload.source === "rag" && payload.stateLabel === "v3_official_course_catalog_lookup" &&
        citations.some((citation) => citation.url === "https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319") &&
        ["CSBP319", "CSBP219", "CSBP221"].every((code) => (payload.content ?? "").includes(code));
      if (!exactReviewedAnswer && !structuredGuideAlternative && !prerequisiteCatalogAlternative) {
        if (!citedCatalogAlternative && !(entry.id === "campus-medical-emergency" && actualId === "urgent-safety" && payload.disposition === "urgent")) {
          errors.push(`expected the reviewed answer ${entry.id}, its exact cited catalog record, or a structured service guide; got ${payload.source ?? "none"}/${actualId ?? "none"}`);
        }
      }
      if (exactReviewedAnswer) {
        for (const citation of entry.citations) {
          if (citation.url && !citations.some((actual) => actual.url === citation.url)) errors.push(`missing expected citation ${citation.url}`);
        }
      } else if (structuredGuideAlternative && !citations.some((citation) => citation.url)) {
        errors.push("structured service guide omitted a source URL");
      }
      const answerLanguageText = language === "ar" ? entry.answer_ar : entry.answer_en;
      if (hasArabic(question) !== hasArabic(payload.content ?? "")) errors.push("response language does not match the question language");
      return {
        id: `VQA-${language.toUpperCase()}-${entry.id}`,
        language,
        domain: entry.category,
        question,
        messages: [{ role: "user", content: question }],
        answerText: payload.content ?? "",
        actualSource: payload.source ?? "none",
        actualDisposition: payload.disposition ?? payload.stateLabel ?? "none",
        actualStateLabel: payload.stateLabel ?? null,
        actualAnswerId: actualId,
        citations,
        guide: payload.guide ?? null,
        expected: { answerId: entry.id, source: "faq", citations: entry.citations, canonicalAnswerLength: answerLanguageText.length },
        reviewState: "route-contract-only; factual-content-and-six-criterion-review-required",
        httpStatus: response.status,
        errors,
      };
    }));
    results.push(...rows);
    fs.appendFileSync(outputPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  }
  const byLanguage: Record<string, { total: number; passed: number; failed: number }> = {};
  const byDomain: Record<string, { total: number; passed: number; failed: number }> = {};
  const byError: Record<string, number> = {};
  for (const result of results as (typeof results[number] & { language: string; domain: string; errors: string[] })[]) {
    for (const [map, key] of [[byLanguage, result.language], [byDomain, result.domain]] as const) {
      map[key] ??= { total: 0, passed: 0, failed: 0 };
      map[key].total += 1;
      map[key][result.errors.length ? "failed" : "passed"] += 1;
    }
    for (const error of result.errors) byError[error] = (byError[error] ?? 0) + 1;
  }
  const passed = (results as (typeof results[number] & { errors: string[] })[]).filter((row) => row.errors.length === 0).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    candidate: "current local working tree; no deployment identity asserted",
    environment: "AI_PROVIDER=mock; local route; in-memory chat database; no external model calls",
    purpose: "Ensure every curated verified-answer entry is reachable in each language for which it has a localized prompt. This is routing/citation coverage, not factual or quality certification.",
    total: results.length,
    passed,
    failed: results.length - passed,
    byLanguage,
    byDomain,
    byError,
    resultJsonl: path.relative(root, outputPath),
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
