import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corpusPath = path.join(root, "data/evals/v3-scale-questions.jsonl");
const manifestPath = path.join(root, "data/evals/v3-scale-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const corpus = fs.readFileSync(corpusPath, "utf8").trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line));
const courses = new Map(JSON.parse(fs.readFileSync(path.join(root, "data/academic/course-catalog.json"), "utf8")).courses.map((course) => [course.code, course]));
const curricula = new Map(JSON.parse(fs.readFileSync(path.join(root, "data/academic/program-curricula.json"), "utf8")).flatMap((program) => (program.curriculumVersions ?? []).map((version) => [version.id, { program, version }])));
const fixtures = [
  ...JSON.parse(fs.readFileSync(path.join(root, "data/evals/common-questions.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(root, "data/evals/alignment-questions.json"), "utf8")).cases,
];
const fixtureById = new Map(fixtures.map((testCase) => [testCase.id, testCase]));
const guideFiles = fs.readdirSync(path.join(root, "data/service-guides")).filter((name) => name.endsWith(".json"));
const guides = new Map(guideFiles.map((name) => {
  const guide = JSON.parse(fs.readFileSync(path.join(root, "data/service-guides", name), "utf8"));
  return [guide.id, guide];
}));

const errors = [];
const ids = new Set();
const uniqueInteractions = new Set();
const uniqueLatestTurns = new Set();
const languageCounts = {};
const domainCounts = {};
const coveredCourseCodes = new Set();
const coveredCurriculumIds = new Set();
const coveredGuideIds = new Set();
for (const [index, testCase] of corpus.entries()) {
  const label = testCase.id || `line-${index + 1}`;
  if (!testCase.id || ids.has(testCase.id)) errors.push(`${label}: missing/duplicate id`);
  ids.add(testCase.id);
  if (!testCase.question?.trim()) errors.push(`${label}: empty question`);
  const interaction = testCase.messages?.map(({ role, content }) => `${role}:${content}`).join("\n") ?? `user:${testCase.question}`;
  const normalizedInteraction = interaction.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
  if (uniqueInteractions.has(normalizedInteraction)) errors.push(`${label}: duplicate evaluation interaction`);
  uniqueInteractions.add(normalizedInteraction);
  uniqueLatestTurns.add(testCase.question.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim());
  if (testCase.trainingUse !== "prohibited") errors.push(`${label}: runtime/training exclusion is missing`);
  languageCounts[testCase.language] = (languageCounts[testCase.language] ?? 0) + 1;
  domainCounts[testCase.domain] = (domainCounts[testCase.domain] ?? 0) + 1;

  if (testCase.expected.kind === "official_course_catalog_fact") {
    coveredCourseCodes.add(testCase.expected.courseCode);
    const source = courses.get(testCase.expected.courseCode);
    if (!source) errors.push(`${label}: unknown course ${testCase.expected.courseCode}`);
    else {
      for (const key of ["title", "creditHours", "prerequisiteText", "corequisiteText", "preCorequisiteText"]) {
        if ((source[key] ?? null) !== (testCase.expected[key] ?? null)) errors.push(`${label}: stale/mismatched course ${key}`);
      }
      if (source.source?.url !== testCase.expected.sourceUrl) errors.push(`${label}: course source URL mismatch`);
    }
  } else if (testCase.expected.kind === "official_curriculum_snapshot_fact") {
    coveredCurriculumIds.add(testCase.expected.curriculumVersionId);
    const record = curricula.get(testCase.expected.curriculumVersionId);
    if (!record) errors.push(`${label}: unknown curriculum version ${testCase.expected.curriculumVersionId}`);
    else if (record.program.id !== testCase.expected.programId || record.version.version !== testCase.expected.version) {
      errors.push(`${label}: curriculum identity mismatch`);
    }
  } else if (testCase.expected.kind === "existing_route_fixture_expectation") {
    const seed = fixtureById.get(testCase.expected.seedFixture);
    if (!seed) errors.push(`${label}: unknown route fixture ${testCase.expected.seedFixture}`);
    else if (seed.expectedAnswerId !== testCase.expected.expectedAnswerId) errors.push(`${label}: answer expectation differs from source fixture`);
  } else if (testCase.expected.kind === "official_service_workflow_route") {
    coveredGuideIds.add(testCase.expected.guideId);
    const guide = guides.get(testCase.expected.guideId);
    if (!guide) errors.push(`${label}: unknown service guide ${testCase.expected.guideId}`);
    else if (guide.officialUrl !== testCase.expected.officialUrl || guide.steps?.length !== testCase.expected.minimumStepCount) {
      errors.push(`${label}: service guide expectation differs from the structured guide`);
    }
  } else errors.push(`${label}: unknown expectation kind`);
}

if (corpus.length !== manifest.caseCount || corpus.length !== 10000) errors.push(`case count mismatch: corpus=${corpus.length}, manifest=${manifest.caseCount}`);
if (uniqueInteractions.size !== 10000 || manifest.uniqueInteractionCount !== 10000) errors.push(`unique interaction count mismatch: ${uniqueInteractions.size}`);
for (const [language, expected] of Object.entries({ en: 4000, ar: 4000, hi: 500, ur: 500, fr: 500, es: 500 })) {
  if (languageCounts[language] !== expected) errors.push(`${language} count mismatch: got ${languageCounts[language] ?? 0}, expected ${expected}`);
}
if (Object.keys(domainCounts).length < 30) errors.push(`domain coverage unexpectedly narrow: ${Object.keys(domainCounts).length}`);
for (const code of courses.keys()) if (!coveredCourseCodes.has(code)) errors.push(`catalog course has no evaluation case: ${code}`);
for (const id of curricula.keys()) if (!coveredCurriculumIds.has(id)) errors.push(`curriculum version has no evaluation case: ${id}`);
for (const id of guides.keys()) if (!coveredGuideIds.has(id)) errors.push(`service guide has no workflow evaluation case: ${id}`);

if (errors.length) {
  console.error(`Scale corpus validation failed (${errors.length} issue(s)).`);
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`- ... ${errors.length - 50} more`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    valid: true,
    cases: corpus.length,
    uniqueInteractions: uniqueInteractions.size,
    uniqueLatestTurns: uniqueLatestTurns.size,
    languageCounts,
    domainCount: Object.keys(domainCounts).length,
    domainCounts,
    machineVerifiedSourceLinks: courses.size,
    coveredCourseCodes: coveredCourseCodes.size,
    curriculumVersions: curricula.size,
    coveredCurriculumVersions: coveredCurriculumIds.size,
    serviceGuides: guides.size,
    coveredServiceGuides: coveredGuideIds.size,
    warnings: manifest.limitations,
  }, null, 2));
}
