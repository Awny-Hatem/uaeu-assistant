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

export const CLARIFICATION_KINDS = ["", "applicant_category", "degree_level", "term_year", "course_identity", "cohort", "student_status", "campus_or_branch", "request_type", "individual_record", "unverified_fact"] as const;

export type GroundedAnswer = {
  claims: { text: string; evidenceIds: string[] }[];
  clarification: typeof CLARIFICATION_KINDS[number];
  disposition: "answer" | "clarify" | "abstain";
};

export function groundedAnswerSchema(evidenceIds: string[]) {
  return {
    type: "object", additionalProperties: false,
    properties: {
      claims: { type: "array", maxItems: 16, items: {
        type: "object", additionalProperties: false,
        properties: {
          text: { type: "string", description: "A concise factual answer paragraph or bullet in the response language, supported entirely by its evidence IDs. No citation markers or URLs." },
          evidenceIds: { type: "array", items: { type: "string", enum: evidenceIds }, minItems: 1, maxItems: 1 },
        }, required: ["text", "evidenceIds"],
      } },
      clarification: { type: "string", enum: [...CLARIFICATION_KINDS], description: "Choose only the required missing-scope code, or empty. The application renders a safe localized question. Never write free-form prose here." },
      disposition: { type: "string", enum: ["answer", "clarify", "abstain"] },
    }, required: ["claims", "clarification", "disposition"],
  };
}

export function parseGroundedAnswer(text: string, evidenceIds: string[]): GroundedAnswer | null {
  try {
    const value = JSON.parse(text) as GroundedAnswer;
    if (!value || Object.keys(value).some((key) => !["claims", "clarification", "disposition"].includes(key)) || !Array.isArray(value.claims) || !CLARIFICATION_KINDS.includes(value.clarification) ||
      !["answer", "clarify", "abstain"].includes(value.disposition)) return null;
    if (value.claims.length > 16 || !value.claims.every((claim) => claim && Object.keys(claim).every((key) => ["text", "evidenceIds"].includes(key)) && typeof claim.text === "string" && Boolean(claim.text.trim()) &&
      Array.isArray(claim.evidenceIds) && claim.evidenceIds.length === 1 && claim.evidenceIds.every((id) => evidenceIds.includes(id)))) return null;
    if (value.disposition === "answer" && value.claims.length === 0) return null;
    if (value.claims.map((claim) => claim.text).join("\n\n").length + value.clarification.length > 5800) return null;
    return value;
  } catch { return null; }
}
