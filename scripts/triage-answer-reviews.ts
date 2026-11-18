import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as nextEnv from "@next/env";
import { generateAssistantResponse } from "@/lib/ai-provider";
import { openReviewJournal } from "./answer-review-checkpoint.mjs";

type CriterionId = "accuracy" | "relevance_context" | "completeness" | "actionability" | "clarity" | "safety_scope";
type CriterionScore = { score: number; rationale: string; evidence: string[] };
type Assessment = {
  criteria: Record<CriterionId, CriterionScore>;
  overall: "verified" | "safe-limitation" | "appropriate-clarification" | "needs-fix";
};

const cliArgs = process.argv.slice(2);
const allowIncompleteCapture = cliArgs.includes("--allow-incomplete-capture");
const allowMissingSourceEvidence = cliArgs.includes("--allow-missing-source-evidence");
const positionalArgs = cliArgs.filter((arg) => !arg.startsWith("--"));
const [runArg, reviewArg, batchArg, concurrencyArg] = positionalArgs;
if (!runArg || !reviewArg) throw new Error("Usage: npx tsx scripts/triage-answer-reviews.ts RUN.json REVIEW.json [BATCH_SIZE=4] [CONCURRENCY=2] [--allow-incomplete-capture] [--allow-missing-source-evidence]");
nextEnv.loadEnvConfig(process.cwd());
const runPath = path.resolve(runArg);
const reviewPath = path.resolve(reviewArg);
const retryErrorsPath = `${reviewPath}.retry-errors.jsonl`;
const runBytes = fs.readFileSync(runPath);
const runHash = crypto.createHash("sha256").update(runBytes).digest("hex");
const isJsonlRun = runPath.toLowerCase().endsWith(".jsonl");
const captureManifestPath = isJsonlRun ? runPath.replace(/\.jsonl$/iu, ".manifest.json") : null;
const captureManifest = captureManifestPath && fs.existsSync(captureManifestPath)
  ? JSON.parse(fs.readFileSync(captureManifestPath, "utf8")) as Record<string, unknown>
  : null;
if (captureManifest && (captureManifest.status !== "complete" || captureManifest.runSha256 !== runHash ||
    captureManifest.localSourceUnchanged !== true || (captureManifest.runIntegrityIssues as unknown[] | undefined)?.length)) {
  throw new Error("Capture manifest does not certify a complete, hash-matching run with an unchanged source snapshot.");
}
const endpointComparison = captureManifest?.endpointIdentityComparison as Record<string, unknown> | undefined;
if (isJsonlRun && !allowIncompleteCapture && (!captureManifest || captureManifest.expectedCount !== 10_000 ||
    captureManifest.completedCount !== 10_000 || captureManifest.errorCount !== 0 ||
    endpointComparison?.unchanged !== true || endpointComparison?.verifiable !== true)) {
  throw new Error("Full JSONL triage requires a complete 10,000-row capture, zero unresolved errors, an unchanged source snapshot, and a verifiable stable endpoint identity.");
}
const runText = runBytes.toString("utf8");
const rubric = JSON.parse(fs.readFileSync(path.resolve("data/evals/answer-review-rubric.json"), "utf8")) as {
  scoring: { anchors?: Record<string, string>; rule?: string; calibration?: string };
  criteria: Array<{ id: CriterionId; name: string; check: string }>;
};
const run = runPath.endsWith(".jsonl")
  ? { results: runText.trim().split(/\r?\n/u).map((line) => JSON.parse(line)) }
  : JSON.parse(runText) as { results: Array<Record<string, unknown>> };
if (!Array.isArray(run.results)) throw new Error("Run must contain a results array.");
if (isJsonlRun && !allowIncompleteCapture && (run.results.length !== 10_000 || run.results.some((row) =>
    row.status !== 200 || row.networkError || (Array.isArray(row.errors) && row.errors.length > 0) ||
    (Array.isArray(row.automatedIssues) && row.automatedIssues.length > 0)))) {
  throw new Error("Full JSONL triage refuses incomplete or failed response rows; retry and reconcile them before scoring.");
}
const rubricSha256 = crypto.createHash("sha256").update(JSON.stringify(rubric)).digest("hex");
const reviewBytes = fs.readFileSync(reviewPath);
let review = JSON.parse(reviewBytes.toString("utf8")) as {
  runSha256: string;
  rubricSha256: string;
  count: number;
  assessments: Record<string, Record<string, unknown>>;
  reviewState?: string;
  updatedAt?: string;
};
if (review.runSha256 !== runHash) throw new Error("Review template does not match the exact captured run bytes.");
if (review.rubricSha256 !== rubricSha256) throw new Error("Review template rubric hash does not match the current six-criteria rubric.");
const runIds = run.results.map((row) => String(row.id));
const reviewIds = Object.keys(review.assessments ?? {});
if (new Set(runIds).size !== runIds.length || review.count !== runIds.length || reviewIds.length !== runIds.length ||
    runIds.some((id) => !Object.hasOwn(review.assessments ?? {}, id)) || reviewIds.some((id) => !runIds.includes(id))) {
  throw new Error("Review template must contain exactly one assessment for every captured answer before triage starts.");
}

