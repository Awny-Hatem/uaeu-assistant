import assert from "node:assert/strict";
import { loadOfficialCourseCatalog } from "../lib/academic/course-catalog";
import { assessDegreeAuditConversation, renderDegreeAuditAssessment } from "../lib/academic/degree-audit";
import { loadUndergraduateProgramCatalog } from "../lib/academic/undergraduate-program-catalog";
import { assessAcademicProgramIdentityReview, assessProgramCourseSubstitutionConversation, assessProgramCreditConversation, assessProgramRequirementsConversation, assessProgramSemesterPlanConversation, fallEntryCurriculumForYear, getProgramCurriculum, getPublishedCurriculumVersion, hasProgramCreditIntent, listAcademicPrograms, programIdInText, renderProgramCourseSubstitutionAssessment, renderProgramCreditAssessment, renderProgramRequirementsAssessment, renderProgramSemesterPlanAssessment, type ProgramRequirement } from "../lib/academic/program-curricula";

const programs = listAcademicPrograms();
const courseCreditHours = new Map(loadOfficialCourseCatalog()?.courses.map((course) => [course.code, course.creditHours]) ?? []);
const explicitSourceCourseCredits = new Map(Object.entries({
  ESPU103: 3, ESPU106: 3, ESPU107: 3, GEEM105: 3, HSS105: 3, ISLM100: 3, ISLM101: 3, MATH145: 3, MATH270: 3,
  ART201: 3, ART301: 3, ART302: 3, ART303: 3, ART382: 3, VIS450: 3,
  ISEC421: 2,
  PETE409: 3, PSY313: 3, PSY304: 3, VMED100: 3, VMED109: 2, VMED115: 4, VMED120: 3, VMED150: 4,
  VMED205: 3, VMED210: 3, VMED220: 2, VMED250: 3, VMED280: 3, VMED300: 3, VMED320: 4, VMED370: 3,
  VMED330: 3, VMED340: 3, VMED445: 3, VMED450: 3, VMED460: 2, VMED520: 2, VMED530: 1,
  VMED400: 2, VMED325: 1,
}));
function modeledCreditTotal(requirements: ProgramRequirement[]): number {
  return requirements.reduce((sum, requirement) => {
    if (requirement.type === "REQUIRED_COURSE_SET") {
      return sum + requirement.courseCodes.reduce((credits, code) => {
        const courseCredits = explicitSourceCourseCredits.get(code) ?? courseCreditHours.get(code);
        assert.ok(courseCredits !== undefined && courseCredits !== null, `${code} has a non-null credit value in the official course catalog`);
        return credits + courseCredits;
      }, 0);
    }
    if (requirement.type === "ONE_OF_GROUP") {
      const alternativeCredits = new Set(requirement.courseCodes.map((code) => explicitSourceCourseCredits.get(code) ?? courseCreditHours.get(code)));
      assert.equal(alternativeCredits.size, 1, `${requirement.name} alternatives have equal published credits`);
      const credits = [...alternativeCredits][0];
      assert.ok(credits !== undefined && credits !== null, `${requirement.name} alternatives have published credit values`);
      return sum + credits * requirement.chooseCount;
    }
    if (requirement.type === "CREDIT_BLOCK" || requirement.type === "INTERNSHIP" || requirement.type === "ELECTIVE_GROUP") return sum + requirement.credits;
    if (requirement.type === "PATHWAY_CHOICE") {
      const optionCredits = new Set(requirement.options.map((option) => option.credits));
      assert.equal(optionCredits.size, 1, `${requirement.name} alternatives have equal published credits`);
      return sum + requirement.options[0].credits;
    }
    return sum;
  }, 0);
}
function collectAuditFixtureCourses(requirements: ProgramRequirement[], codes = new Set<string>()): Set<string> {
  for (const requirement of requirements) {
    if ("courseCodes" in requirement) requirement.courseCodes.forEach((code) => codes.add(code.toUpperCase()));
    if (requirement.type === "INTERNSHIP") codes.add(requirement.courseCode.toUpperCase());
    if (requirement.type === "PATHWAY_CHOICE") {
      for (const option of requirement.options) {
        option.courseCodes.forEach((code) => codes.add(code.toUpperCase()));
        if (option.type === "COMPOSITE" && option.requirements) collectAuditFixtureCourses(option.requirements, codes);
      }
    }
  }
  return codes;
}
assert.equal(programs.length, 57, "fifty-seven current or historical program records have structured evidence records");
for (const catalogProgram of loadUndergraduateProgramCatalog().programs) {
  if (catalogProgram.curriculumStatus === "not_modelled") {
    assert.equal(programIdInText(catalogProgram.title), catalogProgram.id, `${catalogProgram.title} resolves to its own catalog identity`);
  }
}
assert.ok(programs.every((program) => program.sources.length > 0 && program.curriculumVersions.length > 0));
for (const program of programs) {
  for (const version of program.curriculumVersions) {
    if (!version.requirements.length || version.cohortMapping === "unresolved") continue;
    const cohortYears = Array.from({ length: 40 }, (_, index) => 1990 + index);
    assert.ok(cohortYears.some((year) => getProgramCurriculum(program.id, year)?.curriculum.id === version.id),
      `${program.id}/${version.id} with a source-backed cohort label must resolve from at least one entry year`);
  }
}

const psychology = getProgramCurriculum("psychology");
assert.ok(psychology);
assert.equal(psychology.curriculum.totalCredits, 120);
assert.deepEqual(psychology.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 54, 6, 6, 15, 12]);
assert.equal(psychology.curriculum.cohortLabel, "Students admitted from Fall or Spring 2025-2026 onwards");
const psychologyCore = psychology.curriculum.requirements.find((item) => item.id === "psychology-major-required");
assert.ok(psychologyCore?.type === "REQUIRED_COURSE_SET");
assert.equal(psychologyCore.courseCodes.length, 18);
const psychology452 = psychology.curriculum.requirements.find((item) => item.id === "psychology-internship-452");
assert.ok(psychology452?.type === "INTERNSHIP");
assert.equal(psychology452.otherCoursesAllowed, false);
const psychology454 = psychology.curriculum.requirements.find((item) => item.id === "psychology-research-project-454");
assert.ok(psychology454?.type === "INTERNSHIP");
assert.equal(psychology454.otherCoursesAllowed, true);
assert.match(psychology454.name ?? "", /up to 6 additional course credits/);
const psychologyAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Psychology?" }]);
assert.equal(psychologyAnswer?.programId, "psychology");
assert.match(renderProgramRequirementsAssessment(psychologyAnswer!, "en"), /PSYC452/);
assert.match(renderProgramRequirementsAssessment(psychologyAnswer!, "en"), /maximum of 6 additional course credits/);
assert.equal(getProgramCurriculum("psychology", 2024), null, "the 2025-2026 Psychology model must not be applied to earlier cohorts");
assert.equal(getProgramCurriculum("bsc-computer-science", 2027), null,
  "a source verification date on a current catalog page must not be treated as a confirmed student cohort mapping");

const informationTechnology = getProgramCurriculum("bsc-information-technology");
assert.ok(informationTechnology);
assert.equal(informationTechnology.curriculum.totalCredits, 120);
assert.equal(informationTechnology.curriculum.cohortMapping, "unresolved",
  "conflicting published 2025 IT plan totals must not be silently applied to an individual cohort");
assert.ok(informationTechnology.program.sources.some(({ url }) => url.endsWith("bsc_in_it_study_plan_fall_2025_onwards.pdf")),
  "the current CIT 2025-onwards plan must be attached as a primary source");
const itCreditAnswer = assessProgramCreditConversation([{ role: "user", content: "How many credits are listed for the Information Technology degree?" }]);
assert.equal(itCreditAnswer?.programId, "bsc-information-technology");
assert.match(renderProgramCreditAssessment(itCreditAnswer!, "en"), /2025 onwards.*120|120.*130/s,
  "an IT credit answer must disclose the 120-versus-130 source conflict");
assert.equal(getProgramCurriculum("bsc-information-technology", 2025), null,
  "the conflicting IT plan versions cannot establish a student's assigned 2025 cohort plan");

const informationSecurity = getProgramCurriculum("bsc-information-security");
assert.ok(informationSecurity);
for (const code of ["ITBP480", "ITBP481"]) {
  const requiredGroups: ProgramRequirement[] = informationSecurity.curriculum.requirements.filter((requirement) =>
    requirement.type === "REQUIRED_COURSE_SET" && requirement.courseCodes.includes(code));
  assert.equal(requiredGroups.length, 1, `${code} is required once; its senior-project label must not duplicate degree-audit progress`);
}

const translationStudies = getProgramCurriculum("translation-studies");
assert.ok(translationStudies);
assert.equal(translationStudies.curriculum.totalCredits, 120);
assert.deepEqual(translationStudies.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 42, 6, 15, 18, 12]);
assert.equal(translationStudies.curriculum.cohortLabel, "Students admitted from Fall or Spring 2025-2026 onwards");
const translationInternship = translationStudies.curriculum.requirements.find((item) => item.id === "translation-studies-internship");
assert.ok(translationInternship?.type === "INTERNSHIP");
assert.equal(translationInternship.courseCode, "TRS490");
assert.equal(translationInternship.credits, 6);
assert.equal(translationInternship.otherCoursesAllowed, false);
const thirdLanguage = translationStudies.curriculum.requirements.find((item) => item.id === "translation-studies-third-language");
assert.ok(thirdLanguage?.type === "PATHWAY_CHOICE");
assert.equal(thirdLanguage.options.length, 5);
assert.ok(thirdLanguage.options.every((option) => option.credits === 18 && option.courseCodes.length === 6));
const translationQuestion = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Translation Studies?" }]);
assert.equal(translationQuestion?.programId, "translation-studies");
assert.match(renderProgramRequirementsAssessment(translationQuestion!, "en"), /TRS490/);
assert.match(renderProgramRequirementsAssessment(translationQuestion!, "en"), /earlier cohorts/);
assert.equal(getProgramCurriculum("translation-studies", 2024), null, "the 2025-2026 model must not be applied to older cohorts");

const arabicLiterature = getProgramCurriculum("arabic-language-and-literature");
assert.ok(arabicLiterature);
assert.equal(arabicLiterature.curriculum.totalCredits, 120);
assert.deepEqual(arabicLiterature.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 6, 51, 6, 18, 12]);
assert.equal(arabicLiterature.curriculum.cohortLabel, "Students admitted from Fall or Spring 2025-2026 onwards");
const arabicMajor = arabicLiterature.curriculum.requirements.find((item) => item.id === "arabic-language-and-literature-major");
assert.ok(arabicMajor?.type === "REQUIRED_COURSE_SET");
assert.equal(arabicMajor.courseCodes.length, 17);
const arabicInternship = arabicLiterature.curriculum.requirements.find((item) => item.id === "arabic-language-and-literature-internship");
assert.ok(arabicInternship?.type === "INTERNSHIP");
assert.equal(arabicInternship.courseCode, "ARB490");
assert.equal(arabicInternship.otherCoursesAllowed, false);
const arabicAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Arabic Language and Literature?" }]);
assert.equal(arabicAnswer?.programId, "arabic-language-and-literature");
assert.match(renderProgramRequirementsAssessment(arabicAnswer!, "en"), /ARB490/);
assert.match(renderProgramRequirementsAssessment(arabicAnswer!, "en"), /introductory summary on the same degree page conflicts with those detailed tables/i);
assert.equal(getProgramCurriculum("arabic-language-and-literature", 2024), null, "the 2025-2026 Arabic model must not be applied to earlier cohorts");
const mixedScriptArabicDegreeTotal = assessProgramCreditConversation([{
  role: "user",
  content: "ما إجمالي الساعات الذي ينص عليه منهج Bachelor of Arts in Arabic Language and Literature المنشور للفئة الموصوفة بأنها 'Students admitted from Fall or Spring 2025-2026 onwards'؟ مع ذكر مصدر النسخة المحددة.",
}]);
assert.equal(mixedScriptArabicDegreeTotal?.programId, "arabic-language-and-literature",
  "capitalized English degree titles inside Arabic questions must not prevent curriculum intent detection");
assert.equal(mixedScriptArabicDegreeTotal?.curriculum?.id, "arabic-language-and-literature-2025-2026-onwards");
assert.equal(mixedScriptArabicDegreeTotal?.curriculum?.totalCredits, 120);
const mixedScriptArabicCreditAnswer = renderProgramCreditAssessment(mixedScriptArabicDegreeTotal!, "ar");
assert.match(mixedScriptArabicCreditAnswer, /[\u0600-\u06ff]/u,
  "explicitly selected curriculum variants must answer in Arabic when the question is Arabic");
assert.match(mixedScriptArabicCreditAnswer, /120/u,
  "Arabic source-variant answer must preserve the verified credit total");
assert.match(mixedScriptArabicCreditAnswer, /Students admitted from Fall or Spring 2025-2026 onwards/u,
  "Arabic answer may retain the official published cohort label verbatim");
assert.doesNotMatch(mixedScriptArabicCreditAnswer, /\\n/u,
  "Arabic source-variant answer must render real line breaks");

const localizedCreditIntentCases = [
  "\u00bfCu\u00e1ntos cr\u00e9ditos indica el curr\u00edculo publicado de Bachelor of Arts in Psychology para el grupo descrito como 'Students admitted from Fall or Spring 2025-2026 onwards'?",
  "Combien de cr\u00e9dits le cursus publi\u00e9 de Bachelor of Arts in Psychology indique-t-il pour le groupe d\u00e9crit comme 'Students admitted from Fall or Spring 2025-2026 onwards' ?",
  "Bachelor of Arts in Psychology \u0915\u0947 \u092a\u094d\u0930\u0915\u093e\u0936\u093f\u0924 \u092a\u093e\u0920\u094d\u092f\u0915\u094d\u0930\u092e \u092e\u0947\u0902 \u0915\u0941\u0932 \u0915\u093f\u0924\u0928\u0947 \u0915\u094d\u0930\u0947\u0921\u093f\u091f \u0939\u0948\u0902?",
  "Bachelor of Arts in Psychology \u06a9\u06d2 \u0634\u0627\u0626\u0639 \u0634\u062f\u06c1 \u0646\u0635\u0627\u0628 \u0645\u06cc\u06ba \u06a9\u0644 \u06a9\u062a\u0646\u06d2 \u06a9\u0631\u06cc\u0688\u0679\u0633 \u06c1\u06cc\u06ba\u061f",
];
for (const question of localizedCreditIntentCases) {
  assert.equal(hasProgramCreditIntent(question), true, `localized credit intent is recognized: ${question}`);
  assert.equal(assessProgramCreditConversation([{ role: "user", content: question }])?.programId, "psychology",
    "localized credit questions should route to the structured model when the English degree title is present");
}
assert.equal(hasProgramCreditIntent("Which degree title is printed for the '144-credit source variant'?"), false,
  "a credit term inside a quoted cohort label must not turn an identity question into a credit-total request");

const visualStudies = getProgramCurriculum("visual-studies-and-creative-industries");
assert.ok(visualStudies);
assert.equal(visualStudies.curriculum.totalCredits, 120);
assert.deepEqual(visualStudies.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 54, 6, 21, 12]);
const visualStudies2024 = getProgramCurriculum("visual-studies-and-creative-industries", 2024);
assert.ok(visualStudies2024?.cohortMatched);
assert.equal(visualStudies2024.curriculum.id, "visual-studies-2022-2023-onwards");
assert.deepEqual(visualStudies2024.curriculum.creditBuckets?.map(({ credits }) => credits), [33, 57, 21, 6, 3]);
assert.equal(modeledCreditTotal(visualStudies2024.curriculum.requirements), 120,
  "the 2022 Visual Studies requirement groups reconcile to the source-published 120-credit total");
assert.equal(visualStudies2024.curriculum.requirements.find((item) => item.id === "visual-studies-2022-internship")?.type, "INTERNSHIP");
assert.equal(getProgramCurriculum("visual-studies-and-creative-industries", 2025)?.curriculum.id, "visual-studies-2025-2026-onwards",
  "the explicitly published 2025 cohort plan replaces the earlier model for the 2025 cohort onward");
const visualStudies2024CreditAnswer = assessProgramCreditConversation([
  { role: "user", content: "I entered UAEU in 2024 in Visual Studies and Creative Industries. How many credits are in the published model plan?" },
]);
assert.equal(visualStudies2024CreditAnswer?.curriculum?.id, "visual-studies-2022-2023-onwards");
assert.match(renderProgramCreditAssessment(visualStudies2024CreditAnswer!, "en"), /120 credit hours[\s\S]*VIS450[\s\S]*3 credits/i,
  "a 2024 cohort question should cite the older plan and preserve its 3-credit VIS450 internship");
const visualStudies2025CreditAnswer = assessProgramCreditConversation([
  { role: "user", content: "I entered UAEU in Fall 2025 in Visual Studies and Creative Industries. How many credits are in the published model plan?" },
]);
assert.equal(visualStudies2025CreditAnswer?.curriculum?.id, "visual-studies-2025-2026-onwards");
assert.match(renderProgramCreditAssessment(visualStudies2025CreditAnswer!, "en"), /120 credit hours[\s\S]*VIS451[\s\S]*6 credits/i,
  "a 2025 cohort question should use the new plan's separate 6-credit VIS451 internship");
const visualElectives = visualStudies.curriculum.requirements.filter((item) => item.type === "ELECTIVE_GROUP");
assert.deepEqual(visualElectives.map(({ chooseCount }) => chooseCount), [2, 2, 3]);
assert.match(visualStudies.curriculum.limitations.join(" "), /six major electives overall.*2 \+ 2 \+ 3 courses/i);
const visualAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Visual Studies and Creative Industries?" }]);
assert.equal(visualAnswer?.programId, "visual-studies-and-creative-industries");
assert.match(renderProgramRequirementsAssessment(visualAnswer!, "en"), /says to select six major electives overall, but its three explicit group requirements require 2 \+ 2 \+ 3 courses/i);

const geography = getProgramCurriculum("geography");
assert.ok(geography);
assert.equal(geography.curriculum.totalCredits, 120);
assert.deepEqual(geography.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 24, 57, 12]);
const geographyConcentrations = geography.curriculum.requirements.find((item) => item.id === "geography-concentrations");
assert.ok(geographyConcentrations?.type === "PATHWAY_CHOICE");
assert.equal(geographyConcentrations.options.length, 3);
assert.ok(geographyConcentrations.options.every(({ credits, requirements }) => credits === 57 && requirements?.some((item) => item.type === "INTERNSHIP" && item.otherCoursesAllowed === false)));
const geographyAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What concentrations are available in Geography?" }]);
assert.equal(geographyAnswer?.programId, "geography");
assert.match(renderProgramRequirementsAssessment(geographyAnswer!, "en"), /Environmental Geography/);
assert.match(renderProgramRequirementsAssessment(geographyAnswer!, "en"), /Geoinformatics/);
assert.match(renderProgramRequirementsAssessment(geographyAnswer!, "en"), /Urban Planning/);

const appliedSociology = getProgramCurriculum("applied-sociology-and-social-data-analytics");
assert.ok(appliedSociology);
assert.equal(appliedSociology.curriculum.totalCredits, 120);
assert.deepEqual(appliedSociology.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 48, 6, 3, 33, 3]);
const appliedSociologyConcentrations = appliedSociology.curriculum.requirements.find((item) => item.id === "applied-sociology-concentrations");
assert.ok(appliedSociologyConcentrations?.type === "PATHWAY_CHOICE");
assert.equal(appliedSociologyConcentrations.options.length, 3);
assert.ok(appliedSociologyConcentrations.options.every(({ credits, requirements }) => credits === 33 && requirements?.some((item) => item.type === "ELECTIVE_GROUP" && item.chooseCount === 5)));
const appliedSociologyAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What concentrations are in Applied Sociology and Social Data Analytics?" }]);
assert.equal(appliedSociologyAnswer?.programId, "applied-sociology-and-social-data-analytics");
assert.match(renderProgramRequirementsAssessment(appliedSociologyAnswer!, "en"), /Sociology of Consumption/);
assert.match(renderProgramRequirementsAssessment(appliedSociologyAnswer!, "en"), /Social Policy Analysis/);
assert.match(renderProgramRequirementsAssessment(appliedSociologyAnswer!, "en"), /Quality of Life Analysis/);

