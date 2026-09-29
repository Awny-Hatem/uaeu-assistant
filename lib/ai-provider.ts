import { chatModel as geminiChatModel, getGemini } from "@/lib/gemini";
import { groundedAnswerSchema, parseGroundedAnswer, type GroundedAnswer } from "@/lib/provider-response";

export type ProviderName = "openai" | "gemini" | "mock";

export type ProviderChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ProviderResult = {
  text: string;
  provider: ProviderName;
  model: string;
  grounded?: GroundedAnswer;
};

type GenerateArgs = {
  system: string;
  messages: ProviderChatMessage[];
  evidenceIds?: string[];
  responseSchema?: { name: string; schema: Record<string, unknown> };
  deadlineAt?: number;
};

export class AiProviderError extends Error {
  status: number;
  providerStatus: string;
  publicMessage: string;
  retryable: boolean;
  retryAfterMs?: number;

  constructor(args: {
    status: number;
    providerStatus: string;
    publicMessage: string;
    cause?: unknown;
    retryable?: boolean;
    retryAfterMs?: number;
  }) {
    super(args.publicMessage);
    this.name = "AiProviderError";
    this.status = args.status;
    this.providerStatus = args.providerStatus;
    this.publicMessage = args.publicMessage;
    this.retryable = args.retryable === true;
    this.retryAfterMs = args.retryAfterMs;
    if (args.cause) {
      this.cause = args.cause;
    }
  }
}

const MAX_OPENAI_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 10_000;
const MIN_RETRY_ATTEMPT_BUDGET_MS = 1_000;

function assertAnswerDeadline(deadlineAt?: number): void {
  if (deadlineAt !== undefined && !Number.isFinite(deadlineAt)) throw new AiProviderError({ status: 503, providerStatus: 'ANSWER_DEADLINE_INVALID', publicMessage: 'The answer time budget is invalid.' });
  if (deadlineAt !== undefined && Date.now() >= deadlineAt) throw new AiProviderError({ status: 504, providerStatus: 'ANSWER_DEADLINE_EXCEEDED', publicMessage: 'The answer exceeded its total time limit.' });
}

function retryAfterMs(header: string | null): number | undefined {
  if (!header?.trim()) return undefined;
  const value = header.trim();
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const milliseconds = Number(value) * 1000;
    // Overflow is still an excessive server minimum, not a missing hint.
    return milliseconds;
  }
  // Do not let Date.parse interpret malformed numeric hints (such as -1) as
  // dates. HTTP-date has an alphabetic weekday/month and an explicit GMT zone.
  if (!/[A-Za-z]/.test(value) || !/GMT$/i.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.max(0, time - Date.now()) : undefined;
}

function openAiHttpError(response: Response, data: Record<string, unknown>): AiProviderError {
  const detail = data.error && typeof data.error === 'object'
    ? data.error as { code?: unknown; type?: unknown } : {};
  const quotaCodes = new Set([
    'insufficient_quota', 'credit_balance_exhausted', 'organization_spend_limit_exceeded',
    'project_spend_limit_exceeded', 'organization_usage_limit_exceeded', 'billing_hard_limit_reached',
  ]);
  const quota = typeof detail.code === 'string' && quotaCodes.has(detail.code) || detail.type === 'insufficient_quota';
  const auth = response.status === 401 || response.status === 403;
  const rate = response.status === 429;
  const classifiedRate = detail.code === 'rate_limit_exceeded' || detail.code === 'slow_down' || detail.type === 'rate_limit_error';
  const server = response.status >= 500 && response.status <= 599;
  // Provider error bodies may contain organization IDs, account details or
  // request text. Neither public metadata nor Error.cause retains those bodies.
  return new AiProviderError({
    status: rate ? 503 : response.status,
    providerStatus: quota ? 'OPENAI_QUOTA_EXHAUSTED' : auth ? 'OPENAI_AUTH_ERROR' : rate ? (classifiedRate ? 'OPENAI_RATE_LIMITED' : 'OPENAI_429_UNCLASSIFIED') :
      server ? 'OPENAI_UNAVAILABLE' : response.status === 400 ? 'OPENAI_BAD_REQUEST' : 'OPENAI_HTTP_ERROR',
    publicMessage: quota ? 'OpenAI credits or an account usage limit require administrator action.' :
      auth ? 'OpenAI rejected the configured credentials or permissions.' :
      rate ? (classifiedRate ? 'OpenAI is temporarily rate limited. Please try again later.' : 'OpenAI refused requests with HTTP 429. The account rate or quota condition needs checking.') :
      server ? 'OpenAI is temporarily unavailable. Please try again later.' : 'OpenAI rejected the request configuration.',
    retryable: !quota && !auth && (rate || server),
    retryAfterMs: retryAfterMs(response.headers.get('retry-after')),
  });
}

