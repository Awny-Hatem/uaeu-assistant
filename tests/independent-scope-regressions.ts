/** Independent synthetic scope/recall checks. No held-out fixture, HTTP or model calls. */
import assert from "node:assert/strict";
import { understandQuery, resolveConversation } from "../lib/query-understanding";
import { canonicalCandidateIds, canonicalEntriesForSemanticRoute, requestedCourseTargets, type SemanticRoute } from "../lib/semantic-routing";
import { courseIdentityConflict } from "../lib/faq";

let passed = 0;
let failed = 0;
let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls += 1; throw new Error("Independent scope checks forbid network access"); };
function check(name: string, run: () => void) {
  try { run(); passed += 1; console.log(`PASS ${name}`); }
  catch (error) { failed += 1; console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`); }
}
const request = (query: string, ids: string[] = [], targets = understandQuery(query).codes): SemanticRoute => ({
  resolvedQuery: query, subject: "", recordIds: [], primaryRecordIds: ids,
  targetCourseCodes: targets, clarification: "", kind: "answer",
});
const resolve = (...turns: string[]) => resolveConversation(turns.map(content => ({ role: "user", content })), turns.at(-1)!);

try {
  check("explicitly negated category is not positive applicant scope", () => {
    assert.deepEqual(understandQuery("I am not an international applicant; I am a UAE national.").applicantCategories, ["national"]);
    assert.deepEqual(understandQuery("I am international, not a UAE national.").applicantCategories, ["international"]);
  });
  check("plural population comparison retains both categories", () => {
    assert.deepEqual(new Set(understandQuery("Do UAE nationals and international applicants have different English requirements?").applicantCategories), new Set(["national", "international"]));
  });
  check("category correction keeps established subject, degree and year", () => {
    const result = resolve("What are international undergraduate admission requirements for Fall 2027?", "I am a UAE national instead.");
    const meaning = understandQuery(result.query);
    assert.equal(result.subject?.key, "admissions");
    assert.equal(result.usedContext, true);
    assert.equal(meaning.applicantCategory, "national");
    assert.equal(meaning.degreeLevel, "undergraduate");
    assert.deepEqual(meaning.years, [2027]);
    assert.deepEqual(meaning.terms, ["fall"]);
  });
  check("third-turn document follow-up retains intervening category update", () => {
    const result = resolve("What are undergraduate admission requirements for Fall 2027?", "I am international.", "What documents do I need?");
    const meaning = understandQuery(result.query);
    assert.equal(result.subject?.key, "admissions");
    assert.equal(result.usedContext, true);
    assert.equal(meaning.applicantCategory, "international");
    assert.equal(meaning.degreeLevel, "undergraduate");
    assert.deepEqual(meaning.years, [2027]);
    assert.ok(meaning.intents.includes("documents"));
  });
  check("weekday continuation retains named branch despite an assistant error", () => {
    const result = resolveConversation([
      { role: "user", content: "When is the Main Library open?" },
      { role: "assistant", content: "The answer service is temporarily unavailable." },
      { role: "user", content: "Friday?" },
    ], "Friday?");
    assert.equal(result.usedContext, true);
    assert.match(result.query, /Main Library/);
    assert.ok(canonicalCandidateIds(request(result.query)).includes("library-opening-hours"));
  });
  check("standalone category fragment does not invent an admission subject", () => {
    const result = resolve("I am international.");
    assert.equal(result.subject, undefined);
    assert.equal(result.needsClarification, true);
  });
  check("named new service resets admission scope", () => {
    const result = resolve("What are international undergraduate admission requirements for Fall 2027?", "How do I reset my password?");
    assert.equal(result.subject?.key, "password");
    assert.equal(result.usedContext, false);
    assert.deepEqual(understandQuery(result.query).years, []);
    assert.deepEqual(understandQuery(result.query).applicantCategories, []);
  });
  check("academic load paraphrase recalls complete load policy", () => {
    assert.ok(canonicalCandidateIds(request("What is the usual academic load during a regular term?")).includes("semester-credit-load"));
    assert.ok(canonicalCandidateIds(request("Who can authorize an overload of credits?")).includes("semester-credit-load"));
  });
  check("transferred credit quantity is not semester load", () => {
    const query = "How many credits can be transferred from another university?";
    assert.ok(canonicalCandidateIds(request(query)).includes("admissions-transfer-credits"));
    assert.equal(canonicalEntriesForSemanticRoute(request(query, ["admissions-transfer-credits"])).length, 1);
  });
  for (const query of [
    "Are modules completed at my former university recognized toward a UAEU degree?",
    "Can coursework from another institution reduce the credits I still need for my degree here?",
    "How is academic credit from my previous university assessed after I move to UAEU?",
  ]) {
    check(`external academic credit does not refer back to a prerequisite course: ${query}`, () => {
      const result = resolve("What are the prerequisites for CSBP319?", query);
      assert.equal(result.needsClarification, false);
      assert.notEqual(result.subject?.key, "CSBP319");
      assert.deepEqual(requestedCourseTargets(result.query), []);
      assert.equal(understandQuery(result.query).intents.includes("prerequisites"), false);
      assert.ok(canonicalCandidateIds(request(result.query)).includes("admissions-transfer-credits"));
      assert.equal(canonicalEntriesForSemanticRoute(request(result.query, ["admissions-transfer-credits"])).length, 1);
    });
  }
  check("a genuine previous-course reference still resolves the earlier course", () => {
    const result = resolve("What are the prerequisites for CSBP319?", "What are the prerequisites for CSBP340?", "What were the prerequisites for the previous course?");
    assert.equal(result.subject?.key, "CSBP319");
    assert.equal(result.usedContext, true);
    assert.equal(result.needsClarification, false);
    assert.deepEqual(requestedCourseTargets(result.query), ["CSBP319"]);
  });
  check("housing transfer does not become academic credit recognition", () => {
    const query = "How can I transfer from my current housing room to another dormitory?";
    const result = resolve("How many credits can be transferred from another university?", query);
    assert.equal(result.subject?.key, "housing");
    assert.equal(result.usedContext, false);
    assert.equal(canonicalCandidateIds(request(result.query)).includes("admissions-transfer-credits"), false);
    assert.deepEqual(canonicalEntriesForSemanticRoute(request(result.query, ["admissions-transfer-credits"])), []);
  });
  check("a completed course code cannot replace an external-credit question", () => {
    const query = "I completed CSBP219; can academic credits from my previous university count toward my UAEU degree?";
    const targets = requestedCourseTargets(query);
    assert.deepEqual(targets, []);
    assert.ok(canonicalCandidateIds(request(query, [], targets)).includes("admissions-transfer-credits"));
    assert.equal(canonicalEntriesForSemanticRoute(request(query, ["admissions-transfer-credits"], targets)).length, 1);
    assert.deepEqual(canonicalEntriesForSemanticRoute(request(query, ["course-prerequisites-object-oriented-programming"], targets)), []);
  });
  check("withdrawal morphology recalls the governing course policy", () => {
    assert.ok(canonicalCandidateIds(request("Explain withdrawing versus dropping a module.")).includes("course-withdrawal"));
  });
  check("unknown future calendar cannot borrow a published year", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(request("When are Spring 2031 final exams?", ["final-exam-schedule"])), []);
  });
  check("private approval result cannot be answered by public application steps", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(request("Has my application for undergraduate admission been approved?", ["admissions-apply-undergraduate"])), []);
  });
  check("postgraduate load cannot borrow undergraduate policy", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(request("What is the postgraduate semester credit load?", ["semester-credit-load"])), []);
  });
  check("target course is distinct from student-reported completed course", () => {
    const query = "I passed CSBP219; can I take CSBP319?";
    assert.equal(canonicalEntriesForSemanticRoute(request(query, ["course-prerequisites-data-structures"], ["CSBP319"])).length, 1);
    assert.deepEqual(canonicalEntriesForSemanticRoute(request(query, ["course-prerequisites-object-oriented-programming"], ["CSBP319"])), []);
  });
  check("unknown identifier/title conflict is not silently corrected", () => {
    assert.deepEqual(courseIdentityConflict("CSBP998 Data Structures prerequisites"), { supplied: "CSBP998", named: "CSBP319", title: "Data Structures" });
    assert.deepEqual(canonicalEntriesForSemanticRoute(request("CSBP998 prerequisites", ["course-prerequisites-data-structures"], ["CSBP998"])), []);
  });
  check("library borrowing cannot acquire an unrelated academic-load policy", () => {
    assert.deepEqual(canonicalEntriesForSemanticRoute(request("Does a library loan have a credit load limit?", ["semester-credit-load"])), []);
  });
  assert.equal(networkCalls, 0);
  console.log(`${passed}/${passed + failed} independent synthetic scope checks passed; no network calls. These are contract/recall regressions, not factual certification.`);
  if (failed) process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
}