const doctorOfMedicine = getProgramCurriculum("doctor-of-medicine");
assert.ok(doctorOfMedicine);
assert.equal(doctorOfMedicine.curriculum.totalCredits, 233);
assert.deepEqual(doctorOfMedicine.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 212]);
const medicineMajor = doctorOfMedicine.curriculum.requirements.find((item) => item.id === "doctor-of-medicine-major");
assert.ok(medicineMajor?.type === "REQUIRED_COURSE_SET");
assert.equal(medicineMajor.courseCodes.length, 43);
assert.equal(getProgramCurriculum("doctor-of-medicine", 2025), null, "an unresolved current MD page is not applied to an earlier cohort");
const medicineAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Doctor of Medicine?" }]);
assert.equal(medicineAnswer?.programId, "doctor-of-medicine");
assert.match(renderProgramRequirementsAssessment(medicineAnswer!, "en"), /cross-counting/i);

const socialWork = getProgramCurriculum("social-work");
assert.ok(socialWork);
assert.equal(socialWork.curriculum.totalCredits, 120);
assert.deepEqual(socialWork.curriculum.creditBuckets?.map(({ credits }) => credits), [33, 66, 18, 3]);
assert.equal(socialWork.curriculum.cohortMapping, "unresolved", "the published model-plan label is not assigned to a student's cohort automatically");
const socialWorkMajor = socialWork.curriculum.requirements.find((item) => item.id === "social-work-required-courses");
assert.ok(socialWorkMajor?.type === "REQUIRED_COURSE_SET");
assert.equal(socialWorkMajor.courseCodes.length, 23);
assert.ok(socialWorkMajor.courseCodes.includes("SWK465") && socialWorkMajor.courseCodes.includes("SWK470"));
assert.match(socialWorkMajor.ruleNote ?? "", /at most 6 additional course credits/i);
const socialWorkAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Social Work?" }]);
assert.equal(socialWorkAnswer?.programId, "social-work");
assert.match(renderProgramRequirementsAssessment(socialWorkAnswer!, "en"), /SWK465/);
assert.match(renderProgramRequirementsAssessment(socialWorkAnswer!, "en"), /SWK470/);
assert.match(JSON.stringify(socialWork.program.sources), /chss_bsc_social_work_study_plan\.pdf/);

const englishLiterature = getProgramCurriculum("english-literature");
assert.ok(englishLiterature);
assert.equal(englishLiterature.curriculum.totalCredits, 120);
assert.deepEqual(englishLiterature.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 57, 6, 6, 12, 12]);
assert.equal(englishLiterature.curriculum.cohortMapping, "unresolved");
const engCore = englishLiterature.curriculum.requirements.find((item) => item.id === "english-literature-compulsory");
assert.ok(engCore?.type === "REQUIRED_COURSE_SET");
assert.equal(engCore.courseCodes.length, 17);
assert.ok(engCore.courseCodes.includes("ENG489"));
const engInternship = englishLiterature.curriculum.requirements.find((item) => item.id === "english-literature-internship");
assert.ok(engInternship?.type === "INTERNSHIP");
assert.equal(engInternship.courseCode, "ENG490");
assert.equal(engInternship.otherCoursesAllowed, false);
const englishLanguage = englishLiterature.curriculum.requirements.find((item) => item.id === "english-literature-supporting-language");
assert.ok(englishLanguage?.type === "PATHWAY_CHOICE");
assert.equal(englishLanguage.options.length, 5);
assert.ok(englishLanguage.options.every((option) => option.type === "COMPOSITE" && option.credits === 6));
const englishAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in English Literature?" }]);
assert.equal(englishAnswer?.programId, "english-literature");
assert.match(renderProgramRequirementsAssessment(englishAnswer!, "en"), /ENG490/);
const englishRequirementsWording = assessProgramRequirementsConversation([{ role: "user", content: "What are the requirements for English Literature?" }]);
assert.equal(englishRequirementsWording?.programId, "english-literature");
assert.equal(assessProgramRequirementsConversation([{ role: "user", content: "What are the admission requirements for English Literature?" }]), null,
  "degree-course requirements routing must not consume admissions questions");
assert.match(JSON.stringify(englishLiterature.program.sources), /bachelor-of-arts-in-english-literature\.shtml/);

const tourism = getProgramCurriculum("tourism-studies");
assert.ok(tourism);
assert.equal(tourism.curriculum.totalCredits, 120);
assert.deepEqual(tourism.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 45, 6, 21, 9, 12]);
assert.equal(tourism.curriculum.cohortMapping, "unresolved");
assert.equal(tourism.curriculum.requirements.find((item) => item.id === "tourism-major")?.type, "REQUIRED_COURSE_SET");
const tourismClusters = tourism.curriculum.requirements.filter((item) => item.type === "ELECTIVE_GROUP");
assert.deepEqual(tourismClusters.map(({ chooseCount }) => chooseCount), [3, 4]);
const tourismLanguages = tourism.curriculum.requirements.find((item) => item.id === "tourism-language-pathway");
assert.ok(tourismLanguages?.type === "PATHWAY_CHOICE");
assert.equal(tourismLanguages.options.length, 5);
const tourismInternship = tourism.curriculum.requirements.find((item) => item.id === "tourism-internship");
assert.ok(tourismInternship?.type === "INTERNSHIP");
assert.equal(tourismInternship.courseCode, "TOR440");
assert.equal(tourismInternship.otherCoursesAllowed, false);
const tourismAnswer = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Tourism Studies?" }]);
assert.equal(tourismAnswer?.programId, "tourism-studies");
assert.match(renderProgramRequirementsAssessment(tourismAnswer!, "en"), /TOR440/);
const tourismRequirementsWording = assessProgramRequirementsConversation([{ role: "user", content: "What are the requirements for Tourism Studies?" }]);
assert.equal(tourismRequirementsWording?.programId, "tourism-studies");
assert.match(JSON.stringify(tourism.program.sources), /bachelor-of-arts-in-tourism-studies\.shtml/);

const historyArchaeology = getProgramCurriculum("history-and-archaeology");
assert.ok(historyArchaeology);
assert.equal(historyArchaeology.curriculum.totalCredits, 120);
assert.deepEqual(historyArchaeology.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 42, 18, 6, 9, 6, 12]);
assert.equal(historyArchaeology.curriculum.cohortMapping, "unresolved");
const historyArchaeologyConcentration = historyArchaeology.curriculum.requirements.find((item) => item.id === "history-archaeology-concentrations");
assert.ok(historyArchaeologyConcentration?.type === "PATHWAY_CHOICE");
assert.equal(historyArchaeologyConcentration.options.length, 2);
assert.deepEqual(historyArchaeologyConcentration.options.map(({ credits }) => credits), [18, 18]);
const historyInternship = historyArchaeology.curriculum.requirements.find((item) => item.id === "history-archaeology-internship");
assert.ok(historyInternship?.type === "INTERNSHIP");
assert.equal(historyInternship.courseCode, "HIS402");
assert.equal(historyInternship.otherCoursesAllowed, false);
const historyQuestion = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in History and Archaeology?" }]);
assert.equal(historyQuestion?.programId, "history-and-archaeology");
assert.match(renderProgramRequirementsAssessment(historyQuestion!, "en"), /HIS311/);
assert.match(JSON.stringify(historyArchaeology.program.sources), /bachelor-of-arts-in-history-and-archaeology\.shtml/);

const politicalScience = getProgramCurriculum("political-science");
assert.ok(politicalScience);
assert.equal(politicalScience.curriculum.totalCredits, 120);
assert.deepEqual(politicalScience.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 45, 3, 12, 15, 18]);
assert.equal(politicalScience.curriculum.cohortMapping, "unresolved");
const politicalSupport = politicalScience.curriculum.requirements.find((item) => item.id === "political-science-supporting-pathway");
assert.ok(politicalSupport?.type === "PATHWAY_CHOICE");
assert.equal(politicalSupport.options.length, 2);
assert.equal(politicalSupport.options[0].type, "ELECTIVE_GROUP");
assert.equal(politicalSupport.options[0].chooseCount, 5);
assert.equal(politicalSupport.options[1].type, "COMPOSITE");
assert.ok(politicalSupport.options[1].requirements?.some((item) => item.type === "ELECTIVE_GROUP" && item.chooseCount === 3));
assert.ok(politicalSupport.options[1].requirements?.some((item) => item.type === "PATHWAY_CHOICE"));
const politicalQuestion = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Political Science?" }]);
assert.equal(politicalQuestion?.programId, "political-science");
assert.match(renderProgramRequirementsAssessment(politicalQuestion!, "en"), /PSG440/);
assert.match(JSON.stringify(politicalScience.program.sources), /bachelor-of-arts-in-political-science\.shtml/);

const linguistics = getProgramCurriculum("linguistics");
assert.ok(linguistics);
assert.equal(linguistics.curriculum.totalCredits, 120);
assert.deepEqual(linguistics.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 63, 6, 9, 3, 12]);
assert.equal(linguistics.curriculum.cohortMapping, "unresolved");
const linguisticsMajor = linguistics.curriculum.requirements.find((item) => item.id === "linguistics-major");
assert.ok(linguisticsMajor?.type === "REQUIRED_COURSE_SET");
assert.equal(linguisticsMajor.courseCodes.length, 21);
assert.equal(linguisticsMajor.courseCodes.includes("LNG456"), false);
const linguisticsInternship = linguistics.curriculum.requirements.find((item) => item.id === "linguistics-internship");
assert.ok(linguisticsInternship?.type === "INTERNSHIP");
assert.equal(linguisticsInternship.courseCode, "LNG456");
assert.equal(linguisticsInternship.otherCoursesAllowed, false);
const linguisticsLanguagePath = linguistics.curriculum.requirements.find((item) => item.id === "linguistics-general-education-language");
assert.ok(linguisticsLanguagePath?.type === "PATHWAY_CHOICE");
assert.equal(linguisticsLanguagePath.options.length, 5);
const linguisticsQuestion = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Linguistics?" }]);
assert.equal(linguisticsQuestion?.programId, "linguistics");
assert.match(renderProgramRequirementsAssessment(linguisticsQuestion!, "en"), /LNG456/);
assert.match(JSON.stringify(linguistics.program.sources), /bachelor-of-arts-in-linguistics\.shtml/);

const massCommunication = getProgramCurriculum("mass-communication");
assert.ok(massCommunication);
assert.equal(massCommunication.curriculum.totalCredits, 120);
assert.deepEqual(massCommunication.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 6, 27, 6, 27, 18, 15]);
assert.equal(massCommunication.curriculum.cohortMapping, "unresolved");
const massConcentrations = massCommunication.curriculum.requirements.find((item) => item.id === "mass-communication-concentrations");
assert.ok(massConcentrations?.type === "PATHWAY_CHOICE");
assert.equal(massConcentrations.options.length, 3);
assert.ok(massConcentrations.options.every(({ credits }) => credits === 27));
const mediaSupporting = massCommunication.curriculum.requirements.find((item) => item.id === "mass-communication-supporting-pathway");
assert.ok(mediaSupporting?.type === "PATHWAY_CHOICE");
assert.equal(mediaSupporting.options.length, 2);
assert.ok(mediaSupporting.options[1].requirements?.some((item) => item.type === "PATHWAY_CHOICE"));
const massInternship = massCommunication.curriculum.requirements.find((item) => item.id === "mass-communication-internship");
assert.ok(massInternship?.type === "INTERNSHIP");
assert.equal(massInternship.courseCode, "MSC490");
assert.equal(massInternship.otherCoursesAllowed, false);
const massQuestion = assessProgramRequirementsConversation([{ role: "user", content: "What are the requirements for Mass Communication?" }]);
assert.equal(massQuestion?.programId, "mass-communication");
assert.match(renderProgramRequirementsAssessment(massQuestion!, "en"), /Journalism/);
assert.match(JSON.stringify(massCommunication.program.sources), /bachelor-of-arts-in-mass-communication\.shtml/);

for (const programId of ["biology", "biochemistry"]) {
  const program = getProgramCurriculum(programId);
  assert.equal(program?.curriculum.totalCredits, 120, `${programId} preserves the current page's 120-credit total`);
  assert.equal(program?.curriculum.cohortMapping, "unresolved", `${programId} current-page rules are not silently assigned to a cohort`);
  assert.ok((program?.curriculum.requirements.length ?? 0) > 0, `${programId} has structured requirements`);
}
const biologyConcentrations = assessProgramRequirementsConversation([{ role: "user", content: "What are the Biology concentration requirements?" }]);
assert.equal(biologyConcentrations?.programId, "biology");
assert.match(renderProgramRequirementsAssessment(biologyConcentrations!, "en"), /Ecology and Organismal Biology/);
assert.match(renderProgramRequirementsAssessment(biologyConcentrations!, "en"), /Cellular and Molecular Biology/);
assert.match(renderProgramRequirementsAssessment(biologyConcentrations!, "en"), /BIOM335/);
const biochemistryElectives = assessProgramRequirementsConversation([{ role: "user", content: "What are the Biochemistry elective requirements?" }]);
assert.equal(biochemistryElectives?.programId, "biochemistry");
assert.match(renderProgramRequirementsAssessment(biochemistryElectives!, "en"), /BCHM483/);
assert.match(renderProgramRequirementsAssessment(biochemistryElectives!, "en"), /CHEM419/);
for (const programId of ["chemistry", "geosciences", "mathematics-of-data-science", "mathematics", "physics", "space-sciences"]) {
  const model = getProgramCurriculum(programId);
  assert.equal(model?.curriculum.totalCredits, 120, `${programId} has the published current-page credit total`);
  assert.equal(model?.curriculum.cohortMapping, "unresolved", `${programId} does not infer a cohort mapping`);
  assert.ok((model?.curriculum.requirements.length ?? 0) > 0);
}
for (const [programId, totalCredits, bucketCredits] of [
  ["law", 130, [21, 96, 9, 4]],
  ["nutritional-science", 120, [21, 75, 3, 15, 6]],
  ["dietetics", 120, [21, 81, 6, 6, 6]],
  ["speech-language-pathology", 120, [21, 75, 24]],
] as const) {
  const model = getProgramCurriculum(programId);
  assert.equal(model?.curriculum.totalCredits, totalCredits, `${programId} uses the official current-page total`);
  assert.equal(model?.curriculum.cohortMapping, "unresolved", `${programId} is not silently mapped to a student's cohort`);
  assert.deepEqual(model?.curriculum.creditBuckets?.map(({ credits }) => credits), bucketCredits);
  assert.ok(model?.curriculum.requirements.length);
  assert.equal(programIdInText(programId.replace(/-/g, " ")), programId);
}
const lawElectives = getProgramCurriculum("law")?.curriculum.requirements.filter((item) => item.type === "ELECTIVE_GROUP");
assert.deepEqual(lawElectives?.map(({ chooseCount, credits }) => [chooseCount, credits]), [[2, 6], [1, 3]], "Law preserves the separate Arabic and English elective groups");
const dieteticsInternship = getProgramCurriculum("dietetics")?.curriculum.requirements.find((item) => item.id === "diet-internship");
assert.ok(dieteticsInternship?.type === "INTERNSHIP");
assert.equal(dieteticsInternship.courseCode, "NUTR490");
assert.equal(dieteticsInternship.otherCoursesAllowed, false);
const dieteticsInternshipQuestion = assessProgramRequirementsConversation([{ role: "user", content: "What is the internship requirement for Dietetics?" }]);
assert.equal(dieteticsInternshipQuestion?.programId, "dietetics");
assert.match(renderProgramRequirementsAssessment(dieteticsInternshipQuestion!, "en"), /NUTR490/);
const nutritionInternship = getProgramCurriculum("nutritional-science")?.curriculum.requirements.find((item) => item.id === "ns-internship");
assert.ok(nutritionInternship?.type === "INTERNSHIP");
assert.equal(nutritionInternship.courseCode, "NUTR491");
const slpClinical = getProgramCurriculum("speech-language-pathology")?.curriculum.requirements.find((item) => item.id === "slp-clinical");
assert.ok(slpClinical?.type === "REQUIRED_COURSE_SET");
assert.match(slpClinical.ruleNote ?? "", /200 clinical hours[\s\S]*no concurrent courses[\s\S]*300 clinical hours/i);
const slpClinicalQuestion = assessProgramRequirementsConversation([{ role: "user", content: "What are the clinical training requirements for Speech-Language Pathology?" }]);
assert.equal(slpClinicalQuestion?.programId, "speech-language-pathology");
assert.match(renderProgramRequirementsAssessment(slpClinicalQuestion!, "en"), /SLP456/);
const spaceDegree = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required in Space Sciences?" }]);
assert.equal(spaceDegree?.programId, "space-sciences", "standalone Space Sciences degree is not conflated with Physics concentration");
assert.match(renderProgramRequirementsAssessment(spaceDegree!, "en"), /CSBP478/);
const physicsTracks = assessProgramRequirementsConversation([{ role: "user", content: "What are the Physics concentration requirements?" }]);
assert.equal(physicsTracks?.programId, "physics");
assert.match(renderProgramRequirementsAssessment(physicsTracks!, "en"), /General Physics/);
const chemistryRequiredCourses = assessProgramRequirementsConversation([{ role: "user", content: "What are the required Chemistry major courses?" }]);
assert.equal(chemistryRequiredCourses?.programId, "chemistry");
assert.match(renderProgramRequirementsAssessment(chemistryRequiredCourses!, "en"), /CHEM331/);
const geoscienceElectiveChoices = assessProgramRequirementsConversation([{ role: "user", content: "What Geosciences elective choices are listed?" }]);
assert.equal(geoscienceElectiveChoices?.programId, "geosciences");
assert.match(renderProgramRequirementsAssessment(geoscienceElectiveChoices!, "en"), /GEOL488/);
const mdsDegreeRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What are the Mathematics of Data Science degree requirements?" }]);
assert.equal(mdsDegreeRequirements?.programId, "mathematics-of-data-science");
assert.match(renderProgramRequirementsAssessment(mdsDegreeRequirements!, "en"), /MATH497/);
assert.equal(assessProgramCreditConversation([{ role: "user", content: "What are the Mathematics of Data Science degree requirements?" }]), null,
  "general degree requirements must not be mistaken for a credit-total request");
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credits do I need to graduate from Mathematics of Data Science?" }])?.programId, "mathematics-of-data-science");

assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits do I need to graduate from Cybersecurity?" },
], "en"), null, "a current Cybersecurity question must use its own catalog model, not be blocked by the older Information Security record");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "I am asking about Cybersecurity." },
  { role: "assistant", content: "Which academic detail do you need?" },
  { role: "user", content: "Which courses are required?" },
], "en"), null, "a Cybersecurity follow-up uses the current program model");
const securityIdentityReview = assessAcademicProgramIdentityReview([
  { role: "user", content: "Did Cybersecurity replace Information Security?" },
], "en");
assert.equal(securityIdentityReview?.clarificationReason, "cybersecurity_curriculum_mapping_unverified");
assert.match(securityIdentityReview?.content ?? "", /cannot claim one replaced the other/i);
assert.match(JSON.stringify(securityIdentityReview?.citations), /bachelor-of-science-in-cybersecurity/);
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits do I need for BSc Information Security?" },
], "en"), null, "an explicit Information Security identity can use its own model");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits for Cybersecurity? I meant Information Security, not Cybersecurity." },
], "en"), null, "explicitly corrected program identity overrides the negated prior label");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits for Cybersecurity?" },
  { role: "assistant", content: "I need to check which degree you mean." },
  { role: "user", content: "How many credits for Information Technology?" },
], "en"), null, "a new explicit program topic replaces the unresolved prior program");
assert.equal(programIdInText("How many credits for Cybersecurity? I meant Information Security, not Cybersecurity."), "bsc-information-security", "an explicit correction preserves the corrected degree identity");
assert.equal(programIdInText("How many credits for Cybersecurity?"), "cybersecurity");
assert.equal(programIdInText("How many credits for Data Science and Artificial Intelligence?"), "data-science-and-artificial-intelligence");
assert.equal(programIdInText("How many credits in Electrical Engineering?"), "electrical-engineering");
assert.equal(programIdInText("What courses are required in Civil Engineering?"), "civil-engineering");
assert.equal(programIdInText("What courses are required in Chemical Engineering?"), "chemical-engineering");
assert.equal(programIdInText("What courses are required in Aerospace Engineering?"), "aerospace-engineering");
assert.equal(programIdInText("What courses are required in Petroleum Engineering?"), "petroleum-engineering");
assert.equal(programIdInText("\u0643\u0645 \u0633\u0627\u0639\u0629 \u0644\u0644\u062a\u062e\u0631\u062c \u0645\u0646 \u0627\u0644\u0623\u0645\u0646 \u0627\u0644\u0633\u064a\u0628\u0631\u0627\u0646\u064a\u061f"), "cybersecurity", "Arabic Cybersecurity queries map to the current Cybersecurity curriculum");

const computerEngineeringIdentityReview = assessAcademicProgramIdentityReview([
  { role: "user", content: "In Computer Engineering, take Networking Security instead of Selected Topics." },
], "en");
assert.equal(computerEngineeringIdentityReview?.clarificationReason, "computer_engineering_cohort_required");
assert.match(computerEngineeringIdentityReview?.content ?? "", /entry year/i);
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "I entered Computer Engineering in 2022. Which courses are required in my plan?" },
], "en"), null, "a historic computer-engineering plan can be scoped by its entry cohort");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "How many credits for Computer and Artificial Intelligence Engineering?" },
], "en"), null, "the current named Computer and AI Engineering program is distinct from the legacy Computer Engineering record");
assert.equal(assessAcademicProgramIdentityReview([
  { role: "user", content: "\u0643\u0645 \u0633\u0627\u0639\u0629 \u0644\u0644\u062a\u062e\u0631\u062c \u0645\u0646 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628\u061f" },
], "ar")?.clarificationReason, "computer_engineering_cohort_required", "Arabic Computer Engineering questions must establish the applicable cohort");
const computerEngineeringArabicReview = assessAcademicProgramIdentityReview([
  { role: "user", content: "\u0643\u0645 \u0633\u0627\u0639\u0629 \u0644\u0644\u062a\u062e\u0631\u062c \u0645\u0646 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628\u061f" },
], "ar");
assert.ok(computerEngineeringArabicReview?.content && /[\u0600-\u06FF]/u.test(computerEngineeringArabicReview.content), "Arabic Computer Engineering identity review is readable");

const isecCurrent = getProgramCurriculum("bsc-information-security");
assert.ok(isecCurrent);
assert.equal(isecCurrent.curriculum.totalCredits, 120);
assert.equal(isecCurrent.cohortMatched, false, "a default/current version is not proof of a student's cohort");
assert.deepEqual(isecCurrent.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 46, 6, 6]);
assert.equal(isecCurrent.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 120);
assert.equal(modeledCreditTotal(isecCurrent.curriculum.requirements), 120,
  "the Information Security audit requirements reconcile to all 120 published credits, including the sourced 2-credit ISEC421 plan value");
assert.equal(isecCurrent.curriculum.requirements.find((item) => item.type === "CREDIT_BLOCK")?.id,
  "information-security-general-education-themes-6-11",
  "the 6-credit General Education theme choices remain visible as a credit-only block rather than fabricated course codes");
assert.equal(isecCurrent.curriculum.requirements.find((item) => item.id === "information-security-college-required-courses")?.type,
  "REQUIRED_COURSE_SET", "all fixed college courses are represented in the structured audit");
assert.equal(isecCurrent.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.chooseCount, 2);
assert.deepEqual(isecCurrent.curriculum.requirements.find((item) => item.type === "INTERNSHIP"), {
  type: "INTERNSHIP", id: "information-security-internship", courseCode: "ITBP496", credits: 6,
  finalSemesterOnly: true, otherCoursesAllowed: false,
});

assert.equal(getProgramCurriculum("bsc-information-security", 2022), null,
  "the 130-credit Information Security source variant is not auto-assigned to a student cohort");
const isec2022Credits = assessProgramCreditConversation([
  { role: "user", content: "I entered UAEU in 2022 in Information Security. How many credit hours are in the published plan?" },
]);
assert.equal(isec2022Credits?.curriculum?.totalCredits, 130,
  "the unresolved older Information Security version can report its published total without becoming a course-level plan");
const isec2022Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered UAEU in Fall 2022 in Information Security." },
  { role: "user", content: "What courses are in my degree?" },
]);
assert.equal(isec2022Requirements?.curriculum?.requirements.length, 7,
  "the independently reconciled older 130-credit source exposes its published course and choice groups");
assert.ok(isec2022Requirements?.curriculum?.requirements.some((item) => item.type === "INTERNSHIP" && item.courseCode === "ITBP495" && item.credits === 12),
  "the older plan keeps its source-published ITBP495 internship requirement");
assert.match(isec2022Requirements?.curriculum?.limitations.join(" ") ?? "", /ISEC421 as 2 credits.*3 credits/i,
  "the older-plan/current-catalog ISEC421 discrepancy remains explicit");
assert.match(renderProgramRequirementsAssessment(isec2022Requirements!, "en"), /130 total credits/i);
assert.equal(getProgramCurriculum("bsc-information-security", 2024), null,
  "an unresolved 130-credit source variant is not auto-assigned by year alone");
assert.equal(fallEntryCurriculumForYear("bsc-information-security", 2026)?.curriculum.totalCredits, 120,
  "the 120-credit model is available for an explicit Fall-entry cohort in the source-defined range");
const isecFall2026Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered UAEU in Fall 2026 in Information Security." },
  { role: "user", content: "What courses are in my degree?" },
]);
assert.equal(isecFall2026Requirements?.curriculum?.id, "isec-2025-2026-fall-120");
const isecUnknownEntry2026 = assessProgramRequirementsConversation([
  { role: "user", content: "I entered UAEU in 2026 in Information Security." },
  { role: "user", content: "What courses are in my degree?" },
]);
assert.equal(isecUnknownEntry2026?.curriculum, null,
  "do not apply a Fall-only Information Security plan to an unspecified entry semester");

const cs = getProgramCurriculum("bsc-computer-science");
assert.ok(cs);
assert.equal(cs.curriculum.totalCredits, 120);
assert.equal(cs.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 120);
assert.equal(cs.curriculum.creditBuckets?.find(({ id }) => id === "free-electives")?.credits, 2);
assert.equal(cs.curriculum.requirements.find((item) => item.type === "ONE_OF_GROUP")?.chooseCount, 1);
assert.equal(cs.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.credits, 12);
assert.equal(getProgramCurriculum("bsc-computer-science", 2022), null, "unknown historic CS versions stay unresolved");
assert.equal(getProgramCurriculum("unmodeled-program"), null);

const it = getProgramCurriculum("bsc-information-technology");
assert.ok(it);
assert.equal(it.curriculum.totalCredits, 120);
assert.deepEqual(it.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 37, 6, 9, 6]);
assert.equal(it.curriculum.requirements.find((item) => item.type === "ONE_OF_GROUP")?.chooseCount, 1, "the science choice does not make both options mandatory");
assert.equal(it.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.chooseCount, 3);
assert.match(it.curriculum.limitations.join(" "), /states 130/,
  "the IT catalog/model-plan conflict is disclosed alongside the modeled catalog total");
const itAssessment = assessProgramCreditConversation([{ role: "user", content: "How many credit hours to graduate in Information Technology?" }]);
assert.ok(itAssessment);
assert.match(renderProgramCreditAssessment(itAssessment, "en"), /The currently published curriculum requires \*\*120 credit hours\*\*/);

const mech = getProgramCurriculum("bsc-mechanical-engineering");
assert.ok(mech);
assert.equal(mech.curriculum.totalCredits, 132);
assert.deepEqual(mech.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 35, 68, 2, 6]);
assert.equal(mech.curriculum.requirements.filter((item) => item.type === "INTERNSHIP").length, 2);
assert.equal(mech.curriculum.requirements.find((item) => item.type === "ELECTIVE_GROUP")?.chooseCount, 2);
assert.match(mech.curriculum.limitations.join(" "), /MATH130\/MATH135/,
  "the cohort-specific math sequence is explicitly noted");
const mechAssessment = assessProgramCreditConversation([{ role: "user", content: "How many credits to graduate in Mechanical Engineering?" }]);
assert.ok(mechAssessment);
assert.match(renderProgramCreditAssessment(mechAssessment, "en"), /MECH485: 1 credit;/);
assert.doesNotMatch(renderProgramCreditAssessment(mechAssessment, "en"), /MECH\d+: 1 credits/);

const currentQuestion = assessProgramCreditConversation([
  { role: "user", content: "How many credit hours do I need to graduate from Information Security?" },
]);
assert.ok(currentQuestion);
assert.equal(currentQuestion.curriculum?.totalCredits, 120);
assert.match(renderProgramCreditAssessment(currentQuestion, "en"), /21 credits/);
assert.match(renderProgramCreditAssessment(currentQuestion, "en"), /assigned study plan/i);

const officialCourseCredits = new Map(loadOfficialCourseCatalog()?.courses.map(({ code, creditHours }) => [code, creditHours] as const));
const officialCourseCodes = new Set(officialCourseCredits.keys());
for (const [programId, expectedBuckets] of [
  ["cybersecurity", [21, 41, 46, 6, 6]],
  ["data-science-and-artificial-intelligence", [21, 54, 6, 15, 9, 6, 9]],
  ["electrical-engineering", [21, 35, 62, 2, 12]],
  ["chemical-engineering", [21, 35, 45, 6, 2, 17, 6]],
  ["civil-engineering", [21, 35, 65, 2, 9]],
  ["aerospace-engineering", [21, 35, 68, 2, 6]],
  ["petroleum-engineering", [21, 35, 65, 2, 9]],
  ["accounting", [21, 30, 30, 27, 12]],
  ["finance-and-banking", [21, 30, 24, 24, 15, 6]],
  ["early-childhood-education", [21, 57, 9, 30, 3]],
  ["health-and-physical-education", [21, 33, 6, 15, 39, 6]],
  ["special-education", [21, 18, 30, 24, 21, 6]],
  ["economics", [21, 30, 30, 30, 9]],
  ["human-resources-management-and-development", [21, 9, 9, 12, 30, 30, 9]],
  ["supply-chain-management-and-logistics", [21, 9, 9, 12, 30, 30, 9]],
  ["entrepreneurship", [21, 9, 9, 12, 30, 30, 9]],
  ["marketing", [21, 9, 9, 12, 30, 30, 9]],
  ["statistics-and-data-analytics", [21, 30, 12, 40, 15, 3]],
  ["architectural-engineering", [21, 35, 65, 2, 9]],
  ["communication-engineering", [21, 35, 62, 2, 12]],
  ["food-science", [21, 12, 63, 3, 15, 6]],
  ["veterinary-medicine", [21, 124, 27, 3]],
] as const) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled, `${programId} has a current official curriculum model`);
  const bucketTotal = expectedBuckets.reduce((sum, credits) => sum + credits, 0);
  assert.equal(modeled.curriculum.totalCredits, bucketTotal);
  assert.deepEqual(modeled.curriculum.creditBuckets?.map(({ credits }) => credits), expectedBuckets);
  assert.equal(modeled.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), bucketTotal);
  assert.ok(modeled.curriculum.requirements.some(({ type }) => type === "CREDIT_BLOCK"), "general-education choice rules remain explicitly unassessed rather than being guessed course by course");
}
for (const programId of ["early-childhood-education", "health-and-physical-education", "special-education"]) {
  assert.equal(programIdInText(programId.replace(/-/g, " ")), programId, `${programId} resolves from a student-facing program name`);
  const currentPublished = getProgramCurriculum(programId);
  assert.equal(currentPublished?.curriculum.totalCredits, 120, `${programId} has a current 120-credit published total`);
  assert.ok(currentPublished?.curriculum.requirements.length, `${programId} has structured current-page requirements for general questions`);
  const cohort2025Model = getProgramCurriculum(programId, 2025);
  assert.equal(cohort2025Model, null, `${programId} Fall-only plan is not assigned from year alone`);
  if (programId === "early-childhood-education") {
    assert.equal(getProgramCurriculum(programId, 2024), null, "year alone does not assign either of the Fall-only older plans");
    assert.equal(fallEntryCurriculumForYear(programId, 2024)?.curriculum.totalCredits, 126, "explicit Fall entry selects the applicable 2022 cohort model");
  } else if (programId === "health-and-physical-education") {
    assert.equal(getProgramCurriculum(programId, 2024), null, "year alone does not assign a Fall-only historical plan");
    assert.equal(fallEntryCurriculumForYear(programId, 2024)?.curriculum.totalCredits, 126, "explicit Fall entry selects the 2022 Health and Physical Education model");
  } else {
    assert.equal(getProgramCurriculum(programId, 2024), null, "year alone does not assign a Fall-entry historical plan");
    assert.equal(fallEntryCurriculumForYear(programId, 2024)?.curriculum.totalCredits, 126, "explicit Fall entry selects the 2022 Special Education model");
  }
  const cohort2022Model = programId === "early-childhood-education"
    ? fallEntryCurriculumForYear(programId, 2022)
    : programId === "health-and-physical-education"
      ? fallEntryCurriculumForYear(programId, 2022)
      : fallEntryCurriculumForYear(programId, 2022);
  assert.equal(cohort2022Model?.curriculum.totalCredits, 126);
  if (programId === "early-childhood-education" || programId === "health-and-physical-education" || programId === "special-education") {
    assert.ok(cohort2022Model?.curriculum.requirements.length, `the distinct 2022 ${programId} model plan has structured course rows`);
    assert.equal(modeledCreditTotal(cohort2022Model!.curriculum.requirements), 126);
  } else {
  }
}
const earlyChildhood2020Plan = getPublishedCurriculumVersion("early-childhood-education", "early-childhood-education-2020-126");
assert.ok(earlyChildhood2020Plan);
assert.equal(earlyChildhood2020Plan.curriculum.requirements.length, 0, "the 2020 plan's #REF! credits remain unstructured");
assert.ok(earlyChildhood2020Plan.curriculum.limitations.some((item) => item.includes("#REF!")));
const earlyChildhood2022Plan = getPublishedCurriculumVersion("early-childhood-education", "early-childhood-education-2022-126");
assert.ok(earlyChildhood2022Plan);
assert.equal(modeledCreditTotal(earlyChildhood2022Plan.curriculum.requirements), 126,
  "the separately transcribed Fall 2022 Early Childhood plan reconciles named courses and source-backed credit blocks to 126");
const earlyChildhoodFall2022Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Early Childhood Education in 2022." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2022. What courses does my cohort model plan list?" },
]);
assert.equal(earlyChildhoodFall2022Requirements?.curriculum?.id, "early-childhood-education-2022-126");
assert.match(renderProgramRequirementsAssessment(earlyChildhoodFall2022Requirements!, "en"), /CURR465/);
assert.match(renderProgramRequirementsAssessment(earlyChildhoodFall2022Requirements!, "en"), /ISLM100\/ISLM101/);
const earlyChildhood2021Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Early Childhood Education in the 2021 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2021. Which courses are in my model plan?" },
]);
assert.equal(earlyChildhood2021Requirements?.curriculum?.id, "early-childhood-education-2020-126");
const earlyChildhood2021Answer = renderProgramRequirementsAssessment(earlyChildhood2021Requirements!, "en");
assert.match(earlyChildhood2021Answer, /course requirements are not structured/i);
assert.doesNotMatch(earlyChildhood2021Answer, /CURR101/);
assert.equal(getProgramCurriculum("finance-and-banking", 2027), null, "a current page without an established cohort mapping is not applied to an individual cohort");
for (const programId of ["economics", "human-resources-management-and-development", "supply-chain-management-and-logistics", "entrepreneurship", "marketing", "statistics-and-data-analytics", "architectural-engineering", "communication-engineering", "food-science", "veterinary-medicine"]) {
  const currentPage = getProgramCurriculum(programId);
  assert.ok(currentPage?.curriculum.cohortMapping === "unresolved", `${programId} current-page requirements are not silently assigned to a cohort`);
  assert.ok(currentPage.curriculum.requirements.length > 0, `${programId} current-page model supports general requirement questions`);
  assert.equal(programIdInText(programId.replace(/-/g, " ")), programId, `${programId} resolves from its student-facing degree name`);
}
const economics2025Plan = getPublishedCurriculumVersion("economics", "economics-2025-plan-total-only");
assert.ok(economics2025Plan, "the exact Fall-entry 2025-2026 Economics plan remains explicitly selectable");
assert.equal(economics2025Plan.curriculum.totalCredits, 120);
assert.equal(modeledCreditTotal(economics2025Plan.curriculum.requirements), 120, "Economics named courses, choice blocks and pathway reconcile to the published total");
assert.equal(economics2025Plan.curriculum.cohortMapping, "unresolved", "a year-only student profile must not auto-assign a Fall-only plan");
const economics2025NamedCourses = economics2025Plan.curriculum.requirements.find((item) => item.id === "economics-2025-model-named-courses");
assert.ok(economics2025NamedCourses?.type === "REQUIRED_COURSE_SET");
assert.equal(economics2025NamedCourses.courseCodes.length, 31);
assert.ok(economics2025NamedCourses.courseCodes.includes("ECON215"));
assert.equal(economics2025Plan.curriculum.requirements.filter((item) => item.type === "CREDIT_BLOCK").reduce((sum, item) => sum + item.credits, 0), 15,
  "the plan preserves three unspecified major-elective credits and two unspecified General Education choices without inventing course codes");
assert.ok(economics2025Plan.curriculum.requirements.some((item) => item.type === "PATHWAY_CHOICE" && item.options.some((option) => option.courseCodes.includes("GBUS460") && option.credits === 12) && item.options.some((option) => option.courseCodes.includes("ENTR415") && option.credits === 12)));
assert.equal(getProgramCurriculum("economics", 2025), null,
  "a year without Fall/Spring entry term must not silently apply the Fall-only Economics model plan");
const economicsYearOnlyRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Economics in the 2025 cohort." },
  { role: "assistant", content: "Which degree requirement would you like to check?" },
  { role: "user", content: "Which courses are required in my assigned plan?" },
]);
assert.ok(economicsYearOnlyRequirements);
assert.equal(economicsYearOnlyRequirements.curriculum, null);
assert.match(economicsYearOnlyRequirements.scopeClarification ?? "", /specifically for Fall-entry students.*Did you start in Fall or Spring/i);
const economicsFallRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Economics in the 2025 cohort." },
  { role: "assistant", content: "Which degree requirement would you like to check?" },
  { role: "user", content: "I was admitted in Fall 2025." },
  { role: "assistant", content: "What would you like to know about the plan?" },
  { role: "user", content: "Which courses are required in my assigned plan?" },
]);
assert.equal(economicsFallRequirements?.curriculum?.id, "economics-2025-plan-total-only");
assert.match(renderProgramRequirementsAssessment(economicsFallRequirements!, "en"), /ECON215/);
assert.match(renderProgramRequirementsAssessment(economicsFallRequirements!, "en"), /three 3-credit Student choice Major Elective rows/);
const economicsSpringRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Economics in the 2025 cohort." },
  { role: "assistant", content: "Which degree requirement would you like to check?" },
  { role: "user", content: "I was admitted in Spring 2025." },
  { role: "assistant", content: "What would you like to know about the plan?" },
  { role: "user", content: "Which courses are required in my assigned plan?" },
]);
assert.equal(economicsSpringRequirements?.curriculum, null, "the Fall-only plan is not assigned to a Spring entrant");
assert.match(economicsSpringRequirements?.scopeClarification ?? "", /does not establish the Spring-entry course requirements/i);
const entrepreneurship2025Plan = getPublishedCurriculumVersion("entrepreneurship", "entrepreneurship-2025-plan-total-only");
assert.ok(entrepreneurship2025Plan, "the exact Fall-entry 2025-2026 Entrepreneurship plan is separately selectable");
assert.equal(entrepreneurship2025Plan.curriculum.totalCredits, 120);
assert.equal(modeledCreditTotal(entrepreneurship2025Plan.curriculum.requirements), 120, "Entrepreneurship named courses and credit-choice blocks reconcile to the published total");
assert.equal(entrepreneurship2025Plan.curriculum.cohortMapping, "unresolved", "year-only records must not auto-assign the Fall-entry plan");
const entrepreneurship2025NamedCourses = entrepreneurship2025Plan.curriculum.requirements.find((item) => item.id === "entrepreneurship-2025-model-named-courses");
assert.ok(entrepreneurship2025NamedCourses?.type === "REQUIRED_COURSE_SET");
assert.equal(entrepreneurship2025NamedCourses.courseCodes.length, 32);
assert.ok(entrepreneurship2025NamedCourses.courseCodes.includes("ENTR415"));
assert.match(entrepreneurship2025NamedCourses.ruleNote ?? "", /ENTR415 is listed as a 12-credit Internship.*current degree page describes the course.*registration gate/i);
assert.equal(entrepreneurship2025Plan.curriculum.requirements.filter((item) => item.type === "CREDIT_BLOCK").reduce((sum, item) => sum + item.credits, 0), 15,
  "the plan preserves unnamed elective and General Education choice credits without inventing course codes");
const entrepreneurshipFallRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are required for Entrepreneurship in my plan? I entered in 2025." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2025." },
  { role: "user", content: "Which courses are required?" },
]);
assert.equal(entrepreneurshipFallRequirements?.curriculum?.id, "entrepreneurship-2025-plan-total-only");
assert.match(renderProgramRequirementsAssessment(entrepreneurshipFallRequirements!, "en"), /ACCT111.*ENTR415/s);
assert.match(renderProgramRequirementsAssessment(entrepreneurshipFallRequirements!, "en"), /three 3-credit Student choice Major Elective rows/);
const entrepreneurshipYearOnlyRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Entrepreneurship in the 2025 cohort. Which courses are required?" },
]);
assert.equal(entrepreneurshipYearOnlyRequirements?.curriculum, null);
assert.match(entrepreneurshipYearOnlyRequirements?.scopeClarification ?? "", /specifically for Fall-entry students.*Did you start in Fall or Spring/i);
const entrepreneurshipSpringRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I am in the 2025 Entrepreneurship cohort; I started Spring 2025. Which courses are required?" },
]);
assert.equal(entrepreneurshipSpringRequirements?.curriculum, null, "the Fall-only plan must not be assigned to Spring entrants");
assert.match(entrepreneurshipSpringRequirements?.scopeClarification ?? "", /does not establish the Spring-entry course requirements/i);
const scml2025Plan = getPublishedCurriculumVersion("supply-chain-management-and-logistics", "scml-2025-plan-total-only");
assert.ok(scml2025Plan, "the exact Fall-entry 2025-2026 Supply Chain plan is separately selectable");
assert.equal(scml2025Plan.curriculum.totalCredits, 120);
assert.equal(modeledCreditTotal(scml2025Plan.curriculum.requirements), 120, "Supply Chain named courses, choice blocks and pathway reconcile to the published total");
assert.equal(scml2025Plan.curriculum.cohortMapping, "unresolved");
const scml2025Courses = scml2025Plan.curriculum.requirements.find((item) => item.id === "scml-2025-model-named-courses");
assert.ok(scml2025Courses?.type === "REQUIRED_COURSE_SET");
assert.equal(scml2025Courses.courseCodes.length, 31);
assert.ok(scml2025Courses.courseCodes.includes("MGMT415"));
assert.match(scml2025Courses.ruleNote ?? "", /MGMT415 is labeled Learning in Action.*current degree page/i);
assert.equal(scml2025Plan.curriculum.requirements.filter((item) => item.type === "CREDIT_BLOCK").reduce((sum, item) => sum + item.credits, 0), 15);
assert.ok(scml2025Plan.curriculum.requirements.some((item) => item.type === "PATHWAY_CHOICE" && item.options.some((option) => option.courseCodes.includes("ENTR415") && option.credits === 12) && item.options.some((option) => option.courseCodes.includes("GBUS460") && option.credits === 12)));
const scmlFallRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Supply Chain Management and Logistics in the 2025 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2025. What courses are required?" },
]);
assert.equal(scmlFallRequirements?.curriculum?.id, "scml-2025-plan-total-only");
assert.match(renderProgramRequirementsAssessment(scmlFallRequirements!, "en"), /SCML450.*GBUS460/s);
const scmlYearOnlyRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Supply Chain Management and Logistics in the 2025 cohort. Which courses are required?" },
]);
assert.equal(scmlYearOnlyRequirements?.curriculum, null);
assert.match(scmlYearOnlyRequirements?.scopeClarification ?? "", /specifically for Fall-entry students.*Did you start in Fall or Spring/i);
const marketing2025Plan = getPublishedCurriculumVersion("marketing", "marketing-2025-plan-total-only");
assert.ok(marketing2025Plan, "the exact Fall-entry 2025-2026 Marketing plan is separately selectable");
assert.equal(marketing2025Plan.curriculum.totalCredits, 120);
assert.equal(modeledCreditTotal(marketing2025Plan.curriculum.requirements), 120, "Marketing named courses, choice blocks and pathway reconcile to the published total");
assert.equal(marketing2025Plan.curriculum.cohortMapping, "unresolved");
const marketing2025Courses = marketing2025Plan.curriculum.requirements.find((item) => item.id === "marketing-2025-model-named-courses");
assert.ok(marketing2025Courses?.type === "REQUIRED_COURSE_SET");
assert.equal(marketing2025Courses.courseCodes.length, 31);
assert.ok(marketing2025Courses.courseCodes.includes("BANA310"));
assert.match(marketing2025Courses.ruleNote ?? "", /BANA310 is named in the plan.*current degree page.*MGMT415/i);
assert.equal(marketing2025Plan.curriculum.requirements.filter((item) => item.type === "CREDIT_BLOCK").reduce((sum, item) => sum + item.credits, 0), 15);
assert.ok(marketing2025Plan.curriculum.requirements.some((item) => item.type === "PATHWAY_CHOICE" && item.options.some((option) => option.courseCodes.includes("ENTR415") && option.credits === 12) && item.options.some((option) => option.courseCodes.includes("GBUS460") && option.credits === 12)));
const marketingFallRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Marketing in the 2025 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2025. Which courses are required?" },
]);
assert.equal(marketingFallRequirements?.curriculum?.id, "marketing-2025-plan-total-only");
assert.match(renderProgramRequirementsAssessment(marketingFallRequirements!, "en"), /MKTG420.*GBUS460/s);
assert.equal(getProgramCurriculum("human-resources-management-and-development", 2025), null,
  "HRMD course details are not assigned to a cohort while the linked plan has not been reconciled");
assert.equal(getProgramCurriculum("marketing", 2025), null, "year-only records must not auto-assign the Fall-only Marketing plan");
assert.equal(getProgramCurriculum("statistics-and-data-analytics", 2024), null, "year alone does not assign the Fall-entry 2024 plan");
assert.equal(getProgramCurriculum("statistics-and-data-analytics", 2022), null, "year alone does not assign the Fall-entry 2022 plan");
for (const year of [2022, 2023, 2024]) {
  const answer = assessProgramCreditConversation([{ role: "user", content: `How many credits to graduate from Statistics and Data Analytics in ${year}?` }]);
  assert.equal(answer?.curriculum?.totalCredits, 121, `published total may be reported with a caveat for ${year}`);
  assert.equal(answer?.cohortMatched, false, `a published cohort total does not prove the student's personal plan for ${year}`);
}
assert.equal(getProgramCurriculum("statistics-and-data-analytics", 2025), null, "current Statistics page details are not silently mapped onto an unsupported cohort");
for (const [year, id] of [[2022, "statistics-data-analytics-2022-plan-121"], [2024, "statistics-data-analytics-2024-plan-121"]] as const) {
  const plan = getPublishedCurriculumVersion("statistics-and-data-analytics", id);
  assert.ok(plan, `the directly inspected ${year} Fall-entry plan is modeled separately`);
  assert.equal(plan.curriculum.totalCredits, 121);
  assert.equal(modeledCreditTotal(plan.curriculum.requirements), 121, `${year} Fall-entry plan reconciles to 121 credits`);
  assert.equal(plan.curriculum.cohortMapping, "unresolved", "public cohort label does not establish individual Degree Works assignment");
  const pathways = plan.curriculum.requirements.find((item) => item.type === "PATHWAY_CHOICE");
  assert.ok(pathways?.type === "PATHWAY_CHOICE");
  assert.deepEqual(pathways.options.map((option) => option.id), ["analytics-for-business", "statistics"]);
  for (const option of pathways.options) assert.equal(modeledCreditTotal(option.requirements ?? []), 15);
  assert.ok(plan.curriculum.limitations.some((item) => /Spring-entry sequences are separately displayed/.test(item)));
}
assert.equal(fallEntryCurriculumForYear("statistics-and-data-analytics", 2022)?.curriculum.id, "statistics-data-analytics-2022-plan-121");
assert.equal(fallEntryCurriculumForYear("statistics-and-data-analytics", 2024)?.curriculum.id, "statistics-data-analytics-2024-plan-121");
const statsFall2024Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Statistics and Data Analytics in 2024." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2024, Statistics concentration. What courses does the plan list?" },
]);
assert.equal(statsFall2024Requirements?.curriculum?.id, "statistics-data-analytics-2024-plan-121");
assert.match(renderProgramRequirementsAssessment(statsFall2024Requirements!, "en"), /CSBP121.*STAT460.*STAT420.*STAT480/s);
assert.equal(getProgramCurriculum("architectural-engineering", 2023), null,
  "do not cohort-assign the 2023 Architectural Engineering plan while its source credits conflict");
assert.equal(getProgramCurriculum("architectural-engineering", 2025), null,
  "the model options do not establish each student's assigned Architectural Engineering cohort");
assert.equal(getProgramCurriculum("architectural-engineering", 2022), null,
  "do not cohort-assign the 2022 Architectural Engineering plan while course rows conflict");
assert.equal(getProgramCurriculum("communication-engineering", 2023)?.curriculum.totalCredits, 132);
assert.equal(getProgramCurriculum("communication-engineering", 2025), null,
  "the Fall-only 2025 model requires explicit entry-term evidence");
assert.equal(getProgramCurriculum("communication-engineering", 2022), null,
  "do not auto-assign the 2022 plan while its Spring-entry source discrepancy is unresolved");
for (const [versionId, expectedCounts] of [
  ["architectural-engineering-2025-2026-model-plans-132", [41, 40]],
  ["architectural-engineering-2026-2027-model-plans-132", [42, 41]],
] as const) {
  const plan = getPublishedCurriculumVersion("architectural-engineering", versionId)?.curriculum;
  assert.ok(plan, `${versionId} is a separately captured official cohort model`);
  assert.equal(plan.totalCredits, 132);
  const entryTermChoice = plan.requirements.find((item) => item.type === "PATHWAY_CHOICE");
  assert.ok(entryTermChoice?.type === "PATHWAY_CHOICE");
  assert.deepEqual(entryTermChoice.options.map((option) => option.id), ["fall-entry", "spring-entry"]);
  for (const [index, option] of entryTermChoice.options.entries()) {
    assert.equal(option.type, "COMPOSITE");
    assert.equal(option.courseCodes.length, expectedCounts[index], `${option.name} retains only its own named course codes`);
    assert.equal(new Set(option.courseCodes).size, option.courseCodes.length, `${option.name} does not duplicate course identities`);
    assert.equal(modeledCreditTotal(option.requirements ?? []), 132, `${option.name} courses and choice blocks reconcile to 132 credits`);
    assert.ok(option.requirements?.some((requirement) => requirement.type === "REQUIRED_COURSE_SET" && /Semester 1/.test(requirement.name)));
    assert.equal(option.requirements?.filter((requirement) => requirement.type === "INTERNSHIP").length, 2,
      `${option.name} retains the two published internship courses`);
  }
}
assert.equal(getProgramCurriculum("communication-engineering", 2025), null,
  "do not assign a 2025 Communication Engineering plan without its explicit Fall-entry condition");
const communication2025 = getPublishedCurriculumVersion("communication-engineering", "communication-engineering-2025-plan-132-fall")?.curriculum;
assert.ok(communication2025);
assert.equal(communication2025.totalCredits, 132);
assert.equal(modeledCreditTotal(communication2025.requirements), 132,
  "the 2025-2026 Fall-entry Communication Engineering semester groups reconcile to 132 credits");
assert.ok(!communication2025.requirements.some((requirement) => "courseCodes" in requirement && requirement.courseCodes.includes("GESU121")),
  "the 2025 plan keeps Theme 5 as a student choice rather than assigning GESU121");
const communication2025Fall = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are in Communication Engineering for Fall 2025 entry?" },
]);
assert.equal(communication2025Fall?.curriculum?.id, "communication-engineering-2025-plan-132-fall");
const communication2025Spring = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are in Communication Engineering for Spring 2025 entry?" },
]);
assert.equal(communication2025Spring?.curriculum, null,
  "the Fall-only 2025-2026 model must not be applied to a Spring entrant");
assert.match(communication2025Spring?.scopeClarification ?? "", /does not establish the Spring-entry course requirements/);
const communication2026 = getProgramCurriculum("communication-engineering", 2026)?.curriculum;
assert.equal(communication2026?.id, "communication-engineering-2026-plan-132-fall-spring");
assert.equal(communication2026?.requirements[0]?.type, "PATHWAY_CHOICE");
if (communication2026?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.deepEqual(communication2026.requirements[0].options.map(({ id }) => id), ["fall-entry", "spring-entry"]);
  assert.ok(communication2026.requirements[0].options.every(({ credits }) => credits === 132));
  for (const option of communication2026.requirements[0].options) {
    assert.equal(modeledCreditTotal(option.requirements ?? []), 132,
      `Communication Engineering ${option.id} semester rows reconcile to 132 credits`);
    assert.ok(!option.courseCodes.includes("GESU121"),
      `${option.id} preserves Theme 5 as a choice category instead of inventing a fixed course`);
  }
  const fallOption = communication2026.requirements[0].options.find(({ id }) => id === "fall-entry");
  assert.ok(fallOption?.type === "COMPOSITE");
  const fallSemester5 = fallOption.requirements?.find((requirement): requirement is Extract<ProgramRequirement, { type: "REQUIRED_COURSE_SET" }> =>
    requirement.type === "REQUIRED_COURSE_SET" && requirement.id.endsWith("semester-5-courses"));
  const fallSemester6 = fallOption.requirements?.find((requirement): requirement is Extract<ProgramRequirement, { type: "REQUIRED_COURSE_SET" }> =>
    requirement.type === "REQUIRED_COURSE_SET" && requirement.id.endsWith("semester-6-courses"));
  assert.deepEqual(fallSemester5?.courseCodes, ["ECOM360", "ELEC370", "ELEC375", "ELEC451", "ELEC290", "GENG315"]);
  assert.deepEqual(fallSemester6?.courseCodes, ["ECOM412", "ELEC461", "ECOM432", "ECOM442", "ELEC462", "ELEC395"]);
}
const arch2022SourceGap = getPublishedCurriculumVersion("architectural-engineering", "architectural-engineering-2022-plan-total-only")?.curriculum;
assert.ok(arch2022SourceGap);
assert.deepEqual(arch2022SourceGap.requirements, [], "do not invent an Architectural Engineering 2022 course mapping while GENG215 is duplicated");
assert.match(arch2022SourceGap.limitations.join(" "), /GENG215 Engineering Ethics \(2 credits\) twice/);
assert.match(arch2022SourceGap.limitations.join(" "), /MATH1110\/130/);
assert.equal(arch2022SourceGap.cohortMapping, "unresolved");
const arch2023SourceGap = getPublishedCurriculumVersion("architectural-engineering", "architectural-engineering-2023-plan-total-only")?.curriculum;
assert.ok(arch2023SourceGap);
assert.deepEqual(arch2023SourceGap.requirements, [], "keep the zero-credit legacy course line out of a deterministic requirement model");
assert.match(arch2023SourceGap.limitations.join(" "), /ISLM101 line with 0 credits/);
assert.equal(arch2023SourceGap.cohortMapping, "unresolved");
const communication2022SourceGap = getPublishedCurriculumVersion("communication-engineering", "communication-engineering-2022-plan-total-only")?.curriculum;
assert.ok(communication2022SourceGap);
assert.equal(communication2022SourceGap.totalCredits, 147);
assert.equal(communication2022SourceGap.cohortMapping, "unresolved");
assert.equal(communication2022SourceGap.requirements.length, 1);
assert.equal(communication2022SourceGap.requirements[0]?.type, "PATHWAY_CHOICE");
assert.equal(communication2022SourceGap.semesterPlans?.length, 2, "both reconciled entry tracks stay attached to the corpus version ID");
for (const plan of communication2022SourceGap.semesterPlans ?? []) {
  assert.equal(plan.semesters.length, 9);
  assert.equal(plan.semesters.reduce((sum, semester) => sum + semester.publishedCredits, 0), 147);
  assert.ok(plan.semesters.every((semester) => semester.courses.every((course) => course.sourceLabel.trim().length > 0)));
}
assert.doesNotMatch(communication2022SourceGap.limitations.join(" "), /138, nine credits below/);
const communication2023 = getPublishedCurriculumVersion("communication-engineering", "communication-engineering-2023-plan-132-fall-spring")?.curriculum;
assert.ok(communication2023);
assert.equal(communication2023.requirements.length, 1);
assert.equal(modeledCreditTotal(communication2023.requirements), 132,
  "both 2023-2024 Communication Engineering pathways reconcile to the official 132-credit total");
const communication2023Pathways = communication2023.requirements[0];
assert.ok(communication2023Pathways.type === "PATHWAY_CHOICE");
assert.deepEqual(communication2023Pathways.options.map(({ id }) => id), ["fall-entry", "spring-entry"]);
for (const option of communication2023Pathways.options) {
  assert.equal(option.type, "COMPOSITE");
  assert.equal(option.credits, 132);
  assert.equal(option.requirements?.filter(({ type }) => type === "REQUIRED_COURSE_SET").length, 8);
  assert.equal(option.requirements?.filter(({ type }) => type === "INTERNSHIP").length, 2);
  assert.ok(option.courseCodes.includes("ISLM101"));
}
assert.match(communication2023.limitations.join(" "), /ISLM101 Biography of the Prophet \(Sira\) is listed as a 3-credit course/);
for (const entrySemester of ["Fall", "Spring"] as const) {
  const communication2023EntryAnswer = assessProgramRequirementsConversation([
    { role: "user", content: `What courses are in Communication Engineering for ${entrySemester} 2023 entry?` },
  ]);
  assert.equal(communication2023EntryAnswer?.curriculum?.id, "communication-engineering-2023-plan-132-fall-spring");
  assert.equal(communication2023EntryAnswer?.entrySemester, entrySemester.toLowerCase());
  const rendered = renderProgramRequirementsAssessment(communication2023EntryAnswer!, "en");
  assert.match(rendered, new RegExp(`Semester 1 \\(${entrySemester}\\)`));
  assert.doesNotMatch(rendered, new RegExp(`- ${entrySemester === "Fall" ? "Spring" : "Fall"} entry \\(132 credits\\)`));
}
const veterinary2022SourceGap = getPublishedCurriculumVersion("veterinary-medicine", "veterinary-medicine-2022-plan-152-header-149-subtotals")?.curriculum;
assert.ok(veterinary2022SourceGap);
assert.equal(veterinary2022SourceGap.cohortMapping, "unresolved",
  "the Fall-only historical Veterinary Medicine plan must not be auto-assigned without matching student records");
