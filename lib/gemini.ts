import { GoogleGenAI } from "@google/genai";

function providerTimeoutMs(): number {
  const configured = Number.parseInt(process.env.AI_PROVIDER_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(configured)
    ? Math.min(120_000, Math.max(1_000, configured))
    : 20_000;
}

export function getGemini(): GoogleGenAI | null {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { timeout: providerTimeoutMs(), headers: {} },
    });
  }
  return null;
}

export function chatModel(): string {
  return process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-2.5-flash";
}

export function embeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";
}
