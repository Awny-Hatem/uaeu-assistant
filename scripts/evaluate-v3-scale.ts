import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { validateEvidenceOnly, type EvidenceOnlyExpectation } from "./evaluation-evidence-checks";

type ScaleCase = {
  id: string;
  language: string;
  domain: string;
  question: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  expected: Record<string, unknown>;
  reviewState?: string;
};

type Payload = {
  content?: string;
  source?: string;
  stateLabel?: string;
  answerId?: string;
  faqId?: string;
  disposition?: string;
  escalationReason?: string;
  citations?: { title?: string; url?: string; document?: string }[];
  guide?: { id?: string; steps?: unknown[] };
  error?: string;
};

type Result = {
  id: string;
  language: string;
  domain: string;
  question: string;
  messages: { role: "user" | "assistant"; content: string }[];
  expected: Record<string, unknown>;
  reviewState: string;
  httpStatus: number;
  answerText: string;
  actualSource: string;
  actualDisposition: string;
  actualStateLabel: string | null;
  actualAnswerId: string | null;
  citations: NonNullable<Payload["citations"]>;
  guide: Payload["guide"] | null;
  errors: string[];
};

const root = process.cwd();
const inputPath = path.join(root, "data/evals/v3-scale-questions.jsonl");
const reportDirectory = path.join(root, "reports/coverage");
const runDate = new Date().toISOString().slice(0, 10);
const requestedLimit = Number(process.env.SCALE_EVAL_LIMIT ?? 10000);
const limited = Number.isInteger(requestedLimit) && requestedLimit > 0 && requestedLimit < 10000;
const selectedIds = (process.env.SCALE_EVAL_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
const selectedLanguages = (process.env.SCALE_EVAL_LANGUAGES ?? "").split(",").map((language) => language.trim().toLowerCase()).filter(Boolean);
const selectedDomains = (process.env.SCALE_EVAL_DOMAINS ?? "").split(",").map((domain) => domain.trim().toLowerCase()).filter(Boolean);
const runVersion = process.env.SCALE_EVAL_VERSION?.trim();
const isTargeted = selectedIds.length > 0 || selectedLanguages.length > 0 || selectedDomains.length > 0;
const runLabelBase = isTargeted ? "targeted" : limited ? `pilot-${requestedLimit}` : "10000";
const runLabel = runVersion ? `${runVersion}-${runLabelBase}` : runLabelBase;
const reportPath = path.join(reportDirectory, `v3-scale-route-eval-${runDate}-${runLabel}.jsonl`);
const summaryPath = path.join(reportDirectory, `v3-scale-route-eval-${runDate}-${runLabel}.json`);

function listFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : entry.isFile() ? [absolute] : [];
  });
}

