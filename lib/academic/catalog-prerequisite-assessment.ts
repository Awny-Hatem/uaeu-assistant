import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";
import { academicSnapshotFromMessages, evaluateCatalogPrerequisite, type PrerequisiteConversationAssessment } from "@/lib/academic/prerequisite-rules";

function codesIn(text: string): string[] {
  const matches = [...text.matchAll(/\b([A-Z]{2,8})[\s-]?(\d{3,4}[A-Z]?)\b/giu)];
  return [...new Set(matches.map((match) => `${match[1]}${match[2]}`.toUpperCase()))];
}

function explicitTargetCode(text: string): string | undefined {
  const code = "([A-Z]{2,8}[\\s-]?\\d{3,4}[A-Z]?)";
  const patterns = [
    new RegExp(`\\b(?:take|register\\s+(?:for|in)|enroll\\s+(?:in|for)|enrol\\s+(?:in|for)|eligible\\s+for|allowed\\s+to\\s+take)\\s+(?:the\\s+)?${code}\\b`, "iu"),
    new RegExp(`\\b(?:what|how)\\s+about\\s+(?:the\\s+)?${code}\\b`, "iu"),
    new RegExp(`\\b(?:prerequisites?|corequisites?)\\s+(?:for|of)\\s+(?:the\\s+)?${code}\\b`, "iu"),
    new RegExp(`\\b${code}\\s+(?:prerequisites?|corequisites?)\\b`, "iu"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/[\s-]/gu, "").toUpperCase();
  }
  return undefined;
}

export function assessCatalogPrerequisiteConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): PrerequisiteConversationAssessment | null {
  const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;
  if (!latestQuestion) return null;
  const catalog = loadOfficialCourseCatalog();
  if (!catalog) return null;
  const targetCode = catalogTargetCodeFromMessages(messages);
  if (!targetCode) return null;
  const record = catalog.courses.find((course) => course.code === targetCode);
  if (!record || record.creditHours === null) return null;
  const expression = parseCatalogPrerequisiteExpression(record);
  if (!expression) return null;
  const source = { documentId: `official-course-catalog-${record.code}`, title: record.source.title, url: record.source.url };
  const course = { code: record.code, title: record.title, credits: record.creditHours };
  const evaluation = evaluateCatalogPrerequisite({
    targetCourse: course,
    expression,
    version: record.source.verifiedAt,
    source,
    snapshot: academicSnapshotFromMessages(messages),
  });
  return {
    rule: { id: `official-course-catalog-${record.code}`, course, expression, source, version: record.source.verifiedAt },
    evaluation,
  };
}

/** Resolve only a clearly named target or a short, explicit course follow-up. */
export function catalogTargetCodeFromMessages(
  messages: { role: "user" | "assistant"; content: string }[],
): string | undefined {
  const userMessages = messages.filter((message) => message.role === "user");
  const latestQuestion = userMessages.at(-1)?.content;
  if (!latestQuestion) return undefined;
  const catalog = loadOfficialCourseCatalog();
  if (!catalog) return undefined;

  let candidate = explicitTargetCode(latestQuestion);
  if (!candidate && /\bfirst course\b|\bfirst one\b|\bcourse i (?:first )?mentioned\b/iu.test(latestQuestion)) {
    candidate = userMessages.flatMap(({ content }) => codesIn(content))[0];
  }
  if (!candidate && /\b(?:it|that one|that course|this course|the same course|that class|this class)\b/iu.test(latestQuestion)) {
    const previousMessages = userMessages.slice(0, -1).reverse();
    candidate = previousMessages.map(({ content }) => explicitTargetCode(content)).find(Boolean)
      ?? previousMessages.flatMap(({ content }) => codesIn(content))[0];
  }
  if (!candidate) {
    const currentCodes = codesIn(latestQuestion);
    if (currentCodes.length === 1) candidate = currentCodes[0];
  }
  return candidate && catalog.courses.some((course) => course.code === candidate) ? candidate : undefined;
}

/** Detect short course follow-ups whose requested fact is established earlier in the same chat. */
export function isCoursePrerequisiteFollowUp(
  messages: { role: "user" | "assistant"; content: string }[],
): boolean {
  const userMessages = messages.filter((message) => message.role === "user");
  const latest = userMessages.at(-1)?.content;
  if (!latest || userMessages.length < 2) return false;
  const earlierAskedForPrerequisites = userMessages.slice(0, -1).some(({ content }) =>
    /\b(?:prerequisites?|pre-?reqs?|corequisites?)\b|\b(?:classes|courses)\b.{0,60}\b(?:pass|complete|take)\b.{0,30}\bbefore\b|\bwhat\s+(?:must|do)\s+i\s+complete\s+before\b/iu.test(content));
  if (!earlierAskedForPrerequisites) return false;
  return /\bwhat about\b|\bthat one\b|\bthat course\b|\bthis course\b|\bthe first course\b|\bfirst one\b|\bcourse i (?:first )?mentioned\b|\bminimum grade\b/iu.test(latest);
}