assert.equal(veterinary2022SourceGap.requirements.filter(({ type }) => type === "REQUIRED_COURSE_SET").length, 10,
  "the 2022 Veterinary Medicine PDF's ten semester course sets are now represented");
assert.equal(modeledCreditTotal(veterinary2022SourceGap.requirements), 149,
  "the named courses and student-choice blocks reconcile to the PDF semester subtotals, not its 152-credit header");
const veterinary2022Internship = veterinary2022SourceGap.requirements.find(({ type }) => type === "INTERNSHIP");
assert.ok(veterinary2022Internship?.type === "INTERNSHIP");
assert.equal(veterinary2022Internship.courseCode, "VMED590");
assert.equal(veterinary2022Internship.credits, 9);
assert.match(veterinary2022SourceGap.limitations.join(" "), /semester subtotals sum to 149 credits.*degree-page\/model-plan record states 152/);
const veterinary2022FallRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are in Veterinary Medicine for Fall 2022 entry?" },
]);
assert.equal(veterinary2022FallRequirements?.curriculum?.id, "veterinary-medicine-2022-plan-152-header-149-subtotals");
assert.match(renderProgramRequirementsAssessment(veterinary2022FallRequirements!, "en"), /VMED590.*149.*152/s);
const veterinary2022SpringRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are in Veterinary Medicine for Spring 2022 entry?" },
]);
assert.equal(veterinary2022SpringRequirements?.curriculum, null,
  "the Fall-only 2022 model must not be applied to a Spring entrant");
assert.match(veterinary2022SpringRequirements?.scopeClarification ?? "", /does not establish the Spring-entry course requirements/);
assert.equal(getProgramCurriculum("food-science", 2020)?.curriculum.totalCredits, 120);
const foodModel = getProgramCurriculum("food-science", 2020);
assert.ok(foodModel?.curriculum.requirements[0]?.type === "PATHWAY_CHOICE");
assert.deepEqual(foodModel.curriculum.requirements[0].options.map(({ id }) => id), ["fall-entry", "spring-entry"]);
const foodFallPlan = foodModel.curriculum.requirements[0].options[0];
const foodSpringPlan = foodModel.curriculum.requirements[0].options[1];
assert.equal(foodFallPlan.type, "COMPOSITE");
assert.equal(foodSpringPlan.type, "COMPOSITE");
assert.equal(modeledCreditTotal(foodFallPlan.requirements!), 120, "the published Fall-entry semesters reconcile to 120 credits");
assert.equal(modeledCreditTotal(foodSpringPlan.requirements!), 117, "the Spring semester subtotals are preserved as published and are not padded to the stated 120");
assert.match(foodModel.curriculum.limitations.join(" "), /sum to 117.*GESU121 appears in both semesters 1 and 7/i);
assert.match(foodModel.curriculum.limitations.join(" "), /2026 degree page has a different course list/i);
assert.equal(getPublishedCurriculumVersion("veterinary-medicine", "veterinary-medicine-2022-plan-152-header-149-subtotals")?.curriculum.totalCredits, 152,
  "retain the published header total while exposing the independent 149-credit semester subtotal conflict");
for (const [year, id] of [
  [2024, "veterinary-medicine-2024-plan-175"],
  [2025, "veterinary-medicine-2025-plan-175"],
  [2026, "veterinary-medicine-2026-plan-175"],
] as const) {
  assert.equal(getProgramCurriculum("veterinary-medicine", year), null,
    `Veterinary Medicine's Fall-only ${year} plan is not selected from year alone`);
  const veterinaryRequirements = assessProgramRequirementsConversation([
    { role: "user", content: `What courses are in Veterinary Medicine for Fall ${year} entry?` },
  ]);
  const veterinaryPlan = veterinaryRequirements?.curriculum;
  assert.equal(veterinaryPlan?.id, id, `explicit Fall ${year} entry selects its separately published Veterinary Medicine plan`);
  assert.equal(veterinaryPlan?.totalCredits, 175);
  assert.equal(modeledCreditTotal(veterinaryPlan!.requirements), 175,
    `Veterinary Medicine ${year} named courses and major elective reconcile to 175 credits`);
  assert.equal(veterinaryPlan?.requirements.length, 2);
}
const veterinary2024Courses = getPublishedCurriculumVersion("veterinary-medicine", "veterinary-medicine-2024-plan-175")?.curriculum.requirements[0];
assert.ok(veterinary2024Courses?.type === "REQUIRED_COURSE_SET");
assert.ok(veterinary2024Courses.courseCodes.includes("VMED109"));
assert.ok(!veterinary2024Courses.courseCodes.includes("VMED108"), "the 2024 plan does not borrow the later physiology code");
const veterinary2025Courses = getPublishedCurriculumVersion("veterinary-medicine", "veterinary-medicine-2025-plan-175")?.curriculum.requirements[0];
assert.ok(veterinary2025Courses?.type === "REQUIRED_COURSE_SET");
assert.ok(veterinary2025Courses.courseCodes.includes("GEIT113"));
assert.ok(!veterinary2025Courses.courseCodes.includes("VMED143"), "the 2025 plan does not borrow the 2026 AI course");
const veterinary2026Courses = getPublishedCurriculumVersion("veterinary-medicine", "veterinary-medicine-2026-plan-175")?.curriculum.requirements[0];
assert.ok(veterinary2026Courses?.type === "REQUIRED_COURSE_SET");
assert.ok(veterinary2026Courses.courseCodes.includes("VMED143"));
assert.ok(!veterinary2026Courses.courseCodes.includes("GEIT113"), "the 2026 plan keeps its separately published AI course code");
const statsRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Statistics and Data Analytics?" }]);
assert.ok(statsRequirements?.curriculum);
const statsRequirementsText = renderProgramRequirementsAssessment(statsRequirements, "en");
assert.match(statsRequirementsText, /Statistics concentration electives: choose 2 \(6 credits\) from STAT250, STAT370, STAT410, STAT475/);
assert.match(statsRequirementsText, /Analytics for Business concentration electives: choose 2 \(6 credits\) from BANA410, BANA420, BANA430/);
assert.match(statsRequirementsText, /course names/);
assert.doesNotMatch(statsRequirementsText, /\.\./, "nested concentration requirements render clean punctuation");
const veterinaryRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What are the course requirements for Veterinary Medicine?" }]);
assert.ok(veterinaryRequirements?.curriculum);
const veterinaryRequirementsText = renderProgramRequirementsAssessment(veterinaryRequirements, "en");
assert.match(veterinaryRequirementsText, /VMED500, VMED505, VMED511/);
assert.match(veterinaryRequirementsText, /after all Year 1-4 courses and VMED580 Senior Research Project are complete/i);
assert.match(veterinaryRequirementsText, /must not be double-counted/i);
for (const [id, degree] of [
  ["agricultural-resource-management", "Agricultural Resource Management"],
  ["horticulture", "Horticulture"],
  ["marine-fisheries-and-animal-science", "Marine Fisheries and Animal Science"],
] as const) {
  const credit = assessProgramCreditConversation([{ role: "user", content: `How many credits are required to graduate from ${degree}?` }]);
  assert.equal(credit?.programId, id, `${degree} is identified from the student's wording`);
  assert.equal(credit?.curriculum?.totalCredits, 120);
  assert.match(renderProgramCreditAssessment(credit!, "en"), /120 credit hours/);
  const requirements = assessProgramRequirementsConversation([{ role: "user", content: `What courses are required for ${degree}?` }]);
  assert.equal(requirements?.programId, id, `${degree} requirement question does not resolve to another degree`);
  assert.ok(requirements?.curriculum);
}
const horticultureRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Horticulture?" }]);
assert.match(renderProgramRequirementsAssessment(horticultureRequirements!, "en"), /choose one option/);
const mfassRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Marine Fisheries and Animal Science?" }]);
assert.match(renderProgramRequirementsAssessment(mfassRequirements!, "en"), /select 3 courses/);
const animalScienceConcentrationRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What are the Animal Science concentration elective requirements?" }]);
assert.equal(animalScienceConcentrationRequirements?.programId, "marine-fisheries-and-animal-science");
assert.match(renderProgramRequirementsAssessment(animalScienceConcentrationRequirements!, "en"), /cannot be established safely/);
const foodCredit = assessProgramCreditConversation([{ role: "user", content: "How many credits are in Food Science?" }]);
assert.equal(foodCredit?.curriculum?.totalCredits, 120);
const economicsRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Economics?" }]);
assert.ok(economicsRequirements?.curriculum);
assert.match(renderProgramRequirementsAssessment(economicsRequirements, "en"), /at least 3 credits from each cluster/i,
  "Economics elective cluster minimums survive into the answer");
const entrepreneurshipRequirements = assessProgramRequirementsConversation([{ role: "user", content: "What courses are required for Entrepreneurship?" }]);
assert.ok(entrepreneurshipRequirements?.curriculum);
assert.match(renderProgramRequirementsAssessment(entrepreneurshipRequirements, "en"), /GPA above 2\.0, at least 76 completed credits, and GEIE222 completed with minimum grade D/i,
  "the ENTR415 registration gate remains visible with its course requirement");
const earlyChildhoodCohortAudit = assessDegreeAuditConversation([
  { role: "user", content: "I entered Early Childhood Education in the 2025 cohort." },
  { role: "assistant", content: "What would you like to audit?" },
  { role: "user", content: "What do I still need to graduate?" },
]);
assert.equal(earlyChildhoodCohortAudit?.auditStatus, "COHORT_ENTRY_TERM_REQUIRED", "a Fall-only plan must ask for the student's entry semester instead of guessing from year");
assert.equal(earlyChildhoodCohortAudit?.curriculumVersion, "early-childhood-education-2025-120-plan-only");
assert.match(renderDegreeAuditAssessment(earlyChildhoodCohortAudit!, "en"), /specifically for Fall-entry students.*Did you start in Fall or Spring/i);
const earlyChildhoodFallAudit = assessDegreeAuditConversation([
  { role: "user", content: "I entered Early Childhood Education in the 2025 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2025. I passed CURR101 with B. What do I still need to graduate?" },
]);
assert.equal(earlyChildhoodFallAudit?.auditStatus, "PRELIMINARY", "an explicit Fall entry term may select the corresponding published plan for a preliminary comparison");
assert.equal(earlyChildhoodFallAudit?.curriculumVersion, "early-childhood-education-2025-120-plan-only");
assert.equal(earlyChildhoodFallAudit?.courseStatus.CURR101, "COMPLETE");
assert.ok(earlyChildhoodFallAudit?.creditBlocksNotAssessed.includes("Unspecified General Education theme choices"));
assert.match(renderDegreeAuditAssessment(earlyChildhoodFallAudit!, "en"), /not an official degree audit/i);
assert.equal(modeledCreditTotal(getPublishedCurriculumVersion("early-childhood-education", "early-childhood-education-2025-120-plan-only")!.curriculum.requirements), 120,
  "Early Childhood named courses, internship and unspecified choices reconcile to the published total");
const healthPe2025Plan = getPublishedCurriculumVersion("health-and-physical-education", "health-and-physical-education-2025-120-plan-only");
assert.ok(healthPe2025Plan, "the Fall-entry 2025-2026 Health and Physical Education plan is separately selectable");
assert.equal(healthPe2025Plan.curriculum.cohortMapping, "unresolved");
assert.equal(modeledCreditTotal(healthPe2025Plan.curriculum.requirements), 120,
  "Health and Physical Education named courses, student-teaching internship and unspecified choices reconcile to the published total");
assert.ok(healthPe2025Plan.curriculum.requirements.some((item) => item.type === "INTERNSHIP" && item.courseCode === "PHED409" && item.credits === 9 && item.finalSemesterOnly));
assert.equal(healthPe2025Plan.curriculum.requirements.filter((item) => item.type === "CREDIT_BLOCK").reduce((sum, item) => sum + item.credits, 0), 21);
const healthPeFallRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Health and Physical Education in the 2025 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2025. Which courses are required?" },
]);
assert.equal(healthPeFallRequirements?.curriculum?.id, "health-and-physical-education-2025-120-plan-only");
assert.match(renderProgramRequirementsAssessment(healthPeFallRequirements!, "en"), /PHED409/);
const healthPe2020Plan = getPublishedCurriculumVersion("health-and-physical-education", "health-and-physical-education-2020-126");
const healthPe2022Plan = getPublishedCurriculumVersion("health-and-physical-education", "health-and-physical-education-2022-126");
assert.ok(healthPe2020Plan && healthPe2022Plan, "the Fall-entry 2020-2021 and 2022-2023 historical plans are separately modeled");
assert.equal(healthPe2020Plan.curriculum.cohortMapping, "unresolved");
assert.equal(healthPe2022Plan.curriculum.cohortMapping, "unresolved");
assert.equal(modeledCreditTotal(healthPe2020Plan.curriculum.requirements), 126);
assert.equal(modeledCreditTotal(healthPe2022Plan.curriculum.requirements), 126);
assert.deepEqual(healthPe2020Plan.curriculum.requirements.find((item) => item.id === "hpe-2020-islamic-course")?.type, "REQUIRED_COURSE_SET");
assert.deepEqual(healthPe2022Plan.curriculum.requirements.find((item) => item.id === "hpe-2022-islamic-choice")?.type, "ONE_OF_GROUP");
assert.equal(healthPe2020Plan.curriculum.effectiveTo, "2022-07-31");
assert.equal(healthPe2022Plan.curriculum.effectiveFrom, "2022-08-01");
const healthPe2020Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Health and Physical Education in the 2020 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2020. Which courses are required?" },
]);
assert.equal(healthPe2020Requirements?.curriculum?.id, "health-and-physical-education-2020-126");
const healthPe2022Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Health and Physical Education in the 2022 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2022. Which courses are required?" },
]);
assert.equal(healthPe2022Requirements?.curriculum?.id, "health-and-physical-education-2022-126");
assert.match(renderProgramRequirementsAssessment(healthPe2022Requirements!, "en"), /ISLM100 or ISLM101/);
const specialEducation2025Plan = getPublishedCurriculumVersion("special-education", "special-education-2025-120-plan-only");
assert.ok(specialEducation2025Plan, "the Fall-entry 2025-2026 Special Education model plan is separately selectable");
assert.equal(modeledCreditTotal(specialEducation2025Plan.curriculum.requirements), 120,
  "Special Education named courses, concentration-specific plan options and choice blocks reconcile to the published total");
const specialEducation2025Path = specialEducation2025Plan.curriculum.requirements.find((item) => item.id === "special-education-2025-concentration-plan");
assert.ok(specialEducation2025Path?.type === "PATHWAY_CHOICE");
for (const option of specialEducation2025Path.options) {
  assert.equal(option.type, "COMPOSITE");
  const optionRequirements = option.requirements ?? [];
  const credits = modeledCreditTotal(optionRequirements);
  assert.equal(option.credits, 30, `${option.name} 30-credit path-specific course set reconciles using published catalog credits`);
  assert.equal(credits, 30, `${option.name} listed model-plan courses sum to 30 credits`);
}
const sensoryPlanOption = specialEducation2025Path.options.find((option) => option.id === "sensory-impairments");
assert.ok(sensoryPlanOption?.type === "COMPOSITE");
assert.ok(sensoryPlanOption.requirements?.some((item) => item.type === "CREDIT_BLOCK" && /duplicates SPED321/.test(item.name)),
  "the duplicate SPED321 listing in the source PDF is preserved as a flagged 3-credit ambiguity");
assert.match(sensoryPlanOption.selectionNote ?? "", /SPED312 Individuals with Mild\/Moderate Disabilities/);
const specialEducationFallRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Special Education in the 2025 cohort." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2025, Sensory Impairments concentration. Which courses are on that model plan?" },
]);
assert.equal(specialEducationFallRequirements?.curriculum?.id, "special-education-2025-120-plan-only");
assert.match(renderProgramRequirementsAssessment(specialEducationFallRequirements!, "en"), /SPED542.*SPED562/s);
assert.match(renderProgramRequirementsAssessment(specialEducationFallRequirements!, "en"), /SPED321 in both semesters 3 and 5/);
for (const [year, id] of [[2020, "special-education-2020-126"], [2022, "special-education-2022-126"]] as const) {
  const plan = getPublishedCurriculumVersion("special-education", id);
  assert.ok(plan, `the published ${year} Special Education plan is separately modeled`);
  assert.equal(plan.curriculum.totalCredits, 126);
  assert.equal(modeledCreditTotal(plan.curriculum.requirements), 126,
    `${year} Special Education requirement groups reconcile to 126 credits`);
  assert.equal(plan.curriculum.cohortMapping, "unresolved",
    `${year} cohort label does not establish an individual student's Degree Works assignment`);
  const path = plan.curriculum.requirements.find((item) => item.type === "PATHWAY_CHOICE");
  assert.ok(path?.type === "PATHWAY_CHOICE");
  assert.deepEqual(path.options.map((option) => option.id), [
    "gifted-and-talented", "mild-moderate-disabilities", "sensory-impairments", "severe-disabilities",
  ]);
  for (const option of path.options) {
    assert.equal(option.credits, 21);
    assert.equal(modeledCreditTotal(option.requirements ?? []), 21,
      `${year} ${option.name} concentration, capstone, and internship reconcile`);
  }
  assert.ok(plan.curriculum.requirements.some((item) => item.type === "CREDIT_BLOCK" && item.name.includes("General Education")),
    `${year} unselected General Education choices are not invented as completed named courses`);
}
assert.equal(fallEntryCurriculumForYear("special-education", 2020)?.curriculum.id, "special-education-2020-126");
assert.equal(fallEntryCurriculumForYear("special-education", 2022)?.curriculum.id, "special-education-2022-126");
const specialEducation2022Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Special Education in 2022." },
  { role: "assistant", content: "Did you start in Fall or Spring?" },
  { role: "user", content: "Fall 2022, Gifted and Talented concentration. Which courses are in the published plan?" },
]);
assert.equal(specialEducation2022Requirements?.curriculum?.id, "special-education-2022-126");
assert.match(renderProgramRequirementsAssessment(specialEducation2022Requirements!, "en"), /SPED331.*SPED326.*SPED416/s);
assert.match(renderProgramRequirementsAssessment(specialEducation2022Requirements!, "en"), /SPED544.*SPED564/s);
const computerScienceGradeAudit = assessDegreeAuditConversation([
  { role: "user", content: "I entered Psychology in the 2025 cohort." },
  { role: "user", content: "I am a Psychology student." },
  { role: "user", content: "I received 59 in PSYC100. I got a D in PSYC200. I received W in PSYC201." },
  { role: "user", content: "What do I still need to graduate?" },
]);
assert.equal(computerScienceGradeAudit?.courseStatus.PSYC100, "REPEAT_REQUIRED",
  "a numeric mark below the published 60-point pass threshold is not counted as a completed course in a program covered by the general undergraduate grading policy");
assert.equal(computerScienceGradeAudit?.courseStatus.PSYC200, "COMPLETE",
  "a recognized passing letter grade remains complete in a program covered by the general undergraduate grading policy");
assert.equal(computerScienceGradeAudit?.courseStatus.PSYC201, "NEEDS_CONFIRMATION",
  "withdrawal is not interpreted as a completed course");
