export function finalizeProviderResponse(
  text: string,
  fallback: string,
): { content: string; escalated: boolean } {
  const taggedForEscalation = /\[ESCALATE\]/i.test(text);
  const content = text.replace(/\[ESCALATE\]/gi, "").trim();
  return {
    content: content || fallback,
    escalated: taggedForEscalation || !content,
  };
}
