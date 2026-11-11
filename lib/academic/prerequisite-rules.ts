import rulesData from "@/data/academic/prerequisite-rules.json";

export type Grade = "F" | "D" | "D+" | "C-" | "C" | "C+" | "B-" | "B" | "B+" | "A-" | "A";

export type PrerequisiteExpression =
  | { type: "COURSE_GRADE_AT_LEAST"; courseCode: string; minimumGrade: Grade }
  | { type: "COURSE_COMPLETED"; courseCode: string }
  | { type: "COURSE_CURRENT"; courseCode: string }
  | { op: "AND" | "OR"; conditions: PrerequisiteExpression[] };

export type PrerequisiteRule = {
  schemaVersion: 1;
  id: string;
  version: string;
  status: "approved";
  ruleType: "PREREQUISITE";
  course: { code: string; title: string; credits: number };
  degreeLevel: "undergraduate" | "postgraduate";
  /** Date the current catalog entry was checked; this is not a policy effective date. */
  verifiedAt: string;
  /** Only populate when the authoritative source explicitly gives a policy start date. */
  effectiveFrom?: string;
  effectiveTo?: string;
  source: { documentId: string; title: string; url: string };
  expression: PrerequisiteExpression;
};

export type RuleConditionResult = {
  path: string;
  courseCode?: string;
  status: "SATISFIED" | "NOT_SATISFIED" | "UNKNOWN";
  reason: string;
};

export type PrerequisiteEvaluation = {
  targetCourse: { code: string; title: string; credits: number };
  status: "ELIGIBLE" | "NOT_ELIGIBLE" | "UNDETERMINED";
  resolutionState: "CONDITIONAL" | "MISSING_CONTEXT" | "UNSUPPORTED";
  decisionKind: "NON_OFFICIAL_RULE_ASSESSMENT";
  ruleId?: string;
  ruleVersion?: string;
  conditions: RuleConditionResult[];
  source?: PrerequisiteRule["source"];
  explanation: string;
};

export type AcademicSnapshot = {
  completedCourses: { courseCode: string; grade: string }[];
  currentCourses?: string[];
};

const gradeOrder: Record<Grade, number> = {
  F: 0, D: 1, "D+": 2, "C-": 3, C: 4, "C+": 5,
  "B-": 6, B: 7, "B+": 8, "A-": 9, A: 10,
};
const VALID_GRADES = new Set(Object.keys(gradeOrder));
const COURSE_CODE = /^[A-Z]{2,8}\d{3,4}[A-Z]?$/;
const MAX_RULE_AGE_DAYS = 180;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExpression(value: unknown): value is PrerequisiteExpression {
  if (!isRecord(value)) return false;
  if (value.type === "COURSE_CURRENT") return typeof value.courseCode === "string" && COURSE_CODE.test(value.courseCode);
  if (value.type === "COURSE_COMPLETED") return typeof value.courseCode === "string" && COURSE_CODE.test(value.courseCode);
  if (value.type === "COURSE_GRADE_AT_LEAST") {
    return typeof value.courseCode === "string" && COURSE_CODE.test(value.courseCode) &&
      typeof value.minimumGrade === "string" && VALID_GRADES.has(value.minimumGrade);
  }
  return (value.op === "AND" || value.op === "OR") && Array.isArray(value.conditions) &&
    value.conditions.length > 0 && value.conditions.every(isExpression);
}

