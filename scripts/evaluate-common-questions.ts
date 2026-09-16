import fs from "node:fs";
import path from "node:path";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ExpectedSource = "faq" | "guide" | "rag" | "escalated";
type ExpectedDisposition =
  | "answer"
  | "clarify"
  | "portal"
  | "guide"
  | "urgent"
  | "handoff";

type EvalCase = {
  id: string;
  category: string;
  question: string;
  messages?: Message[];
  expectedAnswerId: string;
  expectedSource: ExpectedSource;
  expectedDisposition: ExpectedDisposition;
  requiredTerms?: string[];
  minCitations: number;
};

type ChatPayload = {
  content?: string;
  source?: string;
  stateLabel?: string;
  answerId?: string;
  faqId?: string;
  disposition?: string;
  guide?: { id?: string };
  escalationReason?: string;
  citations?: { title?: string; url?: string; document?: string }[];
  error?: string;
};

type CaseResult = {
  testCase: EvalCase;
  actualSource: string;
  errors: string[];
};

const FIXTURE_PATH = path.join(
  process.cwd(),
  "data",
  "evals",
  "common-questions.json",
);
const ARABIC_TEXT = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readCases(): EvalCase[] {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("common-questions.json must contain an array.");
  }

  const cases = parsed as EvalCase[];
  if (cases.length !== 100) {
    throw new Error(`Expected exactly 100 evaluation cases, found ${cases.length}.`);
  }

  const ids = new Set<string>();
  const answerIds = new Set<string>();
  const allowedSources = new Set<ExpectedSource>(["faq", "guide", "rag", "escalated"]);
  const allowedDispositions = new Set<ExpectedDisposition>([
    "answer",
    "clarify",
    "portal",
    "guide",
    "urgent",
    "handoff",
  ]);

  for (const testCase of cases) {
    if (!testCase.id || ids.has(testCase.id)) {
      throw new Error(`Missing or duplicate case id: ${testCase.id || "(empty)"}.`);
    }
    ids.add(testCase.id);

    if (!testCase.expectedAnswerId || answerIds.has(testCase.expectedAnswerId)) {
      throw new Error(
        `Missing or duplicate expectedAnswerId: ${testCase.expectedAnswerId || "(empty)"}.`,
      );
    }
    answerIds.add(testCase.expectedAnswerId);

    if (!testCase.question?.trim()) {
      throw new Error(`${testCase.id} is missing a question.`);
    }
    if (!allowedSources.has(testCase.expectedSource)) {
      throw new Error(`${testCase.id} has invalid expectedSource ${testCase.expectedSource}.`);
    }
    if (!allowedDispositions.has(testCase.expectedDisposition)) {
      throw new Error(
        `${testCase.id} has invalid expectedDisposition ${testCase.expectedDisposition}.`,
      );
    }
    if (!Number.isInteger(testCase.minCitations) || testCase.minCitations < 0) {
      throw new Error(`${testCase.id} has an invalid minCitations value.`);
    }

    if (testCase.messages) {
      const latestUserMessage = [...testCase.messages]
        .reverse()
        .find((message) => message.role === "user");
      if (!latestUserMessage || latestUserMessage.content !== testCase.question) {
        throw new Error(
          `${testCase.id} question must equal the latest user message in messages[].`,
        );
      }
    }
  }

  return cases;
}

function validateDisposition(
  testCase: EvalCase,
  payload: ChatPayload,
  errors: string[],
): void {
  const content = payload.content ?? "";

  switch (testCase.expectedDisposition) {
    case "guide":
      if (payload.source !== "guide") errors.push("expected a guided-service response");
      break;
    case "handoff":
      if (
        payload.source !== "escalated" ||
        payload.escalationReason !== "student_requested_person"
      ) {
        errors.push("expected a student-requested human handoff");
      }
      break;
    case "clarify":
      if (
        !/\b(confirm|depend|depends|depending|specific|specify|varies|vary|which)\b|تأكد|يعتمد|تختلف|حدد|اختر/iu.test(
          content,
        )
      ) {
        errors.push("expected clarification or an explicit dependency/verification note");
      }
      break;
    case "portal":
      if (!/\bportal\b|بوابة/iu.test(content)) {
        errors.push("expected portal instructions");
      }
      break;
    case "urgent":
      if (!/\b(immediate|immediately|emergency|urgent)\b|الطوارئ|فور|عاجل/iu.test(content)) {
        errors.push("expected immediate or emergency guidance");
      }
      break;
    case "answer":
      if (payload.source === "escalated" || payload.source === "error") {
        errors.push("expected a substantive answer, not escalation or error");
      }
      break;
  }
}