const sourceEvidencePath = isJsonlRun ? runPath.replace(/\.jsonl$/iu, ".source-evidence.jsonl") : null;
const sourceEvidenceManifestPath = isJsonlRun ? runPath.replace(/\.jsonl$/iu, ".source-evidence.manifest.json") : null;
const sourceEvidenceById = new Map<string, Record<string, unknown>>();
if (sourceEvidencePath && sourceEvidenceManifestPath && (fs.existsSync(sourceEvidencePath) || fs.existsSync(sourceEvidenceManifestPath))) {
  if (!fs.existsSync(sourceEvidencePath) || !fs.existsSync(sourceEvidenceManifestPath)) {
    throw new Error("Source-evidence sidecar is incomplete; both the data file and manifest are required.");
  }
  const sourceEvidenceBytes = fs.readFileSync(sourceEvidencePath);
  const sourceEvidenceManifest = JSON.parse(fs.readFileSync(sourceEvidenceManifestPath, "utf8")) as Record<string, unknown>;
  if (sourceEvidenceManifest.runSha256 !== runHash || sourceEvidenceManifest.count !== run.results.length ||
      sourceEvidenceManifest.sourceEvidenceSha256 !== crypto.createHash("sha256").update(sourceEvidenceBytes).digest("hex") ||
      !captureManifest || sourceEvidenceManifest.localSourceSha256 !== captureManifest.localSourceSha256) {
    throw new Error("Source-evidence sidecar does not match the exact answer capture or its own manifest hash.");
  }
  for (const [index, line] of sourceEvidenceBytes.toString("utf8").trim().split(/\r?\n/u).entries()) {
    const evidence = JSON.parse(line) as Record<string, unknown>;
    if (typeof evidence.id !== "string" || sourceEvidenceById.has(evidence.id)) {
      throw new Error(`Invalid or duplicate source-evidence ID at line ${index + 1}.`);
    }
    sourceEvidenceById.set(evidence.id, evidence);
  }
  if (sourceEvidenceById.size !== run.results.length || run.results.some((row) => !sourceEvidenceById.has(String(row.id)))) {
    throw new Error("Source-evidence sidecar must contain exactly one row per captured answer.");
  }
}
if (isJsonlRun && !allowMissingSourceEvidence && sourceEvidenceById.size !== run.results.length) {
  throw new Error("Full JSONL triage requires a complete run-hash-bound source-evidence sidecar.");
}

const journal = openReviewJournal({
  reviewPath,
  currentReview: review,
  currentReviewBytes: reviewBytes,
  runSha256: runHash,
  rubricSha256,
  count: run.results.length,
});
review = journal.review;

const ids: CriterionId[] = ["accuracy", "relevance_context", "completeness", "actionability", "clarity", "safety_scope"];
const batchSize = Math.min(8, Math.max(1, Number.parseInt(batchArg ?? "4", 10) || 4));
const concurrency = Math.min(16, Math.max(1, Number.parseInt(concurrencyArg ?? "2", 10) || 2));
const byId = new Map(run.results.map((result) => [String(result.id), result]));
const todo = Object.entries(review.assessments).filter(([, item]) => item.reviewerType === "pending");
const criterionSchema = {
  type: "object", additionalProperties: false, required: ["score", "rationale", "evidence"],
  properties: {
    score: { type: "integer", minimum: 1, maximum: 5 },
    rationale: { type: "string" },
    evidence: { type: "array", maxItems: 2, items: { type: "string", maxLength: 120 } },
  },
};

