/** Shared, conservative interpretation used by routing, retrieval and citations.
 * It resolves identities and requested facts; it never creates university facts.
 */
export function normalizeCourseCodes(text: string): string {
  // Whitespace alone is not enough to identify a code: "for 120 credits" is
  // ordinary prose. These prefixes are present in the bundled UAEU catalogs.
  // Compact and hyphenated unknown codes remain recognizable as unknown IDs.
  const catalogPrefixes = new Set(["CENG", "CSBP", "ISEC", "ITBP", "MATH", "STAT"]);
  return text.replace(/\b([a-z]{3,6})([\s\u00a0\u2010-\u2015-]*)(\d{3})(?!\d)/gi,
    (original, prefix: string, separator: string, number: string) => {
      if (separator && !/[\u2010-\u2015-]/u.test(separator) && !catalogPrefixes.has(prefix.toUpperCase())) return original;
      return `${prefix.toUpperCase()}${number}`;
    });
}

export function normalizeQuery(text: string): string {
  return normalizeCourseCodes(text).toLowerCase().normalize("NFKD")
    .replace(/\p{M}/gu, "").replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

export function courseCodes(text: string): string[] {
  return [...new Set(normalizeCourseCodes(text).match(/\b[A-Z]{3,6}\d{3}\b/g) ?? [])];
}

function isExternalAcademicCreditRequest(text: string): boolean {
  const normalized = normalizeQuery(text);
  return /\b(?:transfer(?:red)? credits?|credit transfer|credit recognition|credit evaluation|course equivalenc(?:y|ies)|advanced standing)\b/u.test(normalized) ||
    (/\b(?:courses?|coursework|modules?|credits?)\b/u.test(normalized) && /\b(?:previous|former|another|other|different|prior) (?:university|college|institution)\b/u.test(normalized)) ||
    /(?:تحويل|معادل[ةه]).{0,35}(?:الساعات|المساقات|المقررات)|(?:ساعات|مساقات|مقررات).{0,45}جامع[ةه] (?:سابق[ةه]|اخرى)/u.test(normalized);
}

const SUBJECTS = [
  ["transcript", "official transcript", /\btranscripts?\b|كشف\s+(?:الدرجات|درجات)/u],
  ["certificate", "graduation certificate", /\b(?:graduation|degree) (?:certificate|diploma)|\bdiploma\b|شهاد[ةه]\s+(?:التخرج|الدرج[ةه])/u],
  ["enrollment-document", "enrollment certificate", /\benrollment (?:certificate|letter)|\bproof of enroll|\b(?:letter|certificate|document)\b.{0,35}\b(?:proving|confirming|showing|certifying|to prove|to confirm)\b.{0,35}\b(?:enrolled|enrolment|enrollment|student status)\b|شهاد[ةه]\s+قيد|اثبات\s+القيد|(?:رسال[ةه]|خطاب|شهاد[ةه]|وثيق[ةه]).{0,30}(?:تثبت|يثبت|اثبات|تاكيد).{0,25}(?:قيد|مقيد|طالب)/u],
  ["student-document", "student document", /\bstudent documents?\b|وثيق[ةه] طالب|وثائق الطلب[ةه]/u],
  ["twimc", "to whom it may concern letter", /to whom it may concern|\btwimc\b|لمن يهمه الامر/u],
  ["reference-letter", "recommendation letter", /\b(?:recommendation|reference) letter\b|رسالة توصية|خطاب توصية/u],
  ["graduation", "graduation", /\bgraduation\b|\bgraduate from\b|\bto graduate\b|التخرج|للتخرج|اتخرج/u],
  ["admissions", "admission", /\badmissions?\b|\bapply (?:to|as) (?:a |an |the )?(?:uaeu|university|college|undergraduate|bachelor|postgraduate|master|phd|doctoral|international|emirati|national)\b|\bapply for (?:fall|spring|summer|autumn|winter)\b|\bundergraduate application|القبول|للقبول|قبول|البكالوريوس/u],
  ["transfer", "external academic credit transfer", /\b(?:transfer(?:red)? credits?|credit transfer|credit recognition|credit evaluation|course equivalenc(?:y|ies)|advanced standing)\b/u],
  ["housing", "student housing", /\b(?:housing|dorms?|dormitory|accommodation|room assignment)\b|السكن|سكن|وحدات السكن/u],
  ["scholarship", "scholarship", /\bscholarships?\b|المنح|منح[ةه]|ابتعاث/u],
  ["visa", "student visa", /\b(?:visa|residence permit)\b|تاشير[ةه]|الاقام[ةه]/u],
  ["library", "library", /\b(?:library|librarian)\b|المكتب[ةه]|مكتب[ةه]|امين المكتبة/u],
  ["parking", "parking", /\b(?:parking|vehicle permit)\b|مواقف|تصريح.*سيار/u],
  ["calendar", "academic calendar", /\b(?:calendar|semester start|term start|classes (?:start|begin)|holiday|final exams?)\b|التقويم|بداي[ةه] الفصل|الامتحانات النهائي[ةه]/u],
  ["tuition", "tuition fees", /\btuition\b|الرسوم الدراسي[ةه]/u],
  ["registration", "course registration", /\b(?:registration|register|enroll|add drop|drop a course|dropping|withdraw\w*|credit load|course load|study load|normal load)\b|تسجيل|حذف|انسحاب|العبء الدراسي/u],
  ["internship", "internship", /\binternships?\b|التدريب|تدريب/u],
  ["password", "password reset", /\b(?:password|mfa|multi factor|account locked)\b|كلم[ةه] المرور|المصادق[ةه]/u],
  ["wifi", "campus wifi", /\b(?:wi fi|wifi|wireless)\b|واي فاي|الشبك[ةه] اللاسلكي[ةه]/u],
  ["faculty", "faculty teaching assignment", /\b(?:professor|faculty member|lecturer|instructor .*teach)\b|الاستاذ|الدكتور.*يدرس/u],
  ["information-security", "Information Security study plan", /\binformation security\b|امن المعلومات/u],
  ["computer-science", "Computer Science study plan", /\bcomputer science\b|\bcs (?:major|student|courses)|علوم (?:الحاسوب|الكمبيوتر)/u],
  ["counseling", "counseling", /\bcounsel(?:l)?ing\b|ارشاد نفسي|الارشاد النفسي/u],
  ["medical", "medical services", /\b(?:medical|health clinic)\b|العياد[ةه]|خدمات صحي[ةه]/u],
  ["major-change", "change of major", /\b(?:change|switch|transfer).*\bmajor\b|تغيير التخصص|تخصص.*اخر/u],
  ["refund", "fee refund", /\brefund\b|استرداد/u],
  ["grade", "grades", /\b(?:grade|grading|academic standing|probation)\b|تقدير|درج[ةه]|انذار اكاديمي/u],
] as const;

export type FactIntent = "prerequisites" | "fees" | "duration" | "deadline" | "status" | "eligibility" | "topics" | "location" | "hours" | "documents" | "apply" | "requirements" | "gpa" | "courses" | "contact" | "verify" | "start" | "exams" | "credit-load" | "standing" | "approval" | "withdrawal";
const INTENTS: [FactIntent, RegExp][] = [
  ["credit-load", /\b(?:credit (?:hours?|load)|course load|study load|semester load|normal load|maximum load|minimum load|how many credits)\b|العبء الدراسي|ساعات معتمد[ةه]|عدد الساعات/u],
  ["standing", /\b(?:academic standing|academic probation|on probation|probation|academic dismissal)\b|الوضع الاكاديمي|انذار اكاديمي|الانذار الاكاديمي|فصل اكاديمي/u],
  ["approval", /\b(?:approv\w*|authoriz\w*|authoris\w*|permission)\b|موافق[ةه]|يوافق|تصريح/u],
  ["withdrawal", /\b(?:withdrawing|withdrawal|withdraw|dropping|drop)\b|انسحاب|الانسحاب|حذف|الحذف/u],
  ["prerequisites", /\b(?:prerequisites?|corequisites?|pre requisites?)\b|متطلبات سابق[ةه]|المتطلبات السابق[ةه]|متطلب سابق|متطلبات.*(?:csbp|isec)|شروط.*(?:csbp|isec)/u],
  ["gpa", /\b(?:gpa|cgpa|grade point average)\b|معدل.*(?:التخرج|تخرج)|المعدل التراكمي/u],
  ["fees", /\b(?:fees?|cost|charge|price|free|pay|payment|paid)\b|how much|كم.*(?:يكلف|رسوم|ادفع)|رسوم|تكلف[ةه]|مجاني/u],
  ["duration", /\b(?:how long|processing time|delivery time|how soon|turnaround)\b|كم يستغرق|كم تاخذ|مد[ةه].*(?:اصدار|انجاز|معالج[ةه])/u],
  ["deadline", /\b(?:deadlines?|last (?:day|date)|due date|apply by)\b|\bapplications?\b.{0,70}\b(?:closes?|ends?)\b|اخر موعد|الموعد النهائي|متى.*(?:ينتهي|يغلق)/u],
  ["status", /\b(?:status|track|tracking|progress)\b|حال[ةه] الطلب|متابع[ةه] الطلب/u],
  ["eligibility", /\b(?:eligible|eligibility|qualify|qualified)\b|اهلي[ةه]|موهل|استحق/u],
  ["topics", /\b(?:topics?|content|covers?|covered|taught|learn|syllabus)\b|موضوعات|المواضيع|محتوى|يتناول|يدرسها/u],
  ["hours", /\b(?:opening hours|hours|open|closed)\b|ساعات العمل|اوقات العمل|ساعات الدوام|متى.*(?:تفتح|تغلق)/u],
  ["location", /\b(?:where|location|located|address)\b|اين|موقع/u],
  ["documents", /\b(?:documents?|paperwork)\b|مستندات|الاوراق|وثائق/u],
  ["apply", /\b(?:apply|request|order|obtain|collect|issue|register|renew)\b|اطلب|اقدم|اطلع|استخراج|اصدار|استلام|تقديم|اجدد/u],
  ["requirements", /\b(?:requirements?|conditions|criteria)\b|متطلبات|شروط/u],
  ["courses", /\b(?:courses?|subjects?|study plan|degree plan|curriculum)\b|مساقات|مساق|مقررات|مواد|الخطة/u],
  ["contact", /\b(?:contact|phone|email|reach)\b|تواصل|هاتف|بريد/u],
  ["verify", /\b(?:verify|sure|source|citation|is that correct)\b|تحقق|المصدر|متاكد|هل هذا صحيح/u],
  ["start", /\b(?:starts?|starting|begins?|beginning|commences?|commencement)\b|يبدا|بداي[ةه]/u],
  ["exams", /\b(?:exams?|examinations?)\b|امتحان|اختبار/u],
];

export type QuerySubject = { key: string; label: string; origin: string };
export type QueryMeaning = {
  normalized: string;
  codes: string[];
  subjects: string[];
  intents: FactIntent[];
  years: number[];
  terms: string[];
  applicantCategory?: "national" | "international";
  applicantCategories: ("national" | "international")[];
  degreeLevel?: "undergraduate" | "postgraduate";
  degreeLevels: ("undergraduate" | "postgraduate")[];
};

export function understandQuery(text: string): QueryMeaning {
  const normalized = normalizeQuery(text);
  const subjects = SUBJECTS.filter(([, , pattern]) => pattern.test(normalized)).map(([key]) => key);
  if (!subjects.includes("transfer") && isExternalAcademicCreditRequest(text)) subjects.push("transfer");
  // Degree applications establish an admissions topic even when the preposition
  // is "for". A degree document or an application to graduate is a different
  // transaction; neither should seed admissions context for a later slot reply.
  if (!subjects.includes("admissions") &&
    /\b(?:apply|applying|application) (?:for|to) (?:a |an |the )?(?:undergraduate|bachelor(?: s|s)?|postgraduate|master(?: s|s)?|phd|doctoral)(?: degree| program| programme)?\b/u.test(normalized) &&
    !/\b(?:certificate|diploma|transcript|attestation)\b/u.test(normalized)) subjects.push("admissions");
  // An intake's application window is admissions, not the semester calendar.
  // Already named services retain their own application topic.
  const intakeApplication = !subjects.length && /\bapplications? for (?:the )?(?:fall|spring|summer|autumn|winter)\b/u.test(normalized);
  if (intakeApplication) subjects.push("admissions");
  // "Does that rule apply to X?" is an applicability follow-up, not a new
  // admission application merely because the words "apply to" appear.
  if (!/\b(?:admission|application|applicant)\b/u.test(normalized) && /\b(?:that|this|it|these|those|rules?|conditions?|requirements?|polic(?:y|ies)|thresholds?|deadlines?|dates?|minimum|maximum)\b.{0,80}\bapply\b/u.test(normalized)) {
    const admissionIndex = subjects.indexOf("admissions");
    if (admissionIndex >= 0) subjects.splice(admissionIndex, 1);
  }
  const intents = INTENTS.filter(([, pattern]) => pattern.test(normalized)).map(([key]) => key);
  // Counting transfer-recognized or degree credits is not semester study load.
  if (intents.includes("credit-load") && /\b(?:transfer\w*|recogniz\w*|degree|graduat\w*)\b/u.test(normalized) &&
    !/\b(?:course load|study load|credit load|semester load|per semester|normal semester)\b/u.test(normalized)) intents.splice(intents.indexOf("credit-load"), 1);
  // A named course question about requirements means prerequisites, not admission requirements.
  const explicit = courseCodes(text);
  const codes = explicit.length ? explicit : /\bdata structures?\b|هياكل البيانات/u.test(normalized) ? ["CSBP319"]
    : /\bdatabase systems?\b|قواعد البيانات/u.test(normalized) && !subjects.includes("library") ? ["CSBP340"] : [];
  if (codes.length && intents.includes("requirements") && !intents.includes("prerequisites")) intents.unshift("prerequisites");
  const terms = [...normalized.matchAll(/\b(fall|spring|summer|autumn|winter)\b|(?:خريف|ربيع|صيف|شتاء)/g)]
    .map(([term]) => ({ autumn: "fall", خريف: "fall", ربيع: "spring", صيف: "summer", شتاء: "winter" }[term] ?? term));
  // A named season plus a start/begin question identifies the academic calendar,
  // without needing adjacent words such as "semester start". Do not reinterpret
  // a housing, visa, application or course question as a calendar request.
  // "When" or "date" alone is insufficient: a date for adding classes or
  // another service must not be reclassified as the start of a semester.
  if (!subjects.length && !codes.length && terms.length && !/\bapplications?\b/u.test(normalized) &&
    intents.includes("start")) subjects.push("calendar");
  const degreeLevels: QueryMeaning["degreeLevels"] = [];
  const positiveDegreeText = normalized.replace(/\bnot (?:a |an )?(?:undergraduate|postgraduate|bachelor(?:s)?|master(?:s)?|phd|doctoral)(?: student| applicant| degree)?\b/gu, "");
  if (/\b(?:postgraduates?|master|masters|phd|doctoral)\b|ماجستير|دكتوراه|دراسات عليا/u.test(positiveDegreeText)) degreeLevels.push("postgraduate");
  if (/\b(?:undergraduates?|bachelor|bachelors)\b|بكالوريوس/u.test(positiveDegreeText)) degreeLevels.push("undergraduate");
  const applicantCategories: QueryMeaning["applicantCategories"] = [];
  const positiveCategoryText = normalized.replace(/\bnot (?:a |an )?(?:uae national|emirati|citizen|international(?: applicant| student)?)\b|لست (?:مواطن[اة]?|اماراتي[اة]?|طالبا? دوليا?)/gu, "");
  if (/\b(?:international|non emiratis?|non nationals?|employee.*child|children of.*employee)\b|دولي|الدوليين|غير المواطنين|ابناء.*الموظف/u.test(positiveCategoryText)) applicantCategories.push("international");
  if (/\b(?:uae nationals?|emiratis?|citizens?|national service)\b|مواطن|اماراتي|ابناء المواطنات/u.test(positiveCategoryText.replace(/non (?:emiratis?|nationals?)|غير المواطنين/g, ""))) applicantCategories.push("national");
  const selfCategory = /\b(?:i am|i m|as) (?:a |an )?(?:uae national|emirati|citizen)\b|انا (?:مواطن|اماراتي)/u.test(normalized) ? "national"
    : /\b(?:i am|i m|as) (?:a |an )?international\b|انا طالب دولي/u.test(normalized) ? "international" : undefined;
  return {
    normalized, codes, subjects, intents,
    years: [...new Set((normalized.match(/\b20\d{2}\b/g) ?? []).map(Number))],
    terms: [...new Set(terms)],
    applicantCategory: selfCategory ?? (applicantCategories.length === 1 ? applicantCategories[0] : undefined),
    applicantCategories,
    degreeLevel: degreeLevels.length === 1 ? degreeLevels[0] : undefined,
    degreeLevels,
  };
}

export function namedSubjects(text: string): QuerySubject[] {
  const meaning = understandQuery(text);
  if (meaning.subjects.includes("transfer") && !meaning.intents.some((intent) => ["prerequisites", "topics"].includes(intent))) {
    return [{ key: "transfer", label: "external academic credit transfer", origin: text }];
  }
  if (meaning.codes.length) return meaning.codes.map((code) => ({ key: code, label: code, origin: normalizeCourseCodes(text) }));
  const matched = SUBJECTS.filter(([key]) => meaning.subjects.includes(key));
  // Specific documents take precedence over the general graduation/admission label.
  if (matched.some(([key]) => ["transcript", "certificate", "twimc", "enrollment-document"].includes(key))) {
    return matched.filter(([key]) => ["transcript", "certificate", "twimc", "enrollment-document"].includes(key))
      .map(([key, label]) => ({ key, label, origin: text }));
  }
  return matched.map(([key, label]) => ({ key, label: key === "library" && /\bmain library\b|المكتبة الرئيسية/iu.test(text) ? "Main Library" : label, origin: text }));
}

const CANCEL = /^(?:never mind|nevermind|forget it|cancel that|ignore that|stop that|خلاص|انس[ىي] الموضوع)$/u;
const REFERENCE = /\b(?:it|its|that|this|them|those|these|same|first|previous(?! (?:university|college|institution)\b)|earlier|last one|what about|how long|how much|am i eligible|the (?:application )?deadline|the source)\b|هذا|هذه|ذلك|لها|له|الاول|السابق|كم يستغرق|كم تكلف|هل انا موهل/u;
const SLOT_FRAGMENT = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|printed|digital|paper copy|hard copy)\b|الاثنين|الثلاثاء|الاربعاء|الخميس|الجمع[ةه]|السبت|الاحد|مطبوع|رقمي/u;
const GENERIC_FOLLOW_UP = /^(?:(?:what|which) (?:are|is) (?:the )?(?:requirements|documents|criteria)|what documents|what do i need|which documents)|^(?:ما|اي) (?:المستندات|الوثائق|المتطلبات|الشروط)/u;

