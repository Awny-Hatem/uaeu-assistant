import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { sourceSnapshotHash } from "./evaluation-integrity.mjs";

const runPath = path.resolve(process.argv[2] ?? "");
if (!process.argv[2] || !runPath.endsWith(".jsonl")) {
  throw new Error("Usage: node scripts/build-v3-review-source-evidence.mjs COMPLETE_CAPTURE.jsonl");
}

const runBytes = fs.readFileSync(runPath);
const runSha256 = crypto.createHash("sha256").update(runBytes).digest("hex");
const manifestPath = runPath.replace(/\.jsonl$/u, ".manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.status !== "complete" || manifest.expectedCount !== manifest.completedCount || manifest.runSha256 !== runSha256) {
  throw new Error("Source evidence requires a complete capture whose manifest hash matches the saved answer file.");
}
if (manifest.localSourceUnchanged !== true || manifest.runIntegrityIssues?.length) {
  throw new Error("Capture integrity or source-snapshot checks failed; do not attach evidence to this run.");
}
const currentSourceSha256 = sourceSnapshotHash(process.cwd());
if (currentSourceSha256 !== manifest.localSourceSha256) {
  throw new Error("The local app/data snapshot differs from the snapshot used for this capture.");
}

const rows = runBytes.toString("utf8").trim().split(/\r?\n/u).map((line, index) => {
  try { return JSON.parse(line); }
  catch { throw new Error(`Invalid capture JSONL at line ${index + 1}.`); }
});
if (rows.length !== manifest.expectedCount || new Set(rows.map(({ id }) => id)).size !== rows.length) {
  throw new Error("Capture response count or unique ID check failed.");
}

const readJson = (filename) => JSON.parse(fs.readFileSync(path.resolve(filename), "utf8"));
const catalog = readJson("data/academic/course-catalog.json");
const programs = readJson("data/academic/program-curricula.json");
const guides = fs.readdirSync(path.resolve("data/service-guides"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => readJson(path.join("data/service-guides", entry.name)));
const knowledgeDocuments = fs.readdirSync(path.resolve("data/knowledge"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => ({ id: entry.name, text: fs.readFileSync(path.resolve("data/knowledge", entry.name), "utf8") }));
const answerEntries = [
  ...readJson("data/verified-answers/academic.json").entries,
  ...readJson("data/verified-answers/student-services.json").entries,
];
function sourceUrlKey(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "coreservices.uaeu.ac.ae" && url.pathname.toLowerCase() === "/calendar/calendar") {
      return `${url.origin}${url.pathname}`;
    }
    return url.href;
  } catch { return value; }
}
const coursesByCode = new Map(catalog.courses.map((course) => [course.code, course]));
const programsById = new Map(programs.map((program) => [program.id, program]));
const guidesById = new Map(guides.map((guide) => [guide.id, guide]));
const answersById = new Map(answerEntries.map((entry) => [entry.id, entry]));
const citationEvidenceByUrl = new Map();
for (const entry of answerEntries) {
  for (const citation of entry.citations ?? []) {
    if (!citation.url || !citation.evidenceText) continue;
    const key = sourceUrlKey(citation.url);
    const evidence = citationEvidenceByUrl.get(key) ?? [];
    if (!evidence.some((item) => item.evidenceText === citation.evidenceText)) {
      evidence.push({ title: citation.title, url: citation.url, lastVerified: citation.lastVerified, evidenceText: citation.evidenceText, answerId: entry.id });
    }
    citationEvidenceByUrl.set(key, evidence);
  }
}

