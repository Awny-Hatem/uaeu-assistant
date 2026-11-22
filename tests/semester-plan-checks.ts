import assert from "node:assert/strict";
import { semesterPlanAnswer } from "../lib/academic/semester-plan-answer";

// Program semester plans from the official model study plans (Ali's manual tests, 22 Nov 2026).
// Expected codes and printed semester totals were read from the official PDFs.
const asked = "Which program are you in, and when were you admitted (for example Fall 2026)?";
const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
let passed = 0;
const check = (name: string, run: () => void) => { run(); passed += 1; console.log(`ok - ${name}`); };
const ask = (q: string, locale: "en" | "ar" = "en", history: { role: string; content: string }[] = []) => semesterPlanAnswer(q, history, locale);
const totals = (content: string) => [...content.matchAll(/Total: \*\*(\d+) credit hours?\*\*/gu)].map((m) => Number(m[1]));

check("a semester question without a program asks for the program once", () => {
  const r = ask("What should I take in my first semester?");
  assert.equal(r?.disposition, "clarify");
  assert.match(r!.content, /Which program are you in/);
  assert.equal(ask("What should I take in my first semester?", "en", [{ role: "user", content: "What should I take in my first semester?" }, { role: "assistant", content: asked }]), null, "never asks twice");
});

// cit_bsc_cybersecurity_study_plan.pdf, 2026-2027 cohort (Fall entry).
const CYBER_TOTALS = [15, 15, 15, 14, 12, 13, 16, 14, 6];
check("Cybersecurity: all 9 semesters match the PDF totals, with both official links", () => {
  CYBER_TOTALS.forEach((total, i) => {
    const r = ask(`What should I take in my ${ORD[i]} semester as a Cybersecurity student?`)!;
    assert.equal(r.disposition, "answer", ORD[i]);
    assert.deepEqual(totals(r.content), [total], ORD[i]);
    assert.match(r.content, /former name, Information Security/);
    assert.ok(r.citations.some((c) => c.url === "https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_cybersecurity_study_plan.pdf"));
    assert.ok(r.citations.some((c) => c.url === "https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml"));
  });
  const first = ask("What should I take in my first semester as a Cybersecurity student?")!.content;
  for (const code of ["GEAE101", "MATH105", "CSBP119", "CENG221", "GEIT113"]) assert.match(first, new RegExp(code));
});

