import { chatModel as geminiChatModel, getGemini } from "@/lib/gemini";

export type ProviderName = "openai" | "gemini" | "mock";

export type ProviderChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ProviderResult = {
  text: string;
  provider: ProviderName;
  model: string;
};

type GenerateArgs = {
  system: string;
  messages: ProviderChatMessage[];
};

export class AiProviderError extends Error {
  status: number;
  providerStatus: string;
  publicMessage: string;

  constructor(args: {
    status: number;
    providerStatus: string;
    publicMessage: string;
    cause?: unknown;
  }) {
    super(args.publicMessage);
    this.name = "AiProviderError";
    this.status = args.status;
    this.providerStatus = args.providerStatus;
    this.publicMessage = args.publicMessage;
    if (args.cause) {
      this.cause = args.cause;
    }
  }
}

function readKey(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function openAiModel(): string {
  return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4.1-mini";
}

export function configuredProviderName(): ProviderName | "none" {
  const preference = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasOpenAi = Boolean(readKey("OPENAI_API_KEY"));
  const hasGemini = Boolean(readKey("GEMINI_API_KEY"));

  if (preference === "mock") return "mock";
  if (preference === "gemini" && hasGemini) return "gemini";
  if (preference === "openai" && hasOpenAi) return "openai";
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

function transcript(messages: ProviderChatMessage[]): string {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => {
      const role = message.role === "assistant" ? "Assistant" : "Student";
      return `${role}: ${message.content}`;
    })
    .join("\n\n");
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

async function generateWithOpenAi(args: GenerateArgs): Promise<ProviderResult> {
  const key = readKey("OPENAI_API_KEY");
  if (!key) {
    throw new AiProviderError({
      status: 503,
      providerStatus: "OPENAI_KEY_MISSING",
      publicMessage: "OPENAI_API_KEY is not configured.",
    });
  }

  const model = openAiModel();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: args.system,
      input: transcript(args.messages),
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 900),
    }),
  });

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = data.error as { status?: string; message?: string } | undefined;
    const providerMessage = error?.message || raw || response.statusText;
    throw new AiProviderError({
      status: response.status === 429 ? 503 : response.status,
      providerStatus: error?.status || `OPENAI_${response.status}`,
      publicMessage: publicProviderMessage(response.status, "OpenAI", providerMessage),
      cause: providerMessage,
    });
  }

  const text = extractOpenAiText(data);
  if (!text) {
    throw new AiProviderError({
      status: 502,
      providerStatus: "OPENAI_EMPTY_RESPONSE",
      publicMessage: "OpenAI returned an empty response.",
      cause: data,
    });
  }

  return { text, provider: "openai", model };
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
        systemInstruction: args.system,
        temperature: 0.2,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return { text, provider: "gemini", model };
  } catch (error) {
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
  if (provider === "openai") return generateWithOpenAi(args);
  if (provider === "gemini") return generateWithGemini(args);

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
