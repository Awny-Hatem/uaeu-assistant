import type { MemoryTurn } from "@/lib/memory/store";

type Message = { role: string; content: string };

/**
 * Decide which conversation the answer pipeline sees.
 * - Stored server turns exist: they replace the client's history entirely and
 *   only the client's newest user message is appended, so a browser cannot
 *   rewrite or forge earlier turns.
 * - No stored turns yet: the client's own history is accepted once (older
 *   clients and evaluation runners send it). That seed is never stored.
 */
export function serverConversation<T extends Message>(client: T[], stored: MemoryTurn[], max: number): { messages: Message[]; usedServerTurns: boolean; seededFromClient: boolean } {
  const latest = client.at(-1);
  if (!latest || latest.role !== "user") return { messages: client, usedServerTurns: false, seededFromClient: false };
  if (stored.length) return { messages: [...stored, { role: "user", content: latest.content }].slice(-max), usedServerTurns: true, seededFromClient: false };
  return { messages: client, usedServerTurns: false, seededFromClient: client.length > 1 };
}
