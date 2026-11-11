import { providerHealthSnapshot } from "@/lib/ai-provider";
import { faqHealthSnapshot, loadFaqEntries } from "@/lib/faq";
import { embeddingModel } from "@/lib/gemini";
import { loadServiceGuides } from "@/lib/service-guides";
import { knowledgeFingerprint, loadKnowledgeMarkdown } from "@/lib/knowledge-files";
import { jsonNoStore } from "@/lib/request-security";
import { authCookieSecretConfigured } from "@/lib/session-cookie";
import { loadEmbeddingChunks } from "@/lib/vector-rag";
import { runtimeContract } from "@/lib/runtime-contract";
import { sourceCoverageSnapshot } from "@/lib/source-registry";
import { createHash } from "node:crypto";
import { isV3Enabled } from "@/lib/v3/runtime";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";
import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";

export const runtime = "nodejs";

export async function GET() {
  const provider = providerHealthSnapshot();
  const knowledgeFiles = loadKnowledgeMarkdown();
  const serviceGuides = loadServiceGuides();
  const verifiedAnswers = loadFaqEntries();
  const answerPacks = faqHealthSnapshot();
  const embeddings = loadEmbeddingChunks(embeddingModel());
  const authConfigured = authCookieSecretConfigured();
  const contract = runtimeContract();
  const v3Enabled = isV3Enabled();
  const sourceCoverage = sourceCoverageSnapshot();
  const programCatalog = loadUndergraduateProgramCatalog();
  const courseCatalog = loadOfficialCourseCatalog();
  const curriculumCoverage = programCatalog.programs.reduce((counts, program) => {
    counts[program.curriculumStatus] += 1;
    return counts;
  }, { modelled: 0, legacy_model_review_required: 0, not_modelled: 0 });
  const coreKnowledgeReady =
    answerPacks.complete && knowledgeFiles.length >= 7 && serviceGuides.length >= 1;

  const generationReady = provider.provider !== "none";
  const embeddingOptIn = process.env.GEMINI_EMBEDDING_SEARCH?.trim().toLowerCase() === "enabled";
  const embeddingAvailable = embeddingOptIn && provider.geminiConfigured && Boolean(embeddings?.length);
  const semanticCatalogEnabled = provider.provider === "openai" || provider.provider === "gemini";
  const contentFingerprint = createHash("sha256").update(JSON.stringify({
    markdown: knowledgeFingerprint(), answers: verifiedAnswers, guides: serviceGuides,
  })).digest("hex");
  const revision = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.CHATBOT_BUILD_REVISION || "unknown").trim().slice(0, 80);
  const ready = coreKnowledgeReady && authConfigured && generationReady && contract.allowed;
  return jsonNoStore({
    ok: ready,
    live: true,
    build: { revision },
    agent: { architecture: v3Enabled ? "v3-evidence-first" : "legacy", v3Enabled, legacySelectorBypassedForUniversityModes: v3Enabled },
    readiness: { knowledge: coreKnowledgeReady, accounts: authConfigured, generation: generationReady, configuration: contract.allowed },
    deployment: contract,
    provider: {
      name: provider.provider,
      configured: provider.provider !== "none",
      model: provider.model,
      crossProviderFallback: provider.crossProviderFallback,
    },
    academicCatalog: {
      status: "verified-undergraduate-degree-inventory",
      programs: programCatalog.programs.length,
      colleges: new Set(programCatalog.programs.map((program) => program.college)).size,
      verifiedAt: programCatalog.verifiedAt,
      curriculumCoverage,
      curriculumRecordsRequiringIdentityReview: programCatalog.curriculumRecordsRequiringIdentityReview.length,
    },
    courseCatalog: {
      status: courseCatalog ? "official-course-catalog-snapshot" : "not-loaded",
      courses: courseCatalog?.courses.length ?? 0,
      verifiedAt: courseCatalog?.verifiedAt ?? null,
      entriesWithoutDescription: courseCatalog?.courses.filter((course) => !course.description).length ?? 0,
      entriesWithoutCreditValue: courseCatalog?.courses.filter((course) => course.creditHours === null).length ?? 0,
      prerequisiteEntries: courseCatalog?.courses.filter((course) => Boolean(course.prerequisiteText)).length ?? 0,
      corequisiteEntries: courseCatalog?.courses.filter((course) => Boolean(course.corequisiteText)).length ?? 0,
      preCorequisiteEntries: courseCatalog?.courses.filter((course) => Boolean(course.preCorequisiteText)).length ?? 0,
      degreeApplicability: "course records do not establish program requirements",
    },
    auth: {
      encryptedCookies: true,
      dedicatedSecretConfigured: authConfigured,
    },
    knowledge: {
      contentFingerprint,
      retrieval: {
        primary: v3Enabled ? "v3-scoped-evidence-retrieval-and-controlled-official-research" : semanticCatalogEnabled ? "scoped-canonical-answers-with-closed-catalog-semantic-selection" : "lexical-approved-documents-and-verified-answers",
        curriculumExtract: "approved-curriculum-markdown-sections-for-matched-english-questions",
        embedding: !embeddingOptIn ? "disabled" : embeddingAvailable ? "ready" : "unavailable",
        semanticCatalog: v3Enabled ? "disabled-v3-evidence-first" : semanticCatalogEnabled ? "enabled-same-configured-provider-closed-record-ids" : "disabled-no-live-provider",
        canonicalRendering: "approved-localized-answer-text-unchanged; primary-records-only; record-level-citation-bundles",
        generationEvidence: "source-specific-reviewed-summaries; unmapped-multisource-references-excluded",
        groundingChecks: "source-id-and-critical-token-validation plus same-provider per-claim source-support review; one rewrite; not-formal-entailment-proof",
        groundingIsolation: { claimsPerRequest: 1, concurrency: 4, maxClaims: 16, totalAnswerBudgetMs: 54000, routeMaxDurationSeconds: 60 },
        activePath: v3Enabled ? "v3-orchestrator-evidence-research-verified-generation" : semanticCatalogEnabled ? "curriculum-extract-then-canonical-selection-and-guarded-generation-fallback" : embeddingAvailable ? "curriculum-extract-then-lexical-with-optional-embedding-candidates" : "curriculum-extract-then-lexical",
      },
      approvedMarkdownFiles: knowledgeFiles.length,
      verifiedAnswers: verifiedAnswers.length,
      coverage: sourceCoverage,
      sourceEvidence: {
        mappedReferences: verifiedAnswers.flatMap(({ citations }) => citations).filter(({ evidenceText }) => Boolean(evidenceText)).length,
        unmappedMultiSourceReferences: verifiedAnswers.filter(({ citations }) => citations.length > 1).flatMap(({ citations }) => citations).filter(({ evidenceText }) => !evidenceText).length,
        singleSourceFallbackRecords: verifiedAnswers.filter(({ citations }) => citations.length === 1 && !citations[0].evidenceText).length,
      },
      answerPacks,
      serviceGuides: serviceGuides.length,
      embeddingIndex: {
        ready: Boolean(embeddings?.length),
        chunks: embeddings?.length ?? 0,
        model: embeddingModel(),
        sourceFingerprint: knowledgeFingerprint(),
      },
    },
    privacy: {
      serverChatHistory:
        process.env.SERVER_CHAT_HISTORY?.trim().toLowerCase() === "enabled"
          ? "enabled"
          : "disabled",
      rawQueryLogs: "disabled",
      serverHistoryRetentionDays: 30,
      serverHistoryMaxMessages: 80,
    },
  }, { status: ready ? 200 : 503 });
}