function readKey(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function providerTimeoutMs(): number {
  const configured = Number.parseInt(process.env.AI_PROVIDER_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(configured)
    ? Math.min(120_000, Math.max(1_000, configured))
    : 20_000;
}

/** Every remote operation in a chat shares an absolute deadline, including
 * retries/fallbacks. A later request cannot restart the answer's time budget. */
export function providerRequestSignal(deadlineAt?: number): AbortSignal {
  assertAnswerDeadline(deadlineAt);
  const remaining = deadlineAt === undefined ? providerTimeoutMs() : Math.min(providerTimeoutMs(), deadlineAt - Date.now());
  if (remaining <= 0) throw new AiProviderError({ status: 504, providerStatus: "ANSWER_DEADLINE_EXCEEDED", publicMessage: "The answer exceeded its total time limit." });
  return AbortSignal.timeout(Math.max(1, Math.floor(remaining)));
}

function maxOutputTokens(provider: "openai" | "gemini" = "openai"): number {
  const configured = Number.parseInt(process.env[provider === "openai" ? "OPENAI_MAX_OUTPUT_TOKENS" : "GEMINI_MAX_OUTPUT_TOKENS"] ?? "", 10);
  return Number.isFinite(configured) ? Math.max(256, Math.min(1500, configured)) : 1100;
}

function providerResult(raw: string, provider: ProviderName, model: string, evidenceIds?: string[]): ProviderResult {
  if (!evidenceIds) return { text: checkedOutput(raw, provider), provider, model };
  const grounded = parseGroundedAnswer(raw, evidenceIds);
  if (!grounded) throw new AiProviderError({ status: 502, providerStatus: "INVALID_GROUNDING_OUTPUT", publicMessage: "The answer service returned an invalid evidence contract." });
  const text = grounded.claims.map((claim) => claim.text).join("\n\n");
  return { text, provider, model, grounded };
}

function checkedOutput(text: string, provider: string): string {
  if (text.length > 5800) throw new AiProviderError({ status: 502, providerStatus: "ANSWER_TOO_LONG", publicMessage: `${provider} returned an answer above the conversation size limit.` });
  return text;
}

export function crossProviderFallbackEnabled(): boolean {
  return process.env.AI_PROVIDER_FALLBACK?.trim().toLowerCase() === "enabled";
}

export function openAiModel(): string {
  return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4.1-mini";
}

export function configuredProviderName(): ProviderName | "none" {
  const preference = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasOpenAi = Boolean(readKey("OPENAI_API_KEY"));
  const hasGemini = Boolean(readKey("GEMINI_API_KEY"));

  if (preference === "mock") return "mock";
  if (preference === "gemini") return hasGemini ? "gemini" : "none";
  if (preference === "openai") return hasOpenAi ? "openai" : "none";
  if (preference) return "none";
  if (hasOpenAi) return "openai";
  if (hasGemini) return "gemini";
  return "none";
}

export function providerHealthSnapshot() {
  const provider = configuredProviderName();
  return {
    provider,
    openaiConfigured: Boolean(readKey("OPENAI_API_KEY")),
    geminiConfigured: Boolean(readKey("GEMINI_API_KEY")),
    crossProviderFallback: crossProviderFallbackEnabled(),
    model:
      provider === "openai"
        ? openAiModel()
        : provider === "gemini"
          ? geminiChatModel()
          : provider === "mock"
            ? "mock-local"
            : null,
  };
}

function extractOpenAiText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const pieces: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const maybeText = part as { text?: unknown; value?: unknown };
      if (typeof maybeText.text === "string") pieces.push(maybeText.text);
      if (typeof maybeText.value === "string") pieces.push(maybeText.value);
    }
  }

  return pieces.join("").trim();
}

