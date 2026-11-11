import type { OfficialCourseRecord } from "@/lib/academic/course-catalog";
import type { Grade, PrerequisiteExpression } from "@/lib/academic/prerequisite-rules";

const COURSE_CODE_PATTERN = /\b([A-Z]{2,8})\s?(\d{3,4}[A-Z]?)\b/giu;
const GRADE_PATTERN = /(?:with\s+)?(?:a\s+)?minimum\s+grade\s+([A-F](?:[+-])?|pass|p)\b/giu;
const VALID_GRADES = new Set<Grade>(["F", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A"]);

type Token = { kind: "course"; expression: PrerequisiteExpression } | { kind: "and" | "or" | "left" | "right" };

function parseItem(text: string): PrerequisiteExpression | null {
  const source = text.trim();
  const courseMatches = [...source.matchAll(COURSE_CODE_PATTERN)];
  if (!courseMatches.length) return null;
  const courses: PrerequisiteExpression[] = [];
  for (const match of courseMatches) {
    const courseCode = `${match[1]}${match[2]}`.toUpperCase();
    const start = (match.index ?? 0) + match[0].length;
    const next = courseMatches.find((candidate) => (candidate.index ?? 0) > (match.index ?? 0));
    const end = next?.index ?? source.length;
    const segment = source.slice(start, end);
    const gradeMatch = [...segment.matchAll(GRADE_PATTERN)][0];
    const grade = gradeMatch?.[1]?.toUpperCase();
    if (grade && !VALID_GRADES.has(grade as Grade) && grade !== "PASS" && grade !== "P") return null;
    courses.push(grade === "PASS" || grade === "P"
      ? { type: "COURSE_COMPLETED", courseCode }
      : grade
        ? { type: "COURSE_GRADE_AT_LEAST", courseCode, minimumGrade: grade as Grade }
        : { type: "COURSE_COMPLETED", courseCode });
  }

  const scrubbed = source.replace(GRADE_PATTERN, " ").replace(COURSE_CODE_PATTERN, " COURSE ");
  const tokenPattern = /\(|\)|\b(?:and|or)\b|\bCOURSE\b/giu;
  const tokens: Token[] = [];
  let cursor = 0;
  let courseIndex = 0;
  for (const match of scrubbed.matchAll(tokenPattern)) {
    const prefix = scrubbed.slice(cursor, match.index).replace(/[\s,;:.]/g, "");
    if (prefix) return null;
    cursor = (match.index ?? 0) + match[0].length;
    const token = match[0].toLowerCase();
    if (token === "course") {
      const course = courses[courseIndex++];
      if (!course) return null;
      tokens.push({ kind: "course", expression: course });
    } else if (token === "and") tokens.push({ kind: "and" });
    else if (token === "or") tokens.push({ kind: "or" });
    else if (token === "(") tokens.push({ kind: "left" });
    else tokens.push({ kind: "right" });
  }
  if (scrubbed.slice(cursor).replace(/[\s,;:.]/g, "") || courseIndex !== courses.length) return null;

  let position = 0;
  const primary = (): PrerequisiteExpression | null => {
    const token = tokens[position++];
    if (!token) return null;
    if (token.kind === "course") return token.expression;
    if (token.kind !== "left") return null;
    const nested = parseOr();
    if (!nested || tokens[position++]?.kind !== "right") return null;
    return nested;
  };
  const parseAnd = (): PrerequisiteExpression | null => {
    const first = primary();
    if (!first) return null;
    const conditions: PrerequisiteExpression[] = [first];
    while (tokens[position]?.kind === "and") {
      position++;
      const next = primary();
      if (!next) return null;
      conditions.push(next);
    }
    return conditions.length === 1 ? conditions[0] : { op: "AND", conditions };
  };
  const parseOr = (): PrerequisiteExpression | null => {
    const first = parseAnd();
    if (!first) return null;
    const conditions: PrerequisiteExpression[] = [first];
    while (tokens[position]?.kind === "or") {
      position++;
      const next = parseAnd();
      if (!next) return null;
      conditions.push(next);
    }
    return conditions.length === 1 ? conditions[0] : { op: "OR", conditions };
  };
  const expression = parseOr();
  return expression && position === tokens.length ? expression : null;
}

/** A listed pre/corequisite may be completed earlier or taken concurrently. */
function mapPriorOrCurrent(expression: PrerequisiteExpression): PrerequisiteExpression | null {
  if ("op" in expression) {
    const conditions = expression.conditions.map(mapPriorOrCurrent);
    if (conditions.some((condition) => !condition)) return null;
    return { op: expression.op, conditions: conditions as PrerequisiteExpression[] };
  }
  if (expression.type === "COURSE_CURRENT") return null;
  return {
    op: "OR",
    conditions: [expression, { type: "COURSE_CURRENT", courseCode: expression.courseCode }],
  };
}

function combineAnd(expressions: PrerequisiteExpression[]): PrerequisiteExpression | null {
  if (!expressions.length) return null;
  return expressions.length === 1 ? expressions[0] : { op: "AND", conditions: expressions };
}

/** Parse only complete, explicit catalog list items; unknown grammar fails closed. */
export function parseCatalogPrerequisiteExpression(record: OfficialCourseRecord): PrerequisiteExpression | null {
  const required = record.prerequisiteItems.map(parseItem);
  if (required.some((expression) => !expression)) return null;
  const corequisites = record.corequisiteItems.map((item) => {
    const parsed = parseItem(item);
    return parsed ? mapPriorOrCurrent(parsed) : null;
  });
  const preCorequisites = record.preCorequisiteItems.map((item) => {
    const parsed = parseItem(item);
    return parsed ? mapPriorOrCurrent(parsed) : null;
  });
  if ([...corequisites, ...preCorequisites].some((expression) => !expression)) return null;
  return combineAnd([
    ...required as PrerequisiteExpression[],
    ...corequisites as PrerequisiteExpression[],
    ...preCorequisites as PrerequisiteExpression[],
  ]);
}
