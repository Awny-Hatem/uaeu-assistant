import type { MinimumGrade, PrerequisiteExpression } from "@/lib/academic/prerequisite-rules";

export type PlannerPrerequisiteStatus = "VERIFIED_RULE" | "VERIFIED_NONE" | "NO_LISTED_RULE" | "UNSUPPORTED";
export type PlannerAvailabilityStatus = "CONFIRMED_OFFERING" | "NOT_OFFERED";

export type PlannerCourse = {
  code: string;
  title: string;
  credits: number;
  finalTermOnly?: boolean;
  exclusiveTerm?: boolean;
  prerequisiteStatus: PlannerPrerequisiteStatus;
  prerequisiteExpression?: PrerequisiteExpression;
  source: { title: string; url: string; verifiedAt: string };
};

export type PlannerTerm = {
  id: string;
  label: string;
  maxCredits: number;
};

export type PlannerAvailability = {
  courseCode: string;
  termId: string;
  status: PlannerAvailabilityStatus;
  verifiedAt: string;
  source: { title: string; url: string };
};

export type SemesterPlan = {
  status: "CONDITIONAL_PLAN" | "PARTIAL_PLAN" | "NO_PLAN";
  terms: {
    id: string;
    label: string;
    creditLimit: number;
    credits: number;
    courses: {
      code: string;
      title: string;
      credits: number;
      availability: "CONFIRMED_OFFERING" | "ASSUMED_FUTURE_OFFERING";
      offeringSource?: PlannerAvailability["source"];
      offeringVerifiedAt?: string;
      prerequisiteAssumptions: string[];
    }[];
  }[];
  unscheduled: { code: string; reason: string }[];
  assumptions: string[];
  blockers: string[];
};

type PrerequisiteOption = {
  completedBefore: Set<string>;
  currentWith: Set<string>;
  minimumGrades: Map<string, MinimumGrade>;
};

const MAX_PREREQUISITE_ALTERNATIVES = 64;
const MAX_EVIDENCE_AGE_DAYS = 180;
const COURSE_CODE = /^[A-Z]{2,8}\d{3,4}[A-Z]?$/u;
const LETTER_GRADE_ORDER: Record<string, number> = {
  F: 0, D: 1, "D+": 2, "C-": 3, C: 4, "C+": 5,
  "B-": 6, B: 7, "B+": 8, "A-": 9, A: 10,
};

function mergeOptions(left: PrerequisiteOption, right: PrerequisiteOption): PrerequisiteOption {
  const minimumGrades = new Map(left.minimumGrades);
  for (const [code, grade] of right.minimumGrades) {
    const prior = minimumGrades.get(code);
    if (prior === undefined) minimumGrades.set(code, grade);
    else if (typeof prior === "number" && typeof grade === "number") minimumGrades.set(code, Math.max(prior, grade));
    else if (typeof prior === "string" && typeof grade === "string") {
      minimumGrades.set(code, LETTER_GRADE_ORDER[prior] >= LETTER_GRADE_ORDER[grade] ? prior : grade);
    } else {
      minimumGrades.set(code, Number.NaN);
    }
  }
  return {
    completedBefore: new Set([...left.completedBefore, ...right.completedBefore]),
    currentWith: new Set([...left.currentWith, ...right.currentWith]),
    minimumGrades,
  };
}

function prerequisiteOptions(expression: PrerequisiteExpression): PrerequisiteOption[] | null {
  if (!("op" in expression)) {
    if (expression.type === "COURSE_CURRENT") {
      return [{ completedBefore: new Set(), currentWith: new Set([expression.courseCode]), minimumGrades: new Map() }];
    }
    const minimumGrades = expression.type === "COURSE_GRADE_AT_LEAST"
      ? new Map([[expression.courseCode, expression.minimumGrade]])
      : new Map<string, MinimumGrade>();
    return [{ completedBefore: new Set([expression.courseCode]), currentWith: new Set(), minimumGrades }];
  }

  const branches = expression.conditions.map(prerequisiteOptions);
  if (branches.some((branch) => !branch)) return null;
  if (expression.op === "OR") {
    const options = branches.flatMap((branch) => branch ?? []);
    return options.length <= MAX_PREREQUISITE_ALTERNATIVES ? options : null;
  }
  let combined: PrerequisiteOption[] = [{ completedBefore: new Set(), currentWith: new Set(), minimumGrades: new Map() }];
  for (const branch of branches as PrerequisiteOption[][]) {
    if (combined.length * branch.length > MAX_PREREQUISITE_ALTERNATIVES) return null;
    combined = combined.flatMap((left) => branch.map((right) => mergeOptions(left, right)));
  }
  return combined;
}

