import { hybridHealthSnapshot } from "@/lib/hybrid-rag";
import { providerHealthSnapshot } from "@/lib/ai-provider";
import { faqHealthSnapshot, loadFaqEntries } from "@/lib/faq";
import { embeddingModel } from "@/lib/gemini";
import { loadServiceGuides } from "@/lib/service-guides";
import { knowledgeFingerprint, loadKnowledgeMarkdown } from "@/lib/knowledge-files";
import { jsonNoStore } from "@/lib/request-security";
import { authCookieSecretConfigured as jwtAuthConfigured } from "@/lib/session-cookie";
import { storeIsDurable } from "@/lib/store/client";
import { memoryEnabled, memoryTtlMs } from "@/lib/memory/store";
import { loadEmbeddingChunks } from "@/lib/vector-rag";
import { runtimeContract } from "@/lib/runtime-contract";
import { sourceCoverageSnapshot } from "@/lib/source-registry";
import { createHash } from "node:crypto";
import { isV3Enabled } from "@/lib/v3/runtime";
import { loadUndergraduateProgramCatalog } from "@/lib/academic/undergraduate-program-catalog";
import { listAcademicPrograms } from "@/lib/academic/program-curricula";
import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";

export const runtime = "nodejs";

export async function GET() {
  const provider = providerHealthSnapshot();
  const knowledgeFiles = loadKnowledgeMarkdown();
  const serviceGuides = loadServiceGuides();
  const verifiedAnswers = loadFaqEntries();
  const answerPacks = faqHealthSnapshot();
  const corpus = hybridHealthSnapshot();
  const embeddings = loadEmbeddingChunks(embeddingModel());
  const authConfigured = jwtAuthConfigured();
  const contract = runtimeContract();
  const v3Enabled = isV3Enabled();
  const sourceCoverage = sourceCoverageSnapshot();
  const programCatalog = loadUndergraduateProgramCatalog();
  const curriculumVersions = listAcademicPrograms().flatMap((program) => program.curriculumVersions);
  const explicitlyUnresolvedCohortMappings = curriculumVersions.filter((version) => version.cohortMapping === "unresolved").length;
  const explicitlyVerifiedCohortMappings = curriculumVersions.filter((version) => version.cohortMapping === "verified").length;
  const versionsWithoutApplicabilityReview = curriculumVersions.filter((version) => !version.cohortMapping).length;
  const courseCatalog = loadOfficialCourseCatalog();
  const relationCourses = courseCatalog?.courses.filter((course) => course.prerequisiteItems.length || course.corequisiteItems.length || course.preCorequisiteItems.length) ?? [];
  const structuredRelationCount = relationCourses.filter((course) => parseCatalogPrerequisiteExpression(course)).length;
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
    corpus: corpus.fingerprint, markdown: knowledgeFingerprint(), answers: verifiedAnswers, guides: serviceGuides,
  })).digest("hex");
  const revision = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.CHATBOT_BUILD_REVISION || "unknown").trim().slice(0, 80);
  const productionArchitectureReady = contract.mode !== "production" || v3Enabled;
  const readinessBlockers = [
    ...(contract.mode !== "production" ? ["Deployment mode is prototype"] : []),
    ...contract.productionBlockers,
    ...(!coreKnowledgeReady ? ["Reviewed knowledge pack is incomplete or stale"] : []),
    ...(!authConfigured ? ["Authentication cookie secret is not configured"] : []),
    ...(!generationReady ? ["AI answer provider is not configured"] : []),
    ...(!productionArchitectureReady ? ["Production chat requires V3 evidence-first architecture"] : []),
  ];
  const productionReady = contract.productionReady && coreKnowledgeReady && authConfigured && generationReady && productionArchitectureReady;
  const ready = contract.mode === "production" ? productionReady : coreKnowledgeReady && authConfigured && generationReady && contract.allowed;
  return jsonNoStore({
    ok: ready,
    live: true,
    build: { revision },
    agent: { architecture: v3Enabled ? "v3-evidence-first" : "legacy", v3Enabled, legacySelectorBypassedForUniversityModes: v3Enabled },
    readiness: { knowledge: coreKnowledgeReady, accounts: authConfigured, generation: generationReady, configuration: contract.allowed },
    deployment: { ...contract, productionReady, productionBlockers: readinessBlockers },
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
      cohortApplicability: {
        curriculumVersions: curriculumVersions.length,
        explicitlyUnresolvedMappings: explicitlyUnresolvedCohortMappings,
        explicitlyVerifiedMappings: explicitlyVerifiedCohortMappings,
        versionsWithoutApplicabilityReview,
      },
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
      prerequisiteParsing: {
        relationRecords: relationCourses.length,
        structuredRecords: structuredRelationCount,
        unsupportedRecords: relationCourses.length - structuredRelationCount,
        structuredCoveragePercent: relationCourses.length ? Math.round((structuredRelationCount / relationCourses.length) * 1000) / 10 : 0,
      },
      degreeApplicability: "course records do not establish program requirements",
    },
    auth: {
      scheme: "jwt-access-plus-rotating-refresh",
      secretConfigured: authConfigured,
    },
    memory: {
      enabled: memoryEnabled(),
      ttlHours: memoryTtlMs() / 3_600_000,
      durableStore: storeIsDurable(),
    },
    knowledge: {
      contentFingerprint,
      retrieval: {
        primary: v3Enabled ? "v3-scoped-evidence-retrieval-and-controlled-official-research" : semanticCatalogEnabled ? "scoped-canonical-answers-with-closed-catalog-semantic-selection" : "lexical-approved-documents-and-verified-answers",
        curriculumExtract: "approved-curriculum-markdown-sections-for-matched-english-questions",
        // OpenAI vectors for the official corpus (knowledge expansion) when present.
        embedding: corpus.vectors > 0 ? "ready-openai-hybrid" : !embeddingOptIn ? "disabled" : embeddingAvailable ? "ready" : "unavailable",
        semanticCatalog: v3Enabled ? "disabled-v3-evidence-first" : semanticCatalogEnabled ? "enabled-same-configured-provider-closed-record-ids" : "disabled-no-live-provider",
        canonicalRendering: "approved-localized-answer-text-unchanged; primary-records-only; record-level-citation-bundles",
        generationEvidence: "source-specific-reviewed-summaries; unmapped-multisource-references-excluded",
        groundingChecks: "source-id-and-critical-token-validation plus same-provider per-claim source-support review; one rewrite; not-formal-entailment-proof",
        groundingIsolation: { claimsPerRequest: 1, concurrency: 4, maxClaims: 16, totalAnswerBudgetMs: 54000, routeMaxDurationSeconds: 60 },
        activePath: v3Enabled ? "v3-orchestrator-evidence-research-verified-generation" : semanticCatalogEnabled ? "curriculum-extract-then-canonical-selection-and-guarded-generation-fallback" : "curriculum-extract-then-reviewed-answers-then-scoped-academic-and-hybrid-corpus-grounded-generation",
      },
      hybridCorpus: corpus,
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
      serverChatHistory: contract.serverChatHistory,
      rawQueryLogs: "disabled",
      serverHistoryRetentionDays: 30,
      serverHistoryMaxMessages: 80,
    },
  }, { status: ready ? 200 : 503 });
}