function validateRule(value: unknown): value is PrerequisiteRule {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.status !== "approved" || value.ruleType !== "PREREQUISITE") return false;
  if (typeof value.id !== "string" || !value.id || typeof value.version !== "string" ||
      typeof value.verifiedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.verifiedAt) ||
      !Number.isFinite(Date.parse(value.verifiedAt))) return false;
  if (value.effectiveFrom !== undefined && (typeof value.effectiveFrom !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.effectiveFrom) || !Number.isFinite(Date.parse(value.effectiveFrom)))) return false;
  if (value.effectiveTo !== undefined && (typeof value.effectiveTo !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.effectiveTo) || !Number.isFinite(Date.parse(value.effectiveTo)))) return false;
  if (!isRecord(value.course) || typeof value.course.code !== "string" || !COURSE_CODE.test(value.course.code) ||
      typeof value.course.title !== "string" || typeof value.course.credits !== "number" || value.course.credits <= 0) return false;
  if (!isRecord(value.source) || typeof value.source.documentId !== "string" || typeof value.source.title !== "string" || typeof value.source.url !== "string") return false;
  try {
    const url = new URL(value.source.url);
    if (url.protocol !== "https:" || !(url.hostname === "uaeu.ac.ae" || url.hostname.endsWith(".uaeu.ac.ae"))) return false;
  } catch { return false; }
  return (value.degreeLevel === "undergraduate" || value.degreeLevel === "postgraduate") && isExpression(value.expression);
}

const rules = rulesData as unknown;
if (!Array.isArray(rules) || !rules.every(validateRule) || new Set(rules.map((rule) => rule.id)).size !== rules.length) {
  throw new Error("The approved prerequisite rule catalog failed validation.");
}
const prerequisiteRules = rules as PrerequisiteRule[];

type Truth = "true" | "false" | "unknown";

function evaluateExpression(
  expression: PrerequisiteExpression,
  snapshot: AcademicSnapshot,
  path: string,
  results: RuleConditionResult[],
): Truth {
  if ("op" in expression) {
    const children = expression.conditions.map((condition, index) => evaluateExpression(condition, snapshot, `${path}.${index + 1}`, results));
    if (expression.op === "AND") return children.includes("false") ? "false" : children.includes("unknown") ? "unknown" : "true";
    return children.includes("true") ? "true" : children.includes("unknown") ? "unknown" : "false";
  }

  const code = expression.courseCode;
  if (expression.type === "COURSE_CURRENT") {
    const current = new Set((snapshot.currentCourses ?? []).map((item) => item.trim().toUpperCase()));
    const satisfied = current.has(code);
    results.push({ path, courseCode: code, status: satisfied ? "SATISFIED" : "NOT_SATISFIED", reason: satisfied ? `${code} is listed as current.` : `${code} is not listed as current.` });
    return satisfied ? "true" : "false";
  }

  const matching = snapshot.completedCourses.filter((item) => item.courseCode.trim().toUpperCase() === code);
  const grades = [...new Set(matching.map((item) => item.grade.trim().toUpperCase()))];
  if (grades.length > 1) {
    results.push({ path, courseCode: code, status: "UNKNOWN", reason: `Conflicting grades were supplied for ${code}.` });
    return "unknown";
  }
  const grade = grades[0];
  if (expression.type === "COURSE_COMPLETED") {
    if (!grade || (!VALID_GRADES.has(grade) && grade !== "PASS" && grade !== "P")) {
      results.push({ path, courseCode: code, status: "UNKNOWN", reason: `No recognized completed result was supplied for ${code}.` });
      return "unknown";
    }
    const satisfied = grade !== "F";
    results.push({ path, courseCode: code, status: satisfied ? "SATISFIED" : "NOT_SATISFIED", reason: satisfied ? `${code} is recorded with a passing grade.` : `${code} is recorded with a failing grade.` });
    return satisfied ? "true" : "false";
  }
  if (!grade || !VALID_GRADES.has(grade)) {
    results.push({ path, courseCode: code, status: "UNKNOWN", reason: `No recognized completed grade was supplied for ${code}.` });
    return "unknown";
  }
  const satisfied = gradeOrder[grade as Grade] >= gradeOrder[expression.minimumGrade];
  results.push({ path, courseCode: code, status: satisfied ? "SATISFIED" : "NOT_SATISFIED", reason: `${code} grade ${grade} ${satisfied ? "meets" : "does not meet"} the minimum ${expression.minimumGrade}.` });
  return satisfied ? "true" : "false";
}

