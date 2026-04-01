/**
 * Build data/embeddings.json from data/knowledge/*.md
 * Requires GEMINI_API_KEY (e.g. in .env.local).
 */
import fs from "fs";
import path from "path";
import { embedQuery } from "../lib/vector-rag";
import { loadKnowledgeMarkdown, splitIntoSections } from "../lib/knowledge-files";
import { embeddingModel, getGemini } from "../lib/gemini";

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

function chunkText(text: string, maxChars: number): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= maxChars) return [t];
  const paras = t.split(/\n\n+/);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    const next = buf ? `${buf}\n\n${p}` : p;
    if (next.length <= maxChars) {
      buf = next;
    } else {
      if (buf) out.push(buf);
      if (p.length <= maxChars) {
        buf = p;
      } else {
        for (let i = 0; i < p.length; i += maxChars) {
          out.push(p.slice(i, i + maxChars));
        }
        buf = "";
      }
    }
  }
  if (buf) out.push(buf);
  return out;
}

async function main() {
  const client = getGemini();
  if (!client) {
    console.error("Missing GEMINI_API_KEY in .env.local.");
    process.exit(1);
  }
  const model = embeddingModel();
  const docs = loadKnowledgeMarkdown();
  if (!docs.length) {
    console.error("No markdown files found in data/knowledge.");
    process.exit(1);
  }

  type Row = {
    id: string;
    source: string;
    text: string;
    embedding: number[];
  };

  const rows: Row[] = [];
  let n = 0;

  for (const { filename, content } of docs) {
    const sections = splitIntoSections(content);
    const pieces =
      sections.length > 0
        ? sections.flatMap((s) => chunkText(s, 900))
        : chunkText(content, 900);

    for (const text of pieces) {
      const id = `${filename}#${n++}`;
      const embedding = await embedQuery(client, model, text);
      rows.push({ id, source: filename, text, embedding });
      process.stdout.write(".");
    }
  }

  const outPath = path.join(process.cwd(), "data", "embeddings.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ chunks: rows }));
  console.log(`\nWrote ${rows.length} chunks to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