function validatePayload(testCase: EvalCase, status: number, payload: ChatPayload): string[] {
  const errors: string[] = [];
  const content = payload.content ?? "";

  if (status !== 200) {
    errors.push(`expected HTTP 200, received ${status}${payload.error ? ` (${payload.error})` : ""}`);
    return errors;
  }

  if (payload.source !== testCase.expectedSource) {
    errors.push(`expected source ${testCase.expectedSource}, received ${payload.source ?? "none"}`);
  }

  const actualAnswerId = payload.answerId ?? payload.faqId ?? payload.guide?.id;
  if (testCase.expectedSource === "faq" && actualAnswerId !== testCase.expectedAnswerId) {
    errors.push(
      `expected FAQ/answer id ${testCase.expectedAnswerId}, received ${actualAnswerId ?? "none"}`,
    );
  }
  if (
    testCase.expectedSource === "faq" &&
    payload.disposition !== testCase.expectedDisposition
  ) {
    errors.push(
      `expected disposition ${testCase.expectedDisposition}, received ${payload.disposition ?? "none"}`,
    );
  }
  if (
    testCase.expectedSource === "guide" &&
    payload.guide?.id !== testCase.expectedAnswerId
  ) {
    errors.push(
      `expected guide id ${testCase.expectedAnswerId}, received ${payload.guide?.id ?? "none"}`,
    );
  }

  const citations = Array.isArray(payload.citations) ? payload.citations : [];
  if (citations.length < testCase.minCitations) {
    errors.push(
      `expected at least ${testCase.minCitations} citation(s), received ${citations.length}`,
    );
  }
  citations.forEach((citation, index) => {
    if (!citation.title?.trim()) errors.push(`citation ${index + 1} is missing a title`);
    if (!citation.url?.trim() && !citation.document?.trim()) {
      errors.push(`citation ${index + 1} is missing a URL or document path`);
    }
    if (citation.url) {
      try {
        const parsed = new URL(citation.url);
        const host = parsed.hostname.toLowerCase();
        const official =
          host === "uaeu.ac.ae" ||
          host.endsWith(".uaeu.ac.ae") ||
          host === "u.ae" ||
          host.endsWith(".u.ae") ||
          host === "mohesr.gov.ae" ||
          host.endsWith(".mohesr.gov.ae") ||
          host === "moe.gov.ae" ||
          host.endsWith(".moe.gov.ae");
        if (parsed.protocol !== "https:" || !official) {
          errors.push(`citation ${index + 1} is not an approved official HTTPS URL`);
        }
      } catch {
        errors.push(`citation ${index + 1} has an invalid URL`);
      }
    }
  });

  for (const term of testCase.requiredTerms ?? []) {
    if (!normalize(content).includes(normalize(term))) {
      errors.push(`answer is missing required term: ${term}`);
    }
  }

  if (ARABIC_TEXT.test(testCase.question)) {
    if (!ARABIC_TEXT.test(content)) errors.push("expected an Arabic answer");
  } else if (!/[A-Za-z]/.test(content)) {
    errors.push("expected an English answer");
  }

  validateDisposition(testCase, payload, errors);
  return errors;
}

async function main(): Promise<void> {
  const cases = readCases();

  // Keep the evaluator deterministic and prevent SQLite or provider network writes.
  process.env.AI_PROVIDER = "mock";
  process.env.GEMINI_EMBEDDING_SEARCH = "";
  process.env.SERVER_CHAT_HISTORY = "";
  process.env.CHATBOT_DB_PATH = ":memory:";

  const { POST } = await import("../app/api/chat/route");
  const results: CaseResult[] = [];

  for (const [index, testCase] of cases.entries()) {
    const messages = testCase.messages ?? [
      { role: "user" as const, content: testCase.question },
    ];
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          // The production guard limits by address; use an isolated identity per pinned case.
          "x-forwarded-for": `198.51.100.${index + 1}`,
        },
        body: JSON.stringify({ locale: "auto", messages }),
      }),
    );
    const payload = (await response.json()) as ChatPayload;
    results.push({
      testCase,
      actualSource: payload.source ?? "none",
      errors: validatePayload(testCase, response.status, payload),
    });
  }

  const failures = results.filter((result) => result.errors.length > 0);
  const sourceCounts = new Map<string, number>();
  for (const result of results) {
    sourceCounts.set(result.actualSource, (sourceCounts.get(result.actualSource) ?? 0) + 1);
  }

  console.log(`Evaluated ${results.length} common UAEU questions.`);
  console.log(`Passed: ${results.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);
  console.log(
    `Actual sources: ${[...sourceCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([source, count]) => `${source}=${count}`)
      .join(", ")}`,
  );

  if (failures.length) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(
        `- ${failure.testCase.id} [${failure.testCase.expectedAnswerId}]: ${failure.errors.join("; ")}`,
      );
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
