import fs from "node:fs";
import path from "node:path";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AlignmentCase = {
  id: string;
  category: string;
  question: string;
  messages?: Message[];
  expectedSource: "faq" | "guide" | "escalated";
  expectedAnswerId: string;
  expectedDisposition?: "answer" | "clarify" | "portal" | "urgent";
  expectedEscalationReason?: string;
  requiredPatterns: string[];
  forbiddenPatterns: string[];
  minCitations: number;
};

type AlignmentFixture = {
  schemaVersion: number;
  globalForbiddenPatterns: string[];
  cases: AlignmentCase[];
};

type ChatPayload = {
  content?: string;
  source?: string;
  faqId?: string;
  disposition?: string;
  guide?: { id?: string };
  escalationReason?: string;
  citations?: {
    title?: string;
    url?: string;
    document?: string;
    lastVerified?: string;
  }[];
  error?: string;
};

type AlignmentResult = {
  testCase: AlignmentCase;
  actualSource: string;
  errors: string[];
};

const FIXTURE_PATH = path.join(
  process.cwd(),
  "data",
  "evals",
  "alignment-questions.json",
);
const ARABIC_TEXT = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/;
const REQUIRED_CATEGORIES = [
  "academics",
  "accessibility",
  "admissions",
  "advising",
  "alumni",
  "calendar",
  "campus-services",
  "careers",
  "courses",
  "dining",
  "documents",
  "events",
  "exams",
  "fees",
  "financial-aid",
  "graduation",
  "health",
  "housing",
  "international",
  "it",
  "it-safety",
  "library",
  "programs",
  "recreation",
  "registration",
  "safety",
  "scholarships",
  "student-life",
  "transport",
  "wellbeing",
] as const;

