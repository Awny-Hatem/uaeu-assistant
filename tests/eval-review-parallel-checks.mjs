import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mergeAssessments, openReviewJournal } from "../scripts/answer-review-checkpoint.mjs";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "uaeu-review-journal-"));
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const makeReview = (ids = ["A", "B", "C"]) => ({
  runSha256: "a".repeat(64), rubricSha256: "b".repeat(64), count: ids.length,
  assessments: Object.fromEntries(ids.map((id) => [id, { reviewerType: "pending", question: `Question ${id}` }])),
});
const assessed = (id, answerText = `Answer ${id}`) => ({
  reviewerType: "automated-triage", answerText, overall: "safe-limitation",
  criteria: { accuracy: { score: 4, rationale: "Supported by source details.", evidence: [] } },
});
const initialize = (reviewPath, review) => {
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  fs.writeFileSync(reviewPath, bytes);
  return openReviewJournal({ reviewPath, currentReview: review, currentReviewBytes: bytes, runSha256: review.runSha256, rubricSha256: review.rubricSha256, count: review.count });
};

try {
  const reviewPath = path.join(temp, "review.json");
  const initial = makeReview();
  const initialBytes = Buffer.from(`${JSON.stringify(initial, null, 2)}\n`);
  const journal = initialize(reviewPath, initial);

  // Completion order is canonicalized; journal appends do not rewrite the full review.
  journal.appendBatch([["C", assessed("C")], ["A", assessed("A")]]);
  assert.deepEqual(JSON.parse(fs.readFileSync(reviewPath, "utf8")), JSON.parse(initialBytes.toString("utf8")), "review JSON remains the base until finalization");
  const firstJournal = fs.readFileSync(journal.journalPath, "utf8");
  assert.equal(firstJournal.trim().split(/\r?\n/u).length, 2, "one compact journal append records one completed batch");

  // Resume before finalization reconstructs prior work, then appends only pending IDs.
  const resumed = openReviewJournal({ reviewPath, currentReview: initial, currentReviewBytes: fs.readFileSync(reviewPath), runSha256: initial.runSha256, rubricSha256: initial.rubricSha256, count: initial.count });
  assert.equal(resumed.review.assessments.A.reviewerType, "automated-triage");
  assert.equal(resumed.review.assessments.B.reviewerType, "pending");
  resumed.appendBatch([["A", assessed("A", "must not replace")], ["B", assessed("B")]]);
  assert.equal(resumed.review.assessments.A.answerText, "Answer A", "replayed assessments cannot overwrite completed work");
  assert.throws(() => resumed.appendBatch([["UNKNOWN", assessed("UNKNOWN")]]), /unknown review ID/u);
  resumed.finalize();

  const finalizedBytes = fs.readFileSync(reviewPath);
  const finalized = JSON.parse(finalizedBytes.toString("utf8"));
  assert.equal(finalized.reviewState, "automated-triage-complete-human-review-required");
  assert.equal(finalized.runSha256, initial.runSha256);
  assert.equal(finalized.rubricSha256, initial.rubricSha256);
  assert.match(finalized.triageJournalSha256, /^[a-f0-9]{64}$/u);
  assert.equal(sha(finalizedBytes).length, 64);
  const afterFinalResume = openReviewJournal({ reviewPath, currentReview: finalized, currentReviewBytes: finalizedBytes, runSha256: initial.runSha256, rubricSha256: initial.rubricSha256, count: initial.count });
  assert.deepEqual(afterFinalResume.review.assessments, finalized.assessments, "final JSON is checked against journal replay");
  const tamperedFinal = structuredClone(finalized);
  tamperedFinal.assessments.A.answerText = "manually altered after finalization";
  assert.throws(() => openReviewJournal({ reviewPath, currentReview: tamperedFinal, currentReviewBytes: Buffer.from(JSON.stringify(tamperedFinal)), runSha256: initial.runSha256, rubricSha256: initial.rubricSha256, count: initial.count }), /differ from the recovered journal/u);

  // An interrupted partial trailing append is discarded; complete hash-verified batches survive.
  const tornPath = path.join(temp, "torn-review.json");
  const tornInitial = makeReview(["X", "Y"]);
  const tornJournal = initialize(tornPath, tornInitial);
  tornJournal.appendBatch([["X", assessed("X")]]);
  fs.appendFileSync(`${tornPath}.journal.jsonl`, '{"kind":"batch","partial":');
  const recovered = openReviewJournal({ reviewPath: tornPath, currentReview: tornInitial, currentReviewBytes: fs.readFileSync(tornPath), runSha256: tornInitial.runSha256, rubricSha256: tornInitial.rubricSha256, count: tornInitial.count });
  assert.equal(recovered.review.assessments.X.reviewerType, "automated-triage");
  assert.equal(recovered.review.assessments.Y.reviewerType, "pending");
  assert.equal(fs.readFileSync(`${tornPath}.journal.jsonl`, "utf8").endsWith("\n"), true, "recovery truncates only the incomplete tail");
  recovered.appendBatch([["Y", assessed("Y")]]);
  recovered.finalize();
  assert.equal(JSON.parse(fs.readFileSync(tornPath, "utf8")).assessments.Y.reviewerType, "automated-triage");

  const newlinePath = path.join(temp, "missing-newline.json");
  const newlineInitial = makeReview(["N"]);
  const newlineWriter = initialize(newlinePath, newlineInitial);
  newlineWriter.appendBatch([["N", assessed("N")]]);
  const noFinalNewline = fs.readFileSync(`${newlinePath}.journal.jsonl`);
  fs.writeFileSync(`${newlinePath}.journal.jsonl`, noFinalNewline.subarray(0, noFinalNewline.length - 1));
  const newlineRecovery = openReviewJournal({ reviewPath: newlinePath, currentReview: newlineInitial, currentReviewBytes: fs.readFileSync(newlinePath), runSha256: newlineInitial.runSha256, rubricSha256: newlineInitial.rubricSha256, count: newlineInitial.count });
  assert.equal(newlineRecovery.review.assessments.N.reviewerType, "automated-triage", "complete JSON record without its newline is retained");

  const headerPath = path.join(temp, "partial-header.json");
  const headerInitial = makeReview(["H"]);
  const headerBytes = Buffer.from(`${JSON.stringify(headerInitial, null, 2)}\n`);
  fs.writeFileSync(headerPath, headerBytes);
  fs.writeFileSync(`${headerPath}.journal.base.json`, headerBytes);
  fs.writeFileSync(`${headerPath}.journal.jsonl`, '{"kind":"header","partial":');
  const headerRecovery = openReviewJournal({ reviewPath: headerPath, currentReview: headerInitial, currentReviewBytes: headerBytes, runSha256: headerInitial.runSha256, rubricSha256: headerInitial.rubricSha256, count: headerInitial.count });
  assert.equal(headerRecovery.review.assessments.H.reviewerType, "pending");
  headerRecovery.appendBatch([["H", assessed("H")]]);
  headerRecovery.finalize();

  // Hash-chain corruption and run/rubric mismatch fail closed.
  const corruptPath = path.join(temp, "corrupt-review.json");
  const corruptInitial = makeReview(["Z"]);
  const corrupt = initialize(corruptPath, corruptInitial);
  corrupt.appendBatch([["Z", assessed("Z")]]);
  const corruptJournalPath = `${corruptPath}.journal.jsonl`;
  const lines = fs.readFileSync(corruptJournalPath, "utf8").trimEnd().split(/\r?\n/u);
  const batchRecord = JSON.parse(lines[1]);
  batchRecord.assessments[0].assessment.answerText = "tampered";
  lines[1] = JSON.stringify(batchRecord);
  fs.writeFileSync(corruptJournalPath, `${lines.join("\n")}\n`);
  assert.throws(() => openReviewJournal({ reviewPath: corruptPath, currentReview: corruptInitial, currentReviewBytes: fs.readFileSync(corruptPath), runSha256: corruptInitial.runSha256, rubricSha256: corruptInitial.rubricSha256, count: corruptInitial.count }), /hash chain is invalid/u);

  const mismatched = initialize(path.join(temp, "mismatch.json"), makeReview(["M"]));
  assert.throws(() => openReviewJournal({ reviewPath: path.join(temp, "mismatch.json"), currentReview: mismatched.review, currentReviewBytes: fs.readFileSync(path.join(temp, "mismatch.json")), runSha256: "c".repeat(64), rubricSha256: "b".repeat(64), count: 1 }), /does not match this captured run/u);

  // Merge helper retains deterministic ordering and no-overwrite behavior.
  const merged = mergeAssessments(initial, [["C", assessed("C")], ["A", assessed("A")]]);
  assert.deepEqual(Object.keys(merged.assessments), ["A", "B", "C"]);
  assert.equal(merged.assessments.B.reviewerType, "pending");
  console.log("Parallel review journal recovery, integrity, and no-overwrite checks passed.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