function publicProviderMessage(status: number, provider: string, message: string): string {
  if (status === 401 || status === 403) {
    return `${provider} rejected the API key. Check that the key is correct and active.`;
  }
  if (status === 429 || /quota|credit|rate|limit|resource_exhausted/i.test(message)) {
    return `${provider} is configured, but the quota, credits, or rate limit appear to be exhausted.`;
  }
  return `${provider} request failed. Please try again or check the provider configuration.`;
}

async function generateWithOpenAiAttempt(args: GenerateArgs): Promise<ProviderResult> {
  const key = readKey("OPENAI_API_KEY");
  if (!key) {
    throw new AiProviderError({
      status: 503,
      providerStatus: "OPENAI_KEY_MISSING",
      publicMessage: "OPENAI_API_KEY is not configured.",
    });
  }

  const model = openAiModel();
  let response: Response;
  let raw: string;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: providerRequestSignal(args.deadlineAt),
      body: JSON.stringify({
        model,
        instructions: args.system,
        input: args.messages
          .filter((message) => message.role !== "system")
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
        max_output_tokens: maxOutputTokens(),
        store: false,
        temperature: 0.1,
        ...(args.responseSchema || args.evidenceIds ? { text: { format: { type: "json_schema", name: args.responseSchema?.name ?? "grounded_answer", strict: true, schema: args.responseSchema?.schema ?? groundedAnswerSchema(args.evidenceIds!) } } } : {}),
      }),
    });
    raw = await response.text();
    assertAnswerDeadline(args.deadlineAt);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    const timedOut = error instanceof Error && /abort|timeout/i.test(`${error.name} ${error.message}`);
    throw new AiProviderError({
      status: timedOut ? 504 : 502,
      providerStatus: timedOut ? "OPENAI_TIMEOUT" : "OPENAI_NETWORK_ERROR",
      publicMessage: timedOut
        ? "OpenAI did not respond before the configured timeout. Please try again."
        : "OpenAI could not be reached. Please try again.",
      retryable: !timedOut,
    });
  }

  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw);
    data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw openAiHttpError(response, data);
  }

  if (data.status === "incomplete") throw new AiProviderError({ status: 502, providerStatus: "OPENAI_INCOMPLETE", publicMessage: "The answer service could not complete the answer within its output limit." });
  const text = extractOpenAiText(data);
  if (!text) {
    throw new AiProviderError({
      status: 502,
      providerStatus: "OPENAI_EMPTY_RESPONSE",
      publicMessage: "OpenAI returned an empty response.",
    });
  }

  return providerResult(text, "openai", model, args.evidenceIds);
}

async function generateWithOpenAi(args: GenerateArgs): Promise<ProviderResult> {
  const deadlineAt = args.deadlineAt ?? Date.now() + providerTimeoutMs();
  for (let retry = 0; ; retry += 1) {
    try {
      return await generateWithOpenAiAttempt({ ...args, deadlineAt });
    } catch (error) {
      if (!(error instanceof AiProviderError) || !error.retryable || retry >= MAX_OPENAI_RETRIES) throw error;
      const baseWait = error.retryAfterMs ?? 500 * 2 ** retry;
      // A server delay is a minimum, never clamped into an earlier retry.
      const wait = Math.ceil(baseWait + Math.random() * 250);
      if (!Number.isFinite(wait) || wait > MAX_RETRY_WAIT_MS ||
        deadlineAt - Date.now() < wait + MIN_RETRY_ATTEMPT_BUDGET_MS) throw error;
      await new Promise<void>(resolve => setTimeout(resolve, wait));
      // The next attempt rechecks the original absolute deadline. A delayed
      // timer/event loop cannot restart the answer's budget.
    }
  }
}