function gradeMeetsMinimum(grade: string | undefined, minimum: MinimumGrade | undefined): boolean {
  if (minimum === undefined) return true;
  if (!grade) return false;
  if (typeof minimum === "number") {
    const numericGrade = Number(grade);
    return Number.isFinite(numericGrade) && numericGrade >= minimum;
  }
  const actual = LETTER_GRADE_ORDER[grade.toUpperCase()];
  const required = LETTER_GRADE_ORDER[minimum];
  return actual !== undefined && required !== undefined && actual >= required;
}

function chooseSatisfiedOption(
  options: PrerequisiteOption[],
  completed: Set<string>,
  sameTerm: Set<string>,
  grades: Map<string, string>,
  assumedPasses: Set<string>,
): PrerequisiteOption | null {
  const satisfied = options.filter((option) => {
    for (const code of option.completedBefore) {
      if (!completed.has(code) || (!assumedPasses.has(code) && !gradeMeetsMinimum(grades.get(code), option.minimumGrades.get(code)))) return false;
    }
    for (const code of option.currentWith) {
      if (!completed.has(code) && !sameTerm.has(code)) return false;
    }
    return true;
  });
  return satisfied.sort((a, b) => a.completedBefore.size + a.currentWith.size - b.completedBefore.size - b.currentWith.size)[0] ?? null;
}

function validateInput(input: {
  courses: PlannerCourse[];
  terms: PlannerTerm[];
  availability: PlannerAvailability[];
  asOf: string;
}): string[] {
  const errors: string[] = [];
  if (!input.courses.length) errors.push("No remaining course requirements were supplied.");
  if (!input.terms.length) errors.push("At least one term with a credit limit is required.");
  if (new Set(input.courses.map(({ code }) => code)).size !== input.courses.length) errors.push("The course list contains duplicate course codes.");
  if (new Set(input.terms.map(({ id }) => id)).size !== input.terms.length) errors.push("The term list contains duplicate identifiers.");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.asOf) || !Number.isFinite(Date.parse(input.asOf))) errors.push("The planning date is invalid.");
  for (const course of input.courses) {
    if (!COURSE_CODE.test(course.code) || !course.title.trim() || !Number.isFinite(course.credits) || course.credits <= 0) {
      errors.push(`Invalid course record: ${course.code || "unknown"}.`);
    }
    if ((course.finalTermOnly !== undefined && typeof course.finalTermOnly !== "boolean") ||
        (course.exclusiveTerm !== undefined && typeof course.exclusiveTerm !== "boolean")) {
      errors.push(`Invalid term constraints for ${course.code || "unknown"}.`);
    }
    if (!course.source?.title || !isUaeuSourceUrl(course.source?.url) || !isDate(course.source?.verifiedAt)) errors.push(`Invalid official course evidence for ${course.code || "unknown"}.`);
    if (course.prerequisiteStatus === "VERIFIED_RULE" && !course.prerequisiteExpression) errors.push(`${course.code} has a rule status but no prerequisite expression.`);
    if (course.prerequisiteStatus !== "VERIFIED_RULE" && course.prerequisiteExpression) errors.push(`${course.code} has an expression without verified rule status.`);
  }
  for (const term of input.terms) {
    if (!term.id.trim() || !term.label.trim() || !Number.isFinite(term.maxCredits) || term.maxCredits <= 0) errors.push(`Invalid term definition: ${term.id || "unknown"}.`);
  }
  for (const offering of input.availability) {
    if (!COURSE_CODE.test(offering.courseCode) || !input.terms.some((term) => term.id === offering.termId) ||
        !isDate(offering.verifiedAt) || !offering.source?.title || !isUaeuSourceUrl(offering.source?.url)) {
      errors.push(`Invalid offering record for ${offering.courseCode || "unknown"}.`);
    }
  }
  return errors;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value));
}

function isUaeuSourceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "uaeu.ac.ae" || url.hostname.endsWith(".uaeu.ac.ae"));
  } catch {
    return false;
  }
}

function isFreshEvidence(verifiedAt: string, asOf: string): boolean {
  const ageDays = Math.floor((Date.parse(asOf) - Date.parse(verifiedAt)) / 86_400_000);
  return Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= MAX_EVIDENCE_AGE_DAYS;
}

/**
 * Creates a deterministic conditional sequence from explicit course requirements,
 * modeled prerequisite rules, term credit limits, and any verified offering data.
 * Missing future-offering data is always marked as an assumption, never as confirmed.
 */
