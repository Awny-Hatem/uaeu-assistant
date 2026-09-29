export function runtimeContract() {
  const durableRequested = process.env.CHATBOT_DURABLE_STORAGE === "enabled";
  // Match db.ts: whitespace is trimmed, and an empty path uses the default
  // data-directory file. A padded SQLite memory sentinel is still ephemeral.
  const configuredDbPath = process.env.CHATBOT_DB_PATH?.trim();
  const durableStore = durableRequested && process.env.VERCEL !== "1" &&
    configuredDbPath !== ":memory:";
  const mode = process.env.CHATBOT_DEPLOYMENT_MODE === "production" ? "production" : "prototype";
  return {
    mode,
    durableStore,
    storageConfigurationValid: !durableRequested || durableStore,
    sessionMode: durableStore ? "registered-revocable" : "device-local-prototype",
    identity: "self-reported-unverified",
    quotas: "browser-local",
    rateLimits: "instance-local",
    productionReady: false,
    allowed: mode === "prototype" && (!durableRequested || durableStore),
    productionBlockers: ["Managed university identity is not integrated", "Shared server-side quotas and rate limits are not integrated"],
  } as const;
}