export type ConversationResolution = {
  query: string;
  subject?: QuerySubject;
  intents: FactIntent[];
  needsClarification: boolean;
  usedContext: boolean;
  ambiguous: boolean;
  candidates: QuerySubject[];
};

export function resolveConversation(
  messages: { role: string; content: string }[],
  latest: string,
): ConversationResolution {
  const prior = messages.filter((message) => message.role === "user").slice(0, -1).slice(-29);
  const entities: QuerySubject[] = [];
  const visits: QuerySubject[][] = [];
  let active: QuerySubject[] = [];
  let lastIntent: FactIntent[] = [];
  let activeScope: QueryMeaning | undefined;
  for (const message of prior) {
    const meaning = understandQuery(message.content);
    if (CANCEL.test(meaning.normalized)) { entities.length = 0; visits.length = 0; active = []; lastIntent = []; activeScope = undefined; continue; }
    const found = namedSubjects(message.content);
    if (found.length) {
      if (!found.some((subject) => active.some((previous) => previous.key === subject.key))) { activeScope = undefined; lastIntent = []; }
      active = found;
      for (const subject of found) if (!entities.some((entry) => entry.key === subject.key)) entities.push(subject);
    } else if (REFERENCE.test(meaning.normalized)) {
      if (/\bfirst\b|الاول/u.test(meaning.normalized) && entities[0]) active = [entities[0]];
      else if (/\b(?:previous|earlier)\b|السابق/u.test(meaning.normalized) && visits.length > 1) active = visits.at(-2)!;
    }
    if (active.length) activeScope = activeScope ? {
      ...activeScope,
      years: meaning.years.length ? meaning.years : activeScope.years,
      terms: meaning.terms.length ? meaning.terms : activeScope.terms,
      applicantCategory: meaning.applicantCategory ?? activeScope.applicantCategory,
      applicantCategories: meaning.applicantCategories.length ? meaning.applicantCategories : activeScope.applicantCategories,
      degreeLevel: meaning.degreeLevel ?? activeScope.degreeLevel,
      degreeLevels: meaning.degreeLevels.length ? meaning.degreeLevels : activeScope.degreeLevels,
    } : meaning;
    if (active.length && active.map(({ key }) => key).join() !== visits.at(-1)?.map(({ key }) => key).join()) visits.push(active);
    const facts = meaning.intents.filter((intent) => !["verify", "courses", "location"].includes(intent));
    if (facts.length) lastIntent = facts;
  }
  const meaning = understandQuery(latest);
  const named = namedSubjects(latest);
  const directFacts = meaning.intents.filter((intent) => !["verify", "courses"].includes(intent));
  const refers = REFERENCE.test(meaning.normalized) || (!named.length && (GENERIC_FOLLOW_UP.test(meaning.normalized) || SLOT_FRAGMENT.test(meaning.normalized) || meaning.applicantCategories.length > 0 || meaning.degreeLevels.length > 0));
  let subject: QuerySubject | undefined = named[0];
  let ambiguous = false;
  if (!named.length && refers) {
    if (/\bfirst\b|الاول/u.test(meaning.normalized)) subject = entities[0];
    else if (/\b(?:previous|earlier)\b|السابق/u.test(meaning.normalized)) {
      const previous = visits.length > 1 ? visits.at(-2)! : active;
      if (previous.length === 1) subject = previous[0];
      else ambiguous = previous.length > 1;
    }
    else if (active.length === 1) subject = active[0];
    else ambiguous = active.length > 1;
  }
  const inheritsIntent = meaning.codes.length > 0 && !directFacts.length && /\bwhat about\b|ماذا عن|وماذا|وبالنسب[ةه]/u.test(meaning.normalized);
  const verification = meaning.intents.includes("verify") && !directFacts.length;
  const intents = (!directFacts.length && (refers || inheritsIntent || verification)) ? lastIntent : meaning.intents;
  const sameSubjectReference = named.length === 1 && active.length === 1 &&
    named[0].key === active[0].key && REFERENCE.test(meaning.normalized);
  const usedContext = Boolean(subject && ((!named.length && refers) || sameSubjectReference || inheritsIntent || verification));
  const intentText: Partial<Record<FactIntent, string>> = { fees: "cost fees", duration: "processing time how long", prerequisites: "prerequisites", deadline: "application deadline", eligibility: "eligibility", status: "status", requirements: "requirements", gpa: "GPA", topics: "course topics" };
  const origin = subject ? (active.some((item) => item.key === subject.key) ? activeScope ?? understandQuery(subject.origin) : understandQuery(subject.origin)) : undefined;
  const inheritedCategory = meaning.applicantCategory ?? origin?.applicantCategory;
  const inheritedScope = origin ? [inheritedCategory === "national" ? "UAE national" : inheritedCategory, meaning.degreeLevel ?? origin.degreeLevel, ...(meaning.years.length ? meaning.years : origin.years), ...(meaning.terms.length ? meaning.terms : origin.terms),
    /\b(?:alumni|alumnus|former student)\b|الخريجين|خريج/u.test(origin.normalized) ? "alumni" : undefined,
    /\bcurrent student\b|طالب حالي/u.test(origin.normalized) ? "current student" : undefined,
  ].filter(Boolean).join(" ") : "";
  // Preserve the identity and applicability, not an old request verb. Otherwise
  // "apply to CSBP319" keeps outscoring a later request for its prerequisites.
  const query = usedContext && subject
    ? `${subject.label} ${inheritedScope}\nRequested fact: ${intents.map((intent) => intentText[intent] ?? intent).join(" ")}\nFollow-up question: ${normalizeCourseCodes(latest)}`
    : normalizeCourseCodes(latest);
  return { query, subject, intents, usedContext, ambiguous, candidates: ambiguous ? active : [], needsClarification: !subject && refers && !named.length };
}