async function main(): Promise<void> {
let nextBatchIndex = 0;
let completedAnswers = 0;
let failedBatches = 0;
const worker = async (): Promise<void> => {
  while (true) {
    const batchIndex = nextBatchIndex++;
    const offset = batchIndex * batchSize;
    if (offset >= todo.length) return;
    const slice = todo.slice(offset, offset + batchSize);
    try {
  const cases = slice.map(([id]) => {
    const row = byId.get(id);
    if (!row) throw new Error(`Review ID ${id} is missing from the run.`);
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const citationData = Array.isArray(payload.citations) ? payload.citations : [];
    const attachedEvidence = sourceEvidenceById.get(id);
    const sourceTexts = [
      ...(Array.isArray(payload.evidence) ? payload.evidence.map((item) => (item as Record<string, unknown>).excerpt) : []),
      ...(Array.isArray(row.evidence) ? (row.evidence as unknown[]).map((item: unknown) => (item as Record<string, unknown>).excerpt) : []),
      ...citationData.map((item) => (item as Record<string, unknown>).evidenceText),
      row.evidenceText,
      attachedEvidence?.sourceText,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    const history = Array.isArray(row.requestMessages) ? row.requestMessages : [];
    const assessment = review.assessments[id];
    return {
      id,
      question: assessment.question,
      answer: assessment.answerText,
      expectedOutcome: row.expectation ?? row.expected ?? null,
      responseSource: payload.source ?? row.actualSource ?? null,
      responseMode: payload.responseMode ?? null,
      citations: citationData,
      sourceText: sourceTexts,
      sourceTextProvided: sourceTexts.length > 0,
      attachedSourceEvidenceType: attachedEvidence?.evidenceType ?? null,
      attachedSourceEvidenceUrls: attachedEvidence?.sourceUrls ?? [],
      attachedSourceEvidenceLastVerified: attachedEvidence?.lastVerified ?? null,
      priorTurns: history,
      automatedIssues: row.automatedIssues ?? row.errors ?? [],
    };
  });
  const idEnum = cases.map(({ id }) => id);
  const schema = {
    type: "object", additionalProperties: false, required: ["assessments"],
    properties: {
      assessments: {
        type: "array", minItems: cases.length, maxItems: cases.length,
        items: {
          type: "object", additionalProperties: false,
          required: ["id", "criteria", "overall"],
          properties: {
            id: { type: "string", enum: idEnum },
            criteria: {
              type: "object", additionalProperties: false, required: ids,
              properties: Object.fromEntries(ids.map((id) => [id, criterionSchema])),
            },
            overall: { type: "string", enum: ["verified", "safe-limitation", "appropriate-clarification", "needs-fix"] },
          },
        },
      },
    },
  };
  const rubricText = [
    rubric.scoring.rule,
    rubric.scoring.calibration,
    ...rubric.criteria.map((criterion) => `${criterion.id} (${criterion.name}): ${criterion.check}`),
  ].filter(Boolean).join("\n");
  const result = await generateAssistantResponse({
    system: [
      "You are a conservative quality-triage reviewer for a UAEU student assistant. You are not an institutional approver.",
      "Apply this rubric and its score calibration strictly; return a 1–5 score and one brief rationale for each of the six criteria, with up to two brief evidence snippets separately per criterion:\n" + rubricText,
      "Score using the supplied captured answer, student question, prior turns, stated expected outcome, and official citation evidence.",
      "The expectation is an unverified review hint, not truth. Citation titles, URLs, and dates are metadata, not source contents; you cannot open URLs. Supplied sourceText may be a versioned local snapshot of an official UAEU catalog, curriculum, guide, or curated citation excerpt. Use it to check answer consistency and scope, but do not call it independent live-source verification or institutional approval. Do not claim a source supports a fact unless source text is included. If no source text is supplied, cap accuracy/evidence at 3/5 and state that source contents were not supplied; assess consistency with the expectation separately from factual verification.",
      "Keep each criterion rationale to at most 8 words. For each criterion, use at most two evidence snippets, each at most 10 words. Do not reuse a snippet unless it directly supports both criteria; never copy long answer passages.",
      "Overall needs-fix if a material factual, relevance, or safety defect exists; safe-limitation if appropriately bounded but source verification is incomplete; appropriate-clarification if it asks for genuinely necessary information; verified only when supplied source text directly supports the material facts and the answer is useful.",
    ].join(" "),
    messages: [{ role: "user", content: JSON.stringify(cases) }],
    responseSchema: { name: "uaeu_answer_review_batch", schema },
    deadlineAt: Date.now() + 120_000,
  });
  const parsed = JSON.parse(result.text) as { assessments: Array<{ id: string; criteria: Record<CriterionId, { score: number; rationale: string; evidence: string[] }>; overall: Assessment["overall"] }> };
  const seen = new Set<string>();
  const updates: Array<[string, Record<string, unknown>]> = [];
  for (const candidate of parsed.assessments) {
    const current = review.assessments[candidate.id];
    const target = current ? { ...current } as Record<string, unknown> & {
      criteria: Assessment["criteria"];
      overall: Assessment["overall"];
    } : undefined;
    if (!target || seen.has(candidate.id)) throw new Error(`Unexpected or repeated review ID: ${candidate.id}`);
    seen.add(candidate.id);
    if (ids.some((id) => !candidate.criteria?.[id] || !Number.isInteger(candidate.criteria[id].score) || candidate.criteria[id].score < 1 || candidate.criteria[id].score > 5 || typeof candidate.criteria[id].rationale !== "string" || candidate.criteria[id].rationale.trim().length < 12 || !Array.isArray(candidate.criteria[id].evidence) || candidate.criteria[id].evidence.length > 2 || candidate.criteria[id].evidence.some((item) => typeof item !== "string" || item.length > 120))) {
      throw new Error(`Malformed six-criteria assessment for ${candidate.id}`);
    }
    const caseInput = cases.find(({ id }) => id === candidate.id)!;
    target.criteria = Object.fromEntries(ids.map((id) => [id, candidate.criteria[id]])) as Assessment["criteria"];
    target.overall = candidate.overall;
    target.sourceEvidenceStatus = caseInput.sourceTextProvided
      ? (caseInput.attachedSourceEvidenceType ? "candidate-local-source-snapshot-attached" : "captured-source-text-present")
      : "citation-metadata-only";
    if (caseInput.attachedSourceEvidenceType) {
      target.sourceEvidenceType = caseInput.attachedSourceEvidenceType;
      target.sourceEvidenceUrls = caseInput.attachedSourceEvidenceUrls;
      target.sourceEvidenceLastVerified = caseInput.attachedSourceEvidenceLastVerified;
    }
    if (!caseInput.sourceTextProvided) {
      target.criteria.accuracy.score = Math.min(target.criteria.accuracy.score, 3);
      target.criteria.accuracy.rationale = "Citation metadata and unverified expectations do not establish factual source support.";
      target.criteria.accuracy.evidence = [];
      if (target.overall === "verified") target.overall = "safe-limitation";
    }
    target.reviewerType = "automated-triage";
    target.reviewNote = caseInput.sourceTextProvided
      ? "Preliminary machine triage. Not independent factual certification; human source review is required for consequential policy, deadlines, eligibility, and academic planning."
      : "Preliminary machine triage only. No source text was captured; accuracy is capped at 3/5 and a verified disposition is prohibited. Human/source review remains required.";
    updates.push([candidate.id, target]);
  }
  if (seen.size !== cases.length) throw new Error("Model did not return exactly one assessment per case in this batch.");
  completedAnswers += journal.appendBatch(updates);
  console.log(`Checkpointed ${completedAnswers}/${todo.length} pending captured answers (${concurrency} workers, batches of ${batchSize}).`);
    } catch (error) {
      failedBatches += 1;
      const id = slice[0]?.[0] ?? "unknown";
      const failure = error as { message?: unknown; status?: unknown; providerStatus?: unknown };
      const record = {
        id,
        at: new Date().toISOString(),
        status: typeof failure.status === "number" ? failure.status : null,
        providerStatus: typeof failure.providerStatus === "string" ? failure.providerStatus : null,
        message: String(failure.message ?? error).slice(0, 240),
      };
      fs.appendFileSync(retryErrorsPath, `${JSON.stringify(record)}\n`, "utf8");
      console.warn(`Review case ${id} remains pending after provider/review error (${record.providerStatus ?? record.status ?? "unknown"}); saved retry record.`);
    }
  }
}
;
await Promise.all(Array.from({ length: Math.min(concurrency, Math.ceil(todo.length / batchSize)) }, () => worker()));
journal.finalize();
const pendingCount = Object.values(review.assessments).filter((item) => item.reviewerType === "pending").length;
console.log(`Review file is hash-bound to ${runHash}; ${run.results.length - pendingCount}/${run.results.length} scored, ${pendingCount} pending, ${failedBatches} provider/review failures in this pass. Scores are automated triage and need human factual review.`);
if (pendingCount > 0) process.exitCode = 2;
}

main().catch((error: unknown) => {
  const candidate = error as { message?: unknown; status?: unknown; providerStatus?: unknown; diagnosticCode?: unknown; diagnosticParam?: unknown; diagnosticSchemaIssue?: unknown };
  console.error(JSON.stringify({
    message: candidate.message ?? String(error), status: candidate.status,
    providerStatus: candidate.providerStatus, diagnosticCode: candidate.diagnosticCode,
    diagnosticParam: candidate.diagnosticParam, diagnosticSchemaIssue: candidate.diagnosticSchemaIssue,
  }));
  process.exitCode = 1;
});
