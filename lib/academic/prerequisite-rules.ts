import rulesData from "@/data/academic/prerequisite-rules.json";

export type Grade = "F" | "D" | "D+" | "C-" | "C" | "C+" | "B-" | "B" | "B+" | "A-" | "A";

export type PrerequisiteExpression =
  | { type: "COURSE_GRADE_AT_LEAST"; courseCode: string; minimumGrade: Grade }
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
  effectiveFrom: string;
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
  resolutionState: "CONDITIONAL" | "UNSUPPORTED";
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
const COURSE_CODE = /^[A-Z]{2,5}\d{3,4}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExpression(value: unknown): value is PrerequisiteExpression {
  if (!isRecord(value)) return false;
  if (value.type === "COURSE_CURRENT") return typeof value.courseCode === "string" && COURSE_CODE.test(value.courseCode);
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
      typeof value.effectiveFrom !== "string" || !Number.isFinite(Date.parse(value.effectiveFrom))) return false;
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
  if (!grade || !VALID_GRADES.has(grade)) {
    results.push({ path, courseCode: code, status: "UNKNOWN", reason: `No recognized completed grade was supplied for ${code}.` });
    return "unknown";
  }
  const satisfied = gradeOrder[grade as Grade] >= gradeOrder[expression.minimumGrade];
  results.push({ path, courseCode: code, status: satisfied ? "SATISFIED" : "NOT_SATISFIED", reason: `${code} grade ${grade} ${satisfied ? "meets" : "does not meet"} the minimum ${expression.minimumGrade}.` });
  return satisfied ? "true" : "false";
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
  if (!Number.isFinite(Date.parse(asOf)) || asOf < rule.effectiveFrom || (rule.effectiveTo && asOf > rule.effectiveTo)) {
    return { targetCourse: rule.course, status: "UNDETERMINED", resolutionState: "UNSUPPORTED", decisionKind: "NON_OFFICIAL_RULE_ASSESSMENT", ruleId: rule.id, ruleVersion: rule.version, conditions: [], source: rule.source, explanation: "The approved rule is not established as effective for the requested date." };
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
    resolutionState: truth === "unknown" ? "UNSUPPORTED" : "CONDITIONAL",
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

function courseCodeFromQuestion(question: string): string | undefined {
  const code = "([A-Z]{2,5}\\d{3,4})";
  const patterns = [
    new RegExp(`\\b(?:can i|may i|am i (?:eligible|allowed) to)\\s+(?:take|register for|enroll in|enrol in)\\s+(?:the\\s+)?${code}\\b`, "i"),
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

function userProvidedSnapshot(messages: { role: "user" | "assistant"; content: string }[]): AcademicSnapshot {
  const completed = new Map<string, Set<string>>();
  const current = new Set<string>();
  const grades = "(A-|A|B\\+|B-|B|C\\+|C-|C|D\\+|D|F)";
  const code = "([A-Z]{2,5}\\d{3,4})";

  for (const message of messages) {
    if (message.role !== "user") continue;
    const clauses = message.content.toUpperCase().split(/[.!?;]|\bBUT\b/);
    for (const clause of clauses) {
      if (/\b(?:NOT|NEVER|DIDN'T|DID NOT|HAVEN'T|HAVE NOT|HASN'T|HAS NOT)\s+(?:YET\s+)?(?:PASSED|COMPLETED|FINISHED|EARNED)\b/.test(clause)) continue;

      const currentPattern = new RegExp(`\\b(?:(?:I AM|I'M)\\s+(?:CURRENTLY\\s+)?TAKING|CURRENTLY\\s+TAKING|(?:I AM\\s+)?(?:CURRENTLY\\s+)?ENROLLED IN|(?:I AM\\s+)?(?:CURRENTLY\\s+)?REGISTERED IN)\\s+${code}\\b`, "g");
      for (const match of clause.matchAll(currentPattern)) {
        const prefix = clause.slice(0, match.index ?? 0);
        if (!/\b(?:NOT|NEVER|NO LONGER)\s*$/.test(prefix)) current.add(match[1]);
      }

      const completionPattern = new RegExp(`\\b(?:PASSED|COMPLETED|FINISHED|EARNED)\\s+(?:COURSE\\s+)?${code}\\b`, "g");
      for (const match of clause.matchAll(completionPattern)) {
        const afterCode = clause.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 28);
        const gradeMatch = afterCode.match(new RegExp(`^\\s+(?:WITH\\s+)?(?:A\\s+)?(?:GRADE\\s+)?${grades}\\b`));
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
  rule: PrerequisiteRule;
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
  return { rule, evaluation: evaluatePrerequisite({ targetCourseCode: targetCode, snapshot: userProvidedSnapshot(messages) }) };
}

function describeExpression(expression: PrerequisiteExpression): string {
  if ("op" in expression) {
    const parts = expression.conditions.map(describeExpression);
    return expression.op === "AND" ? parts.join(" and ") : `either ${parts.join(" or ")}`;
  }
  return expression.type === "COURSE_CURRENT"
    ? `current enrollment in ${expression.courseCode}`
    : `${expression.courseCode} with at least grade ${expression.minimumGrade}`;
}

export function renderPrerequisiteAssessment(
  assessment: PrerequisiteConversationAssessment,
  locale: "en" | "ar",
): string {
  const { rule, evaluation } = assessment;
  if (locale === "ar") {
    const requirement = `المتطلبات المنشورة لمساق ${rule.course.code} (${rule.course.title}): ${describeExpression(rule.expression)}.`;
    const result = evaluation.status === "ELIGIBLE"
      ? "استنادًا إلى الدرجات التي ذكرتها، تبدو متطلبات المساق المحددة في القاعدة مستوفاة. هذا ليس تأكيدًا للتسجيل."
      : evaluation.status === "NOT_ELIGIBLE"
        ? "استنادًا إلى المعلومات التي ذكرتها، لا تتحقق متطلبات المساق المحددة في القاعدة. تحقق من معادلة المقررات أو الاستثناءات مع مرشد كليتك."
        : "لا يمكن حسم متطلباتك من المعلومات المتاحة. أرسل درجات المقررات المطلوبة كما تظهر في سجلك الدراسي.";
    const conditions = evaluation.conditions.map((condition) => `- ${condition.reason}`).join("\n");
    return [requirement, conditions, result, "هذه مقارنة إرشادية مع القاعدة المنشورة باستخدام المعلومات التي أدخلتها؛ لا أستطيع الوصول إلى سجلك، ولا تؤكد النتيجة السماح بالتسجيل أو توفر شعبة. تحقق من Degree Works أو بوابة التسجيل، واسأل مرشدك عن اختلافات الخطة أو المعادلات."]
      .filter(Boolean).join("\n\n");
  }

  const requirement = `The UAEU catalog lists this prerequisite for **${rule.course.code} ${rule.course.title}**: ${describeExpression(rule.expression)}.`;
  const conditions = evaluation.conditions.map((condition) => `- ${condition.reason}`).join("\n");
  const result = evaluation.status === "ELIGIBLE"
    ? "Based on the grades you provided, the modeled prerequisite is satisfied. This does not confirm registration eligibility."
    : evaluation.status === "NOT_ELIGIBLE"
      ? "Based on the information you provided, the modeled prerequisite is not satisfied. Check transfer equivalencies or exceptions with your college advisor."
      : "I cannot determine your result from the details available. Share the grades for the required courses as they appear in your record.";
  return [requirement, conditions, result, "This is a conditional comparison with the published rule using information you entered. I cannot access your record, confirm enrollment permission or section availability, or account for an approved exception. Check Degree Works or the registration portal and confirm cohort-specific cases with your advisor."]
    .filter(Boolean).join("\n\n");
}
