import { researchOfficialUaeu } from "@/lib/research/official-research";
import type { EvidenceQuery } from "@/lib/v3/contracts";

const request = process.argv.slice(2).join(" ").trim();
if (request.length < 8) {
  console.error('Usage: npm run research:official -- "topic or fact to verify"');
  process.exit(2);
}

const query: EvidenceQuery = {
  request,
  requestedFacts: [request],
  scope: {},
  freshnessRequirement: "current",
};

async function main() {
  const evidence = await researchOfficialUaeu(query);
  console.log(JSON.stringify({
    query: request,
    status: evidence.length ? "REVIEW_REQUIRED" : "NO_DISCOVERED_EVIDENCE",
    evidence: evidence.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      excerpt: item.excerpt,
      retrievedAt: item.retrievedAt,
      freshnessStatus: item.freshnessStatus,
      trustStatus: item.trustStatus,
      scope: item.scope,
    })),
    warning: "Discovery results are unapproved research leads. Review the source, scope, dates, and claim support before changing the governed local knowledge snapshot.",
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Official source research failed.");
  process.exitCode = 1;
});
