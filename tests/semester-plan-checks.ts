import assert from "node:assert/strict";
import { semesterPlanAnswer } from "../lib/academic/semester-plan-answer";

// Program semester plans from the official model study plans (Ali's manual test, 22 Nov 2026).
const asked = "Which program are you in, and when were you admitted (for example Fall 2026)?";
let passed = 0;
const check = (name: string, run: () => void) => { run(); passed += 1; console.log(`ok - ${name}`); };

check("a semester question without a program asks for the program once", () => {
  const r = semesterPlanAnswer("What should I take in my first semester?", [], "en");
  assert.equal(r?.disposition, "clarify");
  assert.match(r!.content, /Which program are you in/);
  assert.equal(semesterPlanAnswer("What should I take in my first semester?", [{ role: "user", content: "What should I take in my first semester?" }, { role: "assistant", content: asked }], "en"), null, "never asks twice");
});
check("Cybersecurity first semester comes from the 2026-2027 plan with both official links", () => {
  for (const q of ["What should I take in my first semester as a Cybersecurity student?", "first semester courses cyber security", "what do i take in 1st semester cybersecurity"]) {
    const r = semesterPlanAnswer(q, [], "en")!;
    assert.equal(r.disposition, "answer", q);
    for (const code of ["GEAE101", "MATH105", "CSBP119", "CENG221", "GEIT113"]) assert.match(r.content, new RegExp(code), q);
    assert.match(r.content, /15 credit hours/);
    assert.ok(r.citations.some((c) => c.url === "https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_cybersecurity_study_plan.pdf"));
    assert.ok(r.citations.some((c) => c.url === "https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml"));
  }
});
check("a reply naming only the program continues the earlier semester question", () => {
  const r = semesterPlanAnswer("Cybersecurity", [{ role: "user", content: "What should I take in my first semester?" }, { role: "assistant", content: asked }], "en")!;
  assert.match(r.content, /CENG221/);
});
check("Arabic program and semester names", () => {
  const r = semesterPlanAnswer("ما مواد الفصل الأول في تخصص الأمن السيبراني؟", [], "ar")!;
  assert.match(r.content, /الفصل الأول/); assert.match(r.content, /GEIT113/);
});
check("an earlier admission year selects the earlier cohort plan (former Information Security name)", () => {
  const r = semesterPlanAnswer("What courses are in semester 3 of Information Security for 2023 fall admits?", [], "en")!;
  assert.match(r.content, /2022–2023 cohort/); assert.match(r.content, /CSBP319/);
});
check("specific-course and offering questions are left to other handlers", () => {
  assert.equal(semesterPlanAnswer("Can I take CSBP319 in my first semester?", [], "en"), null);
  assert.equal(semesterPlanAnswer("Which courses are offered in the first semester of summer?", [], "en"), null);
  assert.equal(semesterPlanAnswer("Which courses should I register next semester?", [], "en"), null);
});
console.log(`semester-plan checks: ${passed} passed`);