assert.match(renderDegreeAuditAssessment(computerScienceGradeAudit!, "en"), /repeat required: PSYC100/i,
  "the preliminary audit explains why a below-threshold course remains outstanding");
const missingDegreeAuditCohort = assessDegreeAuditConversation([
  { role: "user", content: "I am a Computer Science student." },
  { role: "user", content: "I passed CSBP119 with a C. What do I still need to graduate?" },
]);
assert.equal(missingDegreeAuditCohort?.auditStatus, "COHORT_YEAR_REQUIRED",
  "a preliminary course comparison must not apply the newest model when the student's cohort is unknown");
assert.equal(missingDegreeAuditCohort?.courseGroups.length, 0,
  "do not disclose a guessed remaining-course list before selecting the applicable cohort");
assert.match(renderDegreeAuditAssessment(missingDegreeAuditCohort!, "en"), /what year did you enter UAEU/i);
const dieteticsGradeAudit = assessDegreeAuditConversation([
  { role: "user", content: "I am a Dietetics student." },
  { role: "user", content: "I received 59 in NUTR101." },
  { role: "user", content: "What do I still need to graduate?" },
]);
assert.equal(dieteticsGradeAudit?.auditStatus, "COHORT_YEAR_REQUIRED",
  "do not assess a College of Medicine and Health Sciences student against the current page without knowing cohort applicability");
const translationAuditCurriculum = getProgramCurriculum("translation-studies", 2026);
assert.ok(translationAuditCurriculum?.cohortMatched, "the all-requirement audit fixture must use a verified cohort mapping");
const translationAuditMessages = [
  { role: "user" as const, content: "I am a Translation Studies student and entered in the 2026 cohort." },
  ...[...collectAuditFixtureCourses(translationAuditCurriculum.curriculum.requirements)].map((code) => ({ role: "user" as const, content: `I passed ${code} with a B.` })),
  { role: "user" as const, content: "What do I still need to graduate?" },
];
const translationAudit = assessDegreeAuditConversation(translationAuditMessages);
assert.equal(translationAudit?.auditStatus, "PRELIMINARY");
assert.equal(translationAudit?.cohortMatched, true);
assert.deepEqual(new Set(translationAudit?.courseGroups.map(({ requirementType }) => requirementType)),
  new Set(["REQUIRED_COURSE_SET", "ELECTIVE_GROUP", "INTERNSHIP", "PATHWAY_CHOICE", "CREDIT_BLOCK"]),
  "the cohort-matched audit fixture exercises required, elective, internship, pathway, and credit-block rules");
for (const type of ["REQUIRED_COURSE_SET", "ELECTIVE_GROUP", "INTERNSHIP", "PATHWAY_CHOICE"] as const) {
  const groups = translationAudit?.courseGroups.filter(({ requirementType }) => requirementType === type) ?? [];
  assert.ok(groups.length > 0 && groups.every(({ status }) => status === "COMPLETE"),
    `reported passing grades complete the modeled ${type} requirements in the fixture`);
}
assert.ok(translationAudit?.creditBlocksNotAssessed.length, "credit-only requirements are explicitly excluded from course-code auditing");
const geographyAuditCurriculum = getProgramCurriculum("geography", 2026);
assert.ok(geographyAuditCurriculum?.cohortMatched);
const geographyAudit = assessDegreeAuditConversation([
  { role: "user", content: "I am a Geography student and entered in the 2026 cohort." },
  ...[...collectAuditFixtureCourses(geographyAuditCurriculum.curriculum.requirements)].map((code) => ({ role: "user" as const, content: `I passed ${code} with a B.` })),
  { role: "user", content: "What do I still need to graduate?" },
]);
assert.ok(geographyAudit?.courseGroups.some(({ requirementType, status }) => requirementType === "PATHWAY_CHOICE" && status === "NOT_ASSESSED"),
  "nested composite pathways remain unassessed rather than being assumed complete");
const cybersecurityAuditCurriculum = getProgramCurriculum("cybersecurity", 2026);
assert.equal(cybersecurityAuditCurriculum, null, "Fall-only Cybersecurity plan requires entry-term evidence");
const cybersecurityFallCurriculum = fallEntryCurriculumForYear("cybersecurity", 2026);
assert.ok(cybersecurityFallCurriculum?.curriculum);
const cybersecurityAudit = assessDegreeAuditConversation([
  { role: "user", content: "I am a Cybersecurity student and entered in Fall 2026." },
  ...[...collectAuditFixtureCourses(cybersecurityFallCurriculum.curriculum.requirements)].map((code) => ({ role: "user" as const, content: `I passed ${code} with a B.` })),
  { role: "user", content: "What do I still need to graduate?" },
]);
assert.ok(cybersecurityAudit?.courseGroups.some(({ requirementType }) => requirementType === "ONE_OF_GROUP"),
  "the cohort-matched audit fixture exercises one-of choice groups");
assert.ok(cybersecurityAudit?.courseGroups.filter(({ requirementType }) => requirementType === "ONE_OF_GROUP")
  .every(({ status }) => status === "COMPLETE"), "reported passing grades satisfy the supported one-of course choice groups");
for (const [programId, requirementId, expectedCredits] of [
  ["aerospace-engineering", "aerospace-core", 68],
  ["petroleum-engineering", "petroleum-major", 65],
  ["accounting", "accounting-supporting", 30],
  ["accounting", "accounting-major", 27],
  ["finance-and-banking", "finance-supporting", 24],
  ["finance-and-banking", "finance-major", 24],
  ["early-childhood-education", "early-childhood-core", 57],
  ["early-childhood-education", "early-childhood-supporting", 30],
  ["health-and-physical-education", "hpe-major", 39],
  ["special-education", "special-education-major", 30],
  ["special-education", "special-education-supporting", 24],
  ["economics", "economics-supporting", 30],
  ["economics", "economics-major", 30],
  ["entrepreneurship", "entrepreneurship-learning-in-action", 12],
  ["human-resources-management-and-development", "hrmd-major", 30],
  ["human-resources-management-and-development", "hrmd-supporting", 30],
  ["supply-chain-management-and-logistics", "scml-major", 30],
  ["supply-chain-management-and-logistics", "scml-supporting", 30],
  ["entrepreneurship", "entrepreneurship-major", 30],
  ["entrepreneurship", "entrepreneurship-supporting", 30],
  ["arabic-language-and-literature", "arabic-language-and-literature-major", 51],
  ["visual-studies-and-creative-industries", "visual-studies-core", 54],
  ["geography", "geography-core", 24],
  ["applied-sociology-and-social-data-analytics", "applied-sociology-core", 48],
  ["doctor-of-medicine", "doctor-of-medicine-major", 212],
] as const) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled);
  const group = modeled.curriculum.requirements.find((item) => item.id === requirementId);
  assert.ok(group && (group.type === "REQUIRED_COURSE_SET" || group.type === "ELECTIVE_GROUP"));
  const listedCredits = group.courseCodes.reduce((sum, code) => sum + (officialCourseCredits.get(code) ?? 0), 0);
  assert.equal(listedCredits, expectedCredits, `${programId} course rows sum to the published ${expectedCredits}-credit requirement`);
}
for (const [programId, requirementId] of [
  ["economics", "economics-cluster-electives"],
  ["human-resources-management-and-development", "hrmd-business-electives"],
  ["supply-chain-management-and-logistics", "scml-business-electives"],
  ["entrepreneurship", "entrepreneurship-business-electives"],
] as const) {
  const modeled = getProgramCurriculum(programId);
  const electives = modeled?.curriculum.requirements.find((item) => item.id === requirementId);
  assert.ok(electives?.type === "ELECTIVE_GROUP");
  assert.equal(electives.chooseCount, 3);
  assert.equal(electives.credits, 9);
  assert.ok(electives.courseCodes.every((code) => officialCourseCredits.get(code) === 3), `${programId} elective choices each carry 3 credits`);
}
const economicsElectives = getProgramCurriculum("economics")?.curriculum.requirements.find((item) => item.id === "economics-cluster-electives");
assert.ok(economicsElectives?.type === "ELECTIVE_GROUP");
assert.match(economicsElectives.selectionNote ?? "", /at least 3 credits from each cluster/i);
for (const [programId, requirementId, expectedCredits] of [
  ["accounting", "accounting-learning-in-action", 12],
  ["finance-and-banking", "finance-learning-in-action", 12],
  ["economics", "economics-learning-in-action", 12],
  ["human-resources-management-and-development", "hrmd-learning-in-action", 12],
  ["supply-chain-management-and-logistics", "scml-learning-in-action", 12],
  ["accounting", "accounting-track", 12],
  ["finance-and-banking", "finance-concentration", 15],
  ["special-education", "special-education-concentrations", 21],
] as const) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled);
  const pathway = modeled.curriculum.requirements.find((item) => item.id === requirementId);
  assert.ok(pathway?.type === "PATHWAY_CHOICE");
  for (const option of pathway.options) {
    const listedCredits = option.courseCodes.reduce((sum, code) => sum + (officialCourseCredits.get(code) ?? 0), 0);
    assert.equal(option.credits, expectedCredits);
    assert.equal(listedCredits, expectedCredits, `${programId} ${option.name} courses sum to ${expectedCredits} credits`);
  }
}
const hpeCurriculum = getProgramCurriculum("health-and-physical-education");
assert.ok(hpeCurriculum);
const hpeInternship = hpeCurriculum.curriculum.requirements.find((item) => item.id === "hpe-student-teaching");
assert.ok(hpeInternship?.type === "INTERNSHIP");
assert.equal(hpeInternship.credits, 9);
for (const programId of ["cybersecurity", "data-science-and-artificial-intelligence", "electrical-engineering", "chemical-engineering", "civil-engineering", "aerospace-engineering", "petroleum-engineering", "accounting", "finance-and-banking", "early-childhood-education", "health-and-physical-education", "special-education", "economics", "human-resources-management-and-development", "supply-chain-management-and-logistics", "entrepreneurship", "marketing", "statistics-and-data-analytics", "architectural-engineering", "communication-engineering", "food-science", "veterinary-medicine", "agricultural-resource-management", "horticulture", "marine-fisheries-and-animal-science", "law", "nutritional-science", "dietetics", "speech-language-pathology"]) {
  const modeled = getProgramCurriculum(programId);
  assert.ok(modeled);
  for (const requirement of modeled.curriculum.requirements) {
    const codes = requirement.type === "REQUIRED_COURSE_SET" || requirement.type === "ONE_OF_GROUP" || requirement.type === "ELECTIVE_GROUP"
      ? requirement.courseCodes
      : requirement.type === "INTERNSHIP" ? [requirement.courseCode]
        : requirement.type === "PATHWAY_CHOICE" ? requirement.options.flatMap(({ courseCodes }) => courseCodes) : [];
    for (const code of codes) {
      const sourceListedZeroCreditInternship = (programId === "electrical-engineering" || programId === "communication-engineering") && code === "ELEC490";
      const historicalHorticulturePdfCode = programId === "horticulture" && ["BIOL215", "BIOL225", "BIOL270"].includes(code);
      assert.ok(officialCourseCodes.has(code) || sourceListedZeroCreditInternship || historicalHorticulturePdfCode,
        `${programId} requirement ${requirement.id} references a catalog course or an explicitly disclosed historical/source-only code: ${code}`);
    }
  }
}
assert.equal(getProgramCurriculum("petroleum-engineering", 2022), null,
  "overlapping Petroleum Engineering 'cohort onwards' source labels do not auto-assign an individual cohort");
const petroleum2022 = getPublishedCurriculumVersion("petroleum-engineering", "petroleum-engineering-2022-plan-147")?.curriculum;
assert.ok(petroleum2022);
assert.equal(petroleum2022.requirements.length, 1, "the older Petroleum plan preserves the two separately published entry sequences");
assert.equal(modeledCreditTotal(petroleum2022.requirements), 147,
  "both source-backed 2022 entry sequences reconcile to the published 147-credit total");
const petroleum2022Pathways = petroleum2022.requirements[0];
assert.ok(petroleum2022Pathways.type === "PATHWAY_CHOICE");
assert.deepEqual(petroleum2022Pathways.options.map(({ id }) => id), ["fall-entry", "spring-entry"]);
for (const [index, option] of petroleum2022Pathways.options.entries()) {
  assert.equal(option.type, "COMPOSITE");
  assert.equal(option.credits, 147);
  assert.equal(option.requirements?.filter(({ type }) => type === "REQUIRED_COURSE_SET").length, 8,
    `${option.name} preserves its eight named academic semesters`);
  const publishedSemesterCredits = option.requirements
    ?.filter((requirement) => requirement.type === "REQUIRED_COURSE_SET")
    .map((requirement) => Number(requirement.name.match(/ - (\d+) credits$/)?.[1]));
  assert.ok(publishedSemesterCredits?.every(Number.isFinite));
  assert.equal(publishedSemesterCredits!.reduce((sum, credits) => sum + credits, 0) + 15, 147,
    `${option.name} preserves the PDF's eight semester subtotals plus 15-credit internship`);
  assert.equal(option.requirements?.filter(({ type }) => type === "INTERNSHIP").length, 1);
  const internship = option.requirements?.find(({ type }) => type === "INTERNSHIP");
  assert.ok(internship?.type === "INTERNSHIP");
  assert.equal(internship.courseCode, "PETE495");
  assert.equal(internship.credits, 15);
  assert.equal(internship.finalSemesterOnly, true);
  assert.ok(option.courseCodes.includes("MATH130"), "the source's MATH1110/130 pair is indexed using its later code label");
  assert.ok(option.courseCodes.includes("ISLM100") && option.courseCodes.includes("ISLM101"), "both source-listed Islamic Culture/Sira codes are retained");
  assert.match(option.requirements?.map(({ name }) => name).join(" ") ?? "", index === 0 ? /Semester 1 \(Fall\).*Semester 8 \(Spring\)/s : /Semester 1 \(Spring\).*Semester 8 \(Fall\)/s);
}
assert.match(petroleum2022.limitations.join(" "), /MATH1110\/130.*ISLM100\/ISLM101/);
assert.match(petroleum2022.limitations.join(" "), /Spring-entry semester 7.*no course-type label/);
assert.equal(getProgramCurriculum("petroleum-engineering", 2022), null,
  "conflicting 'cohort onwards' labels do not silently assign the 2022 plan by year");
for (const entrySemester of ["fall", "spring"] as const) {
  const sourceRequirements = getPublishedCurriculumVersion("petroleum-engineering", "petroleum-engineering-2022-plan-147")?.curriculum.requirements[0];
  assert.ok(sourceRequirements?.type === "PATHWAY_CHOICE");
  const sourceEntryOption = sourceRequirements.options.find((option) => option.id === `${entrySemester}-entry`);
  assert.ok(sourceEntryOption, `the published 2022 ${entrySemester}-entry schedule remains available as source evidence`);
  assert.match(sourceEntryOption.requirements?.map((item) => item.name).join(" ") ?? "", /Semester 1/);
}
const petroleum2022UnspecifiedEntry = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are listed in the Petroleum Engineering 2022 cohort model plan?" },
]);
assert.equal(petroleum2022UnspecifiedEntry?.curriculum, null,
  "a year mention does not resolve the overlapping Petroleum source scopes");
const petroleum2023 = getPublishedCurriculumVersion("petroleum-engineering", "petroleum-engineering-2023-plan-132")?.curriculum;
assert.ok(petroleum2023);
assert.equal(petroleum2023.requirements.length, 5,
  "the 2023–2024 plan models named required courses, elective credit blocks, and both internships");
assert.equal(modeledCreditTotal(petroleum2023.requirements), 132,
  "the source-backed 2023–2024 course and elective model reconciles to its published total");
const petroleum2023Required = petroleum2023.requirements.find(({ id }) => id === "petroleum-2023-required-courses");
assert.deepEqual(petroleum2023Required?.type === "REQUIRED_COURSE_SET"
  ? petroleum2023Required.courseCodes.filter((code) => ["MATH130", "MATH135", "MATH105", "MATH110", "MATH210"].includes(code))
  : [], ["MATH130", "MATH135"], "the older Petroleum plan retains its own calculus course codes");
const petroleum2023Answer = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Petroleum Engineering in Fall 2023. What courses are required for my degree?" },
]);
assert.equal(petroleum2023Answer?.curriculum, null,
  "entry term cannot resolve the overlapping official 'onwards' cohort labels by itself");
assert.match(petroleum2023.limitations.join(" "), /semester order/,
  "the combined Fall/Spring model discloses that semester placement is not represented");
assert.equal(petroleum2023.creditBuckets, undefined,
  "do not apply unverified later credit-category splits to the 2023–2024 plan");
const petroleum2025 = getPublishedCurriculumVersion("petroleum-engineering", "petroleum-engineering-2025-plan-132")?.curriculum;
assert.ok(petroleum2025);
assert.equal(petroleum2025.requirements.length, 5,
  "the 2025–2026 plan has its own source-backed course set, General Education block, major-elective block and internships");
assert.equal(modeledCreditTotal(petroleum2025.requirements), 132,
  "the independently summed 2025–2026 requirement model reconciles to its published total");
const petroleum2025Required = petroleum2025.requirements.find(({ id }) => id === "petroleum-2025-required-courses");
assert.deepEqual(petroleum2025Required?.type === "REQUIRED_COURSE_SET" ? petroleum2025Required.courseCodes.filter((code) => ["MATH130", "MATH135", "MATH105", "MATH110", "MATH210"].includes(code)) : [],
  ["MATH130", "MATH135"], "the 2025–2026 math sequence remains separate from both the old 2023–2024 and new 2026–2027 versions");
const petroleum2025Answer = assessProgramRequirementsConversation([{ role: "user", content: "I entered Petroleum Engineering in Fall 2025. What courses are required for my degree?" }]);
assert.equal(petroleum2025Answer?.curriculum, null,
  "the explicitly named Fall term still cannot resolve the overlapping cohort-onwards labels");
const petroleum2026 = getPublishedCurriculumVersion("petroleum-engineering", "petroleum-engineering-2026-plan-132")?.curriculum;
assert.equal(petroleum2026?.id, "petroleum-engineering-2026-plan-132");
assert.equal(petroleum2026?.totalCredits, 132);
const petroleum2026College = petroleum2026?.requirements.find(({ id }) => id === "petroleum-college");
assert.deepEqual(petroleum2026College?.type === "REQUIRED_COURSE_SET"
  ? petroleum2026College.courseCodes.filter((code) => ["MATH105", "MATH110", "MATH210"].includes(code))
  : [], ["MATH105", "MATH110", "MATH210"],
  "the structured Petroleum sequence containing MATH105/110/210 applies only to the 2026–2027 version");
assert.equal(petroleum2026College?.type === "REQUIRED_COURSE_SET" && petroleum2026College.courseCodes.includes("MATH130"), false,
  "the 2025–2026 calculus codes are not mixed into the 2026–2027 sequence");

const arm = getProgramCurriculum("agricultural-resource-management");
assert.ok(arm);
assert.equal(arm.curriculum.totalCredits, 120);
assert.deepEqual(arm.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 12, 59, 4, 18, 6]);
assert.equal(getProgramCurriculum("agricultural-resource-management", 2020), null,
  "the linked model-plan PDF does not establish a 2020 entry-cohort curriculum");
