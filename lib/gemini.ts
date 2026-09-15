import { GoogleGenAI } from "@google/genai";

export function getGemini(): GoogleGenAI | null {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return new GoogleGenAI({ apiKey: geminiKey });
  }
  return null;
}

export function chatModel(): string {
  return process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-2.5-flash";
}

export function embeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";
}
