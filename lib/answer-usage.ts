import { AsyncLocalStorage } from "node:async_hooks";

type Meter = { started: number; attempts: number; calls: { model: string; purpose: string; inputTokens: number; cachedInputTokens: number; outputTokens: number; estimatedUsd: number | null }[]; embeddingCacheHits: number };
const meters = new AsyncLocalStorage<Meter>();
/** Prices pinned to official model pages verified 2026-11-04. This is an
 * estimate from actual returned token usage, not an account billing statement.
 * No prompts, identifiers, API keys or university records are retained. */
export const USAGE_PRICE_SOURCE = {
  verified: "2026-11-04",
  generation: "https://developers.openai.com/api/docs/models/gpt-4.1-mini",
  embedding: "https://developers.openai.com/api/docs/models/text-embedding-3-small",
};
export function withAnswerUsage<T>(work: () => Promise<T>): Promise<T> {
  return meters.run({ started: Date.now(), attempts: 0, calls: [], embeddingCacheHits: 0 }, work);
}
export function recordProviderAttempt() { const meter = meters.getStore(); if (meter) meter.attempts++; }
export function recordProviderUsage(model: string, purpose: string, raw: unknown) {
  const meter = meters.getStore();
  if (!meter || !raw || typeof raw !== "object") return;
  const u = raw as Record<string, unknown>;
  const input = Number(u.input_tokens ?? u.prompt_tokens ?? 0), output = Number(u.output_tokens ?? 0);
  const detail = u.input_tokens_details as Record<string, unknown> | undefined;
  const cached = Number(detail?.cached_tokens ?? 0);
  if (![input, output, cached].every(n => Number.isFinite(n) && n >= 0) || cached > input) return;
  const price = /^gpt-4\.1-mini(?:-|$)/.test(model) ? ((input - cached) * 0.4 + cached * 0.1 + output * 1.6) / 1_000_000
    : model === "text-embedding-3-small" ? input * 0.02 / 1_000_000 : null;
  meter.calls.push({ model, purpose, inputTokens: input, cachedInputTokens: cached, outputTokens: output, estimatedUsd: price });
}
export function recordEmbeddingCacheHit() { const meter = meters.getStore(); if (meter) meter.embeddingCacheHits++; }
export function answerUsageSnapshot() {
  const meter = meters.getStore();
  if (!meter) return undefined;
  return {
    elapsedMs: Date.now() - meter.started,
    attemptedCalls: meter.attempts,
    unmeteredAttempts: Math.max(0, meter.attempts - meter.calls.length),
    calls: meter.calls,
    embeddingCacheHits: meter.embeddingCacheHits,
    inputTokens: meter.calls.reduce((n, c) => n + c.inputTokens, 0),
    outputTokens: meter.calls.reduce((n, c) => n + c.outputTokens, 0),
    knownUsageUsd: meter.calls.reduce((n, c) => n + (c.estimatedUsd ?? 0), 0),
    estimatedUsd: meter.attempts === meter.calls.length && meter.calls.every(c => c.estimatedUsd !== null) ? meter.calls.reduce((n, c) => n + c.estimatedUsd!, 0) : null,
    priceSource: USAGE_PRICE_SOURCE,
    limitation: "Only successful provider responses returning usage are counted; transport failures and provider billing adjustments are unknown.",
  };
}
