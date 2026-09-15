import { providerHealthSnapshot } from "@/lib/ai-provider";
import { loadServiceGuides } from "@/lib/service-guides";
import { loadKnowledgeMarkdown } from "@/lib/knowledge-files";
import { jsonNoStore } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  const provider = providerHealthSnapshot();
  const knowledgeFiles = loadKnowledgeMarkdown();
  const serviceGuides = loadServiceGuides();

  return jsonNoStore({
    ok: provider.provider !== "none",
    provider: {
      name: provider.provider,
      configured: provider.provider !== "none",
      model: provider.model,
    },
    knowledge: {
      markdownFiles: knowledgeFiles.length,
      serviceGuides: serviceGuides.length,
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
