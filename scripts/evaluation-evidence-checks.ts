import { resolveConversation } from "../lib/query-understanding";
import { retrieveAcademicEvidence } from "../lib/academic-retrieval";
import { loadFaqEntries } from "../lib/faq";
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

/** A generated mock response contains no university facts. Check evidence
 * availability separately, never score its placeholder as an accurate answer. */
export function validateGeneratedMockRetrieval(
  messages: {role:"user"|"assistant";content:string}[],
  question:string,
  expectedAnswerId:string,
):string[]{
  const resolved=resolveConversation(messages,question);
  const rows=retrieveAcademicEvidence(resolved.query)?.rows ?? retrieveVerifiedEvidence(resolved.query,20);
  const expected=loadFaqEntries().find(entry=>entry.id===expectedAnswerId);
  if(!expected)return [`Unknown reviewed record ${expectedAnswerId}`];
  const matching=rows.filter(row=>row.source===`answer:${expectedAnswerId}` || row.citations?.some(citation=>expected.citations.some(reference=>reference.url===citation.url)));
  if(!matching.length)return [`Expected approved record/source ${expectedAnswerId} was not retrievable for the resolved request`];
  const citations=matching.flatMap(row=>row.citations ?? []);
  if(!citations.length)return ["Retrievable evidence lacks an attributed source"];
  if(citations.some(c=>!c.url||!/^https:\/\/(?:[a-z0-9-]+\.)*(?:uaeu\.ac\.ae|u\.ae|moe\.gov\.ae|mohesr\.gov\.ae)\//i.test(c.url)||/(?:webtest|cms)\./i.test(c.url)))return ["Retrievable evidence has a nonofficial/unapproved source"];
  return [];
}
