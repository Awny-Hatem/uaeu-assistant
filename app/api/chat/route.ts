import { NextResponse } from "next/server";
import { faqAnswer, matchFaq } from "@/lib/faq";
import { lexicalRetrieve } from "@/lib/knowledge-files";
import { resolveLocale } from "@/lib/language";
import { chatModel, embeddingModel, getGemini } from "@/lib/gemini";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { loadEmbeddingChunks, vectorRetrieve } from "@/lib/vector-rag";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import db from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = { role: ChatRole; content: string };

function lastUserMessage(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i].content;
  }
  return null;
}

function trimHistory(messages: ChatMessage[], max: number): ChatMessage[] {
  if (messages.length <= max) return messages;
  return messages.slice(messages.length - max);
}

function buildContextBlock(
  rows: { text: string; source: string; score?: number }[],
  userContext?: { studentType?: string; major?: string }
): string {
  let ctx = "";
  if (userContext && (userContext.studentType || userContext.major)) {
    ctx += "USER PROFILE CONTEXT:\n";
    if (userContext.studentType) ctx += `- Type: ${userContext.studentType}\n`;
    if (userContext.major) ctx += `- Major: ${userContext.major}\n`;
    ctx += "\n";
  }

  if (!rows.length) {
    ctx += "LOCAL CONTEXT:\n(no excerpts retrieved)";
    return ctx;
  }
  ctx += "LOCAL CONTEXT:\n" + rows
    .map((r, i) => {
      const src = r.source || "unknown";
      return `--- Excerpt ${i + 1} (source file: ${src}) ---\n${r.text}`;
    })
    .join("\n\n");
  return ctx;
}

// Log unanswered queries for future FAQ growth
function logUnansweredQuery(query: string) {
  try {
    const logPath = path.join(process.cwd(), "data", "unanswered.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${query}\n`);
  } catch (e) {
    console.warn("Failed to log unanswered query", e);
  }
}

// Log every single incoming query to simulate a comprehensive master database tracking system
function logMasterQueryDatabase(query: string, context: any) {
  try {
    const logPath = path.join(process.cwd(), "data", "master_query_database.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] [${context?.studentType || "Visitor"}] ${query}\n`);
  } catch (e) {
    console.warn("Failed to log to master database", e);
  }
}

// Helper: get logged-in userId from session cookie
async function getUserIdFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("chat_session")?.value;
    if (!token) return null;
    const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?").get(token, Date.now()) as any;
    return session?.user_id ?? null;
  } catch {
    return null;
  }
}

// Persist a single message to the database for a user
function saveMessage(userId: string, role: string, content: string, source?: string) {
  try {
    const msgId = crypto.randomUUID();
    db.prepare(`INSERT INTO messages (id, user_id, role, content, source, timestamp) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(msgId, userId, role, content, source ?? null, Date.now());
  } catch (e) {
    console.warn("Failed to save message to DB:", e);
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = (body as { messages?: ChatMessage[] }).messages;
  const localePref = (body as { locale?: "auto" | "ar" | "en" }).locale ?? "auto";
  const userContext = (body as { userContext?: any }).userContext;
  const userId = await getUserIdFromCookie();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages[] is required." }, { status: 400 });
  }

  const sanitized: ChatMessage[] = messages
    .filter(
      (m): m is ChatMessage =>
        m != null &&
        (m.role === "user" || m.role === "assistant" || m.role === "system") &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length <= 12000,
    )
    .map((m) => ({ role: m.role, content: m.content }));

  if (!sanitized.length) {
    return NextResponse.json({ error: "No valid messages." }, { status: 400 });
  }

  const latest = lastUserMessage(sanitized);
  if (!latest) {
    return NextResponse.json({ error: "A user message is required." }, { status: 400 });
  }

  // Save the query to the master database for analytics
  logMasterQueryDatabase(latest, userContext);

  // Persist user message to personal history DB
  if (userId) {
    saveMessage(userId, "user", latest);
  }

  const locale = resolveLocale(latest, localePref);

  // 1. First Layer: FAQ Cache
  const faqHit = matchFaq(latest);
  if (faqHit && !userContext) {
    const faqContent = faqAnswer(faqHit.entry, locale);
    if (userId) saveMessage(userId, "assistant", faqContent, "faq");
    return NextResponse.json({
      role: "assistant" as const,
      content: faqContent,
      source: "faq" as const,
      faqId: faqHit.entry.id,
      stateLabel: "cache"
    });
  }

  const gemini = getGemini();
  if (!gemini) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  // 2. Second Layer: Internal Official Sources RAG
  let retrieved: { text: string; source: string; score: number }[] = [];
  try {
    if (loadEmbeddingChunks()?.length) {
      retrieved = await vectorRetrieve(gemini, embeddingModel(), latest, 5);
    }
    
    if (!retrieved.length) {
      retrieved = lexicalRetrieve(latest, 5).map((r) => ({
        text: r.text,
        source: r.source,
        score: r.score,
      }));
    }
  } catch (e) {
    console.warn("Vector retrieval error:", e);
  }

  // Determine if we need Live Web Search
  const isMissingData = retrieved.length === 0;
  
  if (isMissingData) {
    logUnansweredQuery(latest);
  }

  const context = buildContextBlock(retrieved, userContext);
  const system = `${SYSTEM_PROMPT}\n${context}`;
  const history = trimHistory(sanitized, 24);

  try {
    const formattedMessages = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // 3. Conditional Search Grounding
    // Only query Google if the internal database returned 0 results.
    const tools = isMissingData ? [{ googleSearch: {} }] : undefined;

    const response = await gemini.models.generateContent({
      model: chatModel(),
      contents: formattedMessages,
      config: {
        systemInstruction: system,
        tools: tools as any,
        temperature: 0.2,
      },
    });

    const text = response.text;
    
    // Check for escalation tag (Double-check verification trigger)
    if (text && text.includes("[ESCALATE]")) {
      const escalatedContent = text.replace("[ESCALATE]", "").trim();
      if (userId) saveMessage(userId, "assistant", escalatedContent, "escalated");
      return NextResponse.json({
        role: "assistant" as const,
        content: escalatedContent,
        source: "escalated" as const,
        stateLabel: "escalation"
      });
    }

    if (!text) {
      return NextResponse.json(
        {
          role: "assistant" as const,
          content: "Something went wrong while retrieving the information. Let me try again or connect you to support.",
          source: "error" as const,
        },
        { status: 200 },
      );
    }

    const finalSource = isMissingData ? "web" : "rag";
    if (userId) saveMessage(userId, "assistant", text, finalSource);
    return NextResponse.json({
      role: "assistant" as const,
      content: text,
      source: finalSource,
      stateLabel: isMissingData ? "web_search" : "local_db"
    });
  } catch (e) {
    console.error("Gemini Generation Error:", e);
    return NextResponse.json(
      {
        role: "assistant" as const,
        content: "Something went wrong while retrieving the information. Let me try again or connect you to support.",
        source: "error" as const,
      },
      { status: 200 },
    );
  }
}