const arm2022 = getProgramCurriculum("agricultural-resource-management", 2022)?.curriculum;
assert.equal(arm2022?.id, "arm-2022-model-plan");
assert.equal(arm2022?.requirements[0]?.type, "PATHWAY_CHOICE");
if (arm2022?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.deepEqual(arm2022.requirements[0].options.map(({ id }) => id), ["fall-entry", "spring-entry"]);
  assert.ok(arm2022.requirements[0].options.every((option) => option.type === "COMPOSITE"));
  for (const option of arm2022.requirements[0].options) {
    assert.equal(modeledCreditTotal(option.requirements!), 120, `2022 ${option.id} schedule reconciles to 120 credits`);
  }
}
const arm2025 = getProgramCurriculum("agricultural-resource-management", 2025)?.curriculum;
assert.equal(arm2025?.id, "arm-2025-model-plan");
assert.equal(arm2025?.requirements[0]?.type, "PATHWAY_CHOICE");
if (arm2025?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.deepEqual(arm2025.requirements[0].options.map(({ id }) => id), ["fall-entry", "spring-entry"]);
  for (const option of arm2025.requirements[0].options) {
    assert.equal(modeledCreditTotal(option.requirements!), 120, `2025 ${option.id} schedule reconciles to 120 credits`);
  }
}
assert.match(arm.curriculum.limitations.join(" "), /displayed coded Agribusiness rows sum to 53 credits/);

const horticulture = getProgramCurriculum("horticulture");
assert.ok(horticulture);
assert.equal(horticulture.curriculum.totalCredits, 120);
assert.deepEqual(horticulture.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 12, 45, 3, 21, 12, 6]);
const horticulturePathways = horticulture.curriculum.requirements.find((item) => item.id === "horticulture-concentration");
assert.ok(horticulturePathways?.type === "PATHWAY_CHOICE");
assert.equal(horticulturePathways.options.length, 2);
assert.ok(horticulturePathways.options.every((option) => option.credits === 21));
const horticulture2022 = getProgramCurriculum("horticulture", 2022)?.curriculum;
assert.equal(horticulture2022?.id, "horticulture-2022-model-plans");
assert.equal(horticulture2022?.requirements[0]?.type, "PATHWAY_CHOICE");
if (horticulture2022?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.deepEqual(horticulture2022.requirements[0].options.map(({ id }) => id), [
    "fall-crop-production", "spring-crop-production", "fall-environment-horticulture", "spring-environment-horticulture",
  ]);
  assert.ok(horticulture2022.requirements[0].options.every(({ credits }) => credits === 120));
}
const horticulture2025 = getProgramCurriculum("horticulture", 2025)?.curriculum;
assert.equal(horticulture2025?.id, "horticulture-2025-model-plans");
assert.equal(horticulture2025?.requirements[0]?.type, "PATHWAY_CHOICE");
if (horticulture2025?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.deepEqual(horticulture2025.requirements[0].options.map(({ id }) => id), ["environment-horticulture", "crop-production-organic-farming"]);
  assert.ok(horticulture2025.requirements[0].options.every(({ credits }) => credits === 120));
  assert.ok(horticulture2025.requirements[0].options.every(({ courseCodes }) => courseCodes.includes("CHEM283") && !courseCodes.includes("FDSC285")));
}
const horticulture2026 = getProgramCurriculum("horticulture", 2026)?.curriculum;
assert.equal(horticulture2026?.id, "horticulture-2026-model-plans");
assert.equal(horticulture2026?.requirements[0]?.type, "PATHWAY_CHOICE");
if (horticulture2026?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.ok(horticulture2026.requirements[0].options.every(({ courseCodes }) => courseCodes.includes("FDSC285") && !courseCodes.includes("CHEM283")));
}
assert.match(horticulture2022?.limitations.join(" ") ?? "", /BIOL215, BIOL225, and BIOL270/);
assert.match(horticulture2025?.limitations.join(" ") ?? "", /MATH105/);

const marineFisheries = getProgramCurriculum("marine-fisheries-and-animal-science");
assert.ok(marineFisheries);
assert.equal(marineFisheries.curriculum.totalCredits, 120);
assert.deepEqual(marineFisheries.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 12, 45, 3, 21, 12, 6]);
assert.match(marineFisheries.curriculum.limitations.join(" "), /displayed coded rows total 42 credits/);
assert.match(marineFisheries.curriculum.limitations.join(" "), /select 3 courses/);
const mfass2022 = getProgramCurriculum("marine-fisheries-and-animal-science", 2022)?.curriculum;
assert.equal(mfass2022?.id, "mfass-2022-model-plans");
assert.equal(mfass2022?.requirements[0]?.type, "PATHWAY_CHOICE");
if (mfass2022?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.deepEqual(mfass2022.requirements[0].options.map(({ id }) => id), ["fall-marine", "spring-marine", "fall-animal", "spring-animal"]);
  assert.ok(mfass2022.requirements[0].options.every(({ credits }) => credits === 120));
}
const mfass2025 = getProgramCurriculum("marine-fisheries-and-animal-science", 2025)?.curriculum;
assert.equal(mfass2025?.id, "mfass-2025-model-plans");
assert.equal(mfass2025?.requirements[0]?.type, "PATHWAY_CHOICE");
if (mfass2025?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.deepEqual(mfass2025.requirements[0].options.map(({ id }) => id), ["marine-fisheries", "animal-science"]);
  assert.ok(mfass2025.requirements[0].options.every(({ courseCodes }) => courseCodes.includes("CHEM283") && !courseCodes.includes("FDSC285")));
}
const mfass2026 = getProgramCurriculum("marine-fisheries-and-animal-science", 2026)?.curriculum;
assert.equal(mfass2026?.id, "mfass-2026-model-plans");
assert.equal(mfass2026?.requirements[0]?.type, "PATHWAY_CHOICE");
if (mfass2026?.requirements[0]?.type === "PATHWAY_CHOICE") {
  assert.ok(mfass2026.requirements[0].options.every(({ courseCodes }) => courseCodes.includes("FDSC285") && !courseCodes.includes("CHEM283")));
}
assert.match(mfass2022?.limitations.join(" ") ?? "", /not the previously recorded 2020/);
assert.match(mfass2026?.limitations.join(" ") ?? "", /BIOL270/);
const mfassCombinedQuestion = [
  { role: "user" as const, content: "For the 2026-2027 Marine Fisheries and Animal Science plan, what are the two concentration options and published total credits?" },
];
assert.equal(assessProgramCreditConversation(mfassCombinedQuestion), null,
  "a total-plus-concentration question must be handled by the requirements answer, not short-circuited by the credit-only route");
const mfassCombinedAssessment = assessProgramRequirementsConversation(mfassCombinedQuestion);
assert.equal(mfassCombinedAssessment?.curriculum?.id, "mfass-2026-model-plans",
  "an explicit academic-year plan label must select its matching published curriculum version");
const mfassCombinedAnswer = renderProgramRequirementsAssessment(mfassCombinedAssessment!, "en");
assert.match(mfassCombinedAnswer, /120 total credits/);
assert.match(mfassCombinedAnswer, /Marine Fisheries and Animal Science \(120 credits\)/);
assert.match(mfassCombinedAnswer, /Animal Science \(120 credits\)/);
const mfassPlanQuestion = assessProgramRequirementsConversation([
  { role: "user", content: "Which concentration options are listed in the UAEU Marine Fisheries and Animal Science 2026-2027 model study plan?" },
]);
assert.equal(mfassPlanQuestion?.curriculum?.id, "mfass-2026-model-plans");
const cybersecurityAssessment = assessProgramCreditConversation([
  { role: "user", content: "How many credits do I need to graduate from Cybersecurity?" },
]);
assert.ok(cybersecurityAssessment);
assert.equal(cybersecurityAssessment.programId, "cybersecurity");
assert.match(renderProgramCreditAssessment(cybersecurityAssessment, "en"), /curriculum requires \*\*120 credit hours\*\*/);
assert.match(JSON.stringify(cybersecurityAssessment.sources), /bachelor-of-science-in-cybersecurity/);
const cybersecurityRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I am in Cybersecurity." },
  { role: "assistant", content: "What would you like to know?" },
  { role: "user", content: "Which courses are required?" },
]);
assert.ok(cybersecurityRequirements);
assert.match(renderProgramRequirementsAssessment(cybersecurityRequirements, "en"), /ISEC313/);
assert.match(renderProgramRequirementsAssessment(cybersecurityRequirements, "en"), /ITBP496/);
const dsaiAssessment = assessProgramCreditConversation([
  { role: "user", content: "How many credits to graduate in Data Science and Artificial Intelligence?" },
]);
assert.ok(dsaiAssessment);
assert.equal(dsaiAssessment.programId, "data-science-and-artificial-intelligence");
assert.equal(dsaiAssessment.curriculum?.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 120);
const dsaiRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "What are the required courses for Data Science and Artificial Intelligence?" },
]);
assert.ok(dsaiRequirements);
assert.match(renderProgramRequirementsAssessment(dsaiRequirements, "en"), /CSBP323/);
assert.match(renderProgramRequirementsAssessment(dsaiRequirements, "en"), /CSBP495/);
const electricalAssessment = assessProgramCreditConversation([
  { role: "user", content: "How many credits to graduate in Electrical Engineering?" },
]);
assert.ok(electricalAssessment);
assert.equal(electricalAssessment.programId, "electrical-engineering");
assert.match(renderProgramCreditAssessment(electricalAssessment, "en"), /curriculum requires \*\*132 credit hours\*\*/);
assert.match(electricalAssessment.curriculum?.limitations.join(" ") ?? "", /ELEC485: 1 credit; ELEC490: 0\.00/);
const electricalRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "What courses are required in Electrical Engineering?" },
]);
assert.ok(electricalRequirements);
assert.match(renderProgramRequirementsAssessment(electricalRequirements, "en"), /ELEC585/);
assert.match(renderProgramRequirementsAssessment(electricalRequirements, "en"), /ELEC490/);
for (const [programId, title, course] of [
  ["chemical-engineering", "Chemical Engineering", "CHME455"],
  ["civil-engineering", "Civil Engineering", "CIVL585"],
  ["aerospace-engineering", "Aerospace Engineering", "AERO585"],
  ["petroleum-engineering", "Petroleum Engineering", "PETE585"],
] as const) {
  const credits = assessProgramCreditConversation([{ role: "user", content: `How many credits to graduate in ${title}?` }]);
  assert.ok(credits);
  assert.equal(credits.programId, programId);
  assert.equal(credits.curriculum?.totalCredits, 132);
  const requirements = assessProgramRequirementsConversation([{ role: "user", content: `What courses are required in ${title}?` }]);
  assert.ok(requirements);
  assert.match(renderProgramRequirementsAssessment(requirements, "en"), new RegExp(course));
}

const contextualCohortQuestion = assessProgramCreditConversation([
  { role: "user", content: "I entered the Information Security program in Fall 2022." },
  { role: "assistant", content: "What do you need to know?" },
  { role: "user", content: "How many credits do I need to graduate?" },
]);
assert.ok(contextualCohortQuestion);
assert.equal(contextualCohortQuestion.curriculum?.totalCredits, 130);
assert.match(renderProgramCreditAssessment(contextualCohortQuestion, "en"), /does not establish a complete credit-bucket breakdown/i);
const shortFollowUp = assessProgramCreditConversation([
  { role: "user", content: "I am in the Information Security program." },
  { role: "assistant", content: "Which cohort year? Then I can confirm the credit requirement." },
  { role: "user", content: "How many?" },
]);
assert.equal(shortFollowUp?.curriculum?.totalCredits, 120, "a short credit follow-up resolves the active program from user context");
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credits is ISEC421?" }]), null, "a course credit question is not mistaken for a program degree total");
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credits do I need to graduate?" }]), null, "no degree is inferred when no active program is given");
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credit hours to graduate in Information Technology?" }])?.curriculum?.totalCredits, 120);
assert.equal(assessProgramCreditConversation([{ role: "user", content: "How many credits to graduate in Mechanical Engineering?" }])?.curriculum?.totalCredits, 132);

const itRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "Which courses are required in Information Technology?" },
]);
assert.ok(itRequirements);
const itRequirementsText = renderProgramRequirementsAssessment(itRequirements, "en");
assert.match(itRequirementsText, /CSBP340/);
assert.match(itRequirementsText, /Internship requirement:\*\* ITBP496/);
assert.match(itRequirementsText, /currently published curriculum includes these course groups/);
assert.match(itRequirementsText, /choose 1 from BIOC100 or CHEM111/);
assert.match(itRequirementsText, /choose 3 \(9 credits\)/);
assert.match(itRequirementsText, /do not identify which courses remain/i);

const contextualMechRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I am studying Mechanical Engineering." },
  { role: "assistant", content: "What would you like to know about the degree?" },
  { role: "user", content: "What courses do I need in my program?" },
]);
assert.ok(contextualMechRequirements);
assert.match(renderProgramRequirementsAssessment(contextualMechRequirements, "en"), /MECH485/);
assert.match(renderProgramRequirementsAssessment(contextualMechRequirements, "en"), /MECH490/);
assert.equal(assessProgramRequirementsConversation([
  { role: "user", content: "I am studying Computer Science." },
  { role: "assistant", content: "What would you like to know?" },
  { role: "user", content: "What courses are required for CSBP340?" },
]), null, "course-level requirement questions must not be mistaken for program course lists");
const unknownCohortRequirements = assessProgramRequirementsConversation([
  { role: "user", content: "I am in Computer Science, 2022 cohort." },
  { role: "assistant", content: "How can I help?" },
  { role: "user", content: "Which courses are required for my degree?" },
]);
assert.ok(unknownCohortRequirements);
assert.equal(unknownCohortRequirements.curriculum, null, "unknown historical requirements stay unresolved instead of using the current catalog");

const computerAiEngineering = getProgramCurriculum("bsc-computer-ai-engineering");
assert.ok(computerAiEngineering);
assert.equal(computerAiEngineering.curriculum.totalCredits, 130);
assert.deepEqual(computerAiEngineering.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 44, 6, 15, 3]);
assert.equal(computerAiEngineering.curriculum.creditBuckets?.reduce((sum, bucket) => sum + bucket.credits, 0), 130);
const pathways = computerAiEngineering.curriculum.requirements.find((item) => item.type === "PATHWAY_CHOICE");
assert.ok(pathways);
const generalPathway = pathways.options.find((option) => option.id === "general-computer-ai-engineering");
assert.ok(generalPathway);
assert.equal(generalPathway.chooseCount, 5);
assert.ok(generalPathway.courseCodes.includes("CENG532"));
assert.ok(generalPathway.courseCodes.includes("CENG580"));
const substitution = assessProgramCourseSubstitutionConversation([{
  role: "user",
  content: "In Computer and AI Engineering, take Network Security instead of Selected Topics in Computer Engineering.",
}]);
assert.ok(substitution);
assert.equal(substitution.replacement.code, "CENG532");
assert.equal(substitution.replaced.code, "CENG580");
assert.equal(substitution.sharedOption?.id, "general-computer-ai-engineering");
const substitutionAnswer = renderProgramCourseSubstitutionAssessment(substitution, "en");
assert.match(substitutionAnswer, /permits choosing CENG532 in place of CENG580/);
assert.match(substitutionAnswer, /does not establish that the substitution applies to either named concentration/);
assert.equal(assessProgramCourseSubstitutionConversation([
  { role: "user", content: "I entered the Computer and AI Engineering program in 2022." },
  { role: "assistant", content: "What would you like to check?" },
  { role: "user", content: "In Computer and AI Engineering, take Networking Security instead of Selected Topics." },
])?.curriculum, null, "do not project the current pathway model onto unmodeled cohorts");

const legacyComputerEngineering = getProgramCurriculum("bsc-computer-engineering");
assert.ok(legacyComputerEngineering);
assert.equal(legacyComputerEngineering.curriculum.totalCredits, 131);
assert.deepEqual(legacyComputerEngineering.curriculum.creditBuckets?.map(({ credits }) => credits), [21, 41, 45, 6, 12, 6]);
const computerEngineering144SourceVariant = programs.find((program) => program.id === "bsc-computer-engineering")
  ?.curriculumVersions.find((version) => version.id === "computer-engineering-cohort-model-144");
assert.ok(computerEngineering144SourceVariant);
assert.equal(computerEngineering144SourceVariant.cohortMapping, "unresolved");
assert.equal(computerEngineering144SourceVariant.requirements.length, 0,
  "conflicting historic 144-credit plan sources remain unavailable for requirement-level planning");
assert.equal(computerEngineering144SourceVariant.cohortMapping, "unresolved",
  "source-specific 144-credit plans must not imply a student's assigned Degree Works plan");
const computerEngineering144Plans = getPublishedCurriculumVersion("bsc-computer-engineering", "computer-engineering-cohort-model-144")?.curriculum.semesterPlans;
assert.ok(computerEngineering144Plans, "the academic program model exposes all three source-backed historic plans as distinct semester sequences");
assert.deepEqual(computerEngineering144Plans.map(({ id }) => id), [
  "ce-144-2022-onward-fall-entry", "ce-144-2022-onward-spring-entry", "ce-144-fall-2024-prior",
]);
for (const plan of computerEngineering144Plans) {
  assert.equal(plan.semesters.length, 9, `${plan.id} preserves all nine published semesters`);
  assert.equal(plan.semesters.reduce((sum, semester) => sum + semester.publishedCredits, 0), 144,
    `${plan.id} sums to the source-published 144 credits`);
  for (const semester of plan.semesters) {
    assert.equal(semester.courses.reduce((sum, course) => sum + (course.credits ?? 0), 0), semester.publishedCredits,
      `${plan.id} semester ${semester.semesterNumber} rows reconcile to its printed subtotal`);
  }
}
const ceFall22 = computerEngineering144Plans.find(({ id }) => id === "ce-144-2022-onward-fall-entry")!;
const ceSpring22 = computerEngineering144Plans.find(({ id }) => id === "ce-144-2022-onward-spring-entry")!;
const cePriorFall = computerEngineering144Plans.find(({ id }) => id === "ce-144-fall-2024-prior")!;
assert.equal(ceFall22.semesters[0].season, "fall");
assert.equal(ceSpring22.semesters[0].season, "spring");
assert.equal(ceSpring22.semesters[1].season, "fall");
assert.equal(cePriorFall.semesters[0].season, "fall");
assert.ok(ceFall22.sourceUrl.endsWith("cit_bsc_computer_engineering_study_plan.pdf"));
assert.ok(cePriorFall.sourceUrl.endsWith("bsc_in_ce_study_plan_fall_2024_and_prior.pdf"));
assert.ok(ceFall22.semesters[0].courses.some(({ courseCode }) => courseCode === "GEIT112"));
assert.ok(cePriorFall.semesters[0].courses.some(({ courseCode }) => courseCode === "CENG110"));
assert.ok(cePriorFall.semesters[4].courses.some(({ courseCode }) => courseCode === "CENG340"));
assert.ok(ceFall22.semesters[4].courses.some(({ courseCode }) => courseCode === "ELEC370"));
assert.ok(ceFall22.semesters[3].courses.some(({ courseCodes, selectionRule }) =>
  courseCodes?.join("/") === "BIOC100/CHEM111" && selectionRule === "choose-one"));
assert.ok(cePriorFall.semesters[4].courses.some(({ sourceLabel, courseCode }) =>
  sourceLabel.includes("CENG xxx") && courseCode === undefined),
  "historic CENG xxx elective placeholders remain unresolved instead of being guessed");
assert.ok(computerEngineering144Plans.every((plan) => plan.semesters[8].courses.some(({ courseCode, credits }) =>
  courseCode === "ITBP495" && credits === 12)), "each 144-credit PDF sequence preserves the source's 12-credit ITBP495 row");
assert.equal(getProgramCurriculum("bsc-computer-engineering", 2022), null,
  "separate source sequences still do not resolve which overlapping version applies to a student");
const explicit144Credits = assessProgramCreditConversation([{
  role: "user",
  content: "What total credits does the published curriculum for Bachelor of Science in Computer Engineering list for the cohort described as '144-credit source variant shown in the 2025 model-plan PDF with separate Fall and Spring sequences; exact cohort and revision mapping unresolved'? Cite the version-specific source.",
}]);
assert.ok(explicit144Credits);
assert.equal(explicit144Credits.curriculum?.id, "computer-engineering-cohort-model-144",
  "an explicit version-total label must not be mistaken for a student entry year and select the separate 131-credit plan");
