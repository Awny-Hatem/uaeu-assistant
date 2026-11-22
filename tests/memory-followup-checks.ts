import assert from "node:assert/strict";
import { asksOwnStudentId, asksRemainingCourses, compareQuestion, facetCarryQuestion, lastProgram, levelSwitchQuestion, registrationWhenHint, remainingCoursesReply, translationTarget, refersToPreviousAnswer, withoutTranslationTurns } from "../lib/memory/followups";
import { detectLocale } from "../lib/language";
import { splitSemesterColumns } from "../lib/study-plan-columns";
import { programsMentioned, sameFieldAt } from "../lib/profile/programs";

// Follow-ups resolved from stored conversation turns (no network).
const h = (...t: string[]) => t.map((content, i) => ({ role: i % 2 ? "assistant" : "user", content }));
let passed = 0;
const check = (name: string, run: () => void) => { run(); passed += 1; console.log(`ok - ${name}`); };

check("level switches keep the field and the asked facet (EN, AR, typo-corrected)", () => {
  assert.equal(levelSwitchQuestion("And for the master's?", h("Tell me about the Bachelor of Science in Civil Engineering at UAEU.", "…", "How many credits does it need?", "The Bachelor of Science in Civil Engineering at UAEU requires 132.")), "How many credits does the Master of Science in Civil Engineering require?");
  assert.equal(levelSwitchQuestion("And the PhD?", h("How many credits?", "The Master of Science in Civil Engineering requires 30.")), "How many credits does the Doctor of Philosophy in Civil Engineering require?");
  assert.equal(levelSwitchQuestion("والدكتوراه؟", h("كم ساعه؟", "يتطلب برنامج Master of Science in Electrical Engineering 30 ساعة")), "كم ساعة معتمدة يتطلب برنامج Doctor of Philosophy in Electrical Engineering؟");
  assert.equal(levelSwitchQuestion("masters?", h("total credits?", "The Bachelor of Science in Geosciences requires 120 credits.")), "How many credits does the Master of Science in Geosciences require?");
});
check("no rewrite when the follow-up names a program or no program is in memory", () => {
  assert.equal(levelSwitchQuestion("And the Master of Public Health?", h("credits?", "The Master of Science in Genomic Medicine requires 33.")), null);
  assert.equal(levelSwitchQuestion("And for the master's?", h("When is registration?", "Registration begins 2 November 2026.")), null);
  assert.equal(levelSwitchQuestion("How do master's admissions work?", h("x", "The Bachelor of Science in Physics requires 120.")), null);
});
check("same-field lookup across levels is exact or nothing", () => {
  assert.equal(sameFieldAt("Bachelor of Science in Horticulture", "doctorate"), "Doctor of Philosophy in Horticulture Sciences");
  assert.equal(sameFieldAt("Bachelor of Science in Mechanical Engineering", "doctorate"), "Doctor of Philosophy in Mechanical Engineering");
  assert.equal(sameFieldAt("Bachelor of Law", "master"), null, "two law masters: ambiguous, so no guess");
  assert.deepEqual(programsMentioned("Compare the Bachelor of Law with the Bachelor of Veterinary Medicine").map((p) => p.program), ["Bachelor of Law", "Bachelor of Veterinary Medicine"]);
});
check("'compare it with X' compares the program in memory with X", () => {
  assert.equal(compareQuestion("Compare it with the Bachelor of Veterinary Medicine.", h("How many credits does it need?", "The Bachelor of Law at UAEU requires 130.")), "Compare the Bachelor of Law and the Bachelor of Veterinary Medicine: how many credits does each require?");
  assert.equal(compareQuestion("compare it with mechanical engineering bachelor", h("how many credit hours", "The Bachelor of Science in Aerospace Engineering requires 132.")), "Compare the Bachelor of Science in Aerospace Engineering and the Bachelor of Science in Mechanical Engineering: how many credits does each require?");
  assert.match(compareQuestion("قارنه مع Bachelor of Veterinary Medicine", h("كم ساعة يحتاج؟", "يتطلب Doctor of Medicine 233 ساعة"))!, /^قارن بين Doctor of Medicine و Bachelor of Veterinary Medicine/);
  assert.equal(compareQuestion("Compare the Bachelor of Law with Medicine", h("x", "y")), null);
});
check("a field name with a level word is found in memory; loose words are not", () => {
  assert.equal(lastProgram(h("ما هو بكالوريوس Chemistry في جامعة الإمارات؟", "…")), "Bachelor of Science in Chemistry");
  assert.equal(lastProgram(h("ما هي رسوم البكالوريوس في جامعة الإمارات؟", "…")), null);
  assert.equal(lastProgram(h("When is the master's application deadline?", "…")), null);
});
check("'and the <program>?' keeps the earlier facet; registration 'when' points at the calendar", () => {
  assert.equal(facetCarryQuestion("And the Master of Public Health?", h("How many credits does the Master of Science in Genomic Medicine require?", "33")), "How many credits does the Master of Public Health require?");
  assert.equal(facetCarryQuestion("And the Master of Public Health admission requirements?", h("How many credits?", "33")), null, "its own facet wins");
  assert.match(registrationWhenHint("When is my registration?")!, /published academic calendar/);
  assert.equal(registrationWhenHint("When does Spring 2027 registration begin?"), null, "an explicit term needs no hint");
});
check("translation requests are recognised; other uses of 'translate' are not", () => {
  assert.equal(translationTarget("Translate that to Arabic."), "ar");
  assert.equal(translationTarget("translate your answer to english"), "en");
  assert.equal(translationTarget("ترجم ذلك إلى الإنجليزية"), "en");
  assert.equal(translationTarget("How do I get my transcript translated?"), null);
});
check("'remaining courses' gets an honest record boundary, never a guessed list", () => {
  assert.equal(asksRemainingCourses("What courses do I have remaining?"), true);
  assert.equal(asksRemainingCourses("ما المساقات المتبقية لي؟"), true);
  assert.equal(asksRemainingCourses("What is my remaining tuition balance?"), false);
  assert.match(remainingCoursesReply("en", "Bachelor of Science in Computer Science"), /can.t see your completed courses[\s\S]*degree audit/);
});
check("'what is my student ID?' is recognised (EN/AR) without catching ID-card procedures", () => {
  assert.equal(asksOwnStudentId("What is my student ID?"), true);
  assert.equal(asksOwnStudentId("ما هو رقمي الجامعي؟"), true);
  assert.equal(asksOwnStudentId("How do I replace a lost student ID card?"), false);
});
check("a translation exchange is skipped when resolving the next follow-up", () => {
  const m = [{ role: "user", content: "What are the prerequisites for CSBP 219?" }, { role: "assistant", content: "CSBP119, minimum grade D." }, { role: "user", content: "Translate that to Arabic." }, { role: "assistant", content: "..." }, { role: "user", content: "What was the minimum grade you mentioned?" }];
  assert.deepEqual(withoutTranslationTurns(m).map((t) => t.content), ["What are the prerequisites for CSBP 219?", "CSBP119, minimum grade D.", "What was the minimum grade you mentioned?"]);
  assert.equal(withoutTranslationTurns(m.slice(0, 3)).length, 3, "the latest translation request itself is kept");
});
check("questions about the previous answer are recognised (EN/AR)", () => {
  assert.equal(refersToPreviousAnswer("What was the minimum grade you mentioned?"), true);
  assert.equal(refersToPreviousAnswer("ما الدرجة التي ذكرتها؟"), true);
  assert.equal(refersToPreviousAnswer("What is the minimum grade for CSBP119?"), false);
  assert.equal(refersToPreviousAnswer("My advisor said I need CSBP119, is that right?"), false);
});
check("an Arabic request frame wins over an embedded English program name", () => {
  assert.equal(detectLocale("أخبرني عن برنامج Bachelor of Science in Petroleum Engineering"), "ar");
  assert.equal(detectLocale("Tell me about the Bachelor of Science in Petroleum Engineering"), "en");
});
check("two-column study-plan pages are split into one list per semester", () => {
  const row = (l: string, r: string) => l.padEnd(44) + r;
  const page = [row("Year 1 - First Semester", "Year 1 - Second Semester"), row("GEAE101   English   3", "CENG202   Discrete Math   3"), row("Elective  Culture Elective 1  3", "Math140   Linear Algebra  3")].join("\n");
  const out = splitSemesterColumns(page);
  const second = out.slice(out.indexOf("Year 1 - Second Semester"));
  assert.match(second, /CENG202[\s\S]*Math140/);
  assert.doesNotMatch(second, /Culture Elective|GEAE101/);
  assert.equal(splitSemesterColumns("No plan here."), "No plan here.");
});
console.log(`memory follow-up checks: ${passed} passed`);
