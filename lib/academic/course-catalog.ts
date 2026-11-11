import fs from "node:fs";
import path from "node:path";
import { asksPersonalPrerequisiteEligibility } from "@/lib/academic/prerequisite-rules";
import { parseCatalogPrerequisiteExpression } from "@/lib/academic/catalog-prerequisite-parser";

export type OfficialCourseRecord = {
  code: string;
  title: string;
  description: string | null;
  descriptionStatus: "published" | "not-present-in-catalog-section";
  creditHours: number | null;
  prerequisiteText: string | null;
  prerequisiteItems: string[];
  corequisiteText: string | null;
  corequisiteItems: string[];
  preCorequisiteText: string | null;
  preCorequisiteItems: string[];
  source: { title: string; url: string; verifiedAt: string };
};

type CatalogSnapshot = {
  schemaVersion: 1;
  verifiedAt: string;
  sourceIndex: string;
  courseCount: number;
  courses: OfficialCourseRecord[];
};

const CATALOG_PATH = path.join(process.cwd(), "data", "academic", "course-catalog.json");
let cachedCatalog: CatalogSnapshot | null | undefined;

function isOfficialUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "www.uaeu.ac.ae" && url.pathname.startsWith("/en/catalog/courses/");
  } catch {
    return false;
  }
}

