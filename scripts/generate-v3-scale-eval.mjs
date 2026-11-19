import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "data/evals/v3-scale-questions.jsonl");
const manifestPath = path.join(root, "data/evals/v3-scale-manifest.json");
const load = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const courses = load("data/academic/course-catalog.json").courses;
const curricula = load("data/academic/program-curricula.json");
const common = load("data/evals/common-questions.json");
const alignment = load("data/evals/alignment-questions.json").cases;
const serviceGuides = fs.readdirSync(path.join(root, "data/service-guides"))
  .filter((name) => name.endsWith(".json"))
  .map((name) => load(path.join("data/service-guides", name)));
const answerEntries = [
  ...load("data/verified-answers/academic.json").entries,
  ...load("data/verified-answers/student-services.json").entries,
];
const answersById = new Map(answerEntries.map((entry) => [entry.id, entry]));

const languageTargets = [
  { language: "en", courses: 2400, curricula: 800, scenarios: 800 },
  { language: "ar", courses: 2400, curricula: 800, scenarios: 800 },
  { language: "hi", courses: 400, curricula: 100, scenarios: 0 },
  { language: "ur", courses: 400, curricula: 100, scenarios: 0 },
  { language: "fr", courses: 400, curricula: 100, scenarios: 0 },
  { language: "es", courses: 400, curricula: 100, scenarios: 0 },
];

const courseWording = {
  en: {
    credit: ["How many credit hours does UAEU course {code} carry?", "What is the published credit value of course {code} at UAEU?", "According to the UAEU catalog, how many credits is {code}?"],
    title: ["What is the published title of UAEU course {code}?", "Identify course {code} by its official UAEU catalog title.", "Which course name does the UAEU catalog give for {code}?"],
    prerequisite: ["What prerequisite information does the UAEU catalog publish for {code}?", "Does the UAEU catalog list a prerequisite or corequisite for {code}?", "State the catalog-listed prerequisite/corequisite status for {code}; flag any unresolved source rule."],
  },
  ar: {
    credit: ["كم عدد الساعات المعتمدة للمقرر {code} في جامعة الإمارات؟", "ما عدد الساعات المنشور للمقرر {code} وفق دليل جامعة الإمارات؟", "كم ساعة معتمدة يسجل دليل المقررات لمادة {code}؟"],
    title: ["ما الاسم المنشور للمقرر {code} في دليل جامعة الإمارات؟", "ما عنوان المقرر الرسمي ذي الرمز {code}؟", "كيف يسمي دليل المقررات في جامعة الإمارات مادة {code}؟"],
    prerequisite: ["ما معلومات المتطلب السابق أو المصاحب المنشورة للمقرر {code}؟", "هل يسجل دليل جامعة الإمارات متطلباً سابقاً أو مصاحباً للمقرر {code}؟", "اذكر حالة المتطلب المنشورة للمقرر {code}، ونبّه إلى أي قاعدة غير محسومة."],
  },
  hi: {
    credit: ["UAEU पाठ्यक्रम {code} में कितने क्रेडिट घंटे हैं?", "UAEU कैटलॉग के अनुसार {code} के कितने क्रेडिट हैं?"],
    title: ["UAEU कैटलॉग में पाठ्यक्रम {code} का प्रकाशित नाम क्या है?", "पाठ्यक्रम {code} का आधिकारिक UAEU शीर्षक बताइए।"],
    prerequisite: ["UAEU कैटलॉग में {code} के लिए कौन-सी पूर्वापेक्षा या सह-पाठ्यक्रम शर्त दर्ज है?", "{code} की प्रकाशित पूर्वापेक्षा स्थिति बताइए और अनसुलझे नियम को स्पष्ट करें।"],
  },
  ur: {
    credit: ["UAEU کے کورس {code} کے کتنے کریڈٹ آورز ہیں؟", "UAEU کیٹلاگ کے مطابق {code} کے کتنے کریڈٹس ہیں؟"],
    title: ["UAEU کیٹلاگ میں کورس {code} کا شائع شدہ نام کیا ہے؟", "کورس {code} کا سرکاری UAEU عنوان بتائیں۔"],
    prerequisite: ["UAEU کیٹلاگ میں {code} کے لیے کون سی پیشگی یا ساتھ لینے کی شرط درج ہے؟", "{code} کی شائع شدہ پیشگی شرط کی حالت بتائیں اور غیر حل شدہ قاعدے کی نشاندہی کریں۔"],
  },
  fr: {
    credit: ["Combien d'heures de crédit comporte le cours UAEU {code} ?", "Combien de crédits le catalogue UAEU attribue-t-il à {code} ?"],
    title: ["Quel est le titre publié du cours UAEU {code} ?", "Quel nom officiel le catalogue UAEU donne-t-il au cours {code} ?"],
    prerequisite: ["Quel prérequis ou cours concomitant le catalogue UAEU indique-t-il pour {code} ?", "Indiquez le statut publié des prérequis de {code} et signalez toute règle non résolue."],
  },
  es: {
    credit: ["¿Cuántas horas de crédito tiene la asignatura UAEU {code}?", "¿Cuántos créditos asigna el catálogo UAEU a {code}?"],
    title: ["¿Cuál es el título publicado de la asignatura UAEU {code}?", "¿Qué nombre oficial asigna el catálogo UAEU a {code}?"],
    prerequisite: ["¿Qué prerrequisito o asignatura simultánea indica el catálogo UAEU para {code}?", "Indica el estado publicado de los prerrequisitos de {code} y señala cualquier regla sin resolver."],
  },
};

