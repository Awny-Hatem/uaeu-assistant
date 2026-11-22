"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { GraduationCap, LoaderCircle, X } from "lucide-react";
import type { UiLocale } from "@/lib/ui-copy";

type PublishedVersionOption = { id: string; version: string; cohortLabel: string; totalCredits: number };
type ProgramOption = { id: string; name: string; college: string; curriculumAvailable: boolean; cohorts: number[]; publishedVersions: PublishedVersionOption[]; continuingOnly?: boolean };
type CourseOption = {
  code: string;
  title: string;
  credits: number;
  groups: { id: string; name: string; type: string; chooseCount?: number; credits?: number }[];
  source: { title: string; url: string; verifiedAt: string };
};
type PlanningChoice = {
  id: string;
  name: string;
  type: string;
  courseCodes: string[];
  chooseCount?: number;
  credits?: number;
  selectionNote?: string;
  conditionalOn?: string;
};
type CurriculumOptions = {
  program: { id: string; name: string; college: string };
  cohort: { year: number | null; label: string; version: string; versionId?: string; totalCredits: number; selectionMode: "cohort-matched" | "published-version-selected" };
  courses: CourseOption[];
  requirementSummary: {
    mandatoryCourseCodes: string[];
    choiceGroups: PlanningChoice[];
    conditionalGroups: PlanningChoice[];
    pathwayChoices: { id: string; name: string; options: PlanningChoice[] }[];
    creditBlocksNotAssessed: { id: string; name: string; credits: number; ruleNote: string; conditionalOn?: string }[];
  };
  unavailableCourses: string[];
  sources: { title: string; url: string; lastVerified: string }[];
  limitations: string[];
};
type PlannedSchedule = {
  status: "CONDITIONAL_PLAN" | "PARTIAL_PLAN" | "NO_PLAN";
  terms: { id: string; label: string; credits: number; creditLimit: number; courses: { code: string; title: string; credits: number; availability: string; prerequisiteAssumptions: string[] }[] }[];
  unscheduled: { code: string; reason: string }[];
  assumptions: string[];
  blockers: string[];
};
type SequenceResult = {
  plan: PlannedSchedule;
  comparisonPlan?: PlannedSchedule;
  comparisonMaxCredits?: number;
  courseSources: { code: string; title: string; url: string; verifiedAt: string }[];
  scope: {
    programName: string;
    cohortYear: number | null;
    curriculumSelectionMode: "cohort-matched" | "published-version-selected";
    cohortLabel: string;
    curriculumVersion: string;
    curriculumCredits: number;
    curriculumSources: { title: string; url: string; lastVerified: string }[];
    reportedInputs: {
      completedCourseCodes: string[];
      currentCourseCodes: string[];
      remainingCourseCodes: string[];
      repeatCourseCodes: string[];
      transferCourseCodes: string[];
      completedCourseGrades: Record<string, string>;
      terms: { label: string; maxCredits: number }[];
      comparisonMaxCredits?: number;
    };
    transferReview: string;
    disclaimer: string;
  };
};

function parseCodes(value: string): string[] {
  return [...new Set(value.split(/[\n,;]+/u).map((part) => part.trim().replace(/[\s-]+/gu, "").toUpperCase()).filter(Boolean))];
}

function parseCourseGrades(value: string): Record<string, string> | null {
  const entries = value.split(/[\n;]+/u).map((entry) => entry.trim()).filter(Boolean);
  const grades: Record<string, string> = {};
  for (const entry of entries) {
    const match = entry.match(/^([A-Z]{2,8}[\s-]*\d{3,4}[A-Z]?)\s*:\s*(\d{1,3}(?:\.\d+)?|A-?|B[+-]?|C[+-]?|D\+?)$/iu);
    if (!match) return null;
    const code = match[1].replace(/[\s-]+/gu, "").toUpperCase();
    const grade = match[2].toUpperCase();
    const numericGrade = Number(grade);
    if (Object.hasOwn(grades, code) || (/^\d/u.test(grade) && (numericGrade < 0 || numericGrade > 100)) || grade === "F") return null;
    grades[code] = grade;
  }
  return grades;
}

