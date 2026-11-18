import fs from "node:fs";
import path from "node:path";
import { asksPersonalPrerequisiteEligibility, getCurrentPrerequisiteRule, type PrerequisiteExpression } from "@/lib/academic/prerequisite-rules";
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

function prerequisiteExpressionCodes(expression: PrerequisiteExpression): string[] {
  if ("courseCode" in expression) return [expression.courseCode];
  return "conditions" in expression ? expression.conditions.flatMap(prerequisiteExpressionCodes) : [];
}

function formatPublishedPrerequisite(expression: PrerequisiteExpression, locale: "en" | "ar"): string {
  if ("standing" in expression) return locale === "ar" ? "المستوى الدراسي senior" : "senior standing";
  if ("courseCode" in expression) {
    if (expression.type === "COURSE_GRADE_AT_LEAST") {
      return locale === "ar"
        ? expression.courseCode + " (\u0628\u062f\u0631\u062c\u0629 \u0644\u0627 \u062a\u0642\u0644 \u0639\u0646 " + expression.minimumGrade + ")"
        : expression.courseCode + " (minimum grade " + expression.minimumGrade + ")";
    }
    return locale === "ar"
      ? expression.type === "COURSE_CURRENT" ? expression.courseCode + " (\u0645\u0633\u062c\u0644 \u0641\u064a\u0647 \u062d\u0627\u0644\u064a\u064b\u0627)" : expression.courseCode + " (\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u0642\u0631\u0631)"
      : expression.type === "COURSE_CURRENT" ? expression.courseCode + " (currently enrolled)" : expression.courseCode + " (completion required)";
  }
  if (!("conditions" in expression)) return "";
  const separator = expression.op === "AND"
    ? (locale === "ar" ? " \u0648 " : " and ")
    : (locale === "ar" ? " \u0623\u0648 " : " or ");
  return expression.conditions.map((condition) => formatPublishedPrerequisite(condition, locale)).join(separator);
}
type CourseCreditDiscrepancy = {
  courseCode: string;
  appliesTo?: CatalogFactKind[];
  message: { en: string; ar: string };
  sources: { title: string; url: string; lastVerified: string }[];
};

const CATALOG_PATH = path.join(process.cwd(), "data", "academic", "course-catalog.json");
const CREDIT_DISCREPANCIES_PATH = path.join(process.cwd(), "data", "academic", "course-credit-discrepancies.json");
let cachedCatalog: CatalogSnapshot | null | undefined;
let cachedCreditDiscrepancies: Map<string, CourseCreditDiscrepancy> | null | undefined;

function isOfficialUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const primaryCourseCatalog = url.hostname === "www.uaeu.ac.ae" && url.pathname.startsWith("/en/catalog/courses/");
    const socialWorkDepartmentCatalog = url.hostname === "webapps.uaeu.ac.ae" &&
      url.pathname === "/catalog/auto/department_HS_HS_SOCW.asp";
    const biologyDepartmentCatalog = url.hostname === "webapps.uaeu.ac.ae" &&
      url.pathname === "/catalog/auto/department_SC_SC_BIOL.asp";
    const approvedProgramEvidence = url.hostname === "www.uaeu.ac.ae" && (
      url.pathname === "/en/catalog/undergraduate/programs/bachelor-of-science-in-marine-fisheries-and-animal-science.shtml" ||
      url.pathname === "/en/catalog/undergraduate/programs/bachelor-of-science-in-information-security.shtml" ||
      url.pathname === "/en/catalog/undergraduate/programs/bachelor-of-science-in-electrical-engineering.shtml" ||
      url.pathname === "/en/catalog/undergraduate/programs/bachelor-of-science-in-communication-engineering.shtml" ||
      url.pathname === "/en/cit/undergraduate-students-affairs/bsc_in_is_study_plan_fall_2025_onwards.pdf" ||
      url.pathname === "/en/eng/pdf/coe_bsc_electrical_engineering_study_plan.pdf" ||
      url.pathname === "/en/eng/pdf/coe_bsc_communication_engineering_study_plan.pdf"
    );
    return url.protocol === "https:" && (primaryCourseCatalog || socialWorkDepartmentCatalog || biologyDepartmentCatalog || approvedProgramEvidence);
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