const curriculumWording = {
  en: [
    "What total credits does the published curriculum for {program} list for the cohort described as '{version}'?",
    "What credit allocations does the published {program} curriculum list for the cohort described as '{version}'?",
    "What applicability statement does UAEU publish for {program} for the cohort described as '{version}'?",
    "For the published curriculum label '{version}', which degree title and college are recorded for {program}?",
  ],
  ar: [
    "ما إجمالي الساعات الذي ينص عليه منهج {program} المنشور للفئة الموصوفة بأنها '{version}'؟",
    "ما توزيعات الساعات التي ينشرها منهج {program} للفئة الموصوفة بأنها '{version}'؟",
    "ما عبارة الانطباق التي تنشرها جامعة الإمارات لبرنامج {program} للفئة الموصوفة بأنها '{version}'؟",
    "وفق الوصف المنشور '{version}'، ما اسم الدرجة والكلية المسجلان لبرنامج {program}؟",
  ],
  hi: [
    "{program} के प्रकाशित पाठ्यक्रम में '{version}' के रूप में बताए गए समूह के लिए कुल कितने क्रेडिट हैं?",
    "'{version}' समूह के लिए {program} के प्रकाशित क्रेडिट-विभाजन क्या हैं?",
    "'{version}' समूह के लिए UAEU, {program} की प्रयोज्यता के बारे में क्या प्रकाशित करता है?",
    "प्रकाशित लेबल '{version}' में {program} के लिए कौन-सी डिग्री और कॉलेज दर्ज हैं?",
  ],
  ur: [
    "{program} کے شائع شدہ نصاب میں '{version}' کے طور پر بیان کردہ گروپ کے لیے کل کتنے کریڈٹس ہیں؟",
    "'{version}' گروپ کے لیے {program} کی شائع شدہ کریڈٹ تقسیم کیا ہے؟",
    "'{version}' گروپ کے لیے UAEU، {program} کے اطلاق کے بارے میں کیا شائع کرتا ہے؟",
    "شائع شدہ لیبل '{version}' میں {program} کے لیے کون سی ڈگری اور کالج درج ہیں؟",
  ],
  fr: [
    "Combien de crédits le cursus publié de {program} indique-t-il pour le groupe décrit comme « {version} » ?",
    "Quelles répartitions de crédits le cursus publié de {program} donne-t-il pour « {version} » ?",
    "Quelle indication d'applicabilité UAEU publie-t-elle pour {program} et le groupe « {version} » ?",
    "Pour le libellé publié « {version} », quels diplôme et collège sont indiqués pour {program} ?",
  ],
  es: [
    "¿Cuántos créditos indica el currículo publicado de {program} para el grupo descrito como '{version}'?",
    "¿Qué distribuciones de créditos publica el currículo de {program} para '{version}'?",
    "¿Qué declaración de aplicabilidad publica UAEU para {program} y el grupo '{version}'?",
    "En la etiqueta publicada '{version}', ¿qué título y facultad se registran para {program}?",
  ],
};

