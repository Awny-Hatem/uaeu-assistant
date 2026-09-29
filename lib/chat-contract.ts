import { GROUNDING_REASON_CODES, type AnswerMetadata, type Citation, type ServiceGuide } from "@/lib/prototype-types";

export const MAX_CHAT_BODY_BYTES = 96 * 1024;
export const MAX_CHAT_MESSAGES = 30;
export const MAX_CHAT_MESSAGE_CHARS = 6000;
const OUTGOING_HISTORY_BYTES = 80 * 1024;

export type ConversationMessage = { role: "user" | "assistant"; content: string };

// Keep the first topic for explicit "the first course" references and recent
// complete exchanges. Leave room for the locale/profile JSON envelope.
export function boundOutgoingMessages(messages: ConversationMessage[]): ConversationMessage[] {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user" || latest.content.length > MAX_CHAT_MESSAGE_CHARS) {
    throw new Error("A question must contain at most 6000 characters.");
  }
  const firstIndex = messages.findIndex((message) => message.role === "user");
  const first = messages[firstIndex];
  if (first === latest) return [{ role: "user", content: latest.content }];
  const tailStart = Math.max(firstIndex + 1, messages.length - MAX_CHAT_MESSAGES + 1);
  const recent = messages.slice(tailStart).map(({ role, content }) => ({
    role,
    content: content.slice(0, MAX_CHAT_MESSAGE_CHARS),
  }));
  if (tailStart > firstIndex + 1) {
    while (recent.length > 1 && recent[0].role === "assistant") recent.shift();
  }
  const result = [{ role: "user" as const, content: first.content.slice(0, MAX_CHAT_MESSAGE_CHARS) }, ...recent];
  const removeOldestExchange = () => {
    const start = 1;
    result.splice(start, 1);
    while (result.length > start + 1 && result[start]?.role === "assistant") result.splice(start, 1);
  };
  while (result.length > 1 && (
    result.length > MAX_CHAT_MESSAGES ||
    new TextEncoder().encode(JSON.stringify(result)).byteLength > OUTGOING_HISTORY_BYTES
  )) removeOldestExchange();
  return result;
}

export function uaeDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function dailyUsage(record: { date?: string; used?: unknown } | undefined, now = new Date()): number {
  return record?.date === uaeDateKey(now) && typeof record.used === "number" && Number.isFinite(record.used)
    ? Math.max(0, Math.floor(record.used)) : 0;
}

export class ConversationOwnership {
  private generation = 0;
  private controllers = new Set<AbortController>();
  invalidate() {
    this.generation += 1;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }
  begin() {
    const generation = this.generation;
    const controller = new AbortController();
    this.controllers.add(controller);
    return {
      signal: controller.signal,
      isCurrent: () => generation === this.generation && !controller.signal.aborted,
      finish: () => this.controllers.delete(controller),
    };
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function citation(value: unknown): Citation | null {
  if (!record(value) || typeof value.title !== "string" ||
    ![value.url, value.document, value.lastVerified].every((item) => item === undefined || typeof item === "string")) return null;
  const result: Citation = { title: value.title.slice(0, 500) };
  for (const key of ["url", "document", "lastVerified"] as const) {
    if (typeof value[key] === "string") result[key] = value[key].slice(0, 2000);
  }
  for (const key of ["evidenceText", "sourceSection", "sourceVersion"] as const) {
    const text = value[key];
    const limit = key === "evidenceText" ? 12000 : 2000;
    // Drop invalid evidence instead of silently truncating a qualification.
    if (typeof text === "string" && text.length <= limit) result[key] = text;
  }
  return result;
}

function guide(value: unknown): value is ServiceGuide {
  const optionalText = (item: Record<string, unknown>, keys: string[]) => keys.every((key) => item[key] === undefined || typeof item[key] === "string");
  return record(value) && typeof value.id === "string" && typeof value.title === "string" &&
    typeof value.officialUrl === "string" && optionalText(value, ["titleAr", "description", "descriptionAr", "verificationNote", "verificationNoteAr"]) &&
    Array.isArray(value.steps) && value.steps.length > 0 &&
    value.steps.length <= 30 && value.steps.every((step) => record(step) &&
      typeof step.title === "string" && typeof step.instruction === "string" &&
      optionalText(step, ["titleAr", "instructionAr", "note", "noteAr", "url"]));
}

export function sanitizeAnswerMetadata(value: unknown): AnswerMetadata {
  if (!record(value)) return {};
  const result: AnswerMetadata = {};
  if (Array.isArray(value.citations)) result.citations = value.citations.slice(0, 20)
    .map(citation).filter((item): item is Citation => item !== null);
  if (guide(value.guide)) result.guide = value.guide;
  if (Array.isArray(value.communications)) result.communications = value.communications.filter((item) =>
    record(item) && typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.description === "string" && typeof item.url === "string").slice(0, 10) as AnswerMetadata["communications"];
  for (const key of ["faqId", "provider", "model", "topic", "clarificationReason"] as const) {
    if (typeof value[key] === "string") result[key] = value[key].slice(0, 200);
  }
  if (Array.isArray(value.evidenceIds)) result.evidenceIds = value.evidenceIds.filter((id): id is string => typeof id === "string").slice(0, 30);
  // Audit metadata is retained whole or omitted. Truncating a claim can remove a
  // material qualification; free-form verifier prose must never be persisted.
  if (Array.isArray(value.claims) && value.claims.length <= 16 && value.claims.every((claim) =>
    record(claim) && typeof claim.text === "string" && claim.text.trim().length > 0 && claim.text.length <= 6000 &&
    Array.isArray(claim.evidenceIds) && claim.evidenceIds.length > 0 && claim.evidenceIds.length <= 16 &&
    claim.evidenceIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 200)) &&
    value.claims.reduce((length, claim) => length + claim.text.length, 0) <= 12000) {
    result.claims = value.claims.map((claim) => ({ text: claim.text, evidenceIds: [...claim.evidenceIds] }));
  }
  if (record(value.grounding) && typeof value.grounding.status === "string" && ["checked", "rejected"].includes(value.grounding.status) &&
    (value.grounding.rewriteCount === 0 || value.grounding.rewriteCount === 1) &&
    Array.isArray(value.grounding.reasonCodes) && value.grounding.reasonCodes.length <= 16 &&
    value.grounding.reasonCodes.every((code) => typeof code === "string" && code.length <= 80 &&
      GROUNDING_REASON_CODES.includes(code as typeof GROUNDING_REASON_CODES[number]))) {
    result.grounding = {
      status: value.grounding.status as "checked" | "rejected",
      rewriteCount: value.grounding.rewriteCount,
      reasonCodes: [...value.grounding.reasonCodes] as typeof GROUNDING_REASON_CODES[number][],
    };
    // Rejected drafts are not displayed and must not enter saved history.
    if (result.grounding.status === "rejected") delete result.claims;
  }
  if (typeof value.disposition === "string" && ["answer", "clarify", "portal", "handoff", "urgent"].includes(value.disposition)) {
    result.disposition = value.disposition as AnswerMetadata["disposition"];
  }
  if (value.responseMode === "canonical" || value.responseMode === "grounded_generation") result.responseMode = value.responseMode;
  if (typeof value.escalationReason === "string" && ["low_confidence", "sensitive_policy", "requires_authorization", "technical_support", "student_requested_person"].includes(value.escalationReason)) {
    result.escalationReason = value.escalationReason as AnswerMetadata["escalationReason"];
  }
  return result;
}