function loadCreditDiscrepancies(): Map<string, CourseCreditDiscrepancy> {
  if (cachedCreditDiscrepancies) return cachedCreditDiscrepancies;
  const data = JSON.parse(fs.readFileSync(CREDIT_DISCREPANCIES_PATH, "utf8")) as CourseCreditDiscrepancy[];
  if (!Array.isArray(data)) throw new Error("Invalid UAEU course-credit discrepancy data.");
  const records = new Map<string, CourseCreditDiscrepancy>();
  for (const item of data) {
    if (!/^[A-Z]{2,8}\d{3,4}[A-Z]?$/u.test(item.courseCode) || records.has(item.courseCode) ||
      !item.message?.en || !item.message?.ar || !Array.isArray(item.sources) || !item.sources.length ||
      item.sources.some((source) => !source.title || !isOfficialUrl(source.url) || !source.lastVerified)) {
      throw new Error(`Invalid UAEU course-credit discrepancy record: ${item.courseCode || "unknown"}`);
    }
    records.set(item.courseCode, item);
  }
  cachedCreditDiscrepancies = records;
  return records;
}

function targetCode(question: string): string | null {
  const courses = loadOfficialCourseCatalog()?.courses ?? [];
  // Resolve against actual catalog identities first. Matching arbitrary words
  // followed by a year/credit number ("Fall 2026", "reaches 120") invents
  // course IDs and hijacks degree-planning questions.
  const codeMatches = courses.filter((course) => {
    const [, prefix, suffix] = course.code.match(/^([A-Z]{2,8})(\d{3,4}[A-Z]?)$/u) ?? [];
    if (!prefix || !suffix) return false;
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${prefix}[\\s\\u00a0\\u2010-\\u2015-]*${suffix}(?![\\p{L}\\p{N}])`, "iu").test(question);
  });
  const distinctCodes = [...new Set(codeMatches.map(({ code }) => code))];
  if (distinctCodes.length === 1) return distinctCodes[0];
  // A question may mention completed prerequisite codes and name the target
  // course in prose. Prefer an exact published catalog title in that case.
  const normalizedQuestion = question.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const titleMatches = courses.filter((course) => {
    const title = course.title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    return title.length > 0 && ` ${normalizedQuestion} `.includes(` ${title} `);
  });
  if (distinctCodes.length > 1) return titleMatches.length === 1 ? titleMatches[0].code : null;
  // Preserve a clear, explicitly uppercase unknown code so the assistant can
  // explain that it is absent from this snapshot. Title-case terms and years
  // are not codes.
  const explicitUnknownCodes = [...question.matchAll(/\b([A-Z]{2,8})[\s\u00a0\u2010-\u2015-]?(\d{3,4}[A-Z]?)\b/gu)]
    .map((match) => `${match[1]}${match[2]}`.toUpperCase())
    .filter((code) => !courses.some((course) => course.code === code));
  const distinctUnknownCodes = [...new Set(explicitUnknownCodes)];
  if (distinctUnknownCodes.length === 1) return distinctUnknownCodes[0];
  if (distinctUnknownCodes.length > 1) return null;
  if (distinctCodes.length > 1 && titleMatches.length === 1) return titleMatches[0].code;
  return null;
}

type AdditionalCatalogLocale = "hi" | "ur" | "fr" | "es";
type CatalogFactKind = "creditHours" | "title" | "prerequisite";
type CatalogAnswer = {
  content: string;
  code: string;
  source: { title: string; url: string; lastVerified: string } | null;
  additionalSources?: { title: string; url: string; lastVerified: string }[];
  resolutionState: "UNSUPPORTED" | "MISSING_CONTEXT" | "CONFLICTED" | "VERIFIED";
};

const ADDITIONAL_CATALOG_COPY: Record<AdditionalCatalogLocale, {
  title: string;
  credits: string;
  noCredits: string;
  prerequisite: string;
  noPrerequisite: string;
  unresolved: string;
  scope: string;
  sourceConflict: string;
}> = {
  hi: {
    title: "प्रकाशित पाठ्यक्रम शीर्षक (अंग्रेज़ी में)", credits: "कैटलॉग में प्रकाशित क्रेडिट घंटे", noCredits: "इस कैटलॉग रिकॉर्ड में क्रेडिट घंटे नहीं दिए गए हैं।",
    prerequisite: "कैटलॉग में प्रकाशित पूर्वापेक्षा विवरण (मूल भाषा में)", noPrerequisite: "उपलब्ध कैटलॉग रिकॉर्ड में पूर्वापेक्षा का पाठ नहीं दिया गया है।",
    unresolved: "इस पाठ से नियम की संरचना स्पष्ट नहीं होती। अपनी व्यक्तिगत पंजीकरण पात्रता के लिए इसे न मानें; कॉलेज सलाहकार से पुष्टि करें।",
    scope: "यह केवल पाठ्यक्रम कैटलॉग रिकॉर्ड है। इससे यह तय नहीं होता कि पाठ्यक्रम आपके डिग्री/प्रवेश समूह में आवश्यक है, आप व्यक्तिगत रूप से पंजीकरण के योग्य हैं, या कोई सेक्शन उपलब्ध है।",
    sourceConflict: "आधिकारिक स्रोतों में क्रेडिट संबंधी अंतर है; किसी एक मान को निश्चित न मानें। नीचे दिए गए स्रोतों से इसकी पुष्टि करें।",
  },
  ur: {
    title: "شائع شدہ کورس کا عنوان (انگریزی میں)", credits: "کیٹلاگ میں شائع شدہ کریڈٹ آورز", noCredits: "اس کیٹلاگ ریکارڈ میں کریڈٹ آورز درج نہیں ہیں۔",
    prerequisite: "کیٹلاگ میں شائع شدہ پیشگی شرط (اصل زبان میں)", noPrerequisite: "دستیاب کیٹلاگ ریکارڈ میں پیشگی شرط کا متن درج نہیں ہے۔",
    unresolved: "اس عبارت سے قاعدے کی ساخت واضح نہیں ہوتی۔ اسے اپنی ذاتی رجسٹریشن اہلیت نہ سمجھیں؛ کالج کے مشیر سے تصدیق کریں۔",
    scope: "یہ صرف کورس کیٹلاگ ریکارڈ ہے۔ اس سے یہ طے نہیں ہوتا کہ کورس آپ کی ڈگری/داخلہ گروپ کے لیے لازم ہے، آپ ذاتی طور پر رجسٹریشن کے اہل ہیں، یا کوئی سیکشن دستیاب ہے۔",
    sourceConflict: "سرکاری ذرائع میں کریڈٹ کے بارے میں اختلاف ہے؛ کسی ایک عدد کو حتمی نہ سمجھیں۔ نیچے دیے گئے ذرائع سے تصدیق کریں۔",
  },
  fr: {
    title: "Intitulé publié du cours (en anglais)", credits: "Heures de crédit publiées dans le catalogue", noCredits: "Cette fiche du catalogue n'indique pas le nombre d'heures de crédit.",
    prerequisite: "Prérequis publié dans le catalogue (texte original)", noPrerequisite: "La fiche disponible ne contient pas de texte de prérequis.",
    unresolved: "La formulation ne permet pas d'établir la règle. Ne l'utilisez pas pour conclure à votre admissibilité personnelle; vérifiez auprès du service de conseil de votre collège.",
    scope: "Cette réponse décrit uniquement la fiche du catalogue. Elle ne détermine pas si le cours est requis dans votre diplôme ou cohorte, votre admissibilité personnelle, ni la disponibilité d'une section.",
    sourceConflict: "Les sources officielles divergent sur les crédits; aucun chiffre ne doit être considéré comme confirmé. Vérifiez les sources citées ci-dessous.",
  },
  es: {
    title: "Título publicado de la asignatura (en inglés)", credits: "Créditos publicados en el catálogo", noCredits: "Esta ficha del catálogo no indica los créditos.",
    prerequisite: "Requisito previo publicado en el catálogo (texto original)", noPrerequisite: "La ficha disponible no incluye el texto de requisitos previos.",
    unresolved: "La redacción no permite establecer la regla. No la uses para concluir tu elegibilidad personal; confírmala con la asesoría de tu facultad.",
    scope: "Esta respuesta describe solo la ficha del catálogo. No determina si la asignatura es obligatoria en tu título o cohorte, tu elegibilidad personal ni si hay plazas disponibles.",
    sourceConflict: "Las fuentes oficiales discrepan sobre los créditos; no consideres confirmado ningún valor. Comprueba las fuentes citadas a continuación.",
  },
};

function additionalCatalogIntent(question: string, targetCourseCode?: string): { locale: AdditionalCatalogLocale; fact: CatalogFactKind } | null {
  const text = question.normalize("NFKC").toLocaleLowerCase();
  const code = targetCourseCode ?? targetCode(question);
  if (!code) return null;
  if (/[\u0900-\u097f]/u.test(text)) {
    if (/(?:पात्र|योग्य|पंजीकरण|नामांकन|ले सकता|ले सकती|क्या मैं)/u.test(text)) return null;
    if (/(?:क्रेडिट|घंटे|घंटों)/u.test(text)) return { locale: "hi", fact: "creditHours" };
    if (/(?:शीर्षक|नाम|कौन-सा नाम|क्या है)/u.test(text)) return { locale: "hi", fact: "title" };
    if (/(?:पूर्वापेक्षा|सह-पाठ्यक्रम|सहपाठ्यक्रम|शर्त|आवश्यकता)/u.test(text)) return { locale: "hi", fact: "prerequisite" };
    return null;
  }
  if (/[\u0600-\u06ff]/u.test(text) && /[\u0679\u067e\u0686\u0688\u0691\u0698\u06a9\u06af\u06c1\u06d2]/u.test(text)) {
    if (/(?:اہل|رجسٹر|داخلہ|لے سکتا|لے سکتی|کیا میں)/u.test(text)) return null;
    if (/(?:کریڈٹ|گھنٹے)/u.test(text)) return { locale: "ur", fact: "creditHours" };
    if (/(?:عنوان|نام)/u.test(text)) return { locale: "ur", fact: "title" };
    if (/(?:پیشگی|ساتھ لینے|شرط|تقاضا)/u.test(text)) return { locale: "ur", fact: "prerequisite" };
    return null;
  }
  if (/\b(?:crédit|crédits|heures?|prérequis|corequis|cours|intitulé|catalogue|quel|combien)\b/u.test(text)) {
    if (/\b(?:puis-je|suis-je|admissible|éligible|inscrire|m'inscrire)\b/u.test(text)) return null;
    if (/\b(?:crédit|crédits|heures?)\b/u.test(text)) return { locale: "fr", fact: "creditHours" };
    if (/\b(?:prérequis|corequis|concomitant)\b/u.test(text)) return { locale: "fr", fact: "prerequisite" };
    if (/\b(?:cours|intitulé|titre|nom)\b/u.test(text)) return { locale: "fr", fact: "title" };
  }
  if (/\b(?:crédito|créditos|horas?|prerrequisitos?|correquisitos?|asignatura|título|catálogo)\b/u.test(text)) {
    if (/\b(?:puedo|elegible|inscribirme|matricularme|admisible)\b/u.test(text)) return null;
    if (/\b(?:crédito|créditos|horas?)\b/u.test(text)) return { locale: "es", fact: "creditHours" };
    if (/\b(?:prerrequisitos?|correquisitos?|requisito previo)\b/u.test(text)) return { locale: "es", fact: "prerequisite" };
    if (/\b(?:asignatura|título|nombre)\b/u.test(text)) return { locale: "es", fact: "title" };
  }
  return null;
}

function renderAdditionalCatalogFact(
  record: OfficialCourseRecord,
  request: { locale: AdditionalCatalogLocale; fact: CatalogFactKind },
  isUnresolvedPrerequisite: boolean,
  creditDiscrepancy?: CourseCreditDiscrepancy,
) {
  const copy = ADDITIONAL_CATALOG_COPY[request.locale];
  const lines = [`**${record.code} ${record.title}**`];
  if (request.fact === "title") lines.push(`- ${copy.title}: **${record.title}**.`);
  if (request.fact === "creditHours") {
    if (creditDiscrepancy) lines.push(`- ${copy.sourceConflict} ${creditDiscrepancy.message.en}`);
    else if (record.creditHours === null) lines.push(`- ${copy.noCredits}`);
    else lines.push(`- ${copy.credits}: **${record.creditHours}**.`);
  }
  if (request.fact === "prerequisite") {
    const published = [record.prerequisiteText, record.corequisiteText, record.preCorequisiteText].filter(Boolean);
    if (published.length) lines.push(`- ${copy.prerequisite}: ${published.join("; ")}.`);
    else lines.push(`- ${copy.noPrerequisite}`);
    if (isUnresolvedPrerequisite) lines.push(copy.unresolved);
    if (creditDiscrepancy) lines.push(`- ${copy.sourceConflict} ${creditDiscrepancy.message.en}`);
  }
  lines.push(copy.scope);
  return {
    content: lines.join("\n"),
    code: record.code,
    source: { title: record.source.title, url: record.source.url, lastVerified: record.source.verifiedAt },
    additionalSources: creditDiscrepancy?.sources,
    resolutionState: creditDiscrepancy ? "CONFLICTED" as const : isUnresolvedPrerequisite && request.fact === "prerequisite" ? "UNSUPPORTED" as const : "VERIFIED" as const,
  };
}

export function answerOfficialCourseCatalogQuestion(question: string, locale: "en" | "ar", targetCourseCode?: string): CatalogAnswer | null {
  const normalized = question.toLowerCase();
  const code = targetCourseCode ?? targetCode(question);
  const asksCourseEligibility = asksPersonalPrerequisiteEligibility(question) ||
    /\b(?:eligible to (?:take|enroll|register)|meet (?:the )?prerequisites?)\b/u.test(normalized);
  const asksProgramDecision = /\b(?:will this count|counts? toward|degree requirement|major requirement|graduate|my degree|study plan|cohort|waiver|exception)\b/u.test(normalized);
  const asksWhatToCompleteBeforeCourse = Boolean(code) &&
    (/\b(?:what|which)\s+(?:must|should|do)\s+i\s+(?:complete|finish|pass|take)\s+before\b/u.test(normalized) ||
      /\b(?:what|which)\s+(?:classes|courses)\s+do\s+i\s+need\s+to\s+(?:pass|complete|finish|take)\s+before\b/u.test(normalized));
  const arabicNormalized = question.normalize("NFC").replace(/[\u064B-\u065F\u0670]/gu, "").replace(/[أإآ]/gu, "ا");
  const asksArabicPrerequisiteFacts = /متطلب.{0,30}(?:سابق|مصاحب|منشور|مذكور)|حالة\s+المتطلب/u.test(arabicNormalized);
  const asksArabicCourseFact = /(?:متطلبات\s+(?:مادة|مقرر)|عدد\s+ال?ساعات?|كم\s+(?:(?:عدد\s+)?ال?)?(?:ساعات?|ساعة)|ساعاتها|متطلبا?\s+(?:سابقا?|مصاحبا?)|المتطلبات?\s+(?:السابقة|المصاحبة)|كيف\s+يسم[يى]|(?:اسم|عنوان)\s+(?:ال?مقرر|ال?مادة)|(?:الاسم|العنوان)\s+المنشور\s+ل(?:لمقرر|لمادة)|المتطلب\s+(?:السابق|المصاحب))/u.test(arabicNormalized);
  const additionalIntent = additionalCatalogIntent(question, targetCourseCode);
  const asksArabicCreditHours = /\u0643\u0645\s+(?:\u0633\u0627\u0639\u0629|\u0633\u0627\u0639\u062a\u0647\u0627)|\u0627\u0644\u0633\u0627\u0639\u0627\u062a\s+\u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629/u.test(question);
  const asksCombinedPrerequisiteAndCredits = additionalIntent?.fact === "prerequisite" && asksArabicCreditHours;
  const asksConcurrencyRule = /\b(?:same semester|same term|concurrently|at the same time|together)\b/u.test(normalized);
  const asksCatalogFact = /\b(?:course|classes|credits?|credit hours?|prerequisites?|corequisites?|pre\s*[/&-]?\s*co|description|what is|tell me about|catalog)\b|\u0643\u0645\s+\u0633\u0627\u0639\u0629|\u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629|\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0642\u0631\u0631|\u0627\u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0633\u0627\u0628\u0642\u0629|\u0627\u0644\u0645\u062a\u0637\u0644\u0628\s+\u0627\u0644\u0633\u0627\u0628\u0642|\u0627\u0633\u0645\s+\u0627\u0644\u0645\u0642\u0631\u0631|\u0639\u0646\u0648\u0627\u0646\s+\u0627\u0644\u0645\u0642\u0631\u0631/u.test(normalized) ||
    /\u0627\u0644\u0645\u062a\u0637\u0644\u0628.{0,40}\u0644\u0644\u0645\u0642\u0631\u0631|\u0627\u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a.{0,40}\u0644\u0644\u0645\u0642\u0631\u0631/u.test(normalized) ||
    /\b(?:classes|courses)\b.{0,60}\b(?:pass|complete|take)\b.{0,30}\bbefore\b/u.test(normalized) ||
    asksWhatToCompleteBeforeCourse;
  if ((!asksCatalogFact && !asksArabicCourseFact && !asksConcurrencyRule && !asksCourseEligibility && !additionalIntent) || asksProgramDecision) return null;
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
  const isStandingCondition = hasPrerequisiteEvidence && /\bsenior standing\b/iu.test(record.prerequisiteText ?? "");
  const prerequisiteUnsupported = hasPrerequisiteEvidence && !prerequisiteExpression && !isStandingCondition;
  const danglingPrerequisiteOperator = Boolean(record.prerequisiteText && /\b(?:and|or)\s*[.)]*$/iu.test(record.prerequisiteText));
  if (additionalIntent && !asksProgramDecision && !asksCourseEligibility && !asksCombinedPrerequisiteAndCredits) {
    const candidateDiscrepancy = loadCreditDiscrepancies().get(code);
    const creditDiscrepancy = candidateDiscrepancy &&
      (candidateDiscrepancy.appliesTo ?? ["creditHours"]).includes(additionalIntent.fact)
      ? candidateDiscrepancy
      : undefined;
    return renderAdditionalCatalogFact(record, additionalIntent, prerequisiteUnsupported || danglingPrerequisiteOperator, creditDiscrepancy);
  }
  if (asksCourseEligibility) {
    const listedRequirements = [
      record.prerequisiteText ? `- ${locale === "ar" ? "\u0646\u0635 \u0627\u0644\u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0633\u0627\u0628\u0642 \u0641\u064a \u0627\u0644\u0641\u0647\u0631\u0633" : "Catalog prerequisite wording"}: ${record.prerequisiteText}.` : locale === "ar" ? "- \u0644\u0627 \u064a\u062a\u0636\u0645\u0646 \u0633\u062c\u0644 \u0627\u0644\u0641\u0647\u0631\u0633 \u0627\u0644\u0645\u062a\u0627\u062d \u0646\u0635\u0627\u064b \u0644\u0645\u062a\u0637\u0644\u0628 \u0633\u0627\u0628\u0642 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0642\u0631\u0631." : "- The catalog snapshot does not provide prerequisite wording for this course.",
      record.corequisiteText ? `- ${locale === "ar" ? "\u0646\u0635 \u0627\u0644\u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0645\u0635\u0627\u062d\u0628 \u0641\u064a \u0627\u0644\u0641\u0647\u0631\u0633" : "Catalog corequisite wording"}: ${record.corequisiteText}.` : "",
      record.preCorequisiteText ? `- ${locale === "ar" ? "\u0646\u0635 \u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0633\u0627\u0628\u0642/\u0627\u0644\u0645\u0635\u0627\u062d\u0628 \u0641\u064a \u0627\u0644\u0641\u0647\u0631\u0633" : "Catalog Pre/Co wording"}: ${record.preCorequisiteText}.` : "",
    ].filter(Boolean);
    if (prerequisiteUnsupported) listedRequirements.push(locale === "ar"
      ? "\u0635\u064a\u0627\u063a\u0629 \u0627\u0644\u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0633\u0627\u0628\u0642 \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644\u0629 \u0623\u0648 \u063a\u064a\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u0641\u0633\u064a\u0631 \u0628\u0623\u0645\u0627\u0646. \u0644\u0627 \u0623\u0633\u062a\u0637\u064a\u0639 \u062a\u062d\u062f\u064a\u062f \u0623\u0647\u0644\u064a\u062a\u0643\u061b \u0631\u0627\u062c\u0639 \u062e\u0637\u062a\u0643 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629 \u0623\u0648 \u0648\u062d\u062f\u0629 \u0627\u0644\u0625\u0631\u0634\u0627\u062f \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a."
      : danglingPrerequisiteOperator
        ? "The prerequisite wording ends with a dangling AND/OR, so it is incomplete and does not establish which courses or alternatives are required. I cannot assess eligibility from it. Ask your College Advising Unit to confirm the rule before registering."
        : "The prerequisite wording cannot be safely interpreted by the assistant. Ask your College Advising Unit to confirm the rule before relying on it.");
    const eligibilityNotice = prerequisiteUnsupported || isStandingCondition
      ? isStandingCondition
        ? "The catalog says Senior standing but does not define the credit threshold or year that means for your record. Ask your College Advising Unit to confirm; this answer cannot assess your personal eligibility."
        : "The prerequisite rule is not supported by the evaluator. Confirm it with your College Advising Unit before relying on a personal eligibility assessment."
      : locale === "ar"
        ? "\u064a\u0630\u0643\u0631 \u0627\u0644\u0641\u0647\u0631\u0633 \u0647\u0630\u0627 \u0627\u0644\u0645\u062a\u0637\u0644\u0628\u060c \u0644\u0643\u0646 \u0630\u0644\u0643 \u0648\u062d\u062f\u0647 \u0644\u0627 \u064a\u0624\u0643\u062f \u0623\u0647\u0644\u064a\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629. \u0623\u0631\u0633\u0644 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u062a\u064a \u0623\u0643\u0645\u0644\u062a\u0647\u0627 \u0648\u062f\u0631\u062c\u0627\u062a\u0647\u0627 \u0644\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a. \u0642\u062f \u064a\u0639\u062a\u0645\u062f \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0623\u064a\u0636\u064b\u0627 \u0639\u0644\u0649 \u062e\u0637\u062a\u0643 \u0648\u0645\u0648\u0627\u0639\u064a\u062f \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0648\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u0648\u0627\u0644\u0634\u0639\u0628 \u0627\u0644\u0645\u062a\u0627\u062d\u0629. \u062a\u062d\u0642\u0642 \u0645\u0646 Student Registration\u061b \u0647\u0630\u0627 \u0627\u0644\u0631\u062f \u0644\u0627 \u064a\u0645\u0646\u062d \u0643 \u0625\u0630\u0646\u064b\u0627 \u0628\u0627\u0644\u062a\u0633\u062c\u064a\u0644."
        : "The catalog lists this prerequisite, but that alone cannot establish your personal eligibility. Share the required completed courses and grades to assess the academic rule. Registration may also depend on your assigned plan, registration period, holds, load, and available sections; confirm in Student Registration. This answer does not grant registration permission.";
    return {
      content: [
        `**${record.code} ${record.title} \u2014 ${locale === "ar" ? "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0623\u0647\u0644\u064a\u0629 \u0627\u0644\u062a\u0633\u062c\u064a\u0644" : "eligibility not verified"}**`,
        ...listedRequirements,
        eligibilityNotice,
      ].join("\n"),
      code,
      source: { title: record.source.title, url: record.source.url, lastVerified: record.source.verifiedAt },
      resolutionState: prerequisiteUnsupported || isStandingCondition ? "UNSUPPORTED" as const : "MISSING_CONTEXT" as const,
    };
  }
  const lines = [`**${record.code} ${record.title}**`];
  const asksCredits = /\b(?:credit|credits|credit hours?|hours?)\b|ساعات|ساعة/iu.test(question) || asksArabicCreditHours;
  const candidateDiscrepancy = loadCreditDiscrepancies().get(code);
  const asksPrerequisiteFacts = asksCourseEligibility || asksWhatToCompleteBeforeCourse || additionalIntent?.fact === "prerequisite" ||
    asksArabicPrerequisiteFacts || /\b(?:prerequisites?|pre-?reqs?)\b|المتطلب(?:ات)?\s+(?:السابقة|السابق|المصاحبة|المصاحب)/iu.test(question);
  const requestedFacts: CatalogFactKind[] = [];
  if (asksCredits) requestedFacts.push("creditHours");
  if (asksPrerequisiteFacts) requestedFacts.push("prerequisite");
  const creditDiscrepancy = candidateDiscrepancy &&
    requestedFacts.some((fact) => (candidateDiscrepancy.appliesTo ?? ["creditHours"]).includes(fact))
    ? candidateDiscrepancy
    : undefined;
  const discrepancyFacts = creditDiscrepancy?.appliesTo ?? (creditDiscrepancy ? ["creditHours"] : []);
  const discrepancyCoversCredits = discrepancyFacts.includes("creditHours");
  const discrepancyCoversPrerequisites = discrepancyFacts.includes("prerequisite");
  if (asksCredits && !discrepancyCoversCredits && record.creditHours !== null) lines.push(locale === "ar" ? `- الساعات المعتمدة الموضحة في المصدر المستشهد به: **${record.creditHours}**.` : `- Credit hours shown in the cited source: **${record.creditHours}**.`);
  else if (asksCredits && !discrepancyCoversCredits) lines.push(locale === "ar" ? "- لا يعرض هذا السجل عدد الساعات." : "- This catalog entry does not display a credit-hour value.");
  const prerequisiteRule = !prerequisiteUnsupported ? getCurrentPrerequisiteRule(record.code) : null;
  const ruleCourseCodes = prerequisiteRule ? [...new Set(prerequisiteExpressionCodes(prerequisiteRule.expression).map((item) => item.toUpperCase()))].sort() : [];
  const catalogPrerequisiteCodes = [...new Set(record.prerequisiteItems.map((item) => item.toUpperCase()))].sort();
  const prerequisiteRuleMatchesCatalog = ruleCourseCodes.length > 0 && ruleCourseCodes.length === catalogPrerequisiteCodes.length &&
    ruleCourseCodes.every((item, index) => item === catalogPrerequisiteCodes[index]);
  let prerequisiteRuleSource: { title: string; url: string; lastVerified: string } | undefined;
  if (creditDiscrepancy) lines.push(creditDiscrepancy.message[locale]);
  if (asksPrerequisiteFacts && record.prerequisiteText && !discrepancyCoversPrerequisites) {
    if (prerequisiteUnsupported) {
      lines.push(`- ${locale === "ar" ? "نص المتطلب السابق في الفهرس" : "Catalog prerequisite wording"}: ${record.prerequisiteText}.`);
      lines.push(locale === "ar"
        ? "صياغة المتطلب السابق غير مكتملة أو غير قابلة للتفسير بأمان؛ راجع وحدة الإرشاد الأكاديمي قبل الاعتماد عليها."
        : danglingPrerequisiteOperator
          ? "The prerequisite field is incomplete: it ends with a dangling AND/OR and does not establish the required relationship or whether an additional alternative is missing. Confirm the rule with your College Advising Unit before relying on it."
          : "This prerequisite wording cannot be safely interpreted by the assistant. Confirm the applicable rule with your College Advising Unit before relying on it.");
    } else {
      lines.push(locale === "ar" ? `- المتطلبات السابقة كما وردت في الفهرس: ${record.prerequisiteText}.` : `- Prerequisites as stated in the catalog: ${record.prerequisiteText}.`);
      if (prerequisiteRuleMatchesCatalog && prerequisiteRule && !/minimum\s+grade|minimum\s+mark|grade\s+[A-F]/iu.test(record.prerequisiteText)) {
        lines.push(locale === "ar"
          ? `- \u0627\u0644\u062f\u0631\u062c\u0629 \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0643\u0645\u0627 \u0648\u0631\u062f\u062a \u0641\u064a \u0641\u0647\u0631\u0633 \u0627\u0644\u0645\u0642\u0631\u0631: ${formatPublishedPrerequisite(prerequisiteRule.expression, locale)}.`
          : `- Minimum-grade details in the official course catalog: ${formatPublishedPrerequisite(prerequisiteRule.expression, locale)}.`);
        if (prerequisiteRule.source.url !== record.source.url) {
          prerequisiteRuleSource = { title: prerequisiteRule.source.title, url: prerequisiteRule.source.url, lastVerified: prerequisiteRule.verifiedAt };
        }
      }
    }
  }
  else if (!record.prerequisiteText && asksPrerequisiteFacts) lines.push(locale === "ar" ? "- لا يعرض هذا السجل قسماً للمتطلبات السابقة؛ وهذا لا يثبت عدم وجود قيود تسجيل أخرى." : "- This catalog entry does not show a prerequisite section; that does not establish that no other registration restrictions apply.");
  if (asksPrerequisiteFacts && record.corequisiteText) lines.push(locale === "ar" ? `- المتطلبات المصاحبة: ${record.corequisiteText}.` : `- Corequisites: ${record.corequisiteText}.`);
  if ((asksPrerequisiteFacts || asksConcurrencyRule) && record.preCorequisiteText) {
    if (asksConcurrencyRule) {
      lines.push(locale === "ar"
        ? `- يعني وسم السابق/المصاحب أن ${record.preCorequisiteText} يمكن استيفاؤه بإكماله قبل ${record.code} أو بالتسجيل فيه بالتزامن؛ لذلك يسمح الفهرس بتسجيلهما في الفصل نفسه، مع مراعاة الحد الأدنى للدرجة والتحقق من الخطة والمقاعد المتاحة.`
        : `- The catalog's Pre/Co label means ${record.preCorequisiteText} may be completed before ${record.code} or taken concurrently. The catalog therefore permits both courses in the same semester; confirm your minimum grade, degree plan, holds, and available seats in the live portal.`);
    } else {
      lines.push(locale === "ar" ? `- متطلب سابق/مصاحب كما يسميه الفهرس: ${record.preCorequisiteText}.` : `- Pre/Co requirement as labeled by the catalog: ${record.preCorequisiteText}.`);
    }
  }
  if (/description|describe|tell me about/iu.test(question) && record.description) lines.push(locale === "ar" ? `- وصف المقرر المنشور (بالإنجليزية): ${record.description}` : `- Published course description: ${record.description}`);
  lines.push(locale === "ar"
    ? "هذا سجل فهرس المقرر، ولا يحدد وحده البرنامج أو سنة الدفعة التي ينطبق عليها، ولا يؤكد أهليتك الشخصية أو توفر شعبة."
    : "This is a course-catalog record. It does not establish which degree or cohort requires the course, personal registration eligibility, or current section availability.");
  return {
    content: lines.join("\n"),
    code,
    source: { title: record.source.title, url: record.source.url, lastVerified: record.source.verifiedAt },
    additionalSources: [...new Map([
      ...(prerequisiteRuleSource ? [prerequisiteRuleSource] : []),
      ...(creditDiscrepancy?.sources ?? []),
    ].map((source) => [source.url, source])).values()],
    resolutionState: creditDiscrepancy ? "CONFLICTED" as const : prerequisiteUnsupported && /\b(?:prerequisites?|pre-?reqs?|المتطلبات السابقة)\b/iu.test(normalized) ? "UNSUPPORTED" as const : "VERIFIED" as const,
  };
}
