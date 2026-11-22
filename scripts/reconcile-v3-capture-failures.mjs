import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { sourceSnapshotHash } from "./evaluation-integrity.mjs";

const runPath = path.resolve(process.argv[2] ?? "");
if (!process.argv[2] || !runPath.endsWith(".jsonl")) {
  throw new Error("Usage: node scripts/reconcile-v3-capture-failures.mjs PARTIAL_CAPTURE.jsonl");
}

const manifestPath = runPath.replace(/\.jsonl$/u, ".manifest.json");
const historyBasePath = runPath.replace(/\.jsonl$/u, ".retry-history.jsonl");
const originalBasePath = runPath.replace(/\.jsonl$/u, ".pre-retry.jsonl");
let historyPath = historyBasePath;
let originalPath = originalBasePath;
for (let sequence = 2; fs.existsSync(historyPath) || fs.existsSync(originalPath); sequence += 1) {
  const suffix = `-${sequence}`;
  historyPath = runPath.replace(/\.jsonl$/u, `.retry-history${suffix}.jsonl`);
  originalPath = runPath.replace(/\.jsonl$/u, `.pre-retry${suffix}.jsonl`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const completeRunHasErrors = manifest.status === "complete" && manifest.expectedCount === 10_000 &&
  manifest.completedCount === 10_000 && Number.isInteger(manifest.errorCount) && manifest.errorCount > 0;
if ((manifest.status !== "partial" && !completeRunHasErrors) || !Number.isInteger(manifest.expectedCount) || manifest.expectedCount !== 10_000) {
  throw new Error("Recovery requires a partial 10,000-answer capture or a complete 10,000-row run with recorded errors.");
}
if (manifest.localSourceSha256 !== sourceSnapshotHash(process.cwd())) {
  throw new Error("Refusing recovery because the current source snapshot differs from the capture.");
}

const rawBytes = fs.readFileSync(runPath);
const rawSha256 = crypto.createHash("sha256").update(rawBytes).digest("hex");
if (rawSha256 !== manifest.runSha256) throw new Error("Capture file does not match its recorded run hash.");
const lines = rawBytes.toString("utf8").split(/\r?\n/u).filter(Boolean);
if (lines.length !== manifest.completedCount) throw new Error("Capture row count differs from its manifest.");
const parsed = lines.map((line, index) => {
  try { return JSON.parse(line); }
  catch { throw new Error(`Invalid capture JSON at line ${index + 1}.`); }
});
if (new Set(parsed.map((row) => row.id)).size !== parsed.length) throw new Error("Capture contains duplicate IDs.");

const failed = [];
const successfulLines = [];
for (let index = 0; index < parsed.length; index += 1) {
  const row = parsed[index];
  if ((row.automatedIssues?.length ?? 0) > 0 || (row.errors?.length ?? 0) > 0 ||
      row.status !== 200 || !row.answerText?.trim()) failed.push(lines[index]);
  else successfulLines.push(lines[index]);
}
if (!failed.length) throw new Error("No failed rows need retrying.");
if (completeRunHasErrors && failed.length !== manifest.errorCount) {
  throw new Error(`Manifest records ${manifest.errorCount} errors but ${failed.length} failed rows were found.`);
}

const historyBytes = Buffer.from(`${failed.join("\n")}\n`, "utf8");
const updatedRunBytes = Buffer.from(`${successfulLines.join("\n")}\n`, "utf8");
const nextManifest = {
  ...manifest,
  status: "partial",
  completedCount: successfulLines.length,
  errorCount: 0,
  lastCompletedId: parsed.filter((row) => row.status === 200 && !row.automatedIssues?.length && !row.errors?.length).at(-1)?.id ?? null,
  updatedAt: new Date().toISOString(),
  localSourceUnchanged: true,
  runIntegrityIssues: [],
  runSha256: crypto.createHash("sha256").update(updatedRunBytes).digest("hex"),
  recovery: {
    ...(manifest.recovery ?? {}),
    type: "retry-transport-or-provider-failures",
    recoveredAt: new Date().toISOString(),
    originalRunSha256: rawSha256,
    originalRowCount: parsed.length,
    retriedFailureCount: failed.length,
    retriedFailureHistoryFile: path.basename(historyPath),
    retriedFailureHistorySha256: crypto.createHash("sha256").update(historyBytes).digest("hex"),
    originalCaptureBackupFile: path.basename(originalPath),
  },
  recoveryHistory: [
    ...(Array.isArray(manifest.recoveryHistory) ? manifest.recoveryHistory : manifest.recovery ? [manifest.recovery] : []),
    {
      type: "retry-transport-or-provider-failures",
      recoveredAt: new Date().toISOString(),
      originalRunSha256: rawSha256,
      originalRowCount: parsed.length,
      retriedFailureCount: failed.length,
      retriedFailureHistoryFile: path.basename(historyPath),
      retriedFailureHistorySha256: crypto.createHash("sha256").update(historyBytes).digest("hex"),
      originalCaptureBackupFile: path.basename(originalPath),
    },
  ],
};
const manifestBytes = Buffer.from(`${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");

function writeExclusive(filePath, bytes) {
  const fd = fs.openSync(filePath, "wx");
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
}
function atomicReplace(filePath, bytes) {
  const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  writeExclusive(tempPath, bytes);
  fs.renameSync(tempPath, filePath);
}

writeExclusive(originalPath, rawBytes);
writeExclusive(historyPath, historyBytes);
atomicReplace(runPath, updatedRunBytes);
atomicReplace(manifestPath, manifestBytes);
console.log(JSON.stringify({
  preservedOriginal: path.basename(originalPath),
  retryHistory: path.basename(historyPath),
  retriedFailureCount: failed.length,
  resumableRows: successfulLines.length,
  sourceHash: manifest.localSourceSha256,
}));