function compilePattern(pattern: string, label: string): RegExp {
  try {
    return new RegExp(pattern, "iu");
  } catch (error) {
    throw new Error(
      `${label} has invalid regular expression ${JSON.stringify(pattern)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function isOfficialCitationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "uaeu.ac.ae" ||
      host.endsWith(".uaeu.ac.ae") ||
      host === "u.ae" ||
      host.endsWith(".u.ae") ||
      host === "mohesr.gov.ae" ||
      host.endsWith(".mohesr.gov.ae") ||
      host === "moe.gov.ae" ||
      host.endsWith(".moe.gov.ae")
    );
  } catch {
    return false;
  }
}

function loadFixture(): AlignmentFixture {
  const parsed = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as AlignmentFixture;
  if (parsed.schemaVersion !== 1) {
    throw new Error(`Unsupported alignment fixture schema: ${parsed.schemaVersion}.`);
  }
  if (!Array.isArray(parsed.globalForbiddenPatterns)) {
    throw new Error("globalForbiddenPatterns must be an array.");
  }
  if (!Array.isArray(parsed.cases) || parsed.cases.length < 60) {
    throw new Error(`Alignment fixture needs at least 60 cases; found ${parsed.cases?.length ?? 0}.`);
  }

  const ids = new Set<string>();
  const categories = new Set<string>();
  for (const testCase of parsed.cases) {
    if (!testCase.id || ids.has(testCase.id)) {
      throw new Error(`Missing or duplicate alignment case id: ${testCase.id || "(empty)"}.`);
    }
    ids.add(testCase.id);
    categories.add(testCase.category);

    if (!testCase.question?.trim() || !testCase.expectedAnswerId?.trim()) {
      throw new Error(`${testCase.id} needs a question and expectedAnswerId.`);
    }
    if (!Array.isArray(testCase.requiredPatterns) || !testCase.requiredPatterns.length) {
      throw new Error(`${testCase.id} needs at least one required answer pattern.`);
    }
    if (!Array.isArray(testCase.forbiddenPatterns) || !testCase.forbiddenPatterns.length) {
      throw new Error(`${testCase.id} needs at least one forbidden answer pattern.`);
    }
    if (!Number.isInteger(testCase.minCitations) || testCase.minCitations < 1) {
      throw new Error(`${testCase.id} must require at least one citation.`);
    }
    if (testCase.messages) {
      const latestUser = [...testCase.messages]
        .reverse()
        .find((message) => message.role === "user");
      if (!latestUser || latestUser.content !== testCase.question) {
        throw new Error(`${testCase.id} question must equal its latest user message.`);
      }
    }

    for (const pattern of [
      ...parsed.globalForbiddenPatterns,
      ...testCase.requiredPatterns,
      ...testCase.forbiddenPatterns,
    ]) {
      compilePattern(pattern, testCase.id);
    }
  }

  const missingCategories = REQUIRED_CATEGORIES.filter((category) => !categories.has(category));
  if (missingCategories.length) {
    throw new Error(`Alignment fixture is missing categories: ${missingCategories.join(", ")}.`);
  }
  return parsed;
}

function validateCase(
  fixture: AlignmentFixture,
  testCase: AlignmentCase,
  status: number,
  payload: ChatPayload,
): string[] {
  const errors: string[] = [];
  const content = payload.content ?? "";

  if (status !== 200) {
    errors.push(`expected HTTP 200, received ${status}${payload.error ? ` (${payload.error})` : ""}`);
    return errors;
  }
  if (payload.source !== testCase.expectedSource) {
    errors.push(`expected source ${testCase.expectedSource}, received ${payload.source ?? "none"}`);
  }

  const actualAnswerId =
    payload.source === "faq"
      ? payload.faqId
      : payload.source === "guide"
        ? payload.guide?.id
        : payload.escalationReason;
  if (actualAnswerId !== testCase.expectedAnswerId) {
    errors.push(
      `expected answer/source id ${testCase.expectedAnswerId}, received ${actualAnswerId ?? "none"}`,
    );
  }
  if (
    testCase.expectedEscalationReason &&
    payload.escalationReason !== testCase.expectedEscalationReason
  ) {
    errors.push(
      `expected escalation ${testCase.expectedEscalationReason}, received ${
        payload.escalationReason ?? "none"
      }`,
    );
  }
  if (
    testCase.expectedDisposition &&
    payload.disposition !== testCase.expectedDisposition
  ) {
    errors.push(
      `expected disposition ${testCase.expectedDisposition}, received ${payload.disposition ?? "none"}`,
    );
  }

  if (testCase.expectedSource === "faq" || testCase.expectedSource === "guide") {
    const plainText = content.replace(/[*_#`>-]/g, " ").replace(/\s+/g, " ").trim();
    if (plainText.length < 120) {
      errors.push(`answer is too short to be substantive (${plainText.length} characters)`);
    }
    if (/Needs Official Verification|Human Support|لا تتوفر لدي معلومات موثقة كافية/iu.test(content)) {
      errors.push("expected a direct verified answer, received a generic handoff");
    }
    if (payload.escalationReason) {
      errors.push(`direct answer unexpectedly carried escalation ${payload.escalationReason}`);
    }
  }

  for (const pattern of testCase.requiredPatterns) {
    if (!compilePattern(pattern, testCase.id).test(content)) {
      errors.push(`missing required answer pattern: ${pattern}`);
    }
  }
  for (const pattern of [
    ...fixture.globalForbiddenPatterns,
    ...testCase.forbiddenPatterns,
  ]) {
    if (compilePattern(pattern, testCase.id).test(content)) {
      errors.push(`matched forbidden answer pattern: ${pattern}`);
    }
  }

  if (ARABIC_TEXT.test(testCase.question)) {
    if (!ARABIC_TEXT.test(content)) errors.push("expected an Arabic answer");
  } else if (!/[A-Za-z]/.test(content)) {
    errors.push("expected an English answer");
  }

  const citations = Array.isArray(payload.citations) ? payload.citations : [];
  if (citations.length < testCase.minCitations) {
    errors.push(
      `expected at least ${testCase.minCitations} citation(s), received ${citations.length}`,
    );
  }
  citations.forEach((citation, index) => {
    if (!citation.title?.trim()) errors.push(`citation ${index + 1} has no title`);
    if (!citation.url?.trim()) {
      errors.push(`citation ${index + 1} has no direct URL`);
    } else if (!isOfficialCitationUrl(citation.url)) {
      errors.push(`citation ${index + 1} is not on an approved official domain: ${citation.url}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(citation.lastVerified ?? "")) {
      errors.push(`citation ${index + 1} has no valid lastVerified date`);
    }
  });

  return errors;
}

async function main(): Promise<void> {
  const fixture = loadFixture();

  process.env.AI_PROVIDER = "mock";
  process.env.GEMINI_EMBEDDING_SEARCH = "";
  process.env.SERVER_CHAT_HISTORY = "";
  process.env.CHATBOT_DB_PATH = ":memory:";

  const { POST } = await import("../app/api/chat/route");
  const results: AlignmentResult[] = [];

  for (const [index, testCase] of fixture.cases.entries()) {
    const messages = testCase.messages ?? [
      { role: "user" as const, content: testCase.question },
    ];
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-forwarded-for": `198.51.100.${index + 1}`,
        },
        body: JSON.stringify({ locale: "auto", messages }),
      }),
    );
    const payload = (await response.json()) as ChatPayload;
    results.push({
      testCase,
      actualSource: payload.source ?? "none",
      errors: validateCase(fixture, testCase, response.status, payload),
    });
  }

  const failures = results.filter((result) => result.errors.length > 0);
  const categories = new Set(results.map((result) => result.testCase.category));
  const sourceCounts = new Map<string, number>();
  results.forEach((result) => {
    sourceCounts.set(result.actualSource, (sourceCounts.get(result.actualSource) ?? 0) + 1);
  });

  console.log(`Evaluated ${results.length} alignment cases across ${categories.size} categories.`);
  console.log(`Passed: ${results.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);
  console.log(
    `Actual sources: ${[...sourceCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([source, count]) => `${source}=${count}`)
      .join(", ")}`,
  );

  if (failures.length) {
    console.log("\nAlignment failures:");
    failures.forEach((failure) => {
      console.log(
        `- ${failure.testCase.id} [${failure.testCase.expectedAnswerId}]: ${failure.errors.join("; ")}`,
      );
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