export function evaluateCatalogPrerequisite(input: {
  targetCourse: { code: string; title: string; credits: number };
  expression: PrerequisiteExpression;
  version: string;
  source: PrerequisiteRule["source"];
  snapshot: AcademicSnapshot;
  asOf?: string;
}): PrerequisiteEvaluation {
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
  const ageDays = Math.floor((Date.parse(asOf) - Date.parse(input.version)) / 86_400_000);
  if (!Number.isFinite(Date.parse(asOf)) || !Number.isFinite(Date.parse(input.version)) || ageDays < 0 || ageDays > MAX_RULE_AGE_DAYS) {
    return {
      targetCourse: input.targetCourse,
      status: "UNDETERMINED",
      resolutionState: "UNSUPPORTED",
      decisionKind: "NON_OFFICIAL_RULE_ASSESSMENT",
      conditions: [],
      source: input.source,
      explanation: "The catalog evidence is stale or not valid for the requested date and must be re-verified before applying the course rule.",
    };
  }
  const conditions: RuleConditionResult[] = [];
  const truth = evaluateExpression(input.expression, input.snapshot, "1", conditions);
  const status = truth === "true" ? "ELIGIBLE" : truth === "false" ? "NOT_ELIGIBLE" : "UNDETERMINED";
  return {
    targetCourse: input.targetCourse,
    status,
    resolutionState: truth === "unknown" ? "MISSING_CONTEXT" : "CONDITIONAL",
    decisionKind: "NON_OFFICIAL_RULE_ASSESSMENT",
    ruleId: `course-catalog:${input.targetCourse.code}`,
    ruleVersion: input.version,
    conditions,
    source: input.source,
    explanation: status === "ELIGIBLE"
      ? "The supplied course information satisfies the parsed catalog requirements. This is not a registration approval."
      : status === "NOT_ELIGIBLE"
        ? "The supplied course information does not satisfy the parsed catalog requirements. Confirm equivalencies or exceptions with your college."
        : "The catalog requirement result cannot be established from the supplied course information.",
  };
}

/**
 * Evaluate published prerequisite expressions against a supplied course snapshot.
 * The result is always a conditional assessment, never UAEU registration approval.
 */
export function evaluatePrerequisite(input: {
  targetCourseCode: string;
  snapshot: AcademicSnapshot;
  asOf?: string;
}): PrerequisiteEvaluation {
  const targetCode = input.targetCourseCode.trim().toUpperCase();
  const rule = prerequisiteRules.find((item) => item.course.code === targetCode);
  const empty = { code: targetCode, title: targetCode || "Unknown course", credits: 0 };
  if (!rule) {
    return { targetCourse: empty, status: "UNDETERMINED", resolutionState: "UNSUPPORTED", decisionKind: "NON_OFFICIAL_RULE_ASSESSMENT", conditions: [], explanation: "No approved prerequisite rule is modeled for this course." };
  }

  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
  const ageDays = Math.floor((Date.parse(asOf) - Date.parse(rule.verifiedAt)) / 86_400_000);
  if (!Number.isFinite(Date.parse(asOf)) || ageDays < 0 || ageDays > MAX_RULE_AGE_DAYS ||
      (rule.effectiveFrom !== undefined && asOf < rule.effectiveFrom) || (rule.effectiveTo && asOf > rule.effectiveTo)) {
    return { targetCourse: rule.course, status: "UNDETERMINED", resolutionState: "UNSUPPORTED", decisionKind: "NON_OFFICIAL_RULE_ASSESSMENT", ruleId: rule.id, ruleVersion: rule.version, conditions: [], source: rule.source, explanation: ageDays > MAX_RULE_AGE_DAYS ? "The catalog evidence is stale and must be re-verified before this rule can be applied." : "The approved rule is not established by the verified catalog snapshot for the requested date." };
  }

  const conditions: RuleConditionResult[] = [];
  const truth = evaluateExpression(rule.expression, input.snapshot, "1", conditions);
  const status = truth === "true" ? "ELIGIBLE" : truth === "false" ? "NOT_ELIGIBLE" : "UNDETERMINED";
  const explanation = status === "ELIGIBLE"
    ? "The supplied course information satisfies the modeled prerequisite expression. This is not a registration approval."
    : status === "NOT_ELIGIBLE"
      ? "The supplied course information does not satisfy the modeled prerequisite expression. Confirm transfer equivalencies or exceptions with your college."
      : "The prerequisite result cannot be established from the supplied course information.";
  return {
    targetCourse: rule.course,
    status,
    resolutionState: truth === "unknown" ? "MISSING_CONTEXT" : "CONDITIONAL",
    decisionKind: "NON_OFFICIAL_RULE_ASSESSMENT",
    ruleId: rule.id,
    ruleVersion: rule.version,
    conditions,
    source: rule.source,
    explanation,
  };
}