export function loadOfficialCourseCatalog(): CatalogSnapshot | null {
  if (cachedCatalog !== undefined) return cachedCatalog;
  if (!fs.existsSync(CATALOG_PATH)) {
    cachedCatalog = null;
    return cachedCatalog;
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as CatalogSnapshot;
  if (catalog.schemaVersion !== 1 || !isOfficialUrl(catalog.sourceIndex) || !Array.isArray(catalog.courses) || catalog.courseCount !== catalog.courses.length) {
    throw new Error("Invalid UAEU official course catalog snapshot.");
  }
  const codes = new Set<string>();
  for (const course of catalog.courses) {
    if (!/^[A-Z]{2,8}\d{3,4}[A-Z]?$/u.test(course.code) || codes.has(course.code) || !course.title || !isOfficialUrl(course.source?.url) || !course.source.verifiedAt) {
      throw new Error(`Invalid or duplicate UAEU course catalog record: ${course.code || "unknown"}`);
    }
    if (![course.prerequisiteItems, course.corequisiteItems, course.preCorequisiteItems].every((items) =>
      Array.isArray(items) && items.every((item) => typeof item === "string" && item.trim().length > 0))) {
      throw new Error(`Invalid UAEU course relation items: ${course.code}`);
    }
    codes.add(course.code);
  }
  cachedCatalog = catalog;
  return cachedCatalog;
}

function targetCode(question: string): string | null {
  const codes = [...question.matchAll(/\b([A-Z]{2,8})[\s-]?(\d{3,4}[A-Z]?)\b/giu)]
    .map((match) => `${match[1]}${match[2]}`.toUpperCase());
  return new Set(codes).size === 1 ? codes[0] : null;
}

export function answerOfficialCourseCatalogQuestion(question: string, locale: "en" | "ar", targetCourseCode?: string) {
  const normalized = question.toLowerCase();
  const code = targetCourseCode ?? targetCode(question);
  const asksCourseEligibility = asksPersonalPrerequisiteEligibility(question) ||
    /\b(?:eligible to (?:take|enroll|register)|meet (?:the )?prerequisites?)\b/u.test(normalized);
  const asksProgramDecision = /\b(?:will this count|counts? toward|degree requirement|major requirement|graduate|my degree|study plan|cohort|waiver|exception)\b/u.test(normalized);
  const asksWhatToCompleteBeforeCourse = Boolean(code) &&
    /\b(?:what|which)\s+(?:must|should|do)\s+i\s+(?:complete|finish|pass|take)\s+before\b/u.test(normalized);
  const asksCatalogFact = /\b(?:course|classes|credits?|credit hours?|prerequisites?|corequisites?|pre\s*[/&-]?\s*co|description|what is|tell me about|catalog)\b/u.test(normalized) ||
    /\b(?:classes|courses)\b.{0,60}\b(?:pass|complete|take)\b.{0,30}\bbefore\b/u.test(normalized) ||
    asksWhatToCompleteBeforeCourse;
  if ((!asksCatalogFact && !asksCourseEligibility) || asksProgramDecision) return null;
  if (!code) return null;
  const catalog = loadOfficialCourseCatalog();
  if (!catalog) return null;
  const record = catalog.courses.find((course) => course.code === code);
  if (!record) {
    const content = locale === "ar"
      ? `لم أجد الرمز **${code}** في لقطة فهرس المقررات الرسمية المتاحة. أرسل رمز المقرر كما يظهر في بوابة UAEU أو اذكر سنة الفهرس.`
      : `I could not find **${code}** in the available official UAEU course-catalog snapshot. Check the course code in the UAEU portal or provide the catalog year.`;
    return { content, code, source: null, resolutionState: "UNSUPPORTED" as const };
  }
  const hasPrerequisiteEvidence = record.prerequisiteItems.length > 0;
  const prerequisiteExpression = hasPrerequisiteEvidence ? parseCatalogPrerequisiteExpression(record) : null;
  const prerequisiteUnsupported = hasPrerequisiteEvidence && !prerequisiteExpression;
  const danglingPrerequisiteOperator = Boolean(record.prerequisiteText && /\b(?:and|or)\s*[.)]*$/iu.test(record.prerequisiteText));
  if (asksCourseEligibility) {
    const listedRequirements = [
      record.prerequisiteText ? `- ${locale === "ar" ? "نص المتطلب السابق في الفهرس" : "Catalog prerequisite wording"}: ${record.prerequisiteText}.` : locale === "ar" ? "- لا يتضمن سجل الفهرس المتاح نصاً لمتطلب سابق لهذا المقرر." : "- The catalog snapshot does not provide prerequisite wording for this course.",
      record.corequisiteText ? `- ${locale === "ar" ? "نص المتطلب المصاحب في الفهرس" : "Catalog corequisite wording"}: ${record.corequisiteText}.` : "",
      record.preCorequisiteText ? `- ${locale === "ar" ? "نص متطلب السابق/المصاحب في الفهرس" : "Catalog Pre/Co wording"}: ${record.preCorequisiteText}.` : "",
    ].filter(Boolean);
    if (prerequisiteUnsupported) listedRequirements.push(locale === "ar"
      ? "صياغة المتطلب السابق غير مكتملة أو غير قابلة للتفسير بأمان. لا أستطيع تحديد أهليتك؛ راجع خطتك المعتمدة أو وحدة الإرشاد الأكاديمي."
      : danglingPrerequisiteOperator
        ? "The prerequisite wording ends with a dangling AND/OR, so it is incomplete and does not establish which courses or alternatives are required. I cannot assess eligibility from it. Ask your College Advising Unit to confirm the rule before registering."
        : "The prerequisite wording cannot be safely interpreted by the assistant. Ask your College Advising Unit to confirm the rule before relying on it.");
    return {
      content: [
        `**${record.code} ${record.title} — ${locale === "ar" ? "لم يتم التحقق من أهلية التسجيل" : "eligibility not verified"}**`,
        ...listedRequirements,
        locale === "ar"
          ? "لا أستطيع حساب أهلية التسجيل بأمان من هذا النص وحده لأن صيغة القاعدة غير مدعومة حالياً في أداة التقييم. راجع خطة Degree Works وبوابة التسجيل، أو اطلب من وحدة الإرشاد في كليتك تأكيد القاعدة لدفعتك. هذا الرد لا يؤكد السماح بالتسجيل أو توفر شعبة."
          : "I cannot safely calculate eligibility from this catalog text alone because its rule structure is not supported by the current evaluator. Check your Degree Works plan and registration portal, or ask your college advising unit to confirm the rule for your cohort. This answer does not confirm registration permission or section availability.",
      ].join("\n"),
      code,
      source: { title: record.source.title, url: record.source.url, lastVerified: record.source.verifiedAt },
      resolutionState: "UNSUPPORTED" as const,
    };
  }
  const lines = [`**${record.code} ${record.title}**`];
  if (record.creditHours !== null) lines.push(locale === "ar" ? `- الساعات المعتمدة في الفهرس: **${record.creditHours}**.` : `- Catalog credit hours: **${record.creditHours}**.`);
  else lines.push(locale === "ar" ? "- لا يعرض هذا السجل عدد الساعات." : "- This catalog entry does not display a credit-hour value.");
  if (record.prerequisiteText) {
    if (prerequisiteUnsupported) {
      lines.push(`- ${locale === "ar" ? "نص المتطلب السابق في الفهرس" : "Catalog prerequisite wording"}: ${record.prerequisiteText}.`);
      lines.push(locale === "ar"
        ? "صياغة المتطلب السابق غير مكتملة أو غير قابلة للتفسير بأمان؛ راجع وحدة الإرشاد الأكاديمي قبل الاعتماد عليها."
        : danglingPrerequisiteOperator
          ? "The prerequisite field is incomplete: it ends with a dangling AND/OR and does not establish the required relationship or whether an additional alternative is missing. Confirm the rule with your College Advising Unit before relying on it."
          : "This prerequisite wording cannot be safely interpreted by the assistant. Confirm the applicable rule with your College Advising Unit before relying on it.");
    } else {
      lines.push(locale === "ar" ? `- المتطلبات السابقة كما وردت في الفهرس: ${record.prerequisiteText}.` : `- Prerequisites as stated in the catalog: ${record.prerequisiteText}.`);
    }
  }
  else lines.push(locale === "ar" ? "- لا يعرض هذا السجل قسماً للمتطلبات السابقة؛ وهذا لا يثبت عدم وجود قيود تسجيل أخرى." : "- This catalog entry does not show a prerequisite section; that does not establish that no other registration restrictions apply.");
  if (record.corequisiteText) lines.push(locale === "ar" ? `- المتطلبات المصاحبة: ${record.corequisiteText}.` : `- Corequisites: ${record.corequisiteText}.`);
  if (record.preCorequisiteText) lines.push(locale === "ar" ? `- متطلب سابق/مصاحب كما يسميه الفهرس: ${record.preCorequisiteText}.` : `- Pre/Co requirement as labeled by the catalog: ${record.preCorequisiteText}.`);
  if (/description|tell me about|what is/iu.test(question) && record.description) lines.push(locale === "ar" ? `- وصف المقرر المنشور (بالإنجليزية): ${record.description}` : `- Published course description: ${record.description}`);
  lines.push(locale === "ar"
    ? "هذا سجل فهرس المقرر، ولا يحدد وحده البرنامج أو سنة الدفعة التي ينطبق عليها، ولا يؤكد أهليتك الشخصية أو توفر شعبة."
    : "This is a course-catalog record. It does not establish which degree or cohort requires the course, personal registration eligibility, or current section availability.");
  return {
    content: lines.join("\n"),
    code,
    source: { title: record.source.title, url: record.source.url, lastVerified: record.source.verifiedAt },
    resolutionState: prerequisiteUnsupported && /\b(?:prerequisites?|pre-?reqs?|المتطلبات السابقة)\b/iu.test(normalized) ? "UNSUPPORTED" as const : "VERIFIED" as const,
  };
}
