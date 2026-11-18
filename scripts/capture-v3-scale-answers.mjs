import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
import { sourceSnapshotHash, endpointIdentity, compareEndpointIdentity, captureResponseBody } from "./evaluation-integrity.mjs";
import { boundEvaluationMessages } from "./evaluation-request-contract.mjs";
import { createRequestStartGate, parseJsonlForResume, runBoundedWorkers } from "./capture-concurrency.mjs";

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = (process.env.EVAL_BASE_URL || "http://localhost:3000").replace(/\/$/u, "");
const label = process.env.SCALE_CAPTURE_LABEL || new Date().toISOString().replace(/[:.]/gu, "-");
const resume = process.argv.includes("--resume");
const concurrency = Number(process.env.SCALE_CAPTURE_CONCURRENCY ?? 1);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
  throw new Error("SCALE_CAPTURE_CONCURRENCY must be an integer from 1 to 4.");
}
if (!/^[a-zA-Z0-9_-]+$/u.test(label)) throw new Error("SCALE_CAPTURE_LABEL must be filename-safe.");

const root = process.cwd();
const corpusPath = path.resolve("data/evals/v3-scale-questions.jsonl");
const outputDirectory = path.resolve("reports/acceptance");
const runPath = path.join(outputDirectory, `v3-scale-answers-${label}.jsonl`);
const manifestPath = path.join(outputDirectory, `v3-scale-answers-${label}.manifest.json`);
const corpusBytes = fs.readFileSync(corpusPath);
const corpusSha256 = crypto.createHash("sha256").update(corpusBytes).digest("hex");
const corpus = corpusBytes.toString("utf8").trim().split(/\r?\n/u).map((line, index) => {
  try { return JSON.parse(line); }
  catch { throw new Error(`Invalid JSON in scale corpus at line ${index + 1}.`); }
});
if (corpus.length !== 10_000 || new Set(corpus.map(({ id }) => id)).size !== corpus.length) {
  throw new Error(`Expected 10,000 uniquely identified scale cases, found ${corpus.length}.`);
}

function gitValue(args) {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
  catch { return null; }
}

let discardedPartialTailBytes = 0;
function loadRows() {
  if (!fs.existsSync(runPath)) return [];
  const parsed = parseJsonlForResume(fs.readFileSync(runPath));
  discardedPartialTailBytes = parsed.discardedTailBytes;
  return parsed.rows;
}

function saveManifest(fd, manifest) {
  fs.writeSync(fd, JSON.stringify(manifest, null, 2), 0, "utf8");
  fs.ftruncateSync(fd, Buffer.byteLength(JSON.stringify(manifest, null, 2), "utf8"));
  fs.fsyncSync(fd);
}

const hashAtStart = sourceSnapshotHash(root);
const healthResponse = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(30_000) });
const health = await healthResponse.json();
const identity = endpointIdentity(health, healthResponse.url);
if (healthResponse.status !== 200 || health.agent?.v3Enabled !== true || !["openai", "gemini"].includes(identity.provider)) {
  throw new Error(`Acceptance capture requires a ready V3 endpoint and a real provider; got HTTP ${healthResponse.status}, V3=${health.agent?.v3Enabled}, provider=${identity.provider}.`);
}

fs.mkdirSync(outputDirectory, { recursive: true });
let manifest;
let manifestFd;
let runFd;
let priorRows = [];
if (resume) {
  if (!fs.existsSync(runPath) || !fs.existsSync(manifestPath)) throw new Error("Resume requires both the original answer capture and manifest.");
  priorRows = loadRows();
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.corpusSha256 !== corpusSha256 || manifest.localSourceSha256 !== hashAtStart ||
      manifest.initialEndpointIdentity?.revision !== identity.revision ||
      manifest.initialEndpointIdentity?.contentFingerprint !== identity.contentFingerprint ||
      manifest.initialEndpointIdentity?.provider !== identity.provider ||
      manifest.initialEndpointIdentity?.model !== identity.model) {
    throw new Error("Resume refused: corpus, local source snapshot, or served endpoint identity differs from the original run.");
  }
  const priorIds = new Set(priorRows.map(({ id }) => id));
  if (priorIds.size !== priorRows.length || priorRows.some(({ id }) => !corpus.some((testCase) => testCase.id === id))) {
    throw new Error("Resume refused: partial capture contains duplicate or unknown case IDs.");
  }
  if (discardedPartialTailBytes) {
    fs.truncateSync(runPath, fs.statSync(runPath).size - discardedPartialTailBytes);
    manifest.recoveredPartialTailBytes = (manifest.recoveredPartialTailBytes ?? 0) + discardedPartialTailBytes;
  }
  manifest.status = "running";
  manifest.resumedAt = new Date().toISOString();
  delete manifest.stopReason;
  manifest.localSourceUnchanged = true;
  manifest.runIntegrityIssues = [];
  manifest.concurrencySegments ??= [];
  manifestFd = fs.openSync(manifestPath, "r+");
  runFd = fs.openSync(runPath, "a");
} else {
  if (fs.existsSync(runPath) || fs.existsSync(manifestPath)) throw new Error("Refusing to replace an existing answer capture; choose a new SCALE_CAPTURE_LABEL or resume the exact partial run.");
  manifest = {
    schemaVersion: 1,
    label,
    status: "running",
    startedAt: new Date().toISOString(),
    baseUrl,
    provider: identity.provider,
    model: identity.model,
    initialHealthStatus: healthResponse.status,
    initialEndpointIdentity: identity,
    gitCommit: gitValue(["rev-parse", "HEAD"]),
    workingTreeStatus: gitValue(["status", "--short"]),
    localSourceSha256: hashAtStart,
    corpusFile: path.relative(root, corpusPath),
    corpusSha256,
    expectedCount: corpus.length,
    completedCount: 0,
    errorCount: 0,
    concurrencySegments: [],
    captureMethod: "Actual HTTP requests to the local/preview V3 chat API. No mock provider, fake client address, or runtime fixture selection.",
    answerQualityNote: "HTTP success is not factual accuracy. Each full answer is saved for the separate six-criteria review.",
  };
  manifestFd = fs.openSync(manifestPath, "wx");
  runFd = fs.openSync(runPath, "wx");
  saveManifest(manifestFd, manifest);
}