// cit_bsc_computer_and_artificial_intelligence_engineering_study_plan.pdf, 2026-2027 cohort, three tracks:
// AI Systems Engineering / Robotics and Autonomous Systems / General pathway.
const CAIE: { codes: string[]; totals: number[] }[] = [
  { codes: ["GEAE101", "MATH105", "CSBP119", "PHYS105", "CENG110", "PHYS135"], totals: [16] },
  { codes: ["CENG202", "MATH110", "CSBP219", "CENG205", "MATH140"], totals: [15] },
  { codes: ["CENG210", "CENG201", "CENG231", "PHYS110", "STAT210", "GEEM110"], totals: [16] },
  { codes: ["MATH275", "CENG221", "CSBP315", "CENG310", "BIOC100", "PHYS140", "CENG315"], totals: [17] },
  { codes: ["ITBP301", "CENG340", "CENG529", "GESU121", "CENG320", "CENG341", "CENG500", "CENG570"], totals: [17, 17, 17] },
  { codes: ["CENG324", "CENG325", "CENG328", "CENG329", "ITBP270", "CSBP319", "CENG510", "CENG560"], totals: [13, 16, 16] },
  { codes: ["ITBP218", "ITBP480", "CENG525", "CENG540", "CENG585", "CENG590"], totals: [15, 15, 15] },
  { codes: ["ITBP481", "CENG550", "CENG595"], totals: [12, 12, 12] },
  { codes: ["ITBP496"], totals: [6] },
];
check("Computer and AI Engineering: every semester's courses and printed totals match the PDF", () => {
  CAIE.forEach(({ codes, totals: expected }, i) => {
    for (const name of ["Computer and AI Engineering", "Computer & AI Engineering", "Computer and Artificial Intelligence Engineering"]) {
      const r = ask(`What should I take in my ${ORD[i]} semester as a ${name} student?`)!;
      assert.equal(r.disposition, "answer", `${name} ${ORD[i]}`);
      for (const code of codes) assert.match(r.content, new RegExp(code), `${name} ${ORD[i]} ${code}`);
      assert.deepEqual(totals(r.content), expected, `${name} ${ORD[i]}`);
      assert.match(r.content, /former name, Computer Engineering/);
      assert.ok(r.citations.some((c) => c.url === "https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_and_artificial_intelligence_engineering_study_plan.pdf"));
      assert.ok(r.citations.some((c) => c.url === "https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml"));
    }
  });
});
// cit_bsc_computer_science_study_plan.pdf, 2026-2027 cohort (Fall entry), read from the rendered PDF.
const CS: { codes: string[]; total: number }[] = [
  { codes: ["GEAE101", "MATH105", "CSBP119", "PHYS105"], total: 15 },
  { codes: ["CENG202", "MATH110", "CSBP219", "CENG205", "MATH140"], total: 15 },
  { codes: ["BIOC100", "CHEM111", "CENG210", "CSBP315", "CSBP319"], total: 15 },
  { codes: ["CSBP340", "ITBP270", "STAT210", "SWEB300", "ITBP301"], total: 14 },
  { codes: ["CSBP316", "GEEM110", "SWEB450", "ITBP218"], total: 15 },
  { codes: ["CSBP461", "CSBP400", "CSBP301", "ITBP321", "GESU121"], total: 15 },
  { codes: ["CSBP411", "CSBP421", "ITBP480"], total: 12 },
  { codes: ["PHYS135", "ITBP481"], total: 13 },
  { codes: ["ITBP496"], total: 6 },
];
check("Computer Science: every semester of the 2026-2027 plan matches the PDF, in the shared template", () => {
  CS.forEach(({ codes, total }, i) => {
    const r = ask(`What should I take in my ${ORD[i]} semester as a computer science student?`)!;
    assert.equal(r.disposition, "answer", ORD[i]);
    for (const code of codes) assert.match(r.content, new RegExp(code), `${ORD[i]} ${code}`);
    assert.deepEqual(totals(r.content), [total], ORD[i]);
    assert.match(r.content, /^\*\*Bachelor of Science in Computer Science — /u);
    assert.match(r.content, /2026–2027 cohort onwards \(Fall entry\):/u);
    assert.match(r.content, /Check Degree Works and your academic advisor before registering/u);
    assert.doesNotMatch(r.content, /former name|not a determination|published curriculum, not a check|bscs_study_plan_fall_2025/u);
    assert.deepEqual(r.citations.map((c) => c.url), ["https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf", "https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml"]);
  });
});
check("the 0-credit course printed in the AI Systems plan is flagged, not corrected", () => {
  const r = ask("What should I take in my sixth semester as a Computer and AI Engineering student?")!;
  assert.match(r.content, /\*\*CENG510\*\* AI Systems Deployment \(0 credits\)/);
  assert.match(r.content, /printed numbers don't fully add up/);
  assert.doesNotMatch(ask("What should I take in my first semester as a Computer and AI Engineering student?")!.content, /don't fully add up/);
});
check("formatting: singular credit and Total on its own block", () => {
  const r = ask("What should I take in my first semester as a Computer and AI Engineering student?")!.content;
  assert.match(r, /\*\*PHYS135\*\* General Physics Lab I \(1 credit\)/);
  assert.match(r, /\n\nTotal: \*\*16 credit hours\*\*/);
});
check("a reply naming only the program continues the earlier semester question", () => {
  const r = ask("Cybersecurity", "en", [{ role: "user", content: "What should I take in my first semester?" }, { role: "assistant", content: asked }])!;
  assert.match(r.content, /CENG221/);
});
check("Arabic program and semester names", () => {
  const r = ask("ما مواد الفصل الأول في تخصص الأمن السيبراني؟", "ar")!;
  assert.match(r.content, /الفصل الأول/); assert.match(r.content, /GEIT113/);
  assert.match(ask("ما مواد الفصل الأول في هندسة الحاسوب والذكاء الاصطناعي؟", "ar")!.content, /CENG110/);
});
check("an earlier admission year selects the earlier cohort plan (former Information Security name)", () => {
  const r = ask("What courses are in semester 3 of Information Security for 2023 fall admits?")!;
  assert.match(r.content, /2022–2023 cohort/); assert.match(r.content, /CSBP319/);
});
check("specific-course and offering questions are left to other handlers", () => {
  assert.equal(ask("Can I take CSBP319 in my first semester?"), null);
  assert.equal(ask("Which courses are offered in the first semester of summer?"), null);
  assert.equal(ask("Which courses should I register next semester?"), null);
});
console.log(`semester-plan checks: ${passed} passed`);
check("a catalog program without a parsed plan is recognised and points to its official page", () => {
  for (const q of ["What should I take in my first semester as a Marketing student?", "What should I take in my first semester in Biology?"]) {
    const r = ask(q)!;
    assert.equal(r.disposition, "answer", q);
    assert.match(r.citations[0].url ?? "", /^https:\/\/www\.uaeu\.ac\.ae\/en\/catalog\/undergraduate\/programs\//u);
  }
});
console.log(`semester-plan checks (with catalog fallback): ${passed} passed`);