async function generateWithGemini(args: GenerateArgs): Promise<ProviderResult> {
  const client = getGemini();
  if (!client) {
    throw new AiProviderError({
      status: 503,
      providerStatus: "GEMINI_KEY_MISSING",
      publicMessage: "GEMINI_API_KEY is not configured.",
    });
  }

  const model = geminiChatModel();
  try {
    const response = await client.models.generateContent({
      model,
      contents: args.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
      config: {
        abortSignal: providerRequestSignal(args.deadlineAt),
        systemInstruction: args.system,
        temperature: 0.2,
        maxOutputTokens: maxOutputTokens("gemini"),
        ...(args.responseSchema || args.evidenceIds ? { responseMimeType: "application/json", responseJsonSchema: args.responseSchema?.schema ?? groundedAnswerSchema(args.evidenceIds!) } : {}),
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return providerResult(text, "gemini", model, args.evidenceIds);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    const raw = error instanceof Error ? error.message : String(error);
    throw new AiProviderError({
      status: /quota|credit|prepayment|resource_exhausted|429/i.test(raw) ? 503 : 502,
      providerStatus: /quota|credit|prepayment|resource_exhausted|429/i.test(raw)
        ? "RESOURCE_EXHAUSTED"
        : "GEMINI_PROVIDER_ERROR",
      publicMessage: publicProviderMessage(502, "Gemini", raw),
      cause: error,
    });
  }
}

function generateMock(): ProviderResult {
  return {
    provider: "mock",
    model: "mock-local",
    text:
      "**Prototype Answer**\n- This is a local test response generated without calling an external AI provider.\n- It confirms the chat orchestration, citations, and fallback logic are working.",
  };
}

export async function generateAssistantResponse(
  args: GenerateArgs,
): Promise<ProviderResult> {
  const provider = configuredProviderName();

  if (provider === "mock") return generateMock();
  // Standalone provider calls also receive one operation budget, shared with
  // any explicitly enabled fallback; retries cannot multiply that budget.
  args = { ...args, deadlineAt: args.deadlineAt ?? Date.now() + providerTimeoutMs() };
  if (provider === "openai") {
    try {
      return await generateWithOpenAi(args);
    } catch (error) {
      if (args.deadlineAt !== undefined && (!Number.isFinite(args.deadlineAt) || Date.now() >= args.deadlineAt)) throw error;
      if (crossProviderFallbackEnabled() && readKey("GEMINI_API_KEY")) {
        console.warn("OpenAI generation failed; using the explicitly enabled Gemini fallback.");
        return generateWithGemini(args);
      }
      throw error;
    }
  }
  if (provider === "gemini") {
    try {
      return await generateWithGemini(args);
    } catch (error) {
      if (args.deadlineAt !== undefined && (!Number.isFinite(args.deadlineAt) || Date.now() >= args.deadlineAt)) throw error;
      if (crossProviderFallbackEnabled() && readKey("OPENAI_API_KEY")) {
        console.warn("Gemini generation failed; using the explicitly enabled OpenAI fallback.");
        return generateWithOpenAi(args);
      }
      throw error;
    }
  }

  throw new AiProviderError({
    status: 503,
    providerStatus: "NO_AI_PROVIDER",
    publicMessage:
      "No AI provider is configured. Add OPENAI_API_KEY to .env.local or configure GEMINI_API_KEY as a fallback.",
  });
}

export function describeAiProviderError(error: unknown): {
  status: number;
  providerStatus: string;
  message: string;
} {
  if (error instanceof AiProviderError) {
    return {
      status: error.status,
      providerStatus: error.providerStatus,
      message: error.publicMessage,
    };
  }

  const raw = error instanceof Error ? error.message : String(error);
  return {
    status: 502,
    providerStatus: "AI_PROVIDER_ERROR",
    message: publicProviderMessage(502, "AI provider", raw),
  };
}