assert.equal(explicit144Credits.curriculum?.totalCredits, 144);

const marineCreditsDespiteQuotedPathwayLabel = assessProgramCreditConversation([{
  role: "user",
  content: "\u0645\u0627 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0630\u064a \u064a\u0646\u0635 \u0639\u0644\u064a\u0647 \u0645\u0646\u0647\u062c Bachelor of Science in Marine Fisheries and Animal Science \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0644\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0648\u0635\u0648\u0641\u0629 \u0628\u0623\u0646\u0647\u0627 'The linked PDF labels these plans 2022?2023 cohort onwards; separate Fall and Spring entry schedules are shown for two concentrations.'\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
}]);
assert.equal(marineCreditsDespiteQuotedPathwayLabel?.programId, "marine-fisheries-and-animal-science",
  "incidental concentration wording in a quoted source label must not block a total-credit request");
assert.equal(marineCreditsDespiteQuotedPathwayLabel?.curriculum?.totalCredits, 120);

const aerospacePublishedCohortLabel = "\u0645\u0627 \u0639\u0628\u0627\u0631\u0629 \u0627\u0644\u0627\u0646\u0637\u0628\u0627\u0642 \u0627\u0644\u062a\u064a \u062a\u0646\u0634\u0631\u0647\u0627 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a \u0644\u0628\u0631\u0646\u0627\u0645\u062c Bachelor of Science in Aerospace Engineering \u0644\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0648\u0635\u0648\u0641\u0629 \u0628\u0623\u0646\u0647\u0627 'Current published Aerospace Engineering catalog; confirm an earlier cohort against its linked model plan and assigned Degree Works plan'\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.";
const architecturalProgramIdentity = "\u0648\u0641\u0642 \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 'Students whose assigned plan matches the published 2023-2024 model plan onwards'\u060c \u0645\u0627 \u0627\u0633\u0645 \u0627\u0644\u062f\u0631\u062c\u0629 \u0648\u0627\u0644\u0643\u0644\u064a\u0629 \u0627\u0644\u0645\u0633\u062c\u0644\u0627\u0646 \u0644\u0628\u0631\u0646\u0627\u0645\u062c Bachelor of Science in Architectural Engineering\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.";
assert.equal(assessProgramCreditConversation([{ role: "user", content: aerospacePublishedCohortLabel }]), null,
  "a cohort-label request containing the word curriculum must not be answered with credit totals");
assert.equal(assessProgramCreditConversation([{ role: "user", content: architecturalProgramIdentity }]), null,
  "a degree-identity request containing a cohort year must not be answered with credit totals");
assert.equal(explicit144Credits.explicitlySelectedVersion, true);
assert.equal(explicit144Credits.cohortYear, undefined,
  "a year mentioned as part of the PDF label is not treated as the student's entry year");
assert.ok(explicit144Credits.sources.some(({ url }) => url.endsWith("cit_bsc_computer_engineering_study_plan.pdf")));
assert.ok(explicit144Credits.sources.some(({ url }) => url.endsWith("bsc_in_ce_study_plan_fall_2024_and_prior.pdf")));
const explicit144Text = renderProgramCreditAssessment(explicit144Credits, "en");
assert.match(explicit144Text, /144 total credit hours/u);
assert.match(explicit144Text, /separate Fall-entry 2025–2026-onward.*131 credits/u);
assert.match(explicit144Text, /does not provide a complete structured credit-bucket breakdown/u);
assert.doesNotMatch(explicit144Text, /For the 2025 entry cohort/u);
const ceSemesterFiveFall = assessProgramSemesterPlanConversation([
  { role: "user", content: "I am studying Computer Engineering. Use the 2022-2023 cohort onwards plan; I entered in Fall. What courses are in semester 5?" },
], "en");
assert.ok(ceSemesterFiveFall?.plan);
assert.equal(ceSemesterFiveFall.plan.id, "ce-144-2022-onward-fall-entry");
const ceSemesterFiveFallText = renderProgramSemesterPlanAssessment(ceSemesterFiveFall, "en");
assert.match(ceSemesterFiveFallText, /ELEC370.*ELEC375.*CENG328.*CENG329.*CENG530/s);
assert.match(ceSemesterFiveFallText, /Published semester subtotal: 17 credits/);
assert.match(ceSemesterFiveFallText, /Degree Works plan controls your individual requirements/);
assert.equal(ceSemesterFiveFall.sources.length, 1, "an explicit plan selection returns the citation for that exact source PDF");
assert.ok(ceSemesterFiveFall.sources[0].url.endsWith("cit_bsc_computer_engineering_study_plan.pdf"));

const ceSemesterFiveSpringArabic = assessProgramSemesterPlanConversation([
  { role: "user", content: "\u0623\u0646\u0627 \u0623\u062f\u0631\u0633 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628. \u0623\u0631\u064a\u062f \u062e\u0637\u0629 2022-2023 \u0648\u0645\u0627 \u0628\u0639\u062f\u0647\u0627\u060c \u062f\u062e\u0644\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0631\u0628\u064a\u0639\u064a. \u0645\u0627 \u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062e\u0627\u0645\u0633\u061f" },
], "ar");
assert.ok(ceSemesterFiveSpringArabic?.plan);
assert.equal(ceSemesterFiveSpringArabic.plan.id, "ce-144-2022-onward-spring-entry");
const ceSemesterFiveSpringArabicText = renderProgramSemesterPlanAssessment(ceSemesterFiveSpringArabic, "ar");
assert.match(ceSemesterFiveSpringArabicText, /17 \u0633\u0627\u0639\u0629/);
assert.match(ceSemesterFiveSpringArabicText, /Degree Works/);
assert.doesNotMatch(ceSemesterFiveSpringArabicText, /ELEC370/);

const ceMissingSource = assessProgramSemesterPlanConversation([
  { role: "user", content: "For Computer Engineering, what courses are in semester 5?" },
], "en");
assert.ok(ceMissingSource?.clarification);
assert.match(renderProgramSemesterPlanAssessment(ceMissingSource, "en"), /Which published cohort\/source label applies/);
assert.equal(ceMissingSource.sources.length, 2, "the ambiguity question cites both conflicting official PDFs");
assert.equal(ceMissingSource.plan, undefined, "the assessor does not select a plan when the source version is omitted");

const ceMissingEntry = assessProgramSemesterPlanConversation([
  { role: "user", content: "Use Computer Engineering's 2022-2023 cohort onwards plan. Which courses are in semester 5?" },
], "en");
assert.ok(ceMissingEntry?.clarification);
assert.match(renderProgramSemesterPlanAssessment(ceMissingEntry, "en"), /separate Fall-entry and Spring-entry sequences/);
assert.equal(ceMissingEntry.plan, undefined, "the 2022-onward plan does not pick Fall or Spring ordering without entry context");

const ceOldSpringMismatch = assessProgramSemesterPlanConversation([
  { role: "user", content: "For Computer Engineering, use the plan labeled Fall 2024 and prior. I entered in Spring. What courses are in semester 5?" },
], "en");
assert.ok(ceOldSpringMismatch?.clarification);
assert.match(renderProgramSemesterPlanAssessment(ceOldSpringMismatch, "en"), /does not publish a sequence for that entry term/);
assert.equal(ceOldSpringMismatch.plan, undefined, "a Spring student is not shown the old source's Fall-only schedule");

const ceClarificationTurn = assessProgramSemesterPlanConversation([
  { role: "user", content: "For Computer Engineering, what courses are in semester 5?" },
], "en");
assert.ok(ceClarificationTurn?.clarification);
const ceClarificationFollowUp = assessProgramSemesterPlanConversation([
  { role: "user", content: "For Computer Engineering, what courses are in semester 5?" },
  { role: "assistant", content: renderProgramSemesterPlanAssessment(ceClarificationTurn!, "en") },
  { role: "user", content: "Use the 2022-2023 cohort onwards plan; I entered in Spring." },
], "en");
assert.equal(ceClarificationFollowUp?.plan?.id, "ce-144-2022-onward-spring-entry",
  "the follow-up fills the missing source and entry slots without losing the original semester request");
assert.ok(computerEngineering144SourceVariant.limitations?.some((limitation) => /do not explain the overlap or establish which revision/u.test(limitation)),
  "the overlapping official 144-credit source versions and unresolved revision mapping must be explained");
const computerElectives = legacyComputerEngineering.curriculum.requirements.find((item) => item.id === "computer-engineering-major-electives");
assert.equal(computerElectives?.type, "ELECTIVE_GROUP");
assert.equal(computerElectives?.chooseCount, 4);
assert.ok(computerElectives?.courseCodes.includes("CENG532"));
assert.ok(computerElectives?.courseCodes.includes("CENG580"));
assert.equal(getProgramCurriculum("bsc-computer-engineering", 2022), null,
  "overlapping official 144-credit plans with different course sequences must not be assigned to a cohort by year alone");
assert.equal(getProgramCurriculum("bsc-computer-engineering", 2026), null,
  "year alone does not assign the Fall-entry 2025-2026 Computer Engineering plan");
const computerEngineering2026 = fallEntryCurriculumForYear("bsc-computer-engineering", 2026);
assert.ok(computerEngineering2026, "an explicit Fall-entry lookup finds the published 2025-2026 model");
assert.equal(computerEngineering2026.curriculum.totalCredits, 131);
assert.equal(computerEngineering2026.curriculum.effectiveFrom, "2025-08-01");
assert.match(computerEngineering2026.curriculum.cohortLabel, /Fall-entry cohorts from 2025–2026 onward/u);
assert.ok(computerEngineering2026.curriculum.limitations.some((item) => /does not establish Spring-entry applicability/u.test(item)));
assert.ok(computerEngineering2026.curriculum.limitations.some((item) => /current Computer Engineering catalog identifies.*ITBP496.*model-plan PDF labels.*ITBP495/u.test(item)),
  "Computer Engineering internship code discrepancy must remain explicit in the modeled curriculum");
const cybersecurity2026 = fallEntryCurriculumForYear("cybersecurity", 2026);
assert.ok(cybersecurity2026, "an explicit Fall-entry lookup finds the published 2026-2027 Cybersecurity model");
assert.equal(cybersecurity2026.curriculum.totalCredits, 120);
assert.equal(cybersecurity2026.curriculum.effectiveFrom, "2026-08-01");
const computerEngineering2022Requirements = assessProgramRequirementsConversation([
  { role: "user", content: "I entered Computer Engineering in 2022." },
  { role: "assistant", content: "Which requirements should I check?" },
  { role: "user", content: "Which courses are required in my degree?" },
]);
assert.ok(computerEngineering2022Requirements);
assert.equal(computerEngineering2022Requirements.curriculum, null,
  "the assistant must not treat either overlapping 144-credit source as the student's assigned plan");
assert.match(renderProgramRequirementsAssessment(computerEngineering2022Requirements, "en"), /Degree Works/u,
  "an unresolved historic cohort must direct the student to their assigned Degree Works plan");
const computerDegreeSubstitution = assessProgramCourseSubstitutionConversation([{
  role: "user", content: "In Computer Engineering, take Networking Security instead of Selected Topics in Computer Engineering.",
}]);
assert.ok(computerDegreeSubstitution);
assert.equal(computerDegreeSubstitution.programId, "bsc-computer-engineering");
assert.equal(computerDegreeSubstitution.sharedOption?.id, "computer-engineering-major-electives");
const computerDegreeSubstitutionAnswer = renderProgramCourseSubstitutionAssessment(computerDegreeSubstitution, "en");
assert.match(computerDegreeSubstitutionAnswer, /choosing 4 courses/);
assert.doesNotMatch(computerDegreeSubstitutionAnswer, /concentration/);
const computerDegreeArabic = renderProgramCourseSubstitutionAssessment(computerDegreeSubstitution, "ar");
assert.ok(computerDegreeArabic.includes("يعرض"));

const oldCohortSubstitution = assessProgramCourseSubstitutionConversation([
  { role: "user", content: "I entered Computer Engineering in 2022." },
  { role: "assistant", content: "Which course change are you considering?" },
  { role: "user", content: "Take Networking Security instead of Selected Topics in Computer Engineering." },
]);
assert.ok(oldCohortSubstitution);
assert.equal(oldCohortSubstitution.curriculum, null,
  "ambiguous historical 144-credit source variants must not be treated as one assigned curriculum");
assert.equal(oldCohortSubstitution.sharedOption, undefined, "do not apply the newer elective list to the historical cohort");
assert.match(renderProgramCourseSubstitutionAssessment(oldCohortSubstitution, "en"), /Degree Works/);

const archSpringSchedule = assessProgramSemesterPlanConversation([{
  role: "user",
  content: "For Architectural Engineering, use the 2022-2023 cohort onwards plan. I entered in Spring. What is in semester 1?",
}], "en");
assert.equal(archSpringSchedule?.plan?.id, "architectural-engineering-2022-spring-entry-147-spring-entry");
assert.equal(archSpringSchedule?.plan?.semesters[0]?.publishedCredits, 14);
const archSpringText = renderProgramSemesterPlanAssessment(archSpringSchedule!, "en");
assert.match(archSpringText, /ESPU107.*MATH1110\/130/s);
assert.match(archSpringText, /147-credit plan|2022-2023 cohort onwards/);
assert.equal(archSpringSchedule?.sources[0]?.url, "https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_architectural_engineering_study_plan.pdf");
const archMissingEntry = assessProgramSemesterPlanConversation([{
  role: "user", content: "Architectural Engineering 2022-2023 cohort onwards: what courses are in semester 1?",
}], "en");
assert.ok(archMissingEntry?.clarification);
assert.equal(archMissingEntry.plan, undefined, "Spring-only Architectural Engineering source is not shown without Spring entry context");
const archUnsupportedFall = assessProgramSemesterPlanConversation([{
  role: "user", content: "For Architectural Engineering, use the 2022-2023 cohort onwards plan. I entered in Fall. What is in semester 1?",
}], "en");
assert.ok(archUnsupportedFall?.clarification);
assert.equal(archUnsupportedFall.plan, undefined, "the conflicted Fall schedule remains unavailable at runtime");

const commFallSchedule = assessProgramSemesterPlanConversation([{
  role: "user", content: "For Communication Engineering, use the 2022-2023 plan. I entered in Fall. What is in semester 1?",
}], "en");
assert.equal(commFallSchedule?.plan?.entrySemester, "fall");
assert.equal(commFallSchedule?.plan?.semesters[0]?.publishedCredits, 17);
const commFallText = renderProgramSemesterPlanAssessment(commFallSchedule!, "en");
assert.match(commFallText, /ESPU107.*ISLM100 or ISLM101/s);
assert.match(commFallText, /Published semester subtotal: 17 credits/);
assert.match(commFallText, /Degree Works plan controls your individual requirements/);
assert.equal(commFallSchedule?.sources[0]?.url, "https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_communication_engineering_study_plan.pdf");
const commSpringScheduleArabic = assessProgramSemesterPlanConversation([{
  role: "user",
  content: "\u0623\u062f\u0631\u0633 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a. \u062e\u0637\u0629 2022-2023. \u062f\u062e\u0644\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0631\u0628\u064a\u0639\u064a. \u0645\u0627 \u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0623\u0648\u0644\u061f",
}], "ar");
assert.equal(commSpringScheduleArabic?.plan?.entrySemester, "spring");
assert.match(renderProgramSemesterPlanAssessment(commSpringScheduleArabic!, "ar"), /MATH1110.*MATH130/);
assert.match(renderProgramSemesterPlanAssessment(commSpringScheduleArabic!, "ar"), /17 \u0633\u0627\u0639\u0629/);
const missingProgram = assessProgramSemesterPlanConversation([{
  role: "user", content: "What courses are in semester 5?",
}], "en");
assert.match(missingProgram?.clarification ?? "", /Which degree program/);
assert.equal(missingProgram?.plan, undefined);
const commFollowUp = assessProgramSemesterPlanConversation([
  { role: "user", content: "For Communication Engineering, what courses are in semester 1?" },
  { role: "assistant", content: "Which published cohort/source label applies to your Communication Engineering plan?" },
  { role: "user", content: "2022-2023 plan, Fall entry." },
], "en");
assert.equal(commFollowUp?.plan?.id, "communication-engineering-2022-plan-147-fall-spring-fall-entry");

const isecFallSchedule = assessProgramSemesterPlanConversation([{
  role: "user", content: "For Information Security, use the 2022-2023 130-credit model plan. I entered in Fall. What is in semester 1?",
}], "en");
assert.equal(isecFallSchedule?.plan?.id, "isec-130-2022-onward-fall-entry");
assert.equal(isecFallSchedule?.plan?.semesters.length, 9);
assert.equal(isecFallSchedule?.plan?.semesters.reduce((sum, semester) => sum + semester.publishedCredits, 0), 130);
assert.ok(isecFallSchedule?.plan?.semesters.every((semester) => semester.publishedCredits === semester.courses.reduce((sum, course) => sum + (course.credits ?? 0), 0)));
assert.equal(isecFallSchedule?.sources[0]?.url, "https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_security_study_plan.pdf");
const isecSpringSchedule = assessProgramSemesterPlanConversation([{
  role: "user", content: "For Information Security, use the 2022-2023 130-credit model plan. I entered in Spring. What is in semester 1?",
}], "en");
assert.equal(isecSpringSchedule?.plan?.id, "isec-130-2022-onward-spring-entry");
assert.equal(isecSpringSchedule?.plan?.semesters[0]?.season, "spring");
const isecMissingEntry = assessProgramSemesterPlanConversation([{
  role: "user", content: "For Information Security, use the 2022-2023 130-credit model plan. What is in semester 1?",
}], "en");
assert.ok(isecMissingEntry?.clarification);
assert.equal(isecMissingEntry?.plan, undefined);
const isec130 = getPublishedCurriculumVersion("bsc-information-security", "isec-2022-2023-older-130")?.curriculum;
assert.equal(isec130?.cohortMapping, "unresolved");
assert.equal(isec130?.totalCredits, 130);

const commSpringSchedule = assessProgramSemesterPlanConversation([{
  role: "user", content: "For Communication Engineering, use the reconciled 2022-2023 147-credit plan. I entered in Spring. What is in semester 1?",
}], "en");
assert.equal(commSpringSchedule?.plan?.id, "communication-engineering-2022-plan-147-fall-spring-spring-entry");
assert.equal(commSpringSchedule?.plan?.semesters[0]?.publishedCredits, 17);
assert.equal(commSpringSchedule?.sources[0]?.url, "https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_communication_engineering_study_plan.pdf");

const archVersion = getPublishedCurriculumVersion("architectural-engineering", "architectural-engineering-2022-plan-total-only")?.curriculum;
assert.equal(archVersion?.cohortMapping, "unresolved");
assert.equal(archVersion?.semesterPlans?.length, 1, "only the checked Spring 147-credit sequence is supported");
assert.equal(archVersion?.semesterPlans?.[0]?.semesters.reduce((sum, semester) => sum + semester.publishedCredits, 0), 147);
assert.ok(archVersion?.semesterPlans?.[0]?.semesters.every((semester) => semester.publishedCredits === semester.courses.reduce((sum, course) => sum + (course.credits ?? 0), 0)));
for (const [programId, versionId] of [
  ["architectural-engineering", "architectural-engineering-2023-plan-total-only"],
  ["early-childhood-education", "early-childhood-education-2020-126"],
] as const) {
  const failClosed = getPublishedCurriculumVersion(programId, versionId)?.curriculum;
  assert.ok(failClosed, `${programId}/${versionId} remains represented as a source record`);
  assert.equal(failClosed.semesterPlans?.length ?? 0, 0);
  assert.deepEqual(failClosed.requirements, []);
  assert.equal(failClosed.cohortMapping, "unresolved");
}

console.log(`Academic program model passed: ${programs.length} sourced program records, credit totals, elective and pathway groups, cohort selection, and safe missing versions.`);