export function AcademicSequencePlanner({
  open,
  language,
  onClose,
  onUse,
}: {
  open: boolean;
  language: UiLocale;
  onClose: () => void;
  onUse: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [programId, setProgramId] = useState("");
  const [cohortYear, setCohortYear] = useState("");
  const [publishedVersionId, setPublishedVersionId] = useState("");
  const [curriculum, setCurriculum] = useState<CurriculumOptions | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [completedText, setCompletedText] = useState("");
  const [completedGradeText, setCompletedGradeText] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [repeatText, setRepeatText] = useState("");
  const [transferText, setTransferText] = useState("");
  const [termText, setTermText] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [comparisonCreditLimit, setComparisonCreditLimit] = useState("");
  const [result, setResult] = useState<SequenceResult | null>(null);
  const [error, setError] = useState("");
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const labels = language === "ar" ? {
    repeats: "\u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0625\u0639\u0627\u062f\u0629 \u062f\u0631\u0627\u0633\u062a\u0647\u0627 (\u0631\u0645\u0648\u0632 \u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0648\u0627\u0635\u0644)",
    repeatsHint: "\u0633\u062a\u064f\u062f\u0631\u062c \u0647\u0630\u0647 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0643\u0645\u062d\u0627\u0648\u0644\u0627\u062a \u0625\u0639\u0627\u062f\u0629 \u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0645\u0627 \u0623\u062f\u062e\u0644\u062a\u0647\u061b \u0648\u0644\u064a\u0633\u062a \u062a\u0623\u0643\u064a\u062f\u064b\u0627 \u0645\u0646 \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0631\u0633\u0645\u064a.",
    transfers: "\u0645\u0642\u0631\u0631\u0627\u062a \u062a\u062a\u0648\u0642\u0639 \u0627\u062d\u062a\u0633\u0627\u0628\u0647\u0627 \u0643\u0633\u0627\u0639\u0627\u062a \u0645\u062d\u0648\u0644\u0629 (\u0631\u0645\u0648\u0632 \u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0648\u0627\u0635\u0644)",
    transfersHint: "\u0644\u0627 \u062a\u062f\u062e\u0644 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0645\u062d\u0648\u0644\u0629 \u0641\u064a \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0625\u0644\u0649 \u0623\u0646 \u062a\u0624\u0643\u062f \u0648\u062d\u062f\u0629 \u0627\u0644\u0625\u0631\u0634\u0627\u062f \u0627\u0644\u0643\u0644\u064a\u0629 \u0645\u0639\u0627\u062f\u0644\u062a\u0647\u0627.",
    title: "تخطيط تسلسل المقررات",
    intro: "هذه أداة تخطيط مشروط للمقررات التي تختارها. لا تؤكد استيفاء متطلبات التخرج أو الأهلية للتسجيل أو توفر الشعب.",
    program: "البرنامج الدراسي",
    chooseProgram: "اختر البرنامج",
    cohort: "سنة الالتحاق",
    chooseCohort: "اختر سنة الالتحاق",
    publishedPlan: "خطة منشورة (تحقق من Degree Works)",
    choosePublishedPlan: "اختر نسخة خطة منشورة",
    publishedPlanHint: "اختر هذه الخطة فقط إذا كانت تطابق خطتك المعيّنة. لا تستطيع الأداة التحقق من ذلك.",
    courses: "المقررات المتبقية التي تريد ترتيبها",
    completed: "المقررات المجتازة (رموز المقررات مفصولة بفواصل)",
    current: "المقررات المسجل فيها حالياً",
    terms: "الفصول المخطط لها (فصل واحد في كل سطر)",
    termsHint: "مثال: خريف 2026 ثم ربيع 2027. لا تتجاوز 8 فصول.",
    limit: "الحد الأعلى للساعات في كل فصل",
    compareLimit: "مقارنة بحد آخر للساعات (اختياري)",
    comparison: "سيناريو حمل دراسي بديل",
    comparisonHint: "يستخدم السيناريو الثاني الفصول وسجل المقررات نفسيهما مع هذا الحد للساعات. لا يفترض توفر المقررات.",
    submit: "إنشاء تسلسل مشروط",
    close: "إغلاق مخطط المقررات",
    loading: "جارٍ تحميل بيانات المنهج…",
    loadingPrograms: "جارٍ تحميل البرامج…",
    noCohorts: "لا تتوفر سنة دفعة مرتبطة بمنهج موثوق لهذا البرنامج حالياً.",
    result: "النتيجة",
    scheduled: "المقررات المجدولة",
    assumptions: "الافتراضات",
    blockers: "العوائق",
    unscheduled: "المقررات غير المجدولة",
    sources: "المصادر الرسمية",
    noPlan: "تعذر إنشاء تسلسل كامل بهذه البيانات.",
    selected: "المحدد",
    clear: "\u0645\u0633\u062d \u0645\u062f\u062e\u0644\u0627\u062a \u0627\u0644\u062e\u0637\u0629",
    cancel: "إلغاء",
  } : {
    title: "Plan a course sequence",
    intro: "This creates a conditional sequence for the courses you select. It does not confirm degree completion, registration eligibility, or section availability.",
    program: "Degree program",
    chooseProgram: "Choose a program",
    cohort: "Entry cohort year",
    chooseCohort: "Choose your entry year",
    publishedPlan: "Published plan version (confirm in Degree Works)",
    choosePublishedPlan: "Choose a published plan version",
    publishedPlanHint: "Choose a version only if it matches the plan assigned to you. This tool cannot verify that assignment.",
    courses: "Remaining courses to sequence",
    completed: "Completed course codes (comma separated)",
    grades: "Grades for completed courses (optional)",
    gradesHint: "Only enter passed courses listed above. Use CODE: grade, for example CSBP219: B or MATH105: 78. These are self-reported.",
    repeats: "Courses to repeat (course codes, comma separated)",
    repeatsHint: "These are scheduled as repeat attempts based on your report; this is not a verified transcript result.",
    transfers: "UAEU courses you expect transfer credit to cover (comma separated)",
    transfersHint: "Transfer claims are excluded from calculations until your college confirms equivalency.",
    current: "Courses you are currently taking",
    terms: "Planning terms (one term per line)",
    termsHint: "For example: Fall 2026, then Spring 2027. Use up to 8 terms.",
    limit: "Maximum credits per term",
    compareLimit: "Compare with another maximum (optional)",
    comparison: "Alternative load scenario",
    comparisonHint: "The second scenario uses the same terms and course history with this credit cap. It does not assume course availability.",
    submit: "Create conditional sequence",
    close: "Close course planner",
    loading: "Loading curriculum…",
    loadingPrograms: "Loading programs…",
    noCohorts: "No cohort-matched curriculum is currently available for this program.",
    result: "Plan result",
    scheduled: "Scheduled courses",
    assumptions: "Assumptions",
    blockers: "Blockers",
    unscheduled: "Unscheduled courses",
    sources: "Official sources",
    noPlan: "A complete sequence could not be created from these inputs.",
    selected: "selected",
    clear: "Clear plan inputs",
    cancel: "Cancel",
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoadingPrograms(true);
    setError("");
    fetch("/api/academic/sequence", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load program list.");
        setPrograms([...data.programs, ...(data.continuingPrograms ?? []).map((program: Omit<ProgramOption, "curriculumAvailable" | "cohorts">) => ({
          ...program,
          curriculumAvailable: true,
          cohorts: [],
          continuingOnly: true,
        }))]);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load program list.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingPrograms(false); });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open || !programId || (!cohortYear && !publishedVersionId)) {
      setCurriculum(null);
      setSelectedCodes([]);
      return;
    }
    const controller = new AbortController();
    setLoadingCurriculum(true);
    setError("");
    setResult(null);
    const selection = cohortYear ? `cohortYear=${encodeURIComponent(cohortYear)}` : `curriculumVersionId=${encodeURIComponent(publishedVersionId)}`;
    fetch(`/api/academic/sequence?programId=${encodeURIComponent(programId)}&${selection}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load this cohort curriculum.");
        setCurriculum(data);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load this cohort curriculum.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingCurriculum(false); });
    return () => controller.abort();
  }, [open, programId, cohortYear, publishedVersionId]);

  const selectedProgram = useMemo(() => programs.find((program) => program.id === programId), [programId, programs]);
  const terms = useMemo(() => termText.split("\n").map((term) => term.trim()).filter(Boolean), [termText]);
  const completedAndCurrent = useMemo(() => new Set([...parseCodes(completedText), ...parseCodes(currentText)]), [completedText, currentText]);
  const mandatoryRemaining = useMemo(() => {
    if (!curriculum) return [];
    const available = new Set(curriculum.courses.map((course) => course.code));
    return curriculum.requirementSummary.mandatoryCourseCodes.filter((code) => available.has(code) && !completedAndCurrent.has(code));
  }, [completedAndCurrent, curriculum]);
  const unavailableMandatory = useMemo(() => {
    if (!curriculum) return [];
    const available = new Set(curriculum.courses.map((course) => course.code));
    return curriculum.requirementSummary.mandatoryCourseCodes.filter((code) => !available.has(code) && !completedAndCurrent.has(code));
  }, [completedAndCurrent, curriculum]);
  const requirementCopy = language === "ar" ? {
    overview: "ملخص متطلبات الخطة الدراسية",
    addRequired: (count: number) => `أضف المقررات الإلزامية المتبقية (${count})`,
    selfReported: "تعتمد هذه المقارنة على رموز المقررات التي تُدخلها بنفسك. لا يرتبط النموذج بنظام Degree Works ولا يؤكد استيفاء متطلبات التخرج.",
    unavailable: "رموز مقررات إلزامية لا تتوفر لها سجلات قابلة للاختيار:",
    choiceGroups: "مجموعات الاختيار والمقررات الاختيارية",
    completedCurrent: "خيار/خيارات مدرجة مذكورة كمجتازة أو قيد الدراسة",
    selectedForSequence: "خيار/خيارات محددة لهذا التسلسل",
    choose: (count: number) => `المطلوب اختيار ${count}`,
    credits: (count: number) => `${count} ساعات معتمدة`,
    pathways: "خيارات المسار (لا تُضاف تلقائياً)",
    conditional: "متطلبات مرتبطة باختيار المسار",
    appliesIf: "ينطبق عند اختيار",
    creditBlocks: "متطلبات الساعات التي لا يقيّمها ترتيب المقررات",
    sources: "مصادر الخطة الدراسية",
    requiredPrompt: "يمكن إضافة المقررات الإلزامية المقترحة أعلاه. أضف المقررات الاختيارية ومقررات المسارات بعد التأكد من انطباقها على خطتك. لا تتحقق الأداة من الساعات الاختيارية أو استيفاء متطلبات الدرجة.",
  } : {
    overview: "Curriculum requirement overview",
    addRequired: (count: number) => `Add outstanding required courses (${count})`,
    selfReported: "This comparison uses course codes you enter yourself. It is not connected to Degree Works and does not confirm that requirements are complete.",
    unavailable: "Required course codes without selectable catalog records:",
    choiceGroups: "Elective and choice groups",
    completedCurrent: "listed option(s) reported completed or current",
    selectedForSequence: "listed option(s) selected for this sequence",
    choose: (count: number) => `choose ${count}`,
    credits: (count: number) => `${count} credits`,
    pathways: "Pathway choices (not auto-selected)",
    conditional: "Requirements dependent on a pathway",
    appliesIf: "applies if",
    creditBlocks: "Credit blocks not assessed by course sequencing",
    sources: "Curriculum sources",
    requiredPrompt: "Mandatory course suggestions can be added above. Select electives and pathway courses only after confirming they apply to your plan. This tool does not validate elective credits or degree completion.",
  };

  async function createSequence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const completedCourseCodes = parseCodes(completedText);
    const repeatCourseCodes = parseCodes(repeatText);
    const transferCourseCodes = parseCodes(transferText);
    const completedCourseGrades = parseCourseGrades(completedGradeText);
    if (!completedCourseGrades || Object.keys(completedCourseGrades).some((code) => !completedCourseCodes.includes(code))) {
      setError("Enter grades as COURSECODE: grade, using only passed courses listed in Completed courses (for example CSBP219: B). Remove failed or unlisted courses.");
      return;
    }
    if (!cohortYear && !publishedVersionId) {
      setError("Choose an entry year or an explicit published plan version.");
      return;
    }
    if (!curriculum || (selectedCodes.length === 0 && !repeatCourseCodes.length) || terms.length === 0 || terms.length > 8 || !Number(creditLimit)) {
      setError("Choose at least one remaining course, one planning term, and a valid credit limit.");
      return;
    }
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/academic/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          programId,
          ...(cohortYear ? { cohortYear: Number(cohortYear) } : { curriculumVersionId: publishedVersionId }),
          remainingCourseCodes: [...new Set([...selectedCodes, ...repeatCourseCodes])],
          completedCourseCodes,
          completedCourseGrades,
          currentCourseCodes: parseCodes(currentText),
          repeatCourseCodes,
          transferCourseCodes,
          terms: terms.map((label, index) => ({ id: `term-${index + 1}`, label, maxCredits: Number(creditLimit) })),
          ...(comparisonCreditLimit.trim() ? { comparisonMaxCredits: Number(comparisonCreditLimit) } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create a sequence.");
      setResult(data);
      onUse();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create a sequence.");
    } finally {
      setSubmitting(false);
    }
  }

  function invalidateResult() {
    setResult(null);
    setError("");
  }

  function toggleCourse(code: string) {
    invalidateResult();
    if (completedAndCurrent.has(code)) return;
    setSelectedCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  function updateReportedCourses(kind: "completed" | "current", value: string) {
    invalidateResult();
    const otherValue = kind === "completed" ? currentText : completedText;
    const reported = new Set([...parseCodes(value), ...parseCodes(otherValue)]);
    if (kind === "completed") setCompletedText(value);
    else setCurrentText(value);
    setSelectedCodes((current) => current.filter((code) => !reported.has(code)));
  }

  function addOutstandingRequiredCourses() {
    invalidateResult();
    setSelectedCodes((current) => [...new Set([...current, ...mandatoryRemaining])]);
  }

  function clearPlanInputs() {
    setProgramId("");
    setCohortYear("");
    setPublishedVersionId("");
    setCurriculum(null);
    setSelectedCodes([]);
    setCompletedText("");
    setCompletedGradeText("");
    setCurrentText("");
    setRepeatText("");
    setTransferText("");
    setTermText("");
    setCreditLimit("");
    setComparisonCreditLimit("");
    setResult(null);
    setError("");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="academic-sequence-title"
      aria-describedby="academic-sequence-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto max-h-[92dvh] w-[min(96vw,54rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/50"
      dir={language === "ar" ? "rtl" : "ltr"}
      data-testid="academic-sequence-planner"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white p-5 sm:p-6">
        <div>
          <h2 id="academic-sequence-title" className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="text-[#E0182D]" aria-hidden="true" />{labels.title}
          </h2>
          <p id="academic-sequence-description" className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{labels.intro}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={labels.close} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-offset-2">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <form onSubmit={createSequence} aria-busy={submitting} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-zinc-700">
              {labels.program}
              <select
                autoFocus
                value={programId}
                onChange={(event) => { setProgramId(event.target.value); setCohortYear(""); setPublishedVersionId(""); setCurriculum(null); invalidateResult(); }}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-medium focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20"
                required
              >
                <option value="">{loadingPrograms ? labels.loadingPrograms : labels.chooseProgram}</option>
                {programs.map((program) => <option key={program.id} value={program.id} disabled={!program.curriculumAvailable || (!program.cohorts.length && !program.publishedVersions.length)}>{program.name}{program.continuingOnly ? " — continuing students" : ""} — {program.college}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-700">
              {labels.cohort}
              <select
                value={cohortYear}
                onChange={(event) => { setCohortYear(event.target.value); if (event.target.value) setPublishedVersionId(""); invalidateResult(); }}
                disabled={!selectedProgram?.cohorts.length || loadingPrograms || Boolean(publishedVersionId)}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-medium focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 disabled:bg-zinc-100 disabled:text-zinc-500"
                required={!selectedProgram?.publishedVersions.length}
              >
                <option value="">{labels.chooseCohort}</option>
                {selectedProgram?.cohorts.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              {selectedProgram && !selectedProgram.cohorts.length && !selectedProgram.publishedVersions.length && <span className="mt-1 block text-xs font-medium text-amber-800">{labels.noCohorts}</span>}
            </label>
            {Boolean(selectedProgram?.publishedVersions.length) && <label className="block text-sm font-bold text-zinc-700">
              {labels.publishedPlan}
              <select
                value={publishedVersionId}
                onChange={(event) => { setPublishedVersionId(event.target.value); if (event.target.value) setCohortYear(""); invalidateResult(); }}
                disabled={loadingPrograms || Boolean(cohortYear)}
                required={!selectedProgram?.cohorts.length}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-medium focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 disabled:bg-zinc-100 disabled:text-zinc-500"
              >
                <option value="">{labels.choosePublishedPlan}</option>
                {selectedProgram?.publishedVersions.map((version) => <option key={version.id} value={version.id}>{version.version} — {version.totalCredits} credits — {version.cohortLabel}</option>)}
              </select>
              <span className="mt-1 block text-xs font-medium text-amber-800">{labels.publishedPlanHint}</span>
            </label>}
          </div>

          {loadingCurriculum && <p role="status" className="flex items-center gap-2 text-sm text-zinc-600"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />{labels.loading}</p>}

          {curriculum && <>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
              <p className="font-bold">{curriculum.program.name} · {curriculum.cohort.year ?? curriculum.cohort.version} · {curriculum.cohort.totalCredits} credits</p>
              <p>{curriculum.cohort.label}</p>
              {curriculum.limitations.map((limitation) => <p key={limitation} className="mt-1">{limitation}</p>)}
            </div>

            <section aria-label="Curriculum requirement overview" className="space-y-3 rounded-lg border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-zinc-900">{requirementCopy.overview}</h3>
                <button type="button" onClick={addOutstandingRequiredCourses} disabled={!mandatoryRemaining.length} className="rounded-md border border-[#E0182D] px-3 py-1.5 text-sm font-bold text-[#B10E23] hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {requirementCopy.addRequired(mandatoryRemaining.length)}
                </button>
              </div>
              <p className="text-xs leading-5 text-zinc-600">{requirementCopy.selfReported}</p>
              {unavailableMandatory.length > 0 && <p className="text-xs leading-5 text-amber-800">{requirementCopy.unavailable} {unavailableMandatory.join(", ")}</p>}
              {curriculum.requirementSummary.choiceGroups.length > 0 && <div className="space-y-1 text-sm">
                <h4 className="font-semibold">{requirementCopy.choiceGroups}</h4>
                {curriculum.requirementSummary.choiceGroups.map((group) => {
                  const reported = group.courseCodes.filter((code) => completedAndCurrent.has(code)).length;
                  const selected = group.courseCodes.filter((code) => selectedCodes.includes(code) && !completedAndCurrent.has(code)).length;
                  return <p key={group.id} className="text-zinc-700"><span className="font-medium">{group.name}:</span> {reported} {requirementCopy.completedCurrent}; {selected} {requirementCopy.selectedForSequence}{group.chooseCount !== undefined ? `; ${requirementCopy.choose(group.chooseCount)}` : ""}{group.credits !== undefined ? `; ${requirementCopy.credits(group.credits)}` : ""}. {group.selectionNote}</p>;
                })}
              </div>}
              {curriculum.requirementSummary.pathwayChoices.length > 0 && <div className="space-y-1 text-sm">
                <h4 className="font-semibold">{requirementCopy.pathways}</h4>
                {curriculum.requirementSummary.pathwayChoices.map((pathway) => <p key={pathway.id} className="text-zinc-700"><span className="font-medium">{pathway.name}:</span> {pathway.options.map((option) => `${option.name}${option.courseCodes.length ? ` (${option.courseCodes.join(", ")})` : ""}`).join("; ")}</p>)}
              </div>}
              {curriculum.requirementSummary.conditionalGroups.length > 0 && <div className="space-y-1 text-xs leading-5 text-zinc-600">
                <h4 className="font-semibold text-zinc-700">{requirementCopy.conditional}</h4>
                {curriculum.requirementSummary.conditionalGroups.map((group) => <p key={`${group.id}:${group.conditionalOn}`}><span className="font-medium">{group.name}:</span> {group.courseCodes.join(", ")} — {requirementCopy.appliesIf} {group.conditionalOn}</p>)}
              </div>}
              {curriculum.requirementSummary.creditBlocksNotAssessed.length > 0 && <div className="space-y-1 text-xs leading-5 text-zinc-600">
                <h4 className="font-semibold text-zinc-700">{requirementCopy.creditBlocks}</h4>
                {curriculum.requirementSummary.creditBlocksNotAssessed.map((block) => <p key={block.id}><span className="font-medium">{block.name} ({requirementCopy.credits(block.credits)}):</span> {block.ruleNote}{block.conditionalOn ? ` — ${requirementCopy.appliesIf} ${block.conditionalOn}` : ""}</p>)}
              </div>}
              {curriculum.sources.length > 0 && <div className="space-y-1 text-xs leading-5">
                <h4 className="font-semibold text-zinc-700">{requirementCopy.sources}</h4>
                {curriculum.sources.map((source) => <p key={source.url}><a className="text-[#B10E23] underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.lastVerified}</p>)}
              </div>}
            </section>

            <fieldset className="rounded-lg border border-zinc-200 p-4">
              <legend className="px-1 text-sm font-bold text-zinc-800">{labels.courses} ({new Set([...selectedCodes, ...parseCodes(repeatText)]).size} {labels.selected})</legend>
              <p className="mb-3 text-xs leading-5 text-zinc-600">{requirementCopy.requiredPrompt}</p>
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {curriculum.courses.map((course) => (
                  <label key={course.code} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-zinc-50">
                    <input type="checkbox" checked={selectedCodes.includes(course.code)} disabled={completedAndCurrent.has(course.code)} onChange={() => toggleCourse(course.code)} className="mt-1 h-4 w-4 accent-[#E0182D] disabled:cursor-not-allowed disabled:opacity-50" />
                    <span className="min-w-0 text-sm">
                      <span className="font-bold">{course.code}</span> · {course.title} <span className="text-zinc-500">({course.credits} cr)</span>
                      <span className="block text-xs text-zinc-500">{course.groups.map((group) => group.name).join(" · ")}</span>
                    </span>
                  </label>
                ))}
              </div>
              {curriculum.unavailableCourses.length > 0 && <p className="mt-3 text-xs text-amber-800">Some curriculum codes lack usable catalog credit records and are not selectable: {curriculum.unavailableCourses.join(", ")}</p>}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                {labels.completed}
                <textarea value={completedText} onChange={(event) => updateReportedCourses("completed", event.target.value)} rows={2} placeholder="CSBP119, MATH105" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-normal focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                {labels.current}
                <textarea value={currentText} onChange={(event) => updateReportedCourses("current", event.target.value)} rows={2} placeholder="CSBP219" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-normal focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                {"repeats" in labels ? labels.repeats : "Courses to repeat (course codes, comma separated)"}
                <textarea value={repeatText} onChange={(event) => { setRepeatText(event.target.value); invalidateResult(); }} rows={2} placeholder="CSBP219" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-normal focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
                <span className="mt-1 block text-xs font-normal text-zinc-500">{"repeatsHint" in labels ? labels.repeatsHint : "These are scheduled as repeat attempts based on your report; this is not a verified transcript result."}</span>
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                {"transfers" in labels ? labels.transfers : "UAEU courses you expect transfer credit to cover (comma separated)"}
                <textarea value={transferText} onChange={(event) => { setTransferText(event.target.value); invalidateResult(); }} rows={2} placeholder="CSBP119" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-normal focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
                <span className="mt-1 block text-xs font-normal text-zinc-500">{"transfersHint" in labels ? labels.transfersHint : "Transfer claims are excluded from calculations until your college confirms equivalency."}</span>
              </label>
            </div>

            <label className="block text-sm font-bold text-zinc-700">
              {"grades" in labels ? labels.grades : "Completed course grades (optional)"}
              <textarea value={completedGradeText} onChange={(event) => { setCompletedGradeText(event.target.value); invalidateResult(); }} rows={2} placeholder="CSBP219: B; MATH105: 78" aria-describedby="completed-grade-hint" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-normal focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
              <span id="completed-grade-hint" className="mt-1 block text-xs font-normal text-zinc-500">{"gradesHint" in labels ? labels.gradesHint : "Enter only passed courses listed above. These grades are self-reported."}</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                {labels.terms}
                <textarea value={termText} onChange={(event) => { setTermText(event.target.value); invalidateResult(); }} rows={3} placeholder={language === "ar" ? "خريف 2026\nربيع 2027" : "Fall 2026\nSpring 2027"} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-normal focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
                <span className="mt-1 block text-xs font-normal text-zinc-500">{labels.termsHint}</span>
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                {labels.limit}
                <input type="number" min="1" max="40" step="0.5" inputMode="decimal" value={creditLimit} onChange={(event) => { setCreditLimit(event.target.value); invalidateResult(); }} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-medium focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
              </label>
              <label className="block text-sm font-bold text-zinc-700 sm:col-span-2">
                {labels.compareLimit}
                <input type="number" min="1" max="40" step="0.5" inputMode="decimal" value={comparisonCreditLimit} onChange={(event) => { setComparisonCreditLimit(event.target.value); invalidateResult(); }} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-medium focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20" />
                <span className="mt-1 block text-xs font-normal text-zinc-500">{labels.comparisonHint}</span>
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={clearPlanInputs} disabled={submitting} className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50">{labels.clear}</button>
              <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50">{labels.cancel}</button>
              <button type="submit" disabled={submitting || (!selectedCodes.length && !parseCodes(repeatText).length) || !terms.length || terms.length > 8 || !creditLimit} className="inline-flex items-center gap-2 rounded-lg bg-[#E0182D] px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300">
                {submitting && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{labels.submit}
              </button>
            </div>
          </>}
        </form>

        {result && <section aria-live="polite" className="space-y-4 border-t border-zinc-200 pt-5">
          <div>
            <h3 className="text-lg font-bold">{labels.result}: {result.plan.status.replaceAll("_", " ")}</h3>
            <p className="mt-1 text-sm text-zinc-600">{result.scope.programName} · {result.scope.cohortLabel}</p>
            {result.plan.status === "NO_PLAN" && <p className="mt-2 text-sm font-semibold text-amber-800">{labels.noPlan}</p>}
          </div>
          {result.plan.terms.map((term) => <section key={term.id} className="rounded-lg border border-zinc-200 p-4">
            <h4 className="font-bold">{term.label} · {term.credits}/{term.creditLimit} credits</h4>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
              {term.courses.map((course) => <li key={course.code}><strong>{course.code}</strong> — {course.title} ({course.credits} cr){course.availability === "ASSUMED_FUTURE_OFFERING" ? <span className="text-amber-800"> · offering unconfirmed</span> : null}</li>)}
            </ul>
          </section>)}
          {result.plan.unscheduled.length > 0 && <section><h4 className="font-bold">{labels.unscheduled}</h4><ul className="mt-1 list-disc ps-5 text-sm">{result.plan.unscheduled.map((item) => <li key={item.code}><strong>{item.code}</strong>: {item.reason}</li>)}</ul></section>}
          {result.plan.assumptions.length > 0 && <section><h4 className="font-bold">{labels.assumptions}</h4><ul className="mt-1 list-disc ps-5 text-sm">{result.plan.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          {result.plan.blockers.length > 0 && <section><h4 className="font-bold">{labels.blockers}</h4><ul className="mt-1 list-disc ps-5 text-sm">{result.plan.blockers.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          {result.comparisonPlan && <section className="space-y-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4" aria-label={labels.comparison}>
            <h4 className="font-bold">{labels.comparison} · {result.comparisonMaxCredits} max credits per term · {result.comparisonPlan.status.replaceAll("_", " ")}</h4>
            {result.comparisonPlan.terms.map((term) => <div key={`comparison-${term.id}`}>
              <p className="text-sm font-semibold">{term.label} · {term.credits}/{term.creditLimit} credits</p>
              <p className="text-sm">{term.courses.map((course) => `${course.code} (${course.credits} cr)`).join(", ")}</p>
            </div>)}
            {result.comparisonPlan.unscheduled.length > 0 && <ul className="list-disc ps-5 text-sm">{result.comparisonPlan.unscheduled.map((item) => <li key={`comparison-${item.code}`}><strong>{item.code}</strong>: {item.reason}</li>)}</ul>}
            {result.comparisonPlan.assumptions.length > 0 && <p className="text-xs text-zinc-600">{result.comparisonPlan.assumptions.join(" ")}</p>}
          </section>}
          <section>
            <h4 className="font-bold">{labels.sources}</h4>
            <ul className="mt-1 list-disc ps-5 text-sm">
              {result.scope.curriculumSources.map((source) => <li key={source.url}><a className="text-[#B10E23] underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.lastVerified}</li>)}
              {result.courseSources.map((source) => <li key={source.code}><a className="text-[#B10E23] underline" href={source.url} target="_blank" rel="noreferrer">{source.code} course record</a> · {source.verifiedAt}</li>)}
            </ul>
          </section>
          <section className="rounded-lg border border-zinc-200 p-3 text-sm" aria-label="Inputs used for this plan">
            <h4 className="font-bold">Inputs used</h4>
            <p>Completed: {result.scope.reportedInputs.completedCourseCodes.join(", ") || "none"}; current: {result.scope.reportedInputs.currentCourseCodes.join(", ") || "none"}; repeats: {result.scope.reportedInputs.repeatCourseCodes.join(", ") || "none"}.</p>
            <p>Planned course codes: {result.scope.reportedInputs.remainingCourseCodes.join(", ")}.</p>
            <p>Grades: {Object.entries(result.scope.reportedInputs.completedCourseGrades).map(([code, grade]) => `${code}: ${grade}`).join(", ") || "none supplied"}.</p>
            <p>Terms: {result.scope.reportedInputs.terms.map(({ label, maxCredits }) => `${label} (max ${maxCredits} credits)`).join("; ")}.</p>
            {result.scope.reportedInputs.comparisonMaxCredits !== undefined && <p>Alternative load cap: {result.scope.reportedInputs.comparisonMaxCredits} credits per term.</p>}
            {result.scope.reportedInputs.transferCourseCodes.length > 0 && <p className="mt-1 text-amber-900">{result.scope.transferReview} Reported transfer courses: {result.scope.reportedInputs.transferCourseCodes.join(", ")}.</p>}
          </section>
          <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">{result.scope.disclaimer}</p>
        </section>}
      </div>
    </dialog>
  );
}