const curriculumQualifiers = {
  en: [" Cite the version-specific source.", " Use only the published plan label.", " Keep the answer limited to the cited curriculum.", " State if the source does not publish the value.", " Do not infer my personal cohort from this plan.", " Distinguish a published label from an assigned plan."],
  ar: [" مع ذكر مصدر النسخة المحددة.", " استخدم وصف الخطة المنشور فقط.", " احصر الإجابة في المنهج المستشهد به.", " اذكر إذا لم ينشر المصدر هذه القيمة.", " لا تستنتج دفعتي الشخصية من هذه الخطة.", " ميّز بين الوصف المنشور والخطة المسندة للطالب."],
  hi: [" संस्करण-विशिष्ट स्रोत का उल्लेख करें।", " केवल प्रकाशित योजना का लेबल उपयोग करें।", " उत्तर को उद्धृत पाठ्यक्रम तक सीमित रखें।", " मान प्रकाशित न हो तो स्पष्ट करें।", " इस योजना से मेरी व्यक्तिगत cohort न मानें।", " प्रकाशित लेबल और आवंटित योजना में अंतर बताएं।"],
  ur: [" مخصوصہ نسخے کا ماخذ بھی بتائیں۔", " صرف شائع شدہ منصوبے کا لیبل استعمال کریں۔", " جواب کو حوالہ شدہ نصاب تک محدود رکھیں۔", " اگر قدر شائع نہیں تو واضح کریں۔", " اس منصوبے سے میری ذاتی جماعت اخذ نہ کریں۔", " شائع شدہ لیبل اور طالب علم کو دیے گئے منصوبے میں فرق بتائیں۔"],
  fr: [" Citez la source correspondant à cette version.", " Utilisez uniquement le libellé publié du plan.", " Limitez la réponse au cursus cité.", " Précisez si la source ne publie pas cette valeur.", " Ne déduisez pas ma cohorte personnelle de ce plan.", " Distinguez le libellé publié du plan attribué à l'étudiant."],
  es: [" Cita la fuente de esta versión.", " Usa solo la etiqueta publicada del plan.", " Limita la respuesta al plan citado.", " Indica si la fuente no publica este dato.", " No deduzcas mi cohorte personal a partir de este plan.", " Distingue la etiqueta publicada del plan asignado al estudiante."],
};

const scenarioFrames = {
  en: [
    "Using official UAEU evidence and stating any limits, answer: {question}",
    "I need the current published UAEU answer, with its scope made clear: {question}",
    "Please distinguish confirmed information from anything I must verify: {question}",
    "For a student asking UAEU, what does the cited official information say? {question}",
    "Answer this UAEU question from the relevant official source, not a similar topic: {question}",
    "Please give the practical next step and cite the relevant UAEU evidence: {question}",
    "What is the source-supported answer to this student question? {question}",
    "Please answer only what the official UAEU evidence supports: {question}",
    "For this scenario, identify the correct UAEU topic and its limits: {question}",
    "Please avoid assumptions and explain the applicable UAEU information: {question}",
    "Give a concise, evidence-linked UAEU response to: {question}",
    "Check the official source for this exact issue and answer: {question}",
    "Please state the useful next step without guessing missing policy details: {question}",
  ],
  ar: [
    "أجب استناداً إلى مصدر رسمي لجامعة الإمارات، ووضّح حدود المعلومة: {question}",
    "أحتاج إلى الإجابة المنشورة حالياً مع بيان نطاقها: {question}",
    "يرجى التمييز بين المعلومة المؤكدة وما يجب عليّ التحقق منه: {question}",
    "ما الذي تقوله المعلومات الرسمية ذات الصلة للطالب في جامعة الإمارات؟ {question}",
    "أجب من المصدر الرسمي المناسب، ولا تخلط هذا الموضوع بموضوع مشابه: {question}",
    "اذكر الخطوة العملية التالية واستشهد بمصدر جامعة الإمارات المناسب: {question}",
    "ما الإجابة التي يدعمها المصدر المنشور لهذا الاستفسار؟ {question}",
    "أجب فقط بما تدعمه الأدلة الرسمية لجامعة الإمارات: {question}",
    "في هذا السيناريو، حدد موضوع جامعة الإمارات المناسب وحدوده: {question}",
    "تجنب الافتراضات واشرح المعلومة المنشورة ذات الصلة: {question}",
    "قدّم إجابة موجزة مرتبطة بمصدر رسمي عن: {question}",
    "تحقق من المصدر الرسمي لهذه المسألة تحديداً ثم أجب: {question}",
    "اذكر خطوة عملية مفيدة دون تخمين تفاصيل غير منشورة: {question}",
  ],
};

