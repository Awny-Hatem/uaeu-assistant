export function runtimeContract() {
  const durableRequested = process.env.CHATBOT_DURABLE_STORAGE === "enabled";
  // Match db.ts: whitespace is trimmed, and an empty path uses the default
  // data-directory file. A padded SQLite memory sentinel is still ephemeral.
  const configuredDbPath = process.env.CHATBOT_DB_PATH?.trim();
  const durableStore = durableRequested && process.env.VERCEL !== "1" &&
    configuredDbPath !== ":memory:";
  const mode = process.env.CHATBOT_DEPLOYMENT_MODE === "production" ? "production" : "prototype";
  const redisRestUrl = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim();
  const redisRestToken = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim();
  let sharedRateLimits = false;
  if (redisRestUrl && redisRestToken) {
    try {
      sharedRateLimits = new URL(redisRestUrl).protocol === "https:";
    } catch {
      sharedRateLimits = false;
    }
  }
  // V3 standalone is intentionally useful without institutional SSO or a
  // persistent student database. Student-record access and server chat history
  // remain unavailable unless separately integrated and explicitly enabled.
  // Shared Redis is required for production abuse controls; an explicitly
  // requested but invalid durable-store configuration still blocks startup.
  const productionBlockers = [
    ...(!sharedRateLimits ? ["Shared server-side rate limiting is not configured"] : []),
    ...(durableRequested && !durableStore ? ["Requested durable storage configuration is invalid"] : []),
  ];
  const productionReady = mode === "production" && productionBlockers.length === 0;
  return {
    mode,
    durableStore,
    storageConfigurationValid: !durableRequested || durableStore,
    sessionMode: durableStore ? "registered-revocable" : "device-local",
    identity: "self-reported-unverified",
    institutionalIdentity: "not-integrated",
    personalStudentData: "unavailable",
    serverChatHistory: process.env.SERVER_CHAT_HISTORY?.trim().toLowerCase() === "enabled" && durableStore
      ? "enabled"
      : "disabled",
    quotas: sharedRateLimits ? "shared-upstash" : "browser-local",
    rateLimits: sharedRateLimits ? "shared-upstash" : "instance-local",
    productionReady,
    allowed: mode === "prototype"
      ? (!durableRequested || durableStore)
      : productionReady,
    productionBlockers,
  } as const;
}