function sourceTextFor(row) {
  const expected = row.expected ?? row.expectation ?? {};
  if (expected.kind === "official_course_catalog_fact") {
    const course = coursesByCode.get(expected.courseCode);
    if (!course || (course.source?.url && course.source.url !== expected.sourceUrl)) return null;
    return {
      evidenceType: "official-course-catalog-snapshot-record",
      sourceUrls: [course.source?.url ?? expected.sourceUrl ?? catalog.sourceIndex],
      lastVerified: course.source?.verifiedAt ?? catalog.verifiedAt,
      record: {
        code: course.code,
        title: course.title,
        creditHours: course.creditHours,
        description: course.description,
        prerequisiteText: course.prerequisiteText ?? null,
        corequisiteText: course.corequisiteText ?? null,
        preCorequisiteText: course.preCorequisiteText ?? null,
        prerequisiteItems: course.prerequisiteItems ?? [],
        corequisiteItems: course.corequisiteItems ?? [],
      },
    };
  }
  if (expected.kind === "official_curriculum_snapshot_fact") {
    const program = programsById.get(expected.programId);
    const version = program?.curriculumVersions?.find((item) => item.id === expected.curriculumVersionId);
    if (!program || !version) return null;
    return {
      evidenceType: "official-curriculum-source-snapshot-record",
      sourceUrls: expected.sources?.map((source) => source.url) ?? program.sources.map((source) => source.url),
      lastVerified: expected.sources?.map((source) => source.lastVerified) ?? program.sources.map((source) => source.lastVerified),
      record: {
        program: program.name,
        degreeLevel: program.degreeLevel,
        college: program.college,
        version: version.version,
        cohortLabel: version.cohortLabel,
        effectiveFrom: version.effectiveFrom,
        effectiveTo: version.effectiveTo ?? null,
        cohortMapping: version.cohortMapping ?? "not marked unresolved",
        totalCredits: version.totalCredits,
        creditBuckets: version.creditBuckets ?? null,
        requirements: expected.factType === "programIdentity" ? undefined : version.requirements,
        limitations: version.limitations,
        requestedFactType: expected.factType,
      },
    };
  }
  if (expected.kind === "official_service_workflow_route") {
    const guide = guidesById.get(expected.guideId);
    if (!guide || guide.officialUrl !== expected.officialUrl) return null;
    return {
      evidenceType: "official-service-guide-source-snapshot",
      sourceUrls: [guide.officialUrl],
      lastVerified: guide.lastVerified,
      record: {
        title: guide.title,
        description: guide.description,
        audience: guide.audience,
        steps: guide.steps,
      },
    };
  }
  if (expected.kind === "existing_route_fixture_expectation") {
    const entry = answersById.get(expected.expectedAnswerId);
    if (!entry) return null;
    const citations = (entry.citations ?? []).map(({ title, url, lastVerified, evidenceText }) => ({ title, url, lastVerified, evidenceText }))
      .filter((citation) => citation.evidenceText);
    if (citations.length) {
      return {
        evidenceType: "curated-answer-citation-evidence-snapshot",
        sourceUrls: citations.map((citation) => citation.url),
        lastVerified: citations.map((citation) => citation.lastVerified),
        record: { answerId: entry.id, disposition: entry.disposition, citations },
      };
    }
    const citedUrls = (entry.citations ?? []).map((citation) => citation.url).filter((url) => typeof url === "string");
    const relatedEvidence = citedUrls.flatMap((url) => citationEvidenceByUrl.get(sourceUrlKey(url)) ?? []);
    const uniqueRelatedEvidence = [...new Map(relatedEvidence.map((citation) => [citation.evidenceText, citation])).values()];
    if (uniqueRelatedEvidence.length) {
      return {
        evidenceType: "shared-curated-citation-source-evidence",
        sourceUrls: uniqueRelatedEvidence.map((citation) => citation.url),
        lastVerified: uniqueRelatedEvidence.map((citation) => citation.lastVerified),
        record: { answerId: entry.id, relatedAnswerCitationExcerpts: uniqueRelatedEvidence.slice(0, 5) },
      };
    }
    const citedUrlKeys = citedUrls.map(sourceUrlKey);
    const documents = knowledgeDocuments.filter((document) => citedUrlKeys.some((url) => document.text.split(/\r?\n/u).some((line) => line.includes(url) || (url.includes("/Calendar/Calendar") && line.includes("https://coreservices.uaeu.ac.ae/Calendar/Calendar")))))
      .map(({ id, text }) => ({ id, text }));
    const linkedGuides = guides.filter((guide) => citedUrlKeys.includes(sourceUrlKey(guide.officialUrl)))
      .map((guide) => ({ id: guide.id, title: guide.title, officialUrl: guide.officialUrl, lastVerified: guide.lastVerified, steps: guide.steps }));
    if (!documents.length && !linkedGuides.length) return null;
    return {
      evidenceType: "curated-official-source-summary-snapshot",
      sourceUrls: citedUrls,
      lastVerified: entry.citations?.map((citation) => citation.lastVerified) ?? [],
      record: { answerId: entry.id, documents, guides: linkedGuides },
    };
  }
  return null;
}

const outputPath = runPath.replace(/\.jsonl$/u, ".source-evidence.jsonl");
const outputManifestPath = runPath.replace(/\.jsonl$/u, ".source-evidence.manifest.json");
if (fs.existsSync(outputPath) || fs.existsSync(outputManifestPath)) {
  throw new Error("Refusing to replace an existing source-evidence sidecar.");
}
const counts = {};
let withEvidence = 0;
const lines = rows.map((row) => {
  const evidence = sourceTextFor(row);
  const key = row.expected?.kind ?? row.expectation?.kind ?? "unknown";
  counts[key] = counts[key] ?? { total: 0, mapped: 0 };
  counts[key].total += 1;
  if (evidence) {
    counts[key].mapped += 1;
    withEvidence += 1;
  }
  const sourceText = evidence ? JSON.stringify(evidence, null, 2) : "";
  return JSON.stringify({
    id: row.id,
    evidenceType: evidence?.evidenceType ?? "unmapped",
    sourceUrls: evidence?.sourceUrls ?? [],
    lastVerified: evidence?.lastVerified ?? null,
    sourceText: sourceText.length > 10_000 ? `${sourceText.slice(0, 10_000)}\n[Source snapshot text truncated for review prompt size.]` : sourceText,
  });
});
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, { flag: "wx" });
const sidecarBytes = fs.readFileSync(outputPath);
const outputManifest = {
  schemaVersion: 1,
  runFile: path.basename(runPath),
  runSha256,
  localSourceSha256: manifest.localSourceSha256,
  sourceEvidenceFile: path.basename(outputPath),
  sourceEvidenceSha256: crypto.createHash("sha256").update(sidecarBytes).digest("hex"),
  count: rows.length,
  withEvidence,
  withoutEvidence: rows.length - withEvidence,
  byExpectationKind: counts,
  generatedAt: new Date().toISOString(),
  limitation: "Evidence is derived from the same versioned local official-source snapshots used by the candidate; it enables consistency review but is not independent live-source verification or institutional approval.",
};
fs.writeFileSync(outputManifestPath, `${JSON.stringify(outputManifest, null, 2)}\n`, { flag: "wx" });
console.log(`Built source evidence for ${withEvidence}/${rows.length} captured answers.`);
console.log(`Sidecar: ${outputPath}`);
console.log(`Manifest: ${outputManifestPath}`);
console.log(JSON.stringify(counts, null, 2));
