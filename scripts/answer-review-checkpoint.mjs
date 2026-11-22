import crypto from "node:crypto";
import fs from "node:fs";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => `${JSON.stringify(value, null, 2)}\n`;

export function mergeAssessments(review, updates) {
  const merged = structuredClone(review);
  applyAssessments(merged, updates);
  return merged;
}

function applyAssessments(review, updates) {
  for (const [id, assessment] of updates) {
    const current = review.assessments[id];
    if (!current) throw new Error(`Cannot checkpoint unknown review ID: ${id}`);
    if (current.reviewerType !== "pending") continue;
    review.assessments[id] = { ...current, ...structuredClone(assessment) };
  }
  review.reviewState = "automated-triage-in-progress";
  review.updatedAt = new Date().toISOString();
}

function writeExclusiveAndSync(filePath, bytes) {
  const fd = fs.openSync(filePath, "wx");
  try {
    bytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    let offset = 0;
    while (offset < bytes.length) offset += fs.writeSync(fd, bytes, offset, bytes.length - offset);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function atomicWrite(filePath, bytes) {
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    writeExclusiveAndSync(temporaryPath, bytes);
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    try { fs.rmSync(temporaryPath, { force: true }); } catch { /* Preserve the original failure. */ }
    throw error;
  }
}

function envelope(payload, previousSha256 = null) {
  const entrySha256 = hash(`${previousSha256 ?? ""}\n${JSON.stringify(payload)}`);
  return { ...payload, previousSha256, entrySha256 };
}

function verifyEnvelope(record, expectedPrevious) {
  const { entrySha256, previousSha256, ...payload } = record;
  if (previousSha256 !== expectedPrevious || typeof entrySha256 !== "string" ||
      entrySha256 !== hash(`${expectedPrevious ?? ""}\n${JSON.stringify(payload)}`)) {
    throw new Error("Answer-review journal hash chain is invalid.");
  }
  return { payload, entrySha256 };
}

function recoverJournal(journalPath) {
  let bytes = fs.readFileSync(journalPath);
  if (!bytes.length) throw new Error("Answer-review journal is empty.");
  if (bytes[bytes.length - 1] !== 0x0a) {
    const lastNewline = bytes.lastIndexOf(0x0a);
    const trailing = bytes.subarray(lastNewline + 1);
    let completeJsonRecord = false;
    try { JSON.parse(trailing.toString("utf8")); completeJsonRecord = true; } catch { /* Partial final append. */ }
    if (completeJsonRecord) {
      const fd = fs.openSync(journalPath, "a");
      try { fs.writeSync(fd, "\n"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      bytes = Buffer.concat([bytes, Buffer.from("\n")]);
    } else {
      const safeLength = lastNewline < 0 ? 0 : lastNewline + 1;
      fs.truncateSync(journalPath, safeLength);
      if (safeLength > 0) {
        const fd = fs.openSync(journalPath, "r+");
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      }
      bytes = bytes.subarray(0, safeLength);
      if (!bytes.length) return { records: [], headSha256: null };
    }
  }
  const lines = bytes.toString("utf8").split("\n").slice(0, -1);
  let previous = null;
  const records = [];
  for (const [index, line] of lines.entries()) {
    let parsed;
    try { parsed = JSON.parse(line); } catch { throw new Error(`Answer-review journal record ${index + 1} is malformed.`); }
    const verified = verifyEnvelope(parsed, previous);
    if (index === 0 && verified.payload.kind !== "header") throw new Error("Answer-review journal header is missing.");
    if (index > 0 && verified.payload.kind !== "batch") throw new Error(`Unexpected journal record kind at line ${index + 1}.`);
    records.push(verified.payload);
    previous = verified.entrySha256;
  }
  return { records, headSha256: previous };
}

/** Open or recover a run/rubric-bound append-only journal for captured answer reviews. */
export function openReviewJournal({ reviewPath, currentReview, currentReviewBytes, runSha256, rubricSha256, count }) {
  const journalPath = `${reviewPath}.journal.jsonl`;
  const basePath = `${reviewPath}.journal.base.json`;
  const currentReviewHash = hash(currentReviewBytes);
  let baseReview;
  let baseReviewSha256;
  let recovered;

  if (fs.existsSync(journalPath)) {
    if (!fs.existsSync(basePath)) throw new Error("Answer-review journal base snapshot is missing; refusing unsafe resume.");
    const baseBytes = fs.readFileSync(basePath);
    baseReviewSha256 = hash(baseBytes);
    baseReview = JSON.parse(baseBytes.toString("utf8"));
    recovered = recoverJournal(journalPath);
    const [header, ...batches] = recovered.records;
    if (header && (header.schemaVersion !== 1 || header.runSha256 !== runSha256 || header.rubricSha256 !== rubricSha256 ||
        header.count !== count || header.baseReviewSha256 !== baseReviewSha256)) {
      throw new Error("Answer-review journal does not match this captured run, rubric, or base review.");
    }
    if (!header) {
      const newHeader = envelope({ kind: "header", schemaVersion: 1, runSha256, rubricSha256, count, baseReviewSha256 });
      fs.unlinkSync(journalPath);
      writeExclusiveAndSync(journalPath, `${JSON.stringify(newHeader)}\n`);
      recovered = { records: [{ kind: "header", schemaVersion: 1, runSha256, rubricSha256, count, baseReviewSha256 }], headSha256: newHeader.entrySha256 };
    }
    const finalMarker = currentReview.triageJournalSha256;
    if (finalMarker) {
      if (finalMarker !== recovered.headSha256 || currentReview.runSha256 !== runSha256 ||
          currentReview.rubricSha256 !== rubricSha256) throw new Error("Final review does not match the journal head or hash bindings.");
    } else if (currentReviewHash !== baseReviewSha256) {
      throw new Error("Review JSON changed after journal creation; refusing unsafe resume.");
    }
    for (const batch of batches) {
      if (!Array.isArray(batch.assessments) || batch.assessments.length < 1) throw new Error("Journal batch has no assessments.");
      const seen = new Set();
      for (const entry of batch.assessments) {
        if (typeof entry.id !== "string" || seen.has(entry.id) || !Object.hasOwn(baseReview.assessments, entry.id) ||
            entry.assessment?.reviewerType !== "automated-triage") {
          throw new Error("Journal contains a duplicate, unknown, or malformed assessment ID.");
        }
        seen.add(entry.id);
      }
      applyAssessments(baseReview, batch.assessments.map(({ id, assessment }) => [id, assessment]));
    }
    if (currentReview.triageJournalSha256 && JSON.stringify(currentReview.assessments) !== JSON.stringify(baseReview.assessments)) {
      throw new Error("Final review assessments differ from the recovered journal.");
    }
  } else {
    if (currentReview.triageJournalSha256) throw new Error("Review references a missing answer-review journal.");
    baseReview = currentReview;
    baseReviewSha256 = currentReviewHash;
    const baseBytes = Buffer.from(currentReviewBytes);
    if (fs.existsSync(basePath)) {
      if (hash(fs.readFileSync(basePath)) !== baseReviewSha256) throw new Error("Orphaned journal base snapshot does not match the current review.");
    } else {
      writeExclusiveAndSync(basePath, baseBytes);
    }
    const header = envelope({ kind: "header", schemaVersion: 1, runSha256, rubricSha256, count, baseReviewSha256 });
    writeExclusiveAndSync(journalPath, `${JSON.stringify(header)}\n`);
    recovered = { headSha256: header.entrySha256 };
  }

  let headSha256 = recovered.headSha256;
  let batchNumber = recovered.records?.length ?? 1;
  return {
    review: baseReview,
    journalPath,
    appendBatch(updates) {
      const ids = new Set();
      const accepted = [];
      for (const [id, assessment] of updates) {
        if (ids.has(id)) throw new Error(`Duplicate answer ID in journal batch: ${id}`);
        ids.add(id);
        const current = baseReview.assessments[id];
        if (!current) throw new Error(`Cannot journal unknown review ID: ${id}`);
        if (current.reviewerType === "pending") accepted.push({ id, assessment: structuredClone(assessment) });
      }
      if (!accepted.length) return 0;
      accepted.sort((a, b) => a.id.localeCompare(b.id));
      const payload = { kind: "batch", batchNumber: batchNumber++, assessments: accepted };
      const record = envelope(payload, headSha256);
      const fd = fs.openSync(journalPath, "a");
      try {
        const bytes = Buffer.from(`${JSON.stringify(record)}\n`);
        let offset = 0;
        while (offset < bytes.length) offset += fs.writeSync(fd, bytes, offset, bytes.length - offset);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      headSha256 = record.entrySha256;
      applyAssessments(baseReview, accepted.map(({ id, assessment }) => [id, assessment]));
      return accepted.length;
    },
    finalize() {
      baseReview.reviewState = Object.values(baseReview.assessments).every((item) => item.reviewerType !== "pending")
        ? "automated-triage-complete-human-review-required"
        : "automated-triage-in-progress";
      baseReview.updatedAt = new Date().toISOString();
      baseReview.triageJournalSha256 = headSha256;
      baseReview.triageJournalPath = pathBasename(journalPath);
      atomicWrite(reviewPath, jsonBytes(baseReview));
    },
  };
}

function pathBasename(filePath) {
  return filePath.slice(Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")) + 1);
}
