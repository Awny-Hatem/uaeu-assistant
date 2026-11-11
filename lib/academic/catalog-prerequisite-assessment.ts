import { loadOfficialCourseCatalog } from "@/lib/academic/course-catalog";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";
import { academicSnapshotFromMessages, evaluateCatalogPrerequisite, type PrerequisiteConversationAssessment } from "@/lib/academic/prerequisite-rules";

export function assessCatalogPrerequisiteConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): PrerequisiteConversationAssessment | null {
  const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;
  if (!latestQuestion) return null;
  const codes = [...latestQuestion.matchAll(/\b([A-Z]{2,8})\s?(\d{3,4}[A-Z]?)\b/giu)]
    .map((match) => `${match[1]}${match[2]}`.toUpperCase());
  if (new Set(codes).size !== 1) return null;
  const record = loadOfficialCourseCatalog()?.courses.find((course) => course.code === codes[0]);
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