export function buildConditionalSemesterPlan(input: {
  courses: PlannerCourse[];
  completedCourseCodes: string[];
  completedCourseGrades?: Record<string, string>;
  currentCourseCodes?: string[];
  terms: PlannerTerm[];
  availability?: PlannerAvailability[];
  asOf?: string;
}): SemesterPlan {
  const courses = input.courses.map((course) => ({ ...course, code: course.code.toUpperCase() }));
  const terms = input.terms;
  const availability = input.availability ?? [];
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
  const errors = validateInput({ courses, terms, availability, asOf });
  if (errors.length) return { status: "NO_PLAN", terms: [], unscheduled: [], assumptions: [], blockers: errors };

  const courseByCode = new Map(courses.map((course) => [course.code, course]));
  const completed = new Set(input.completedCourseCodes.map((code) => code.toUpperCase()));
  const current = new Set((input.currentCourseCodes ?? []).map((code) => code.toUpperCase()));
  const grades = new Map(Object.entries(input.completedCourseGrades ?? {}).map(([code, grade]) => [code.toUpperCase(), grade.toUpperCase()]));
  for (const code of completed) if (!grades.has(code)) grades.set(code, "PASS");
  const assumptions = new Set<string>();
  const blockers = new Set<string>();
  const unscheduled = new Map<string, string>();
  const scheduledBefore = new Set([...completed, ...current]);
  const assumedPasses = new Set<string>();
  const plannedGrade = new Map(grades);
  const termsOut: SemesterPlan["terms"] = [];
  let remaining = new Set(courses.map(({ code }) => code));

  for (const course of courses) {
    if (!isFreshEvidence(course.source.verifiedAt, asOf)) {
      unscheduled.set(course.code, "The official course evidence is stale or not yet applicable for the planning date.");
    }
    if (course.prerequisiteStatus === "NO_LISTED_RULE") {
      assumptions.add(`${course.code} has no prerequisite wording in the catalog snapshot; this is not confirmation of registration eligibility or absence of other restrictions.`);
    }
    if (course.prerequisiteStatus === "UNSUPPORTED") unscheduled.set(course.code, "The published prerequisite rule is missing or cannot be interpreted safely.");
    if (course.prerequisiteStatus === "VERIFIED_RULE" && !prerequisiteOptions(course.prerequisiteExpression!)) {
      unscheduled.set(course.code, "The prerequisite rule has too many or unsupported alternatives for deterministic planning.");
    }
  }
  for (const code of unscheduled.keys()) remaining.delete(code);

  for (const [termIndex, term] of terms.entries()) {
    let credits = 0;
    let exclusiveCourseScheduled = false;
    const sameTerm = new Set<string>();
    const plannedInTerm: SemesterPlan["terms"][number]["courses"] = [];
    let madeProgress = true;
    while (madeProgress) {
      madeProgress = false;
      for (const code of [...remaining].sort()) {
        const course = courseByCode.get(code)!;
        if ((course.finalTermOnly && termIndex !== terms.length - 1) || exclusiveCourseScheduled ||
            (course.exclusiveTerm && plannedInTerm.length > 0)) continue;
        if (credits + course.credits > term.maxCredits) continue;

        const offering = availability.find((item) => item.courseCode.toUpperCase() === code && item.termId === term.id);
        if (offering?.status === "NOT_OFFERED" && isFreshEvidence(offering.verifiedAt, asOf)) continue;
        const options = course.prerequisiteStatus === "VERIFIED_NONE" || course.prerequisiteStatus === "NO_LISTED_RULE"
          ? [{ completedBefore: new Set<string>(), currentWith: new Set<string>(), minimumGrades: new Map<string, MinimumGrade>() }]
          : prerequisiteOptions(course.prerequisiteExpression!) ?? [];
        const selected = chooseSatisfiedOption(options, scheduledBefore, new Set([...sameTerm, ...current]), plannedGrade, assumedPasses);
        if (!selected) continue;

        const gradeAssumptions = [...selected.minimumGrades].filter(([requiredCode]) => !completed.has(requiredCode) && !current.has(requiredCode))
          .map(([requiredCode, minimum]) => `${requiredCode} earns at least ${minimum}`);
        if (gradeAssumptions.length) assumptions.add(`Assumes planned prerequisite grades meet the published minimum: ${gradeAssumptions.join(", ")}.`);
        if (selected.completedBefore.size || selected.minimumGrades.size) {
          for (const prerequisiteCode of selected.completedBefore) {
            if (!completed.has(prerequisiteCode) && !current.has(prerequisiteCode)) {
              assumptions.add(`Assumes the student passes planned prerequisite ${prerequisiteCode} before taking ${code}.`);
            }
          }
        }

        const plannedOffering = offering?.status === "CONFIRMED_OFFERING" && isFreshEvidence(offering.verifiedAt, asOf);
        if (!plannedOffering) assumptions.add(`${code} has no confirmed offering for ${term.label}; its placement is a planning placeholder.`);
        plannedInTerm.push({
          code,
          title: course.title,
          credits: course.credits,
          availability: plannedOffering ? "CONFIRMED_OFFERING" : "ASSUMED_FUTURE_OFFERING",
          ...(plannedOffering ? { offeringSource: offering.source, offeringVerifiedAt: offering.verifiedAt } : {}),
          prerequisiteAssumptions: gradeAssumptions,
        });
        if (course.exclusiveTerm) exclusiveCourseScheduled = true;
        credits += course.credits;
        sameTerm.add(code);
        remaining.delete(code);
        madeProgress = true;
      }
    }

    if (plannedInTerm.length) {
      termsOut.push({ id: term.id, label: term.label, creditLimit: term.maxCredits, credits, courses: plannedInTerm });
      for (const course of plannedInTerm) {
        scheduledBefore.add(course.code);
        assumedPasses.add(course.code);
      }
    }
    if (!remaining.size) break;
  }

  for (const code of remaining) {
    const course = courseByCode.get(code)!;
    const noTermFits = terms.every((term) => course.credits > term.maxCredits);
    const notOfferedInAnyTerm = terms.length > 0 && terms.every((term) => availability.some((item) =>
      item.courseCode.toUpperCase() === code && item.termId === term.id && item.status === "NOT_OFFERED" && isFreshEvidence(item.verifiedAt, asOf)));
    const finalTermLimitConflict = course.finalTermOnly && terms.length > 0 && course.credits > terms[terms.length - 1].maxCredits;
    const exclusiveFinalTermConflict = course.exclusiveTerm && termsOut.some((term) =>
      term.id === terms[terms.length - 1]?.id && term.courses.length > 0);
    const options = course.prerequisiteStatus === "VERIFIED_RULE" ? prerequisiteOptions(course.prerequisiteExpression!) ?? [] : [];
    const externalDependencies = [...new Set(options.flatMap((option) => [...option.completedBefore, ...option.currentWith]))]
      .filter((dependency) => !completed.has(dependency) && !current.has(dependency) && !courseByCode.has(dependency));
    const reason = noTermFits
      ? `Its ${course.credits}-credit load exceeds every supplied term limit.`
      : finalTermLimitConflict
        ? `It is restricted to the final supplied term, whose ${terms[terms.length - 1].maxCredits}-credit limit is too low.`
      : exclusiveFinalTermConflict
        ? "It must be taken alone in the final supplied term, which already contains other scheduled courses."
      : notOfferedInAnyTerm
        ? "Verified offering data says this course is unavailable in every supplied term."
      : externalDependencies.length
        ? `The planner needs verified completion or transfer status for prerequisite${externalDependencies.length === 1 ? "" : "s"} ${externalDependencies.join(", ")}.`
        : course.prerequisiteStatus === "VERIFIED_RULE"
          ? "Its modeled prerequisites are not satisfied by earlier courses in the supplied plan, or the required courses cannot fit within the supplied terms."
          : course.prerequisiteStatus === "NO_LISTED_RULE"
            ? "The catalog snapshot contains no prerequisite wording for this course; verify its restrictions in Degree Works or with your advisor before registration."
            : "No verified prerequisite status is available for this course.";
    unscheduled.set(code, reason);
  }

  if (unscheduled.size) blockers.add("Not all supplied courses could be scheduled; resolve the listed course and prerequisite blockers before relying on this sequence.");
  if (input.currentCourseCodes?.length) assumptions.add("Assumes each currently enrolled course is completed successfully before the first planned term.");
  if (!availability.length) assumptions.add("No course-offering data was supplied; all future placements are unconfirmed assumptions.");

  const scheduledCount = termsOut.reduce((count, term) => count + term.courses.length, 0);
  return {
    status: scheduledCount === courses.length ? "CONDITIONAL_PLAN" : scheduledCount ? "PARTIAL_PLAN" : "NO_PLAN",
    terms: termsOut,
    unscheduled: [...unscheduled].map(([code, reason]) => ({ code, reason })),
    assumptions: [...assumptions].sort(),
    blockers: [...blockers],
  };
}
