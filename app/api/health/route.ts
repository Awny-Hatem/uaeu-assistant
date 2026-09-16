import { providerHealthSnapshot } from "@/lib/ai-provider";
import { faqHealthSnapshot, loadFaqEntries } from "@/lib/faq";
import { embeddingModel } from "@/lib/gemini";
import { loadServiceGuides } from "@/lib/service-guides";
import { knowledgeFingerprint, loadKnowledgeMarkdown } from "@/lib/knowledge-files";
import { jsonNoStore } from "@/lib/request-security";
import { authCookieSecretConfigured } from "@/lib/session-cookie";
import { loadEmbeddingChunks } from "@/lib/vector-rag";

export const runtime = "nodejs";

export async function GET() {
  const provider = providerHealthSnapshot();
  const knowledgeFiles = loadKnowledgeMarkdown();
  const serviceGuides = loadServiceGuides();
  const verifiedAnswers = loadFaqEntries();
  const answerPacks = faqHealthSnapshot();
  const embeddings = loadEmbeddingChunks(embeddingModel());
  const authConfigured = authCookieSecretConfigured();
  const coreKnowledgeReady =
    answerPacks.complete && knowledgeFiles.length >= 7 && serviceGuides.length >= 1;

  return jsonNoStore({
    ok: coreKnowledgeReady && authConfigured,
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
      approvedMarkdownFiles: knowledgeFiles.length,
      verifiedAnswers: verifiedAnswers.length,
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
    },
  });
}
