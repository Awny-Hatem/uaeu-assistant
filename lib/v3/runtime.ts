/** V3 is automatic in local development and Vercel Preview, with an explicit
 * flag for deployments whose platform environment is not injected at runtime. */
export function isV3Enabled(): boolean {
  const configured = process.env.UAEU_AGENT_V3_ENABLED?.trim().toLowerCase();
  if (configured === "enabled") return true;
  if (configured === "disabled") return false;
  return process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";
}