export type EvidenceScope = {
  courseCodes?: string[];
  subjects?: string[];
  applicantCategory?: "national" | "international";
  /** Explicitly reviewed common rule, not an inferred applicant category. */
  categoryIndependent?: boolean;
  degreeLevel?: "undergraduate" | "postgraduate";
  years?: number[];
  terms?: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
  temporalCoverage?: "procedural" | "dated";
};

export function scopeAllows(query: string, text: string, scope: EvidenceScope = {}): boolean {
  const wanted = understandQuery(query);
  const evidence = understandQuery(text);
  if (scope.courseCodes?.length && wanted.codes.length && !wanted.codes.some((code) => scope.courseCodes!.includes(code))) return false;
  if (scope.applicantCategory && !wanted.applicantCategories.includes(scope.applicantCategory)) return false;
  if (scope.degreeLevel && wanted.degreeLevel && wanted.degreeLevel !== scope.degreeLevel) return false;
  const temporal = wanted.intents.some((intent) => ["deadline", "start", "exams"].includes(intent));
  if (temporal && wanted.years.length && scope.temporalCoverage !== "procedural") {
    const years = scope.years ?? evidence.years;
    if (!wanted.years.every((year) => years.includes(year))) return false;
    // Exact published dates require an applicable year; procedural guidance may have none.
  }
  if (temporal && wanted.terms.length && scope.terms?.length && !wanted.terms.every((term) => scope.terms!.includes(term))) return false;
  if (scope.effectiveFrom && Date.parse(scope.effectiveFrom) > Date.now()) return false;
  if (scope.effectiveTo && Date.parse(`${scope.effectiveTo}T23:59:59Z`) < Date.now()) return false;
  return true;
}
