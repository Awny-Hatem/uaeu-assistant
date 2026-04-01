import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const EMB_PATH = path.join(process.cwd(), "data", "embeddings.json");

type StoredChunk = {
  id: string;
  source: string;
  text: string;
  embedding: number[];
};

type EmbeddingFile = { chunks: StoredChunk[] };

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

export function loadEmbeddingChunks(): StoredChunk[] | null {
  if (!fs.existsSync(EMB_PATH)) return null;
  try {
    const raw = fs.readFileSync(EMB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as EmbeddingFile;
    if (!parsed.chunks?.length) return null;
    return parsed.chunks;
  } catch {
    return null;
  }
}

export async function embedQuery(
  client: GoogleGenAI,
  model: string,
  query: string,
): Promise<number[]> {
  const res = await client.models.embedContent({
    model: model,
    contents: query,
  });
  
  const v = res.embeddings?.[0]?.values;
  if (!v) throw new Error("Gemini embedding missing vector");
  return v;
}

export async function vectorRetrieve(
  client: GoogleGenAI,
  embeddingModel: string,
  query: string,
  topK: number,
): Promise<{ text: string; source: string; score: number }[]> {
  const chunks = loadEmbeddingChunks();
  if (!chunks?.length) return [];

  const qv = await embedQuery(client, embeddingModel, query);
  const ranked = chunks
    .map((c) => ({
      text: c.text,
      source: c.source,
      score: cosine(qv, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return ranked.filter((r) => r.score > 0.65);
}
