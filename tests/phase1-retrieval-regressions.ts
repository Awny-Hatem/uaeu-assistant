import assert from "node:assert/strict";
import { retrieveVerifiedEvidence } from "@/lib/knowledge-files";

const cases: { query: string; answerId: string }[] = [
  { query: "Which courses are required in the Information Security degree?", answerId: "information-security-degree-courses" },
  { query: "I'm an Information Security student. What must I take in my final semester?", answerId: "information-security-final-semester" },
  { query: "How many credits can I take while on academic probation?", answerId: "academic-probation" },
  { query: "I'm an international undergraduate. How are tuition fees calculated per credit?", answerId: "tuition-program-cost" },
  { query: "What scholarships are there for international undergraduate students?", answerId: "scholarships-available" },
  { query: "If I receive a scholarship, does it always cover housing too?", answerId: "scholarship-housing-coverage" },
  { query: "My UAEU Wi-Fi is not working. How can I get help?", answerId: "campus-wifi-connection" },
  { query: "How can I make a confidential counseling appointment?", answerId: "counseling-appointment" },
  { query: "Can I get help improving my CV and preparing for an interview?", answerId: "career-cv-interview-support" },
  { query: "Where do UAEU students look for internship opportunities?", answerId: "internships-student-jobs" },
  { query: "Who helps international students with UAEU visa questions?", answerId: "student-visa-application" },
  { query: "How much is university accommodation for an international undergraduate?", answerId: "student-housing-cost" },
  { query: "أقدر آخذ نسخة ورقية بدل الرقمية؟", answerId: "alumni-graduation-certificate-format" },
  { query: "minimum cumulative GPA required to graduate with a bachelor's degree", answerId: "graduation-requirements-program" },
  { query: "كم تبلغ رسوم كشف الدرجات الرسمي للطالب الحالي؟", answerId: "transcript-cost-and-student-status" },
];

for (const item of cases) {
  const evidence = retrieveVerifiedEvidence(item.query, 12);
  const selected = evidence.find((row) => row.source === `answer:${item.answerId}`);
  assert.ok(selected,
    `Expected ${item.answerId} to be retrieved for: ${item.query}`);
  if (item.answerId === "information-security-degree-courses") {
    assert.ok(selected.text.includes("ISEC311 Network Security I and ISEC321 Network Systems Security"));
    assert.doesNotMatch(selected.text, /ISEC311\/321 Network Security I\/II|ISEC311\/321/);
  }
}

console.log(`Phase 1 targeted verified-evidence retrieval checks passed: ${cases.length}/${cases.length}.`);
