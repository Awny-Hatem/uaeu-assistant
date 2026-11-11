const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 6000;
const MAX_HISTORY_BYTES = 80 * 1024;

/** Mirror the browser chat's outgoing-history bounds for real HTTP evaluations. */
export function boundEvaluationMessages(messages) {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user" || latest.content.length > MAX_MESSAGE_CHARS) {
    throw new Error("A question must contain at most 6000 characters.");
  }
  const firstIndex = messages.findIndex((message) => message.role === "user");
  const first = messages[firstIndex];
  if (first === latest) return [{ role: "user", content: latest.content }];
  const tailStart = Math.max(firstIndex + 1, messages.length - MAX_MESSAGES + 1);
  const recent = messages.slice(tailStart).map(({ role, content }) => ({
    role,
    content: content.slice(0, MAX_MESSAGE_CHARS),
  }));
  if (tailStart > firstIndex + 1) {
    while (recent.length > 1 && recent[0].role === "assistant") recent.shift();
  }
  const result = [{ role: "user", content: first.content.slice(0, MAX_MESSAGE_CHARS) }, ...recent];
  const removeOldestExchange = () => {
    const start = 1;
    result.splice(start, 1);
    while (result.length > start + 1 && result[start]?.role === "assistant") result.splice(start, 1);
  };
  while (result.length > 1 && (
    result.length > MAX_MESSAGES ||
    new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_HISTORY_BYTES
  )) removeOldestExchange();
  return result;
}
