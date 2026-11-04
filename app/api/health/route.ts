import { hybridHealthSnapshot } from "@/lib/hybrid-rag";
import { providerHealthSnapshot } from "@/lib/ai-provider";
import { faqHealthSnapshot, loadFaqEntries } from "@/lib/faq";
import { embeddingModel } from "@/lib/gemini";
import { loadServiceGuides } from "@/lib/service-guides";
import { knowledgeFingerprint, loadKnowledgeMarkdown } from "@/lib/knowledge-files";
import { jsonNoStore } from "@/lib/request-security";
import { authCookieSecretConfigured } from "@/lib/session-cookie";
import { loadEmbeddingChunks } from "@/lib/vector-rag";
import { runtimeContract } from "@/lib/runtime-contract";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

export async function GET() {
  const provider = providerHealthSnapshot();
  const knowledgeFiles = loadKnowledgeMarkdown();
  const serviceGuides = loadServiceGuides();
  const verifiedAnswers = loadFaqEntries();
  const answerPacks = faqHealthSnapshot();
  const corpus = hybridHealthSnapshot();
  const embeddings = loadEmbeddingChunks(embeddingModel());
  const authConfigured = authCookieSecretConfigured();
  const contract = runtimeContract();
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
  const ready = coreKnowledgeReady && authConfigured && generationReady && contract.allowed;
  return jsonNoStore({
    ok: ready,
    live: true,
    build: { revision },
    readiness: { knowledge: coreKnowledgeReady, accounts: authConfigured, generation: generationReady, configuration: contract.allowed },
    deployment: contract,
    provider: {
      name: provider.provider,
      configured: provider.provider !== "none",
      model: provider.model,
      crossProviderFallback: provider.crossProviderFallback,
    },
    auth: {
      encryptedCookies: true,
      dedicatedSecretConfigured: authConfigured,
    },
    knowledge: {
      contentFingerprint,
      retrieval: {
        primary: "scoped-academic-retrieval-and-source-checked-generation",
        curriculumExtract: "bilingual-program-degree-year-and-facet-planning-from-approved-markdown",
        embedding: corpus.vectors > 0 ? "ready-openai-hybrid" : !embeddingOptIn ? "disabled" : embeddingAvailable ? "ready" : "unavailable",
        semanticCatalog: semanticCatalogEnabled ? "enabled-same-configured-provider-closed-record-ids" : "disabled-no-live-provider",
        canonicalRendering: "prepared answers, workflow evidence and retrieved excerpts feed tailored source-checked generation; structured checklist UI and system notices remain deterministic",
        generationEvidence: "source-specific-reviewed-summaries-and-provenance-linked-official-excerpts; unmapped-multisource-references-excluded",
        groundingChecks: "source-id-and-critical-token-validation plus same-provider per-claim source-support review; up to two checked rewrites; not-formal-entailment-proof",
        groundingIsolation: { claimsPerRequest: 1, concurrency: 4, maxClaims: 16, totalAnswerBudgetMs: 54000, routeMaxDurationSeconds: 60 },
        activePath: "scoped-academic-then-hybrid-or-reviewed-evidence-and-grounded-generation",
      },
      hybridCorpus: corpus,
      approvedMarkdownFiles: knowledgeFiles.length,
      verifiedAnswers: verifiedAnswers.length,
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