export function listModeledPrerequisiteCourses(): PrerequisiteRule["course"][] {
  return prerequisiteRules.map(({ course }) => course);
}

export function asksPersonalPrerequisiteEligibility(question: string): boolean {
  return /\b(?:can i|may i|am i|do i meet|eligible to|allowed to|register for|registration eligibility|enroll in|enrol in|my grade|my grades|my record|my transcript|based on my)\b/iu.test(question) ||
    /(?:Ù‡Ù„\s*(?:Ø£Ø³ØªØ·ÙŠØ¹|ÙŠÙ…ÙƒÙ†Ù†ÙŠ)|Ù‡Ù„ Ø£Ø³Ø¬Ù„|Ø£Ù‡Ù„ Ø£Ù†|Ø£Ø³ØªÙˆÙÙŠ)/u.test(question) ||
    /\u0647\u0644\s*(?:\u0623\u0633\u062a\u0637\u064a\u0639|\u064a\u0645\u0643\u0646\u0646\u064a).*(?:\u062a\u0633\u062c\u064a\u0644|\u0623\u062f\u0631\u0633|\u0622\u062e\u0630)/u.test(question);
}

function courseCodeFromQuestion(question: string): string | undefined {
  const code = "([A-Z]{2,8}\\d{3,4}[A-Z]?)";
  const patterns = [
    new RegExp(`\\b(?:can i|may i|am i (?:eligible|allowed) to)\\s+(?:take|register for|enroll in|enrol in)\\s+(?:the\\s+)?${code}\\b`, "i"),
    new RegExp(`(?:هل\\s+(?:أستطيع|استطيع|يمكنني|اقدر)\\s+(?:أن\\s+)?(?:آخذ|اخذ|أسجل|اسجل|تسجيل|التحاق|ادرس|أدرس)|(?:ما\\s+)?(?:المتطلبات السابقة|المتطلب السابق|متطلبات)\\s+(?:مساق\\s+|لمساق\\s+|مادة\\s+|لمادة\\s+)?)\\s+${code}\\b`, "u"),
    new RegExp(`\\b(?:prerequisites?|pre-?requisites?|pre-?reqs?|corequisites?|requirements?)\\s+(?:for|of)\\s+(?:the\\s+)?${code}\\b`, "i"),
    new RegExp(`\\b${code}\\s+(?:prerequisites?|pre-?requisites?|pre-?reqs?|corequisites?)\\b`, "i"),
    new RegExp(`\\bwhat\\s+(?:are|is)\\s+(?:the\\s+)?(?:prerequisites?|requirements?)\\s+(?:for|of|to take)\\s+(?:the\\s+)?${code}\\b`, "i"),
    new RegExp(`\\bwhat\\s+(?:do i need|must i complete)\\s+(?:before|to take)\\s+(?:the\\s+)?${code}\\b`, "i"),
    new RegExp(`\\b${code}\\b.{0,40}\\b(?:prerequisites?|pre-?requisites?|corequisites?)\\b`, "i"),
  ];
  for (const pattern of patterns) {
    const match = question.match(pattern);
    const target = match?.[1]?.toUpperCase();
    if (target && prerequisiteRules.some((rule) => rule.course.code === target)) return target;
  }
  return undefined;
}