const contextFrames = {
  en: ["For context, {context}", "Background information: {context}", "I should mention: {context}", "To explain my situation, {context}", "Additional context: {context}", "Here is the background to my follow-up: {context}", "One detail about my situation: {context}", "To clarify my earlier message: {context}", "My earlier context was: {context}", "Please keep this background in mind: {context}", "For the question that follows: {context}", "Relevant information: {context}"],
  ar: ["للتوضيح، {context}", "هذه خلفية سؤالي: {context}", "أضيف هذه المعلومة: {context}", "لشرح حالتي، {context}", "سياق إضافي: {context}", "معلومة سابقة مرتبطة بسؤالي: {context}", "تفصيل عن حالتي: {context}", "لتوضيح رسالتي السابقة: {context}", "المعلومات التي ذكرتها سابقاً: {context}", "يرجى مراعاة هذه الخلفية: {context}", "قبل سؤالي التالي: {context}", "معلومة ذات صلة: {context}"],
};

function firstLocalizedQuestion(seed, language) {
  const entry = answersById.get(seed.expectedAnswerId);
  const candidates = [
    ...(entry?.questions ?? []),
    ...(entry?.matchPhrases ?? []),
  ];
  const isArabic = (value) => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value);
  if (language === "ar") {
    return candidates.find(isArabic) ?? (isArabic(seed.question) ? seed.question : null);
  }
  return (!isArabic(seed.question) ? seed.question : null)
    ?? candidates.find((candidate) => !isArabic(candidate))
    ?? null;
}

const sourceScenarioCases = [...common, ...alignment]
  .filter((seed) => seed.expectedAnswerId && answersById.has(seed.expectedAnswerId));
const scenarioSeedsByLanguage = {};
for (const language of ["en", "ar"]) {
  const arabicText = (value) => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value ?? "");
  const matchingLanguage = language === "ar" ? arabicText : (value) => !arabicText(value);
  const answerIds = [...new Set(sourceScenarioCases.map((seed) => seed.expectedAnswerId))];
  const records = answerIds.flatMap((answerId) => {
    const candidates = sourceScenarioCases.filter((seed) => seed.expectedAnswerId === answerId);
    const localizedSeed = candidates.find((seed) => matchingLanguage(seed.question));
    const seed = localizedSeed ?? candidates[0];
    const question = localizedSeed?.question ?? firstLocalizedQuestion(seed, language);
    return question ? [{ id: seed.id, category: seed.category, seed, question, languageMatched: Boolean(localizedSeed) }] : [];
  });
  scenarioSeedsByLanguage[language] = records;
}

for (const guide of serviceGuides) {
  scenarioSeedsByLanguage.en.push({
    id: `GUIDE-${guide.id}`,
    category: "service-workflow",
    type: "serviceGuide",
    seed: guide,
    question: `How do I use the official UAEU service for ${guide.title}?`,
    languageMatched: true,
  });
  scenarioSeedsByLanguage.ar.push({
    id: `GUIDE-${guide.id}`,
    category: "service-workflow",
    type: "serviceGuide",
    seed: guide,
    question: `\u0643\u064a\u0641 \u0623\u0633\u062a\u062e\u062f\u0645 \u062e\u062f\u0645\u0629 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a: ${guide.titleAr ?? guide.title}\u061f`,
    languageMatched: true,
  });
}