const capturedIds = new Set(priorRows.map(({ id }) => id));
if (capturedIds.has(undefined)) throw new Error("Captured partial run contains an empty case ID.");
let completed = priorRows.length;
let errors = priorRows.filter((row) => row.automatedIssues?.length || row.errors?.length).length;
let consecutiveServiceFailures = 0;
let interrupted = false;
let operatorInterrupted = false;
process.on("SIGINT", () => {
  interrupted = true;
  operatorInterrupted = true;
  console.warn("Stop requested; preserving the current response and finalizing the partial capture.");
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requestGapMs = Math.max(2_100, Number(process.env.SCALE_CAPTURE_GAP_MS ?? 2_100));
const segment = {
  id: `segment-${(manifest.concurrencySegments?.length ?? 0) + 1}`,
  startedAt: new Date().toISOString(),
  concurrency,
  minimumRequestStartGapMs: requestGapMs,
  resumed: resume,
  startingCompletedCount: completed,
};
manifest.concurrencySegments ??= [];
manifest.concurrencySegments.push(segment);
saveManifest(manifestFd, manifest);
const reserveRequestStart = createRequestStartGate(requestGapMs);

try {
  const pendingCases = corpus.filter((testCase) => !capturedIds.has(testCase.id));
  await runBoundedWorkers(pendingCases, concurrency, async (testCase) => {
    const messages = testCase.messages?.length ? testCase.messages : [{ role: "user", content: testCase.question }];
    const requestMessages = boundEvaluationMessages(messages);
    let startedAt = null;
    let started = null;
    let httpStatus = 0;
    let payload = null;
    let responseCapture = null;
    let networkError = null;
    let cancelledBeforeRequest = false;
    const attempts = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const reservedAt = await reserveRequestStart(() => interrupted);
        if (reservedAt === null || interrupted) { cancelledBeforeRequest = true; break; }
        if (started === null) {
          started = Date.now();
          startedAt = new Date(started).toISOString();
        }
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ locale: testCase.language === "ar" ? "ar" : testCase.language === "en" ? "en" : "auto", messages: requestMessages }),
          signal: AbortSignal.timeout(90_000),
        });
        httpStatus = response.status;
        attempts.push({ status: httpStatus, at: new Date().toISOString() });
        networkError = null;
        if ([429, 502, 503].includes(httpStatus) && attempt < 2) {
          const retryAfterHeader = response.headers.get("retry-after");
          const retryAfter = retryAfterHeader === null ? NaN : Number(retryAfterHeader);
          await response.body?.cancel();
          const defaultDelay = httpStatus === 429 ? 61_000 : 5_000 * (attempt + 1);
          const retryDelay = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000 + 500
            : defaultDelay;
          await pause(Math.min(httpStatus === 429 ? 65_000 : 30_000, Math.max(1_000, retryDelay)));
          continue;
        }
        const captured = captureResponseBody(await response.text());
        payload = captured.payload;
        responseCapture = captured.capture;
        break;
      } catch (error) {
        networkError = error instanceof Error ? error.message : "Network request failed.";
        attempts.push({ status: 0, error: networkError, at: new Date().toISOString() });
        if (attempt < 2) {
          await pause(2_000 * (attempt + 1));
          continue;
        }
        break;
      }
    }
    if (cancelledBeforeRequest) return null;

    const answerText = typeof payload?.content === "string" ? payload.content : "";
    const automatedIssues = [];
    if (httpStatus !== 200) automatedIssues.push(`HTTP ${httpStatus}`);
    if (networkError) automatedIssues.push(`Network error: ${networkError}`);
    if (!answerText.trim()) automatedIssues.push("Missing answer text");
    if (payload?.provider === "mock" || /local test response generated without calling/iu.test(answerText)) automatedIssues.push("Mock answer cannot establish answer quality");
    if (testCase.language === "ar" && !/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(answerText)) automatedIssues.push("Expected Arabic response");
    if (testCase.language === "en" && !/[A-Za-z]/u.test(answerText)) automatedIssues.push("Expected English response");

    return {
      id: testCase.id,
      language: testCase.language,
      domain: testCase.domain,
      question: testCase.question,
      requestMessages,
      expected: testCase.expected,
      expectation: testCase.expected,
      seedId: testCase.seedId,
      reviewState: testCase.reviewState,
      httpStatus,
      status: httpStatus,
      askedAt: startedAt,
      durationMs: Date.now() - started,
      attempts,
      payload,
      answerText,
      actualSource: payload?.source ?? "none",
      actualStateLabel: payload?.stateLabel ?? null,
      actualDisposition: payload?.disposition ?? null,
      citations: payload?.citations ?? [],
      responseCapture,
      networkError,
      automatedIssues,
      errors: automatedIssues,
      concurrencySegmentId: segment.id,
      configuredConcurrency: concurrency,
      minimumRequestStartGapMs: requestGapMs,
    };
  }, async (row, testCase) => {
    if (row === null) return;
    // This callback is the sole writer. Synchronous append plus the shared ID set
    // keeps rows unique and prevents overlapping file writes across workers.
    if (capturedIds.has(testCase.id)) throw new Error(`Duplicate case completion refused: ${testCase.id}`);
    fs.writeSync(runFd, `${JSON.stringify(row)}\n`, undefined, "utf8");
    completed += 1;
    capturedIds.add(testCase.id);
    if (row.automatedIssues.length) errors += 1;

    const serviceFailed = Boolean(row.networkError) || row.httpStatus === 429 || row.httpStatus >= 500 ||
      row.payload?.stateLabel === "provider_error" || row.payload?.source === "error";
    consecutiveServiceFailures = serviceFailed ? consecutiveServiceFailures + 1 : 0;
    manifest.completedCount = completed;
    manifest.errorCount = errors;
    manifest.lastCompletedId = testCase.id;
    manifest.updatedAt = new Date().toISOString();
    if (completed % 25 === 0 || completed === corpus.length || consecutiveServiceFailures >= 3) saveManifest(manifestFd, manifest);
    if (completed % 100 === 0 || completed === corpus.length) console.log(`Captured ${completed}/${corpus.length}; ${errors} responses have automated transport/content issues.`);

    if (consecutiveServiceFailures >= 3) {
      manifest.stopReason = "Three consecutive service/provider failures; partial answers preserved for diagnosis and resume after the cause is fixed.";
      interrupted = true;
    }
  }, () => interrupted);

  const finalHealthResponse = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(30_000) });
  const finalHealth = await finalHealthResponse.json();
  manifest.finishedAt = new Date().toISOString();
  segment.finishedAt = manifest.finishedAt;
  segment.endingCompletedCount = completed;
  manifest.status = completed === corpus.length && capturedIds.size === corpus.length ? "complete" : "partial";
  if (operatorInterrupted && completed < corpus.length) {
    manifest.stopReason = "Interrupted by operator after preserving the in-flight response; partial answer rows remain available for diagnosis or exact-identity resume.";
  }
  manifest.finalHealthStatus = finalHealthResponse.status;
  manifest.finalEndpointIdentity = endpointIdentity(finalHealth, finalHealthResponse.url);
  manifest.endpointIdentityComparison = compareEndpointIdentity(identity, manifest.finalEndpointIdentity);
  manifest.localSourceUnchanged = hashAtStart === sourceSnapshotHash(root);
  manifest.runSha256 = crypto.createHash("sha256").update(fs.readFileSync(runPath)).digest("hex");
  manifest.runIntegrityIssues = [
    ...(manifest.endpointIdentityComparison.unchanged !== true ? [manifest.endpointIdentityComparison.reason] : []),
    ...(!manifest.endpointIdentityComparison.verifiable ? ["A revision and content fingerprint were not both reported by health."] : []),
    ...(finalHealthResponse.status !== 200 ? ["Endpoint health was degraded after the capture."] : []),
    ...(!manifest.localSourceUnchanged ? ["Local source snapshot changed during capture."] : []),
  ];
  saveManifest(manifestFd, manifest);
  console.log(`Saved ${completed}/${corpus.length} actual responses: ${runPath}`);
  console.log(`Capture manifest: ${manifestPath}`);
} finally {
  fs.closeSync(runFd);
  fs.closeSync(manifestFd);
}