export function academicSnapshotFromMessages(messages: { role: "user" | "assistant"; content: string }[]): AcademicSnapshot {
  const completed = new Map<string, Set<string>>();
  const current = new Set<string>();
  const grades = "(PASS|P|A-|A|B\\+|B-|B|C\\+|C-|C|D\\+|D|F)";
  const code = "([A-Z]{2,8}\\d{3,4}[A-Z]?)";

  for (const message of messages) {
    if (message.role !== "user") continue;
    const clauses = message.content.toUpperCase().split(/[.!?;]|\bBUT\b/);
    for (const clause of clauses) {
      if (/(?:لم|ما)\s+(?:أجتز|اجتز|نجح|أكمل|اكمل|أنهِ|انهِ)/u.test(clause)) continue;
      if (/\b(?:NOT|NEVER|DIDN'T|DID NOT|HAVEN'T|HAVE NOT|HASN'T|HAS NOT)\s+(?:YET\s+)?(?:PASSED|COMPLETED|FINISHED|EARNED)\b/.test(clause)) continue;

      const currentPattern = new RegExp(`\\b(?:(?:I AM|I'M)\\s+(?:CURRENTLY\\s+)?TAKING|CURRENTLY\\s+TAKING|(?:I AM\\s+)?(?:CURRENTLY\\s+)?ENROLLED IN|(?:I AM\\s+)?(?:CURRENTLY\\s+)?REGISTERED IN)\\s+${code}\\b`, "g");
      for (const match of clause.matchAll(currentPattern)) {
        const prefix = clause.slice(0, match.index ?? 0);
        if (!/\b(?:NOT|NEVER|NO LONGER)\s*$/.test(prefix)) current.add(match[1]);
      }

      const arabicCurrentPattern = new RegExp(`(?:أنا\\s+|انا\\s+)?(?:أدرس|ادرس|أسجل في|اسجل في|مسجل(?:ة)? في|ملتحق(?:ة)? ب?مساق|آخذ|اخذ)\\s+${code}\\b`, "gu");
      for (const match of clause.matchAll(arabicCurrentPattern)) {
        const prefix = clause.slice(0, match.index ?? 0);
        if (!/(?:لا|لست|لم|ما)\s*$/u.test(prefix)) current.add(match[1]);
      }

      const completionPattern = new RegExp(`\\b(PASSED|COMPLETED|FINISHED|EARNED)\\s+(?:COURSE\\s+)?${code}\\b`, "g");
      for (const match of clause.matchAll(completionPattern)) {
        const recordCompletedCourse = (courseCode: string, verb: string, cursor: number) => {
          const afterCode = clause.slice(cursor, cursor + 28);
          const gradeMatch = afterCode.match(new RegExp(`^\\s+(?:WITH\\s+)?(?:A\\s+)?(?:GRADE\\s+)?${grades}\\b`));
          const values = completed.get(courseCode) ?? new Set<string>();
          values.add(gradeMatch?.[1] ?? (verb === "PASSED" || verb === "EARNED" ? "PASS" : ""));
          completed.set(courseCode, values);
          return cursor + (gradeMatch?.[0].length ?? 0);
        };
        let cursor = (match.index ?? 0) + match[0].length;
        cursor = recordCompletedCourse(match[2], match[1], cursor);
        const coordinatedCourse = new RegExp(`^\\s*(?:,\\s*(?:AND\\s+)?|AND\\s+)${code}\\b`, "i");
        while (true) {
          const next = coordinatedCourse.exec(clause.slice(cursor));
          if (!next) break;
          const nextCourseCode = next[1];
          cursor += next[0].length;
          cursor = recordCompletedCourse(nextCourseCode, match[1], cursor);
        }
      }

      const arabicCompletionPattern = new RegExp(`(?:اجتزت|نجحت في|أنهيت|انهيت|أكملت|اكملت)\\s+(?:المساق\\s+)?${code}\\b`, "gu");
      for (const match of clause.matchAll(arabicCompletionPattern)) {
        const prefix = clause.slice(0, match.index ?? 0);
        if (/(?:لم|ما)\s*$/u.test(prefix)) continue;
        const afterCode = clause.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 28);
        const gradeMatch = afterCode.match(new RegExp(`^\\s*(?:بدرجة|بتقدير|درجة)\\s*(?:GRADE\\s*)?${grades}\\b`, "u"));
        const values = completed.get(match[1]) ?? new Set<string>();
        values.add(gradeMatch?.[1] ?? "");
        completed.set(match[1], values);
      }

      if (/\b(?:PASSED|COMPLETED|FINISHED|EARNED)\b/.test(clause)) {
        const adjacentGradePattern = new RegExp(`\\b${code}\\s+(?:WITH\\s+(?:A\\s+)?(?:GRADE\\s+)?|GRADE(?:D)?\\s*(?:OF\\s*)?)${grades}\\b`, "g");
        for (const match of clause.matchAll(adjacentGradePattern)) {
          const values = completed.get(match[1]) ?? new Set<string>();
          values.add(match[2]);
          completed.set(match[1], values);
        }
      }

      const reverseGradePattern = new RegExp(`\\b(?:GOT|EARNED|RECEIVED|SCORED)\\s+(?:A\\s+)?${grades}\\s+(?:IN|FOR)\\s+(?:COURSE\\s+)?${code}\\b`, "g");
      for (const match of clause.matchAll(reverseGradePattern)) {
        const prefix = clause.slice(0, match.index ?? 0);
        if (/\b(?:NOT|NEVER|DIDN'T|DID NOT|HAVEN'T|HAVE NOT|HASN'T|HAS NOT)\s*$/.test(prefix)) continue;
        const values = completed.get(match[2]) ?? new Set<string>();
        values.add(match[1]);
        completed.set(match[2], values);
      }
    }
  }

  return {
    completedCourses: [...completed].flatMap(([courseCode, values]) => [...values].map((grade) => ({ courseCode, grade }))),
    currentCourses: [...current],
  };
}

export type PrerequisiteConversationAssessment = {
  rule: Pick<PrerequisiteRule, "id" | "course" | "expression" | "source" | "version">;
  evaluation: PrerequisiteEvaluation;
};

export function assessPrerequisiteConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): PrerequisiteConversationAssessment | null {
  const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;
  if (!latestQuestion) return null;
  const targetCode = courseCodeFromQuestion(latestQuestion);
  if (!targetCode) return null;
  const rule = prerequisiteRules.find((item) => item.course.code === targetCode);
  if (!rule) return null;
  return { rule, evaluation: evaluatePrerequisite({ targetCourseCode: targetCode, snapshot: academicSnapshotFromMessages(messages) }) };
}

function completedOrCurrentPair(expression: PrerequisiteExpression): string | null {
  if (!("op" in expression) || expression.op !== "OR" || expression.conditions.length !== 2) return null;
  const current = expression.conditions.find((condition) => !("op" in condition) && condition.type === "COURSE_CURRENT");
  const completed = expression.conditions.find((condition) => !("op" in condition) && condition.type !== "COURSE_CURRENT");
  if (!current || !completed || "op" in current || "op" in completed || current.courseCode !== completed.courseCode) return null;
  return current.courseCode;
}

function describeExpression(expression: PrerequisiteExpression, locale: "en" | "ar" = "en"): string {
  if ("op" in expression) {
    if (expression.op === "OR") {
      const codes = expression.conditions.map(completedOrCurrentPair);
      if (codes.every((code): code is string => code !== null)) {
        return codes.length === 1
          ? locale === "ar"
            ? `\u0625\u062a\u0645\u0627\u0645 \u0623\u0648 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062d\u0627\u0644\u064a \u0641\u064a ${codes[0]}`
            : `completion or current enrollment in ${codes[0]}`
          : locale === "ar"
            ? `\u0625\u062a\u0645\u0627\u0645 \u0623\u062d\u062f \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a ${codes.join(" \u0623\u0648 ")} \u0623\u0648 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062d\u0627\u0644\u064a \u0641\u064a \u0623\u062d\u062f\u0647\u0627`
            : `completion of, or current enrollment in, either ${codes.join(" or ")}`;
      }
    }
    const parts = expression.conditions.map((condition) => describeExpression(condition, locale));
    if (locale === "ar") return expression.op === "AND" ? parts.join(" و ") : `إما ${parts.join(" أو ")}`;
    return expression.op === "AND" ? parts.join(" and ") : `either ${parts.join(" or ")}`;
  }
  if (expression.type === "COURSE_COMPLETED") {
    return locale === "ar" ? `Ø¥ÙƒÙ…Ø§Ù„ ${expression.courseCode}` : `completion of ${expression.courseCode}`;
  }
  if (locale === "ar") return expression.type === "COURSE_CURRENT"
    ? `التسجيل الحالي في ${expression.courseCode}`
    : `${expression.courseCode} بدرجة لا تقل عن ${expression.minimumGrade}`;
  return expression.type === "COURSE_CURRENT"
    ? `current enrollment in ${expression.courseCode}`
    : `${expression.courseCode} with at least grade ${expression.minimumGrade}`;
}

export function renderPrerequisiteAssessment(
  assessment: PrerequisiteConversationAssessment,
  locale: "en" | "ar",
): string {
  const { rule, evaluation } = assessment;
  const relevantConditions = evaluation.status === "ELIGIBLE"
    ? evaluation.conditions.filter((condition) => condition.status === "SATISFIED")
    : evaluation.conditions;
  if (locale === "ar") {
    const requirement = `المتطلبات المنشورة لمساق ${rule.course.code} (${rule.course.title}): ${describeExpression(rule.expression, locale)}.`;
    const result = evaluation.status === "ELIGIBLE"
      ? "استنادًا إلى معلومات المقررات التي ذكرتها، تبدو متطلبات المساق المحددة في القاعدة مستوفاة. هذا ليس تأكيدًا للتسجيل."
      : evaluation.status === "NOT_ELIGIBLE"
        ? "استنادًا إلى المعلومات التي ذكرتها، لا تتحقق متطلبات المساق المحددة في القاعدة. تحقق من معادلة المقررات أو الاستثناءات مع مرشد كليتك."
        : "لا يمكن حسم متطلباتك من المعلومات المتاحة. أرسل درجات المقررات المطلوبة كما تظهر في سجلك الدراسي.";
    const conditions = relevantConditions.map((condition) => `- ${condition.status === "SATISFIED" ? "المعلومات المدخلة تستوفي الشرط" : condition.status === "NOT_SATISFIED" ? "المعلومات المدخلة لا تستوفي الشرط" : "لا تتوفر معلومات كافية للتحقق من الشرط"} الخاص بـ ${condition.courseCode}.`).join("\n");
    return [requirement, conditions, result, "هذه مقارنة إرشادية مع القاعدة المنشورة باستخدام المعلومات التي أدخلتها؛ لا أستطيع الوصول إلى سجلك، ولا تؤكد النتيجة السماح بالتسجيل أو توفر شعبة. تحقق من Degree Works أو بوابة التسجيل، واسأل مرشدك عن اختلافات الخطة أو المعادلات."]
      .filter(Boolean).join("\n\n");
  }

  const requirement = `The UAEU catalog lists this course requirement for **${rule.course.code} ${rule.course.title}**: ${describeExpression(rule.expression, locale)}.`;
  const conditions = relevantConditions.map((condition) => `- ${condition.reason}`).join("\n");
  const result = evaluation.status === "ELIGIBLE"
    ? "Based on the course information you provided, the modeled prerequisite is satisfied. This does not confirm registration eligibility."
    : evaluation.status === "NOT_ELIGIBLE"
      ? "Based on the information you provided, the modeled prerequisite is not satisfied. Check transfer equivalencies or exceptions with your college advisor."
      : "I cannot determine your result from the details available. Share the grades for the required courses as they appear in your record.";
  return [requirement, conditions, result, "This is a conditional comparison with the published rule using information you entered. I cannot access your record, confirm enrollment permission or section availability, or account for an approved exception. Check Degree Works or the registration portal and confirm cohort-specific cases with your advisor."]
    .filter(Boolean).join("\n\n");
}
