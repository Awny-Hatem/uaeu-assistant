import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
const { retrieveAcademicEvidence } = await import("../lib/academic-retrieval");
const { sourceEvidence, sourceEvidenceContext, sourceClaimViolations } = await import("../lib/source-evidence");
const { academicCoverageViolations } = await import("../lib/academic-coverage");
const { generateAssistantResponse } = await import("../lib/ai-provider");
const { SYSTEM_PROMPT } = await import("../lib/prompts");
const question = process.argv.slice(2).join(" ");
const plan = retrieveAcademicEvidence(question);
const sources = sourceEvidence(plan?.rows ?? []);
const obligations = academicCoverageViolations({claims:[],clarification:"",disposition:"answer"},sources,question);
const result = await generateAssistantResponse({ system: `${SYSTEM_PROMPT}\nRESPONSE LANGUAGE: ${/[\u0600-\u06ff]/u.test(question) ? "Arabic" : "English"}.\nRequested program identities: ${plan?.identifiers?.join(" / ")}.\n${sourceEvidenceContext(sources)}\nRequested-fact completeness:\n${obligations.join("\n")}`, messages: [{ role: "user", content: question }], evidenceIds: sources.map(s=>s.id) });
console.log(JSON.stringify({ query: question, claims: result.grounded, violations: result.grounded ? sourceClaimViolations(result.grounded,sources,question) : [], coverage: result.grounded ? academicCoverageViolations(result.grounded,sources,question) : [], sources: sources.map(s=>({id:s.id,text:s.text})) }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
