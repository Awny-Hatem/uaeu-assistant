import assert from "node:assert/strict";
import { listAcademicPrograms, programIdInText } from "@/lib/academic/program-curricula";
import { publishedCurriculumSnapshotAnswer } from "@/lib/academic/curriculum-snapshot-answer";

const programs = listAcademicPrograms();
const cases = [
  { locale: "en" as const, program: "veterinary-medicine", q: "What applicability statement does UAEU publish for Bachelor of Veterinary Medicine for the cohort described as 'Fall-entry students whose assigned plan matches the published 2026-2027-model-plan model plan'? Cite the version-specific source.", version: "veterinary-medicine-2026-plan-175" },
  { locale: "ar" as const, program: "veterinary-medicine", q: "ما عبارة الانطباق التي تنشرها جامعة الإمارات لبرنامج Bachelor of Veterinary Medicine للفئة الموصوفة بأنها 'Fall-entry students whose assigned plan matches the published 2026-2027-model-plan model plan'؟ مع ذكر مصدر النسخة المحددة.", version: "veterinary-medicine-2026-plan-175" },
  { locale: "en" as const, program: "accounting", q: "What applicability statement does UAEU publish for Bachelor of Accounting for the cohort described as 'Fall 2025 entrants and later cohorts identified by the published model plan; confirm the assigned Degree Works plan'? Cite the version-specific source.", version: "accounting-2025-2026-120" },
  { locale: "en" as const, program: "veterinary-medicine", q: "What applicability statement does UAEU publish for Bachelor of Veterinary Medicine for the cohort described as 'Fall-entry students assigned the published 2022-2023 Veterinary Medicine model plan'? Cite the version-specific source.", version: "veterinary-medicine-2022-plan-152-header-149-subtotals" },
  { locale: "ar" as const, program: "veterinary-medicine", q: "ما عبارة الانطباق التي تنشرها جامعة الإمارات للفئة الموصوفة بأنها 'Fall-entry students assigned the published 2022-2023 Veterinary Medicine model plan'؟", version: "veterinary-medicine-2022-plan-152-header-149-subtotals" },
  { locale: "ar" as const, program: "arabic-language-and-literature", q: "ما عبارة الانطباق المنشورة لبرنامج Bachelor of Arts in Arabic Language and Literature للفئة 'Students admitted from Fall or Spring 2025-2026 onwards'؟", version: "arabic-language-and-literature-2025-2026-onwards" },
  { locale: "ar" as const, program: "architectural-engineering", q: "وفق الوصف المنشور 'Official 2026-2027 model plans; select the plan matching Fall or Spring entry and confirm personal assignment in Degree Works'، ما اسم الدرجة والكلية المسجلان لبرنامج Bachelor of Science in Architectural Engineering؟", version: "architectural-engineering-2026-2027-model-plans-132" },
  { locale: "ar" as const, program: "arabic-language-and-literature", q: "وفق الوصف المنشور 'Students admitted from Fall or Spring 2025-2026 onwards'، ما اسم الدرجة والكلية المسجلان لبرنامج Bachelor of Arts in Arabic Language and Literature؟", version: "arabic-language-and-literature-2025-2026-onwards" },
];

for (const item of cases) {
  assert.equal(programIdInText(item.q), item.program, `${item.program}: route must resolve exact program`);
  const answer = publishedCurriculumSnapshotAnswer(programs, item.program, item.q, item.locale);
  assert.ok(answer, `${item.program}: deterministic answer is required`);
  assert.equal(answer.versionId, item.version, `${item.program}: wrong curriculum version`);
  assert.ok(answer.citations.some((source) => source.url.startsWith("https://www.uaeu.ac.ae/")), "official UAEU citation required");
  assert.doesNotMatch(answer.content, /\\n/u, `${item.program}: render real line breaks, not escaped newline text`);
}

const identityCases = [
  {
    program: "bsc-computer-engineering",
    version: "computer-engineering-cohort-model-144",
    name: "Bachelor of Science in Computer Engineering",
    college: "College of Information Technology",
    q: "For the published curriculum label '144-credit source variant shown in the 2025 model-plan PDF with separate Fall and Spring sequences; exact cohort and revision mapping unresolved', which degree title and college are recorded for Bachelor of Science in Computer Engineering? Cite the version-specific source.",
  },
  {
    program: "statistics-and-data-analytics",
    version: "statistics-data-analytics-2022-plan-121",
    name: "Bachelor of Science in Statistics and Data Analytics",
    college: "College of Business and Economics",
    q: "For the published curriculum label 'Fall-entry 2022-2023 model plan as published; confirm the assigned Degree Works plan', which degree title and college are recorded for Bachelor of Science in Statistics and Data Analytics? Cite the version-specific source.",
  },
  {
    program: "marine-fisheries-and-animal-science",
    version: "mfass-catalog-2026-11",
    name: "Bachelor of Science in Marine Fisheries and Animal Science",
    college: "College of Agriculture and Veterinary Medicine",
    q: "For the published curriculum label 'Current published degree page; entry-cohort applicability is not identified', which degree title and college are recorded for Bachelor of Science in Marine Fisheries and Animal Science? Cite the version-specific source.",
  },
] as const;

for (const item of identityCases) {
  const answer = publishedCurriculumSnapshotAnswer(programs, item.program, item.q, "en");
  assert.ok(answer, `${item.program}: published identity should be answered`);
  assert.equal(answer.versionId, item.version, `${item.program}: identity query must retain its named plan`);
  assert.ok(answer.content.includes(item.name), `${item.program}: answer must name the requested degree`);
  assert.ok(answer.content.includes(item.college), `${item.program}: answer must name the correct college`);
  assert.match(answer.content, /\n/u, `${item.program}: response must contain real line breaks`);
  assert.doesNotMatch(answer.content, /\\n/u, `${item.program}: response must not show escaped newline text`);
  assert.ok(answer.citations.some((source) => source.url.startsWith("https://www.uaeu.ac.ae/")), `${item.program}: official source citation required`);
}

const personal = publishedCurriculumSnapshotAnswer(programs, "veterinary-medicine", "What published cohort label applies to me for Veterinary Medicine?", "en");
assert.equal(personal?.disposition, "clarify");
assert.match(personal?.content ?? "", /cannot determine your assigned plan/i);
const unknown = publishedCurriculumSnapshotAnswer(programs, "veterinary-medicine", "What applicability statement does UAEU publish for Veterinary Medicine for the 2019 cohort?", "en");
assert.equal(unknown, null, "unknown cohort/version must not be guessed");
const unresolvedProgram = programs.find((program) => program.curriculumVersions.some((version) => version.cohortMapping === "unresolved"));
assert.ok(unresolvedProgram);
const unresolvedVersion = unresolvedProgram.curriculumVersions.find((version) => version.cohortMapping === "unresolved");
assert.ok(unresolvedVersion);
const unresolved = publishedCurriculumSnapshotAnswer(programs, unresolvedProgram.id, `What applicability statement does UAEU publish for ${unresolvedProgram.name} for the cohort described as '${unresolvedVersion.cohortLabel}'?`, "en");
assert.equal(unresolved?.cohortMappingUnresolved, true);
assert.equal(unresolved?.disposition, "clarify");
console.log(`curriculum snapshot checks passed: ${cases.length + identityCases.length} scoped prompts, exact plan/source selection, degree/college identity, clean formatting, personal-plan clarification and unknown-version guard`);
