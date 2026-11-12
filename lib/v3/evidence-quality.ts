type EvidenceQuality = {
  freshnessStatus?: "current" | "stale" | "unknown";
  trustStatus?: "approved" | "verified_official" | "discovered";
};

/** A response backed by newly discovered or undated evidence must not claim
 * fully verified/current status, even when its factual claims pass grounding.
 */
export function needsEvidenceQualification(evidence: readonly EvidenceQuality[]): boolean {
  return evidence.some(({ freshnessStatus, trustStatus }) =>
    trustStatus === "discovered" || (freshnessStatus !== undefined && freshnessStatus !== "current"));
}