const scenarioPools = {};
for (const language of ["en", "ar"]) {
  const localizedPool = scenarioSeedsByLanguage[language]
    .sort((left, right) => Number(right.type === "serviceGuide") - Number(left.type === "serviceGuide"));
  const seenSeedQuestions = new Set();
  scenarioPools[language] = localizedPool.filter((record) => record.question).filter((record) => {
    const normalized = record.question.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
    if (seenSeedQuestions.has(normalized)) return false;
    seenSeedQuestions.add(normalized);
    return true;
  });
  if (scenarioPools[language].length === 0) throw new Error(`No ${language} scenario seeds found.`);
}

const sortedCourses = [...courses].sort((a, b) => a.code.localeCompare(b.code));
const sortedCurricula = curricula.flatMap((program) =>
  (program.curriculumVersions ?? []).map((version) => ({ program, version })),
).sort((a, b) => a.version.id.localeCompare(b.version.id));
if (!sortedCourses.length || !sortedCurricula.length) throw new Error("Required governed catalog snapshots are empty.");

function greatestCommonDivisor(a, b) {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
const curriculumStride = sortedCurricula.length === 1
  ? 1
  : Array.from({ length: sortedCurricula.length - 1 }, (_, index) => sortedCurricula.length - index - 1)
    .find((stride) => greatestCommonDivisor(stride, sortedCurricula.length) === 1) ?? 1;

const cases = [];
function addCase(language, domain, question, expected, sourceId, reviewState, messages) {
  const id = `SCALE-${language.toUpperCase()}-${String(cases.length + 1).padStart(5, "0")}`;
  cases.push({
    id,
    language,
    domain,
    question,
    seedId: sourceId,
    ...(messages?.length ? { messages } : {}),
    expected,
    reviewState,
    trainingUse: "prohibited",
  });
}

function makeCourseCases(language, count) {
  const variants = courseWording[language];
  const coverageOffset = language === "en" ? 0 : language === "ar" ? 2400 : ["hi", "ur", "fr", "es"].indexOf(language) * 400 + 4800;
  for (let i = 0; i < count; i += 1) {
    // The combined EN+AR allocation must touch every catalog record at least
    // once; other-language allocations remain separate support probes.
    const course = sortedCourses[(i + coverageOffset) % sortedCourses.length];
    const factType = ["creditHours", "title", "prerequisite"][i % 3];
    const wordingKey = factType === "creditHours" ? "credit" : factType;
    const template = variants[wordingKey][Math.floor(i / 3) % variants[wordingKey].length];
    const source = course.source;
    const prereqState = !course.prerequisiteText && !course.corequisiteText && !course.preCorequisiteText
      ? "no_requirement_text_published"
      : course.prerequisiteItems?.length || course.corequisiteItems?.length || course.preCorequisiteItems?.length
        ? "structured_rule_available"
        : "source_text_present_but_not_structured";
    const expected = {
      kind: "official_course_catalog_fact",
      courseCode: course.code,
      title: course.title,
      creditHours: course.creditHours,
      prerequisiteText: course.prerequisiteText,
      prerequisiteItems: course.prerequisiteItems ?? [],
      corequisiteText: course.corequisiteText,
      corequisiteItems: course.corequisiteItems ?? [],
      preCorequisiteText: course.preCorequisiteText,
      preCorequisiteItems: course.preCorequisiteItems ?? [],
      prerequisiteState: prereqState,
      sourceUrl: source?.url ?? null,
      sourceVerifiedAt: source?.verifiedAt ?? null,
      expectedResolution: factType === "prerequisite" && prereqState === "source_text_present_but_not_structured"
        ? "unresolved_do_not_infer_eligibility"
        : "answer_with_catalog_scope",
      factType,
    };
    addCase(language, "course-catalog", template.replaceAll("{code}", course.code), expected, `course:${course.code}`, "source_snapshot_not_independently_adjudicated");
  }
}

function makeCurriculumCases(language, count) {
  const templates = curriculumWording[language];
  for (let i = 0; i < count; i += 1) {
    // Select a permutation stride coprime to the current number of versions;
    // a fixed stride can revisit only a subset when catalog size changes.
    const curriculumCycle = Math.floor(i / sortedCurricula.length);
    const { program, version } = sortedCurricula[(i * curriculumStride + ["en", "ar", "hi", "ur", "fr", "es"].indexOf(language) * 7) % sortedCurricula.length];
    // Keep each curriculum version's fact dimensions and qualifiers distinct
    // across complete coverage passes. An index-based dimension repeated the
    // same version/dimension/qualifier when the curriculum count shared factors
    // with the four dimensions (for example, 92 versions).
    const dimension = curriculumCycle % 4;
    const paraphrase = Math.floor(curriculumCycle / 4) % curriculumQualifiers[language].length;
    const scope = version.cohortLabel ?? version.version;
    const question = `${templates[dimension]}${curriculumQualifiers[language][paraphrase]}`
      .replaceAll("{version}", scope)
      .replaceAll("{program}", program.name);
    const expectedFields = [
      { factType: "totalCredits", value: version.totalCredits ?? null, state: Number.isFinite(version.totalCredits) ? "published" : "not_stated" },
      { factType: "creditBuckets", value: version.creditBuckets ?? null, state: version.creditBuckets?.length ? "published" : "not_stated" },
      { factType: "cohortLabel", value: version.cohortLabel ?? null, state: version.cohortLabel ? "published_label_not_personal_assignment" : "not_stated" },
      { factType: "programIdentity", value: { program: program.name, degreeLevel: program.degreeLevel, college: program.college }, state: "published_identity" },
    ][dimension];
    addCase(language, "published-curriculum", question, {
      kind: "official_curriculum_snapshot_fact",
      programId: program.id,
      curriculumVersionId: version.id,
      version: version.version,
      factType: expectedFields.factType,
      value: expectedFields.value,
      state: expectedFields.state,
      sources: program.sources ?? [],
      expectedResolution: expectedFields.state === "not_stated" ? "state_not_published" : "answer_with_version_scope",
    }, `curriculum:${version.id}`, "source_snapshot_not_independently_adjudicated");
  }
}

function makeScenarioCases(language, count) {
  const pool = scenarioPools[language];
  const frames = scenarioFrames[language];
  for (let i = 0; i < count; i += 1) {
    const seed = pool[i % pool.length];
    const frame = frames[Math.floor(i / pool.length) % frames.length];
    const base = seed.seed;
    const isGuide = seed.type === "serviceGuide";
    const expected = isGuide
      ? {
        kind: "official_service_workflow_route",
        guideId: base.id,
        officialUrl: base.officialUrl,
        minimumStepCount: base.steps?.length ?? 0,
        routeMustNotClaimTransactionCompleted: true,
      }
      : {
        kind: "existing_route_fixture_expectation",
        expectedAnswerId: base.expectedAnswerId,
        expectedSource: base.expectedSource,
        expectedDisposition: base.expectedDisposition,
        expectedEscalationReason: base.expectedEscalationReason,
        requiredTerms: seed.languageMatched ? base.requiredTerms : [],
        requiredPatterns: seed.languageMatched ? base.requiredPatterns : [],
        forbiddenPatterns: base.forbiddenPatterns,
        minCitations: base.minCitations,
        seedFixture: seed.id,
        evidenceOnly: base.evidenceOnly,
      };
    const messages = base.messages?.map((message) => ({ ...message })) ?? [];
    let framedQuestion;
    if (messages.length) {
      const lastUser = [...messages].map((message, index) => ({ message, index })).reverse().find(({ message }) => message.role === "user");
      const earlierUser = [...messages].map((message, index) => ({ message, index })).find(({ message, index }) => message.role === "user" && index < (lastUser?.index ?? 0));
      if (lastUser && earlierUser) {
        framedQuestion = seed.question;
        const contextFrame = contextFrames[language][Math.floor(i / pool.length) % contextFrames[language].length];
        messages[earlierUser.index] = { ...messages[earlierUser.index], content: contextFrame.replace("{context}", messages[earlierUser.index].content) };
        messages[lastUser.index] = { ...messages[lastUser.index], content: framedQuestion };
      } else {
        framedQuestion = frame.replace("{question}", seed.question);
        if (lastUser) messages[lastUser.index] = { ...messages[lastUser.index], content: framedQuestion };
        else messages.push({ role: "user", content: framedQuestion });
      }
    } else {
      framedQuestion = frame.replace("{question}", seed.question);
      messages.push({ role: "user", content: framedQuestion });
    }
    addCase(language, isGuide ? "service-workflow" : seed.category, framedQuestion, expected, `${isGuide ? "guide" : "fixture"}:${seed.id}`, isGuide ? "route_contract_source_reviewed_not_transaction_tested" : "inherited_route_expectation_requires_human_factual_review", messages);
  }
}

for (const target of languageTargets) {
  makeCourseCases(target.language, target.courses);
  makeCurriculumCases(target.language, target.curricula);
  if (target.scenarios) makeScenarioCases(target.language, target.scenarios);
}

const seenQuestions = new Map();
const latestTurnQuestions = new Set();
const languageCounts = {};
const domainCounts = {};
for (const testCase of cases) {
  if (!testCase.question?.trim()) throw new Error(`${testCase.id} has no question text.`);
  const interaction = testCase.messages?.map(({ role, content }) => `${role}:${content}`).join("\n") ?? `user:${testCase.question}`;
  const normalized = interaction.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
  if (seenQuestions.has(normalized)) throw new Error(`Duplicate evaluation interaction detected: ${seenQuestions.get(normalized)} and ${testCase.id}: ${testCase.question}`);
  seenQuestions.set(normalized, testCase.id);
  latestTurnQuestions.add(testCase.question.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim());
  languageCounts[testCase.language] = (languageCounts[testCase.language] ?? 0) + 1;
  domainCounts[testCase.domain] = (domainCounts[testCase.domain] ?? 0) + 1;
  if (testCase.trainingUse !== "prohibited") throw new Error(`${testCase.id} must remain evaluation-only.`);
  if (testCase.expected.kind === "official_course_catalog_fact" && !testCase.expected.sourceUrl) {
    throw new Error(`${testCase.id} is missing its official course source URL.`);
  }
  if (testCase.expected.kind === "official_curriculum_snapshot_fact" && !testCase.expected.sources?.length) {
    throw new Error(`${testCase.id} is missing its curriculum source list.`);
  }
}

const expectedTotal = 10000;
if (cases.length !== expectedTotal) throw new Error(`Expected ${expectedTotal} cases, generated ${cases.length}.`);
if (Object.values(languageCounts).reduce((sum, count) => sum + count, 0) !== expectedTotal) throw new Error("Language count reconciliation failed.");

fs.writeFileSync(outputPath, `${cases.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
fs.writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: 1,
  title: "UAEU V3 scale evaluation corpus",
  generatedAt: new Date().toISOString(),
  generator: "scripts/generate-v3-scale-eval.mjs",
  caseCount: cases.length,
  uniqueInteractionCount: seenQuestions.size,
  uniqueLatestTurnCount: latestTurnQuestions.size,
  languageCounts,
  domainCounts,
  languageMix: "40% English, 40% Arabic, 5% each Hindi, Urdu, French, and Spanish",
  purpose: "Evaluation and stress testing only; these cases are not used by runtime retrieval, training, or answer selection.",
  limitations: [
    "Generated course/curriculum expectations are derived mechanically from the checked-in source snapshots and have not each received independent human factual adjudication.",
    "Scenario cases inherit answer-route expectations from the existing common/alignment fixtures; generated wording variants are correlated probes, not 1,600 independent factual questions.",
    "This corpus is not evidence of production accuracy. Run cases against a pinned build and independently review consequential outputs before reporting a factual score.",
    "Curriculum applicability labels are published labels and do not establish a student's assigned cohort plan.",
    "Unsupported prerequisite source text is labeled unresolved and must not be converted to an eligibility conclusion.",
  ],
  inputs: {
    courseCatalog: "data/academic/course-catalog.json",
    curricula: "data/academic/program-curricula.json",
    scenarioFixtures: ["data/evals/common-questions.json", "data/evals/alignment-questions.json"],
    verifiedAnswerSnapshots: ["data/verified-answers/academic.json", "data/verified-answers/student-services.json"],
  },
  outputs: ["data/evals/v3-scale-questions.jsonl", "data/evals/v3-scale-manifest.json"],
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ caseCount: cases.length, uniqueInteractionCount: seenQuestions.size, uniqueLatestTurnCount: latestTurnQuestions.size, languageCounts, domainCounts, outputPath: path.relative(root, outputPath), manifestPath: path.relative(root, manifestPath) }, null, 2));