function identifyCandidate(): Record<string, unknown> {
  const trackedPaths = [
    ...["app", "lib", "data", "components"].flatMap(listFiles),
    "scripts/evaluate-v3-scale.ts",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
  ].filter((file) => fs.existsSync(file));
  const uniquePaths = [...new Set(trackedPaths)].sort();
  const snapshot = crypto.createHash("sha256");
  for (const file of uniquePaths) {
    snapshot.update(path.relative(root, file).replaceAll("\\", "/"));
    snapshot.update("\0");
    snapshot.update(fs.readFileSync(file));
    snapshot.update("\0");
  }
  let commit: string | null = null;
  try { commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); }
  catch { /* Source snapshot hash remains available outside a Git checkout. */ }
  return {
    gitCommit: commit,
    appSnapshotSha256: snapshot.digest("hex"),
    includedFileCount: uniquePaths.length,
    includedPaths: ["app/**", "lib/**", "data/**", "components/**", "scripts/evaluate-v3-scale.ts", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json"],
  };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

function readCases(): ScaleCase[] {
  const lines = fs.readFileSync(inputPath, "utf8").trim().split(/\r?\n/u);
  const cases = lines.map((line) => JSON.parse(line) as ScaleCase);
  if (cases.length !== 10_000) throw new Error(`Expected 10,000 cases, found ${cases.length}.`);
  return cases;
}

function validate(testCase: ScaleCase, status: number, payload: Payload): string[] {
  const errors: string[] = [];
  const expected = testCase.expected;
  const content = payload.content ?? "";
  const normalizedContent = normalize(content);
  if (status !== 200) errors.push(`HTTP ${status}`);
  if (payload.error) errors.push(`service error: ${payload.error}`);
  if (!content.trim()) errors.push("empty response");

  const citations = payload.citations ?? [];
  if (expected.kind === "official_course_catalog_fact") {
    const courseCode = String(expected.courseCode ?? "");
    if (!normalizedContent.includes(normalize(courseCode))) errors.push(`response omits ${courseCode}`);
    const sourceUrl = String(expected.sourceUrl ?? "");
    if (sourceUrl && !citations.some((citation) => citation.url === sourceUrl)) errors.push("missing exact course-catalog citation");
    if (expected.factType === "creditHours" && Number.isFinite(expected.creditHours)) {
      const creditText = String(expected.creditHours);
      if (!new RegExp(`(^|\\D)${creditText}(\\D|$)`, "u").test(content)) {
        errors.push(`response omits published credit value ${creditText}`);
      }
    }
    if (expected.factType === "title" && !normalizedContent.includes(normalize(String(expected.title ?? "")))) {
      errors.push("response omits published course title");
    }
    if (expected.expectedResolution === "unresolved_do_not_infer_eligibility") {
      if (!/(unresolved|unsupported|cannot determine|not established|needs confirmation|غير محسوم|غير متاح|لا يمكن تحديد|يلزم التحقق)/iu.test(content)) {
        errors.push("unstructured prerequisite lacks an explicit unresolved boundary");
      }
    }
  } else if (expected.kind === "official_curriculum_snapshot_fact") {
    const sources = Array.isArray(expected.sources) ? expected.sources as { url?: string }[] : [];
    const sourceUrls = sources.map((source) => source.url).filter((url): url is string => Boolean(url));
    if (!citations.some((citation) => sourceUrls.includes(citation.url ?? ""))) errors.push("missing curriculum source citation");
    if (expected.factType === "totalCredits" && expected.state === "published") {
      const value = String(expected.value);
      if (!new RegExp(`(^|\\D)${value}(\\D|$)`, "u").test(content)) errors.push(`response omits published total credits ${value}`);
    }
    if (expected.factType === "creditBuckets" && expected.state === "published" && Array.isArray(expected.value)) {
      const buckets = expected.value as { name?: string; credits?: number }[];
      for (const bucket of buckets) {
        if (!Number.isFinite(bucket.credits) || !new RegExp(`(^|\\D)${bucket.credits}(\\D|$)`, "u").test(content)) {
          errors.push(`response omits published ${String(bucket.name ?? "credit bucket")} credit value ${String(bucket.credits)}`);
        }
      }
    }
    if (expected.factType === "cohortLabel" && expected.state === "published_label_not_personal_assignment") {
      if (!/(cohort|entrant|entry|plan|دفعة|فئة|خطة|الطلبة)/iu.test(content)) errors.push("response does not identify curriculum applicability as a published label");
    }
  } else if (expected.kind === "existing_route_fixture_expectation") {
    const expectedSource = String(expected.expectedSource ?? "");
    const canonicalSources = new Set(["faq", "rag"]);
    const sourceMatches = canonicalSources.has(expectedSource)
      ? canonicalSources.has(payload.source ?? "")
      : payload.source === expectedSource;
    const expectedAnswerId = String(expected.expectedAnswerId ?? "");
    const actualAnswerId = payload.answerId ?? payload.faqId ?? payload.guide?.id;
    const upgradedGuides: Record<string, string> = {
      "librarian-research-help": "ask-a-librarian-research-help",
      "campus-shuttle-schedule": "student-transportation",
      "change-major": "change-undergraduate-major",
    };
    const equivalentGuidedRoute = expectedSource === "faq" && payload.source === "guide" &&
      upgradedGuides[expectedAnswerId] === actualAnswerId;
    if (expectedSource && !sourceMatches && !equivalentGuidedRoute) errors.push(`expected source ${expectedSource}, got ${payload.source ?? "none"}`);
    const verifiedCatalogEquivalent = expectedAnswerId === "course-prerequisites-data-structures" &&
      payload.stateLabel === "v3_official_course_catalog_lookup" &&
      citations.some((citation) => citation.url?.includes("id=CSBP319")) &&
      /CSBP219[\s\S]*CSBP221/u.test(content);
    const verifiedCourseTopicsEquivalent = expectedAnswerId === "course-topics-data-structures" &&
      payload.stateLabel === "v3_official_course_catalog_lookup" &&
      citations.some((citation) => citation.url?.includes("id=CSBP319")) &&
      /arrays[\s\S]*stacks[\s\S]*graphs[\s\S]*recursion/iu.test(content);
    if (expectedAnswerId && actualAnswerId !== expectedAnswerId && !verifiedCatalogEquivalent && !verifiedCourseTopicsEquivalent && !equivalentGuidedRoute) {
      errors.push(`expected answer ${expectedAnswerId}, got ${actualAnswerId ?? "none"}`);
    }
    if (equivalentGuidedRoute) {
      if ((payload.guide?.steps?.length ?? 0) < 2) errors.push("upgraded guided route omitted its structured steps");
      if (!citations.some((citation) => /(?:^|\.)uaeu\.ac\.ae$/i.test(new URL(citation.url ?? "https://invalid.local").hostname))) {
        errors.push("upgraded guided route lacks an official UAEU citation");
      }
    }
    const requiredTerms = [
      ...(Array.isArray(expected.requiredTerms) ? expected.requiredTerms as string[] : []),
      ...(Array.isArray(expected.requiredPatterns) ? expected.requiredPatterns as string[] : []),
    ];
    for (const term of requiredTerms) if (!normalizedContent.includes(normalize(term))) errors.push(`missing expected term/pattern: ${term}`);
    const forbidden = [
      ...(Array.isArray(expected.forbiddenPatterns) ? expected.forbiddenPatterns as string[] : []),
    ];
    for (const term of forbidden) if (normalizedContent.includes(normalize(term))) errors.push(`contains forbidden term/pattern: ${term}`);
    const minCitations = Number(expected.minCitations ?? 0);
    if (citations.length < minCitations) errors.push(`expected ${minCitations} citations, got ${citations.length}`);
    const evidenceOnly = expected.evidenceOnly as EvidenceOnlyExpectation | undefined;
    if (evidenceOnly) errors.push(...validateEvidenceOnly(testCase.messages ?? [{ role: "user", content: testCase.question }], testCase.question, evidenceOnly));
  } else if (expected.kind === "official_service_workflow_route") {
    if (payload.source !== "guide") errors.push(`expected guided workflow, got ${payload.source ?? "none"}`);
    if (payload.guide?.id !== expected.guideId) errors.push(`expected workflow guide ${String(expected.guideId)}, got ${payload.guide?.id ?? "none"}`);
    if ((payload.guide?.steps?.length ?? 0) < Number(expected.minimumStepCount ?? 0)) errors.push("guided workflow omitted structured steps");
    if (!citations.some((citation) => citation.url === expected.officialUrl)) errors.push("missing official workflow destination/source");
    if (/(successfully (submitted|registered|dropped|approved)|تم (إرسال|تسجيل|اعتماد) الطلب بنجاح)/iu.test(content)) errors.push("claims a portal transaction completed");
  } else errors.push(`unknown expected result kind: ${String(expected.kind)}`);

  if (["en", "ar"].includes(testCase.language)) {
    const arabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(content);
    if (testCase.language === "ar" && !arabic) errors.push("expected Arabic answer");
    if (testCase.language === "en" && !/[A-Za-z]/u.test(content)) errors.push("expected English answer");
  }
  return errors;
}

async function main(): Promise<void> {
  const candidateIdentity = identifyCandidate();
  const allCases = readCases();
  let cases = selectedIds.length ? allCases.filter((testCase) => selectedIds.includes(testCase.id)) : allCases;
  if (selectedLanguages.length) cases = cases.filter((testCase) => selectedLanguages.includes(testCase.language.toLowerCase()));
  if (selectedDomains.length) cases = cases.filter((testCase) => selectedDomains.includes(testCase.domain.toLowerCase()));
  if (!isTargeted && limited) cases = cases.slice(0, requestedLimit);
  if (selectedIds.length && cases.length !== new Set(selectedIds).size) {
    throw new Error("One or more requested SCALE_EVAL_IDS were not found.");
  }
  if (isTargeted && cases.length === 0) throw new Error("The requested scale-evaluation filter matched no cases.");
  // This is a deterministic local route exercise; no real provider, persistent chat DB, or deployment is used.
  process.env.AI_PROVIDER = "mock";
  process.env.UAEU_AGENT_V3_ENABLED = "enabled";
  process.env.GEMINI_EMBEDDING_SEARCH = "";
  process.env.SERVER_CHAT_HISTORY = "";
  process.env.CHATBOT_DB_PATH = ":memory:";
  process.env.TRUST_PROXY_HEADERS = "enabled";

  const { POST } = await import("../app/api/chat/route");
  const results: Result[] = [];
  fs.mkdirSync(reportDirectory, { recursive: true });
  // Evaluation captures are evidence. Never delete or silently replace an earlier run.
  if (fs.existsSync(reportPath) || fs.existsSync(summaryPath)) {
    throw new Error(`Refusing to overwrite an existing evaluation capture. Set SCALE_EVAL_VERSION to a new unique label. Existing paths: ${[reportPath, summaryPath].filter((file) => fs.existsSync(file)).join(", ")}`);
  }
  const reportFd = fs.openSync(reportPath, "wx");
  const requestedConcurrency = Number(process.env.SCALE_EVAL_CONCURRENCY ?? 8);
  const concurrency = Number.isInteger(requestedConcurrency) ? Math.min(16, Math.max(1, requestedConcurrency)) : 8;
  const evaluate = async (index: number, testCase: ScaleCase): Promise<Result> => {
    const address = `198.51.${Math.floor(index / 254)}.${(index % 254) + 1}`;
    const messages = testCase.messages ?? [{ role: "user" as const, content: testCase.question }];
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-forwarded-for": address,
      },
      body: JSON.stringify({
        locale: "auto",
        messages,
      }),
    }));
    const payload = await response.json() as Payload;
    const result: Result = {
      id: testCase.id,
      language: testCase.language,
      domain: testCase.domain,
      question: testCase.question,
      messages,
      expected: testCase.expected,
      reviewState: String(testCase.reviewState ?? "unspecified"),
      httpStatus: response.status,
      answerText: payload.content ?? "",
      actualSource: payload.source ?? "none",
      actualDisposition: payload.disposition ?? payload.stateLabel ?? "none",
      actualStateLabel: payload.stateLabel ?? null,
      actualAnswerId: payload.answerId ?? payload.faqId ?? payload.guide?.id ?? null,
      citations: payload.citations ?? [],
      guide: payload.guide ?? null,
      errors: validate(testCase, response.status, payload),
    };
    if (process.env.SCALE_EVAL_DEBUG === "1" && index < 20) {
      console.log(JSON.stringify({ id: testCase.id, question: testCase.question, source: payload.source, content: payload.content, citations: payload.citations, errors: result.errors }, null, 2));
    }
    return result;
  };
  for (let offset = 0; offset < cases.length; offset += concurrency) {
    const batch = cases.slice(offset, offset + concurrency);
    const batchResults = await Promise.all(batch.map((testCase, batchIndex) => evaluate(offset + batchIndex, testCase)));
    results.push(...batchResults);
    fs.writeSync(reportFd, `${batchResults.map((result) => JSON.stringify(result)).join("\n")}\n`, undefined, "utf8");
    const completed = offset + batch.length;
    if (completed % 500 === 0 || completed === cases.length) console.log(`Processed ${completed}/${cases.length}`);
  }

  const passed = results.filter((result) => result.errors.length === 0).length;
  const byLanguage: Record<string, { total: number; passed: number; failed: number }> = {};
  const byDomain: Record<string, { total: number; passed: number; failed: number }> = {};
  const bySource: Record<string, number> = {};
  for (const result of results) {
    const ok = result.errors.length === 0;
    for (const [record, key] of [[byLanguage, result.language], [byDomain, result.domain]] as const) {
      record[key] ??= { total: 0, passed: 0, failed: 0 };
      record[key].total += 1;
      record[key][ok ? "passed" : "failed"] += 1;
    }
    bySource[result.actualSource] = (bySource[result.actualSource] ?? 0) + 1;
  }
  const failureCount = results.length - passed;
  const summary = {
    generatedAt: new Date().toISOString(),
    candidate: "current local working tree; no deployment identity asserted",
    environment: "AI_PROVIDER=mock; local route; in-memory chat database; no external model calls",
    capturedFields: ["question", "messages", "answerText", "expected facts", "review state", "citations", "guide", "route metadata", "validation errors"],
    candidateIdentity,
    selection: {
      ...(selectedLanguages.length ? { languages: selectedLanguages } : {}),
      ...(selectedDomains.length ? { domains: selectedDomains } : {}),
      ...(selectedIds.length ? { ids: selectedIds } : {}),
    },
    captureBoundary: "Synthetic evaluation fixture and local mock-route responses only; this report does not capture live student conversations.",
    total: results.length,
    corpusSize: allCases.length,
    passed,
    failed: failureCount,
    byLanguage,
    byDomain,
    bySource,
    limitations: [
      "Deterministic mock route checks do not measure generated-answer factuality or real-provider availability.",
      "Generated paraphrases share seed expectations and are correlated; the 10,000 count is not 10,000 independent human-authored questions.",
      "Cases derived from source snapshots are checked against those same snapshots; independent source review is still required for consequential claims.",
      "Hindi, Urdu, French, and Spanish have deterministic localized wrappers for course-catalog fact questions only; this run does not establish curriculum or service-workflow support in those languages.",
      "Official course titles and source prerequisite wording remain in English when that is the language UAEU publishes; localized framing does not translate or alter source text.",
    ],
    resultJsonl: path.relative(root, reportPath),
  };
  fs.closeSync(reportFd);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify(summary, null, 2));
  if (failureCount) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
