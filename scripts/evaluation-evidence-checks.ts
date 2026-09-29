import { resolveConversation } from "../lib/query-understanding";
import { retrieveVerifiedEvidence } from "../lib/knowledge-files";

export type EvidenceOnlyExpectation = { source: string; queryTerms: string[] };

/** Mock generation cannot certify factual prose. Explicitly test only its input contract. */
export function validateEvidenceOnly(
  messages: { role: "user" | "assistant"; content: string }[],
  question: string,
  expectation: EvidenceOnlyExpectation,
): string[] {
  const errors: string[] = [];
  const resolved = resolveConversation(messages, question);
  for (const term of expectation.queryTerms) {
    if (!resolved.query.toLowerCase().includes(term.toLowerCase())) errors.push(`Resolved evidence query lost ${term}`);
  }
  const evidence = retrieveVerifiedEvidence(resolved.query);
  if (!evidence.length) errors.push("Expected scoped procedural evidence was not retrieved");
  if (evidence.some(row => row.source !== expectation.source || row.scope?.temporalCoverage !== "procedural")) {
    errors.push("An unrelated or date-entitling record entered a procedural-only deadline answer");
  }
  if (evidence.some(row => !/cannot give a verified deadline|no verified.*deadline/i.test(row.text))) {
    errors.push("Procedural source lost its explicit deadline information gap");
  }
  return errors;
}
