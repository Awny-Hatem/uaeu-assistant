import assert from "node:assert/strict";
import { catalogTargetCodeFromMessages, isCoursePrerequisiteFollowUp } from "../../lib/academic/catalog-prerequisite-assessment";
import { retrieveVerifiedEvidence } from "../../lib/knowledge-files";
import { resolveConversation, understandQuery } from "../../lib/query-understanding";
import { findServiceGuide } from "../../lib/service-guides";
import { answerOfficialCourseCatalogQuestion } from "../../lib/academic/course-catalog";
import { assessPrerequisiteConversation } from "../../lib/academic/prerequisite-rules";
import { assessProgramCreditConversation } from "../../lib/academic/program-curricula";
import { detectLocale, resolveLocale } from "../../lib/language";

process.env.AI_PROVIDER = "mock";
process.env.UAEU_AGENT_V3_ENABLED = "enabled";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";

async function main() {
  const mixedArabicCurriculumQuestion = "ما توزيعات الساعات التي ينشرها منهج Bachelor of Science in Speech-Language Pathology للفئة الموصوفة بأنها cohort plan؟";
  assert.equal(detectLocale(mixedArabicCurriculumQuestion), "ar",
    "Arabic question wording must remain Arabic when an official English degree title is embedded");
  assert.equal(resolveLocale(mixedArabicCurriculumQuestion, "auto"), "ar",
    "auto-detect must preserve the opening language of mixed-script questions");
  const arabicCreditDistribution = assessProgramCreditConversation([{ role: "user", content: mixedArabicCurriculumQuestion }]);
  assert.equal(arabicCreditDistribution?.programId, "speech-language-pathology",
    "Arabic credit-distribution wording must enter the structured curriculum assessment");
  assert.ok(understandQuery("Does IELTS 5.5 automatically qualify me for every master's degree?").subjects.includes("admissions"),
    "English proficiency thresholds must retrieve scoped graduate-admission evidence");
  assert.ok(understandQuery("Who approves taking more than the normal maximum number of credits?").subjects.includes("registration"),
    "credit overload wording must retrieve the registration policy");
  assert.equal(findServiceGuide("كيف اسجل مادة جديدة في الجدول")?.id, "register-for-a-class",
    "Arabic course-registration wording must discover the official workflow guide");
  const courseNamedAlongsidePrerequisiteCodes = answerOfficialCourseCatalogQuestion(
    "I have passed CSBP119 but not CSBP219. Am I ready for Data Structures?", "en",
  );
  assert.equal(courseNamedAlongsidePrerequisiteCodes?.code, "CSBP319",
    "when prerequisite codes and a named target coexist, resolve the target by its exact catalog title");
  const dataStructuresAssessment = assessPrerequisiteConversation([{ role: "user", content: "I have passed CSBP119 but not CSBP219. Am I ready for Data Structures?" }]);
  assert.equal(dataStructuresAssessment?.rule.course.code, "CSBP319",
    "personal assessment resolves a named target course even when other course codes occur in the question");
  assert.equal(dataStructuresAssessment?.evaluation.status, "NOT_ELIGIBLE",
    "an explicitly stated missing prerequisite is evaluated as not satisfied instead of asking for it again");

  const { POST } = await import("../../app/api/chat/route");

  async function askMessages(messages: { role: "user" | "assistant"; content: string }[], ip: string, locale: "en" | "ar" = "en") {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ locale, messages }),
    }));
    return { status: response.status, payload: await response.json() as Record<string, unknown> };
  }
  const ask = (question: string, ip: string, locale: "en" | "ar" = "en") => askMessages([{ role: "user", content: question }], ip, locale);

  const multilingualCatalogQuestions = [
    { question: "UAEU पाठ्यक्रम CSBP319 में कितने क्रेडिट घंटे हैं?", ip: "203.0.113.201", language: /[\u0900-\u097f]/u, fact: /\*\*3\*\*/u },
    { question: "UAEU کے کورس CSBP319 کے کتنے کریڈٹ آورز ہیں؟", ip: "203.0.113.202", language: /[\u0600-\u06ff]/u, fact: /\*\*3\*\*/u },
    { question: "Quel est le titre publié du cours UAEU CSBP319 ?", ip: "203.0.113.203", language: /[\p{L}]/u, fact: /Data Structures/u },
    { question: "¿Qué prerrequisito o asignatura simultánea indica el catálogo UAEU para CSBP319?", ip: "203.0.113.204", language: /[\p{L}]/u, fact: /CSBP219|CSBP221/u },
  ];
  for (const probe of multilingualCatalogQuestions) {
    const result = await ask(probe.question, probe.ip);
    assert.equal(result.status, 200);
    assert.equal(result.payload.stateLabel, "v3_official_course_catalog_lookup");
    assert.match(String(result.payload.content), probe.language);
    assert.match(String(result.payload.content), probe.fact);
    assert.match(JSON.stringify(result.payload.citations), /course_2968\.shtml\?id=CSBP319/u);
  }
  for (const [question, ip] of [
    ["क्या मैं CSBP319 में पंजीकरण कर सकता हूँ?", "203.0.113.205"],
    ["کیا میں CSBP319 میں رجسٹر ہو سکتا ہوں؟", "203.0.113.206"],
    ["Puis-je m'inscrire au cours CSBP319 ?", "203.0.113.207"],
    ["¿Puedo inscribirme en la asignatura CSBP319?", "203.0.113.208"],
  ] as const) {
    const result = await ask(question, ip);
    assert.notEqual(result.payload.stateLabel, "v3_official_course_catalog_lookup",
      "personal eligibility requests in other supported languages must not be reduced to a generic catalog fact");
  }

  const calendar = await ask("Where can I check UAEU academic calendar deadlines?", "203.0.113.221");
  assert.equal(calendar.status, 200);
  assert.equal(calendar.payload.stateLabel, "v3_verified_source_location");
  assert.equal(calendar.payload.resolutionState, "VERIFIED");
  assert.match(String(calendar.payload.content), /official UAEU academic calendar/i);
  assert.match(JSON.stringify(calendar.payload.citations), /coreservices\.uaeu\.ac\.ae/);

  const englishPasswordReset = await ask(
    "I've forgotten the password for my university account. What should I do?",
    "203.0.113.217",
  );
  assert.equal(englishPasswordReset.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(englishPasswordReset.payload.faqId, "account-password-reset");
  assert.match(String(englishPasswordReset.payload.content), /I Forget My Password/);
  assert.match(String(englishPasswordReset.payload.content), /identity-verification prompts/i);
  assert.match(String(englishPasswordReset.payload.content), /Never send.*password.*verification code/i);
  assert.match(JSON.stringify(englishPasswordReset.payload.citations), /selfservice\.uaeu\.ac\.ae/);

  const arabicPasswordReset = await ask(
    "\u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u062c\u0627\u0645\u0639\u0629\u060c \u0643\u064a\u0641 \u0623\u063a\u064a\u0631\u0647\u0627\u061f",
    "203.0.113.218",
    "ar",
  );
  assert.equal(arabicPasswordReset.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(arabicPasswordReset.payload.faqId, "account-password-reset");
  assert.match(String(arabicPasswordReset.payload.content), /I Forget My Password/);
  assert.match(String(arabicPasswordReset.payload.content), /\+971 3 713 6111/);
  assert.doesNotMatch(String(arabicPasswordReset.payload.content), /[ØÙ]/);
  assert.match(JSON.stringify(arabicPasswordReset.payload.citations), /selfservice\.uaeu\.ac\.ae/);

  const personalFinalExamSchedule = await ask("Where do I find the final exam timetable for my registered courses?", "203.0.113.220");
  assert.equal(personalFinalExamSchedule.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(personalFinalExamSchedule.payload.faqId, "final-exam-schedule");
  assert.match(String(personalFinalExamSchedule.payload.content), /Student Official Schedule Letter/i);
  assert.match(String(personalFinalExamSchedule.payload.content), /registered courses.*class timetable.*final-exam schedule/i);
  assert.match(JSON.stringify(personalFinalExamSchedule.payload.citations), /current-students-docs\.pdf/);

  const tuitionPaymentConflict = await ask("Where can I pay an outstanding tuition balance?", "203.0.113.219");
  assert.equal(tuitionPaymentConflict.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(tuitionPaymentConflict.payload.faqId, "tuition-payment-methods");
  assert.match(String(tuitionPaymentConflict.payload.content), /official pages conflict/i);
  assert.match(String(tuitionPaymentConflict.payload.content), /bank transfer/i);
  assert.match(JSON.stringify(tuitionPaymentConflict.payload.citations), /enrollment-deanship-department\.shtml/);

  const studentDocument = await ask("How do I request a To Whom It May Concern letter?", "203.0.113.229");
  assert.equal(studentDocument.status, 200);
  assert.equal(studentDocument.payload.stateLabel, "guided_service");
  assert.equal(studentDocument.payload.resolutionState, "VERIFIED");
  assert.equal(studentDocument.payload.faqId, undefined, "a V3 service workflow must not use canonical answer selection");
  assert.equal((studentDocument.payload.guide as { id?: string } | undefined)?.id, "to-whom-it-may-concern");
  assert.match(String(studentDocument.payload.content), /Current Students Documents/i);
  assert.match(JSON.stringify(studentDocument.payload.citations), /serviceId=92/);

  const vis424Prerequisite = await ask("What prerequisite conditions are published for VIS424?", "203.0.113.263");
  assert.equal(vis424Prerequisite.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.match(String(vis424Prerequisite.payload.content), /21 hours of major credit hours[\s\S]*At least 6 of these CH need to be from Professional Studio Track/u);
  assert.match(String(vis424Prerequisite.payload.content), /cannot be safely interpreted|confirm the rule/i);
  assert.match(JSON.stringify(vis424Prerequisite.payload.citations), /course_4968\.shtml\?id=VIS424/u);

  const incompleteChmePrerequisite = await ask("What prerequisite is published for CHME900?", "203.0.113.264");
  assert.match(String(incompleteChmePrerequisite.payload.content), /Student must pass/u);
  assert.match(String(incompleteChmePrerequisite.payload.content), /cannot be safely interpreted|confirm the rule/i,
    "the incomplete source phrase is disclosed without guessing its missing requirement");

  const certificateAttestation = await ask("How can I have a graduation certificate attested?", "203.0.113.230");
  assert.equal(certificateAttestation.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(certificateAttestation.payload.faqId, "uaeu-academic-qualification-attestation");
  assert.match(String(certificateAttestation.payload.content), /Academic Records & Certificates/i);
  assert.match(String(certificateAttestation.payload.content), /Ministry of Higher Education Academic Qualification Attestation Request/i);
  assert.match(JSON.stringify(certificateAttestation.payload.citations), /alumni\/academic-records-and-certificates\.shtml/);

  const alumniPrintedDocumentFollowUp = await askMessages([
    { role: "user", content: "تخرجت من الجامعة وأحتاج شهادة التخرج، كيف أطلعها؟" },
    { role: "assistant", content: "يمكن لخريجي الجامعة طلب وثائق التخرج الرقمية أو المطبوعة من خدمة وثائق الخريجين." },
    { role: "user", content: "أقدر آخذ نسخة ورقية بدل الرقمية؟" },
  ], "203.0.113.231", "ar");
  assert.equal(alumniPrintedDocumentFollowUp.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(alumniPrintedDocumentFollowUp.payload.faqId, "alumni-graduation-certificate-format");
  assert.match(String(alumniPrintedDocumentFollowUp.payload.content), /25/);
  assert.match(String(alumniPrintedDocumentFollowUp.payload.content), /لا يمكن طباعتها/);

  const computerScienceSecondSemester = await ask(
    "What courses are listed for year one semester two in the Computer Science study plan?",
    "203.0.113.232",
  );
  assert.equal(computerScienceSecondSemester.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(computerScienceSecondSemester.payload.faqId, "computer-science-second-semester-plan");
  assert.match(String(computerScienceSecondSemester.payload.content), /CENG202[\s\S]*MATH110[\s\S]*CSBP219[\s\S]*CENG205[\s\S]*CSBP221[\s\S]*MATH140[\s\S]*16 credits/i);
  assert.doesNotMatch(String(computerScienceSecondSemester.payload.content), /Required major courses|major electives/i);

  const academicStandingConsequence = await ask(
    "What happens if my cumulative GPA falls below the required academic standing?",
    "203.0.113.233",
  );
  assert.equal(academicStandingConsequence.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(academicStandingConsequence.payload.faqId, "academic-probation");
  assert.match(String(academicStandingConsequence.payload.content), /first academic probation/i);
  assert.match(JSON.stringify(academicStandingConsequence.payload.citations), /5_academic_standing_enrollment_eligibility_and_progress/);
  assert.match(JSON.stringify(alumniPrintedDocumentFollowUp.payload.citations), /serviceId=122/);

  const graduationDeadlineRumor = await ask(
    "Someone told me all graduation applications close on October 31. Is that right?",
    "203.0.113.253",
  );
  assert.equal(graduationDeadlineRumor.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(graduationDeadlineRumor.payload.faqId, "graduation-deadline-rumor-scope");
  assert.match(String(graduationDeadlineRumor.payload.content), /October 31[\s\S]*not verified/i);
  assert.match(String(graduationDeadlineRumor.payload.content), /last day to drop without failure/i);
  assert.match(JSON.stringify(graduationDeadlineRumor.payload.citations), /6_degree_completion_and_graduation/);

  const currentStudentTranscript = await ask("I'm currently enrolled. How do I download an official transcript?", "203.0.113.252");
  assert.equal(currentStudentTranscript.payload.stateLabel, "guided_service");
  assert.equal(currentStudentTranscript.payload.resolutionState, "VERIFIED");
  assert.equal((currentStudentTranscript.payload.guide as { id?: string } | undefined)?.id, "current-student-official-transcript");
  assert.match(String(currentStudentTranscript.payload.content), /free/i);
  assert.match(String(currentStudentTranscript.payload.content), /10 minutes/i);
  assert.match(JSON.stringify(currentStudentTranscript.payload.citations), /serviceId=92/);

  const alumniTranscriptServiceComparison = await ask(
    "I'm an alumnus and need another transcript. Is it the same service as current students?",
    "203.0.113.251",
  );
  assert.equal(alumniTranscriptServiceComparison.status, 200);
  assert.equal(alumniTranscriptServiceComparison.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(alumniTranscriptServiceComparison.payload.faqId, "transcript-cost-and-student-status");
  assert.match(String(alumniTranscriptServiceComparison.payload.content), /^\*\*No\. Alumni and current students use separate transcript services\./);
  assert.match(String(alumniTranscriptServiceComparison.payload.content), /AED 30/);
  assert.match(JSON.stringify(alumniTranscriptServiceComparison.payload.citations), /serviceId=122/);

  const transcriptFeeFollowUp = await askMessages([
    { role: "user", content: "I'm currently enrolled. How do I download an official transcript?" },
    { role: "assistant", content: "Use Current Students Documents." },
    { role: "user", content: "Will I be charged anything for it?" },
  ], "203.0.113.253");
  assert.equal(transcriptFeeFollowUp.payload.stateLabel, "v3_reviewed_answer");
  assert.match(JSON.stringify(transcriptFeeFollowUp.payload.citations), /serviceId=92/);
  assert.match(String(transcriptFeeFollowUp.payload.content), /free/i);
  assert.match(String(transcriptFeeFollowUp.payload.content), /10 minutes/i);
  assert.match(String(transcriptFeeFollowUp.payload.content), /free/i);

  const enrollmentLetter = await ask("New topic: I need a letter proving I'm enrolled.", "203.0.113.255");
  assert.equal(enrollmentLetter.payload.stateLabel, "guided_service");
  assert.equal((enrollmentLetter.payload.guide as { id?: string } | undefined)?.id, "to-whom-it-may-concern");
  assert.match(String(enrollmentLetter.payload.content), /enrolled UAEU students/i);
  assert.match(JSON.stringify(enrollmentLetter.payload.citations), /serviceId=92/);

  const parkingPermit = await ask("How do I apply for a university parking permit?", "203.0.113.254");
  assert.equal(parkingPermit.payload.stateLabel, "guided_service");
  assert.equal((parkingPermit.payload.guide as { id?: string } | undefined)?.id, "al-ain-female-student-campus-parking-permit");
  assert.match(String(parkingPermit.payload.content), /female students from Al Ain/i);
  assert.match(JSON.stringify(parkingPermit.payload.citations), /serviceId=117/);

  const dropVersusWithdrawal = await ask("What's the difference between dropping and withdrawing from a course?", "203.0.113.228");
  assert.equal(dropVersusWithdrawal.payload.stateLabel, "guided_service");
  assert.equal((dropVersusWithdrawal.payload.guide as { id?: string } | undefined)?.id, "course-drop-vs-withdrawal");
  assert.match(String(dropVersusWithdrawal.payload.content), /separate eServices request/i);
  assert.match(JSON.stringify(dropVersusWithdrawal.payload.guide), /Drop-Web/);
  assert.match(JSON.stringify(dropVersusWithdrawal.payload.citations), /course-registration-service\.pdf/);

  const registerForClass = await ask("How can I register for a course?", "203.0.113.226");
  assert.equal(registerForClass.payload.stateLabel, "guided_service");
  assert.equal(registerForClass.payload.resolutionState, "VERIFIED");
  assert.equal((registerForClass.payload.guide as { id?: string } | undefined)?.id, "register-for-a-class");

  const arabicRegistrationGuide = await ask("كيف أسجل مادة جديدة في الجدول؟", "203.0.113.245", "ar");
  assert.equal(arabicRegistrationGuide.payload.stateLabel, "guided_service");
  assert.equal((arabicRegistrationGuide.payload.guide as { id?: string } | undefined)?.id, "register-for-a-class");
  assert.match(String(arabicRegistrationGuide.payload.content), /[\u0600-\u06FF]{3,}/,
    "an Arabic registration question must receive Arabic guidance");
  const arabicRegistrationSteps = (arabicRegistrationGuide.payload.guide as { description?: string; steps?: { title?: string; instruction?: string }[] }).steps ?? [];
  assert.equal(arabicRegistrationSteps.length, 4);
  assert.ok(arabicRegistrationSteps.every((step) => /[\u0600-\u06FF]{3,}/.test(`${step.title ?? ""} ${step.instruction ?? ""}`)),
    "every step in the Arabic guide must be localized");
  assert.match(JSON.stringify(arabicRegistrationGuide.payload.guide), /Active & Locked|Register for Classes|Pending|Registered/,
    "localized guidance must preserve the official portal labels students need to find");

  const wifiHelp = await ask("My UAEU Wi-Fi connection isn't working. How can I get help?", "203.0.113.241");
  assert.equal(wifiHelp.payload.stateLabel, "v3_reviewed_answer");
  assert.match(String(wifiHelp.payload.content), /Helpdesk@uaeu\.ac\.ae/i);
  assert.match(JSON.stringify(wifiHelp.payload.citations), /uaeu\.ac\.ae/);

  const libraryHours = await ask("When can I visit the Main Library on a weekday?", "203.0.113.242");
  assert.equal(libraryHours.payload.stateLabel, "v3_reviewed_answer");
  assert.match(String(libraryHours.payload.content), /Monday.*Thursday/i);

  const fridayLibraryHours = await askMessages([
    { role: "user", content: "When can I visit the Main Library on a weekday?" },
    { role: "assistant", content: String(libraryHours.payload.content) },
    { role: "user", content: "And on Friday?" },
  ], "203.0.113.246");
  assert.equal(fridayLibraryHours.payload.stateLabel, "v3_reviewed_answer");
  assert.match(String(fridayLibraryHours.payload.content), /Friday[\s\S]*7:30 a\.m\.[–-]12:00 noon/i);
  assert.doesNotMatch(String(fridayLibraryHours.payload.content), /Monday|Thursday|Saturday|Sunday/i,
    "the Friday follow-up should not repeat unrelated hours");
  assert.ok(String(fridayLibraryHours.payload.content).length < 220,
    "the Friday follow-up should be concise while retaining the seasonal caveat");

  const arabicSaturdayLibraryHours = await ask("المكتبة الرئيسية تفتح يوم السبت؟", "203.0.113.243", "ar");
  assert.equal(arabicSaturdayLibraryHours.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(arabicSaturdayLibraryHours.payload.faqId, "library-opening-hours");
  assert.match(String(arabicSaturdayLibraryHours.payload.content), /9:00 مساءً/);
  assert.match(String(arabicSaturdayLibraryHours.payload.content), /12:00 ظهراً/);
  assert.match(String(arabicSaturdayLibraryHours.payload.content), /لا تنشر ساعات نهاية الأسبوع/);
  assert.match(String(arabicSaturdayLibraryHours.payload.content), /تأكد مباشرةً من المكتبة/);

  const informationSecurityFinalTerm = await ask("What should an Information Security student take in the final semester?", "203.0.113.243");
  assert.equal(informationSecurityFinalTerm.payload.stateLabel, "v3_reviewed_answer");
  assert.match(String(informationSecurityFinalTerm.payload.content), /ITBP496 Internship \(6 credits\)/i);

  const catalogPrerequisite = await ask("Does CSBP 340 require Data Structures first?", "203.0.113.244");
  assert.equal(catalogPrerequisite.payload.stateLabel, "v3_reviewed_answer");
  assert.match(String(catalogPrerequisite.payload.content), /CSBP323.*minimum grade D or CSBP319.*minimum grade D/i);

  const arabicTranscriptFee = await ask("\u0623\u0646\u0627 \u0637\u0627\u0644\u0628 \u062d\u0627\u0644\u064a\u060c \u0623\u0628\u064a \u0643\u0634\u0641 \u062f\u0631\u062c\u0627\u062a \u0631\u0633\u0645\u064a. \u0643\u0645 \u0623\u062f\u0641\u0639\u061f", "203.0.113.245", "ar");
  assert.equal(arabicTranscriptFee.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(arabicTranscriptFee.payload.faqId, "current-student-transcript-fee");
  assert.doesNotMatch(String(arabicTranscriptFee.payload.content), /30\s*(?:AED|درهماً)|3\s*ساعات/u);
  assert.match(JSON.stringify(registerForClass.payload.guide), /Active & Locked/i);
  assert.match(JSON.stringify(registerForClass.payload.guide), /Pending/i);
  assert.match(JSON.stringify(registerForClass.payload.guide), /Registered/i);
  assert.match(JSON.stringify(registerForClass.payload.citations), /course-registration-service\.pdf/);

  const registrationDateQuestion = await ask("When does course registration open for next semester?", "203.0.113.225");
  assert.notEqual((registrationDateQuestion.payload.guide as { id?: string } | undefined)?.id, "register-for-a-class",
    "a question about registration dates must not be routed to the procedural registration guide");

  const finalExamConflict = await ask("Two final exams are scheduled at the same time. What do I do?", "203.0.113.227");
  assert.equal(finalExamConflict.payload.stateLabel, "guided_service");
  assert.equal((finalExamConflict.payload.guide as { id?: string } | undefined)?.id, "final-exam-time-conflict");
  assert.match(String(finalExamConflict.payload.content), /College Advising Unit immediately/i);
  assert.match(String(finalExamConflict.payload.content), /does not state that the same-day overload rule automatically grants/i);
  assert.match(JSON.stringify(finalExamConflict.payload.citations), /final-exams-schedule-for-fall-semester-april-2026\.pdf/);

  const libraryResearchHelp = await ask("How can UAEU students get library or research help?", "203.0.113.230");
  assert.equal(libraryResearchHelp.payload.stateLabel, "guided_service");
  assert.equal(libraryResearchHelp.payload.resolutionState, "VERIFIED");
  assert.equal(libraryResearchHelp.payload.faqId, undefined, "the V3 service guide is not canonical answer selection");
  assert.equal((libraryResearchHelp.payload.guide as { id?: string } | undefined)?.id, "ask-a-librarian-research-help");
  assert.match(String(libraryResearchHelp.payload.content), /one-hour target.*within 48 hours/s);
  assert.match(String(libraryResearchHelp.payload.content), /official sources conflict/i);
  assert.match(JSON.stringify(libraryResearchHelp.payload.citations), /serviceId=98/);

  const housingApplication = await ask("How do I apply for UAEU student housing?", "203.0.113.254");
  assert.equal(housingApplication.payload.stateLabel, "guided_service");
  assert.equal(housingApplication.payload.resolutionState, "VERIFIED");
  assert.equal((housingApplication.payload.guide as { id?: string } | undefined)?.id, "student-housing-room-assignment");
  assert.match(JSON.stringify(housingApplication.payload.guide), /more than 50 km/u);
  assert.match(JSON.stringify(housingApplication.payload.citations), /serviceId=106/);

  const housingProcess = await ask("What is the process for applying for a room in student housing?", "203.0.113.252");
  assert.equal(housingProcess.payload.stateLabel, "guided_service");
  assert.equal((housingProcess.payload.guide as { id?: string } | undefined)?.id, "student-housing-room-assignment");
  assert.match(String(housingProcess.payload.content), /availability is not guaranteed/i);
  assert.match(String(housingProcess.payload.content), /selecting a room is not an assignment/i);

  const housingAdmissionGuarantee = await ask("Does being admitted guarantee a place in university housing?", "203.0.113.253");
  assert.equal(housingAdmissionGuarantee.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(housingAdmissionGuarantee.payload.faqId, "student-housing-application");
  assert.match(String(housingAdmissionGuarantee.payload.content), /Admission alone does not mean a room has been assigned/i);
  assert.match(String(housingAdmissionGuarantee.payload.content), /separate request/i);
  assert.match(String(housingAdmissionGuarantee.payload.content), /available room/i);
  assert.match(JSON.stringify(housingAdmissionGuarantee.payload.citations), /serviceId=106/);

  const studentClinic = await ask("Where can a UAEU student get medical care?", "203.0.113.255");
  assert.equal(studentClinic.payload.stateLabel, "guided_service");
  assert.equal(studentClinic.payload.resolutionState, "VERIFIED");
  assert.equal((studentClinic.payload.guide as { id?: string } | undefined)?.id, "student-medical-care");
  assert.match(JSON.stringify(studentClinic.payload.guide), /nearest Medical Clinic/u);
  assert.match(JSON.stringify(studentClinic.payload.citations), /serviceId=115/);

  const financialAidApplication = await ask("How do I apply for student financial aid through eServices?", "203.0.113.234");
  assert.equal(financialAidApplication.payload.stateLabel, "guided_service");
  assert.equal(financialAidApplication.payload.resolutionState, "VERIFIED");
  assert.equal((financialAidApplication.payload.guide as { id?: string } | undefined)?.id, "financial-aid-application");
  assert.match(String(financialAidApplication.payload.content), /four weeks.*academic calendar/i);
  assert.match(JSON.stringify(financialAidApplication.payload.citations), /financial-aid\/application\.shtml/);

  const thirdYearMajorChange = await ask("Can I switch my major from business administration to finance in third year?", "203.0.113.235");
  assert.equal(thirdYearMajorChange.payload.stateLabel, "guided_service");
  assert.equal(thirdYearMajorChange.payload.resolutionState, "VERIFIED");
  assert.equal((thirdYearMajorChange.payload.guide as { id?: string } | undefined)?.id, "change-undergraduate-major");
  assert.match(JSON.stringify(thirdYearMajorChange.payload.guide), /does not state a third-year cutoff/i);
  assert.match(String(thirdYearMajorChange.payload.content), /confirm the current procedure with your College Advising Unit/i);
  assert.match(String(thirdYearMajorChange.payload.content), /does not guarantee approval/i);

  const animalScienceElectives = await ask("What are the Animal Science concentration elective requirements?", "203.0.113.251");
  assert.equal(animalScienceElectives.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(animalScienceElectives.payload.topic, "marine-fisheries-and-animal-science");
  assert.equal(animalScienceElectives.payload.faqId, undefined, "an incomplete degree-title mention must not trigger a legacy canonical answer");
  assert.match(String(animalScienceElectives.payload.content), /cannot be established safely/);
  assert.doesNotMatch(String(animalScienceElectives.payload.content), /Computer Science/i, "course rules from another degree must not leak into the answer");

  const staffHandoff = await ask("I want to speak to a human advisor.", "203.0.113.246");
  assert.equal(staffHandoff.payload.stateLabel, "human_handoff");
  assert.equal(staffHandoff.payload.escalationReason, "student_requested_person");
  assert.match(JSON.stringify(staffHandoff.payload.citations), /uaeu\.ac\.ae\/en\/contact/);

  const programCatalog = await ask("Which degrees does UAEU offer?", "203.0.113.231");
  assert.equal(programCatalog.payload.stateLabel, "undergraduate_program_catalog");
  assert.equal(programCatalog.payload.resolutionState, "VERIFIED");
  assert.match(String(programCatalog.payload.content), /55 degree programs across 9 colleges/i);
  assert.match(String(programCatalog.payload.content), /Bachelor of Science in Cybersecurity/);
  assert.match(JSON.stringify(programCatalog.payload.citations), /undergraduate\/programs\/index\.shtml/);

  const namedDegreeIdentity = await ask(
    "For the published curriculum label 'Current published degree page', which degree title and college are recorded for Bachelor of Science in Statistics and Data Analytics? Cite the version-specific source.",
    "203.0.113.260",
  );
  assert.equal(namedDegreeIdentity.payload.stateLabel, "published_curriculum_snapshot");
  assert.match(String(namedDegreeIdentity.payload.content), /Bachelor of Science in Statistics and Data Analytics[\s\S]*College of Business and Economics/u);
  assert.doesNotMatch(String(namedDegreeIdentity.payload.content), /College of Science|8 degree programs/u,
    "the word Science in a program title must not trigger a college-wide program inventory");
  assert.match(JSON.stringify(namedDegreeIdentity.payload.citations), /bachelor-of-science-in-statistics-and-data-analytics\.shtml/u);

  const undergraduateApplication = await ask("What do I need to apply for an undergraduate degree?", "203.0.113.250");
  assert.equal(undergraduateApplication.payload.stateLabel, "guided_service");
  assert.equal(undergraduateApplication.payload.resolutionState, "VERIFIED");
  assert.equal((undergraduateApplication.payload.guide as { id?: string } | undefined)?.id, "undergraduate-admission-application");
  assert.match(JSON.stringify(undergraduateApplication.payload.guide), /Ministry of Higher Education.*international applicants.*UAEU/i);
  assert.doesNotMatch(String(undergraduateApplication.payload.content), /55 degree programs/);

  const arabicFramedUndergraduateDocuments = await ask(
    "\u0623\u062c\u0628 \u0627\u0633\u062a\u0646\u0627\u062f\u0627\u064b \u0625\u0644\u0649 \u0645\u0635\u062f\u0631 \u0631\u0633\u0645\u064a \u0644\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a\u060c \u0648\u0648\u0636\u0651\u062d \u062d\u062f\u0648\u062f \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0629: \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0637\u0644\u0628 \u0627\u0644\u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0648\u0633",
    "203.0.113.277",
    "ar",
  );
  assert.equal(arabicFramedUndergraduateDocuments.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(arabicFramedUndergraduateDocuments.payload.faqId, "admissions-documents-undergraduate");
  assert.match(String(arabicFramedUndergraduateDocuments.payload.content), /\u0634\u0647\u0627\u062f\u0629 \u0627\u0644\u062b\u0627\u0646\u0648\u064a\u0629/);
  assert.match(String(arabicFramedUndergraduateDocuments.payload.content), /\u0645\u0627 \u0641\u0626\u0629 \u0627\u0644\u0645\u062a\u0642\u062f\u0645/);
  assert.match(JSON.stringify(arabicFramedUndergraduateDocuments.payload.citations), /admission/);

  const externalTransfer = await ask("Can someone transfer from another university to UAEU?", "203.0.113.251");
  assert.equal(externalTransfer.payload.stateLabel, "guided_service");
  assert.equal((externalTransfer.payload.guide as { id?: string } | undefined)?.id, "undergraduate-transfer-and-credit-review");
  assert.match(JSON.stringify(externalTransfer.payload.guide), /receiving college determines whether each course is equivalent/i);
  assert.match(JSON.stringify(externalTransfer.payload.citations), /student_transfer_credit\.shtml/);

  const transferCreditReview = await ask("Will every course from my previous university count toward my degree?", "203.0.113.252");
  assert.equal(transferCreditReview.payload.stateLabel, "guided_service");
  assert.equal((transferCreditReview.payload.guide as { id?: string } | undefined)?.id, "undergraduate-transfer-and-credit-review");
  assert.match(JSON.stringify(transferCreditReview.payload.guide), /does not establish here|does not establish/i);
  assert.doesNotMatch(JSON.stringify(transferCreditReview.payload.guide), /every course will transfer/i);

  const cybersecurityCredits = await ask("How many credits do I need to graduate from Cybersecurity?", "203.0.113.232");
  assert.equal(cybersecurityCredits.payload.stateLabel, "v3_program_credit_model");
  assert.equal(cybersecurityCredits.payload.resolutionState, "CONDITIONAL");
  assert.match(String(cybersecurityCredits.payload.content), /curriculum requires \*\*120 credit hours\*\*/);
  assert.match(JSON.stringify(cybersecurityCredits.payload.citations), /bachelor-of-science-in-cybersecurity/);

  const dsaiCredits = await ask("How many credits do I need to graduate from Data Science and Artificial Intelligence?", "203.0.113.247");
  assert.equal(dsaiCredits.payload.stateLabel, "v3_program_credit_model");
  assert.equal(dsaiCredits.payload.resolutionState, "CONDITIONAL");
  assert.match(String(dsaiCredits.payload.content), /curriculum requires \*\*120 credit hours\*\*/);
  assert.match(JSON.stringify(dsaiCredits.payload.citations), /bachelor-of-science-in-data-science-and-artificial-intelligence/);

  const electricalCredits = await ask("How many credits do I need to graduate from Electrical Engineering?", "203.0.113.249");
  assert.equal(electricalCredits.payload.stateLabel, "v3_program_credit_model");
  assert.equal(electricalCredits.payload.resolutionState, "CONDITIONAL");
  assert.match(String(electricalCredits.payload.content), /curriculum requires \*\*132 credit hours\*\*/);
  assert.match(JSON.stringify(electricalCredits.payload.citations), /bachelor-of-science-in-electrical-engineering/);

  const securityIdentityQuestion = await ask("Did Cybersecurity replace Information Security?", "203.0.113.248");
  assert.equal(securityIdentityQuestion.payload.stateLabel, "academic_program_identity_review");
  assert.equal(securityIdentityQuestion.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(securityIdentityQuestion.payload.content), /cannot claim one replaced the other/i);

  const unscopedComputerEngineeringCredits = await ask("How many credit hours to graduate from Computer Engineering?", "203.0.113.233");
  assert.equal(unscopedComputerEngineeringCredits.payload.stateLabel, "academic_program_identity_review");
  assert.equal(unscopedComputerEngineeringCredits.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(unscopedComputerEngineeringCredits.payload.content), /entry year/i);

  const identified144Variant = await ask(
    "What total credits does the published curriculum for Bachelor of Science in Computer Engineering list for the cohort described as '144-credit source variant shown in the 2025 model-plan PDF with separate Fall and Spring sequences; exact cohort and revision mapping unresolved'? Cite the version-specific source.",
    "203.0.113.261",
  );
  assert.equal(identified144Variant.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(identified144Variant.payload.content), /144 total credit hours/u);
  assert.match(String(identified144Variant.payload.content), /separate Fall-entry 2025–2026-onward.*131 credits/u);
  assert.doesNotMatch(String(identified144Variant.payload.content), /For the 2025 entry cohort, the curriculum requires \*\*131/u,
    "the year in a described PDF label must not silently override the explicitly named 144-credit source variant");
  assert.match(JSON.stringify(identified144Variant.payload.citations), /cit_bsc_computer_engineering_study_plan\.pdf/u);

  const informationTechnologyTotalWithAuditCaveat = await ask(
    "What total credits does the published curriculum for Bachelor of Science in Information Technology list for the cohort described as 'Currently published catalog requirements; cohort plan and individual degree audit control'? Cite the version-specific source.",
    "203.0.113.269",
  );
  assert.equal(informationTechnologyTotalWithAuditCaveat.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(informationTechnologyTotalWithAuditCaveat.payload.content), /lists \*\*120 total credit hours\*\*/u);
  assert.match(JSON.stringify(informationTechnologyTotalWithAuditCaveat.payload.citations), /bsc_in_it_study_plan_fall_2025_onwards\.pdf/u);

  const informationTechnologyCreditAllocations = await ask(
    "What credit allocations does the published Bachelor of Science in Information Technology curriculum list for the cohort described as 'Currently published catalog requirements; cohort plan and individual degree audit control'? Cite the version-specific source.",
    "203.0.113.270",
  );
  assert.equal(informationTechnologyCreditAllocations.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(informationTechnologyCreditAllocations.payload.content), /General education[^\n]*21/u);
  assert.match(String(informationTechnologyCreditAllocations.payload.content), /College requirements[^\n]*41/u);
  assert.match(String(informationTechnologyCreditAllocations.payload.content), /Major requirements[^\n]*37/u);

  const arabic144CreditVariant = await ask(
    "\u0645\u0627 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0630\u064a \u064a\u0646\u0635 \u0639\u0644\u064a\u0647 \u0645\u0646\u0647\u062c Bachelor of Science in Computer Engineering \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0644\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0648\u0635\u0648\u0641\u0629 \u0628\u0623\u0646\u0647\u0627 '144-credit source variant shown in the 2025 model-plan PDF with separate Fall and Spring sequences; exact cohort and revision mapping unresolved'? \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    "203.0.113.281",
    "ar",
  );
  assert.equal(arabic144CreditVariant.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(arabic144CreditVariant.payload.content), /144 \u0633\u0627\u0639\u0629 \u0645\u0639\u062a\u0645\u062f\u0629/u);
  assert.ok((arabic144CreditVariant.payload.evidenceIds as string[]).includes("academic-program:bsc-computer-engineering:computer-engineering-cohort-model-144"));

  const exactHorticulture2025Label = await ask(
    "What total credits does the published curriculum for Bachelor of Science in Horticulture list for the cohort described as 'The PDF labels these plans 2025\u20132026 cohort-onwards plans and includes separate Environment Horticulture and Crop Production and Organic Farming schedules for Fall and Spring admissions.' Cite the version-specific source.",
    "203.0.113.282",
  );
  assert.equal(exactHorticulture2025Label.payload.stateLabel, "v3_program_credit_model");
  assert.ok((exactHorticulture2025Label.payload.evidenceIds as string[]).includes("academic-program:horticulture:horticulture-2025-model-plans"));

  const guillemetMarketingLabel = await ask(
    "Combien de crédits le cursus publié de Bachelor of Business Administration in Marketing indique-t-il pour le groupe décrit comme \u00ab Fall 2025 entrants and later cohorts covered by the published model plan; explicit Fall entry is required and the assigned plan must be confirmed \u00bb ?",
    "203.0.113.284",
  );
  assert.equal(guillemetMarketingLabel.payload.stateLabel, "v3_program_credit_model");
  assert.ok((guillemetMarketingLabel.payload.evidenceIds as string[]).includes("academic-program:marketing:marketing-2025-plan-total-only"));

  const urduCommunicationEngineeringVersion = await ask(
    "'Students entering Fall or Spring from the 2026-2027 cohort onward, using the published 2026 model plan' گروپ کے لیے Bachelor of Science in Communication Engineering کی شائع شدہ کریڈٹ تقسیم کیا ہے؟ مخصوصہ نسخے کا ماخذ بھی بتائیں۔",
    "203.0.113.285",
  );
  assert.equal(urduCommunicationEngineeringVersion.payload.stateLabel, "v3_program_credit_model");
  assert.ok((urduCommunicationEngineeringVersion.payload.evidenceIds as string[]).includes("academic-program:communication-engineering:communication-engineering-2026-plan-132-fall-spring"));

  const historicArmLabelWithNewerYearMention = await ask(
    "What total credits does the published curriculum for Bachelor of Science in Agricultural Resource Management list for the cohort described as 'The 2022-2023 model plan applies from its named cohort until the newer 2025-2026 model plan; both Fall and Spring entry schedules are published.' Cite the version-specific source.",
    "203.0.113.283",
  );
  assert.equal(historicArmLabelWithNewerYearMention.payload.stateLabel, "v3_program_credit_model");
  assert.ok((historicArmLabelWithNewerYearMention.payload.evidenceIds as string[]).includes("academic-program:agricultural-resource-management:arm-2022-model-plan"));

  const localizedCurriculumCreditQuestions = [
    { question: "\u00bfCu\u00e1ntos cr\u00e9ditos indica el curr\u00edculo publicado de Bachelor of Arts in Psychology para el grupo descrito como 'Students admitted from Fall or Spring 2025-2026 onwards'?", ip: "203.0.113.273" },
    { question: "Combien de cr\u00e9dits le cursus publi\u00e9 de Bachelor of Arts in Psychology indique-t-il pour le groupe d\u00e9crit comme 'Students admitted from Fall or Spring 2025-2026 onwards' ?", ip: "203.0.113.274" },
    { question: "Bachelor of Arts in Psychology \u0915\u0947 \u092a\u094d\u0930\u0915\u093e\u0936\u093f\u0924 \u092a\u093e\u0920\u094d\u092f\u0915\u094d\u0930\u092e \u092e\u0947\u0902 \u0915\u0941\u0932 \u0915\u093f\u0924\u0928\u0947 \u0915\u094d\u0930\u0947\u0921\u093f\u091f \u0939\u0948\u0902?", ip: "203.0.113.275" },
    { question: "Bachelor of Arts in Psychology \u06a9\u06d2 \u0634\u0627\u0626\u0639 \u0634\u062f\u06c1 \u0646\u0635\u0627\u0628 \u0645\u06cc\u06ba \u06a9\u0644 \u06a9\u062a\u0646\u06d2 \u06a9\u0631\u06cc\u0688\u0679\u0633 \u06c1\u06cc\u06ba\u061f", ip: "203.0.113.276" },
  ];
  for (const probe of localizedCurriculumCreditQuestions) {
    const result = await ask(probe.question, probe.ip);
    assert.equal(result.payload.stateLabel, "v3_program_credit_model");
    assert.match(String(result.payload.content), /120(?: total)? credit hours/u);
  }

  const statisticsDegreeIdentity = await ask(
    "For the published curriculum label 'Current published degree page; entry-cohort applicability unresolved', which degree title and college are recorded for Bachelor of Science in Statistics and Data Analytics? Cite the version-specific source.",
    "203.0.113.271",
  );
  assert.equal(statisticsDegreeIdentity.payload.stateLabel, "published_curriculum_snapshot");
  assert.match(String(statisticsDegreeIdentity.payload.content), /Bachelor of Science in Statistics and Data Analytics/u);
  assert.match(String(statisticsDegreeIdentity.payload.content), /College of Business and Economics/u);
  assert.doesNotMatch(String(statisticsDegreeIdentity.payload.content), /College of Science/u);

  const accountingApplicabilityLabel = await ask(
    "What applicability statement does UAEU publish for Bachelor of Accounting for the cohort described as 'Fall 2025 entrants and later cohorts identified by the published model plan; confirm the assigned Degree Works plan'? Cite the version-specific source.",
    "203.0.113.272",
  );
  assert.equal(accountingApplicabilityLabel.payload.stateLabel, "published_curriculum_snapshot");
  assert.match(String(accountingApplicabilityLabel.payload.content), /Fall 2025 entrants and later cohorts identified by the published model plan/u);
  assert.match(JSON.stringify(accountingApplicabilityLabel.payload.citations), /bachelor-of-accounting\.shtml/u);

  const marineCreditsDespiteQuotedPathwayLabel = await ask(
    "\u0645\u0627 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0630\u064a \u064a\u0646\u0635 \u0639\u0644\u064a\u0647 \u0645\u0646\u0647\u062c Bachelor of Science in Marine Fisheries and Animal Science \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0644\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0648\u0635\u0648\u0641\u0629 \u0628\u0623\u0646\u0647\u0627 'The linked PDF labels these plans 2022?2023 cohort onwards; separate Fall and Spring entry schedules are shown for two concentrations.'\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    "203.0.113.265",
    "ar",
  );
  assert.equal(marineCreditsDespiteQuotedPathwayLabel.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(marineCreditsDespiteQuotedPathwayLabel.payload.content), /120/u);
  assert.match(JSON.stringify(marineCreditsDespiteQuotedPathwayLabel.payload.citations), /marine-fisheries-and-animal-science/u);

  const aerospacePublishedCohortLabel = await ask(
    "\u0645\u0627 \u0639\u0628\u0627\u0631\u0629 \u0627\u0644\u0627\u0646\u0637\u0628\u0627\u0642 \u0627\u0644\u062a\u064a \u062a\u0646\u0634\u0631\u0647\u0627 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a \u0644\u0628\u0631\u0646\u0627\u0645\u062c Bachelor of Science in Aerospace Engineering \u0644\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0648\u0635\u0648\u0641\u0629 \u0628\u0623\u0646\u0647\u0627 'Current published Aerospace Engineering catalog; confirm an earlier cohort against its linked model plan and assigned Degree Works plan'\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    "203.0.113.266",
    "ar",
  );
  assert.equal(aerospacePublishedCohortLabel.payload.stateLabel, "published_curriculum_snapshot");
  assert.match(String(aerospacePublishedCohortLabel.payload.content), /Current published Aerospace Engineering catalog/u);
  assert.doesNotMatch(String(aerospacePublishedCohortLabel.payload.content), /132 credit hours/u);

  const architecturalProgramIdentity = await ask(
    "\u0648\u0641\u0642 \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 'Students whose assigned plan matches the published 2023-2024 model plan onwards'\u060c \u0645\u0627 \u0627\u0633\u0645 \u0627\u0644\u062f\u0631\u062c\u0629 \u0648\u0627\u0644\u0643\u0644\u064a\u0629 \u0627\u0644\u0645\u0633\u062c\u0644\u0627\u0646 \u0644\u0628\u0631\u0646\u0627\u0645\u062c Bachelor of Science in Architectural Engineering\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    "203.0.113.267",
    "ar",
  );
  assert.equal(architecturalProgramIdentity.payload.stateLabel, "published_curriculum_snapshot");
  assert.match(String(architecturalProgramIdentity.payload.content), /Bachelor of Science in Architectural Engineering/u);
  assert.match(String(architecturalProgramIdentity.payload.content), /College of Engineering/u);

  const veterinaryProgramIdentity = await ask(
    "\u0648\u0641\u0642 \u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 'Fall-entry students assigned the published 2022-2023 Veterinary Medicine model plan'\u060c \u0645\u0627 \u0627\u0633\u0645 \u0627\u0644\u062f\u0631\u062c\u0629 \u0648\u0627\u0644\u0643\u0644\u064a\u0629 \u0627\u0644\u0645\u0633\u062c\u0644\u0627\u0646 \u0644\u0628\u0631\u0646\u0627\u0645\u062c Bachelor of Veterinary Medicine\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    "203.0.113.268",
    "ar",
  );
  assert.equal(veterinaryProgramIdentity.payload.stateLabel, "published_curriculum_snapshot");
  assert.match(String(veterinaryProgramIdentity.payload.content), /Bachelor of Veterinary Medicine/u);
  assert.match(String(veterinaryProgramIdentity.payload.content), /College of Agriculture and Veterinary Medicine/u);

  const mixedScriptArabicDegreeTotal = await ask(
    "\u0645\u0627 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0630\u064a \u064a\u0646\u0635 \u0639\u0644\u064a\u0647 \u0645\u0646\u0647\u062c Bachelor of Arts in Arabic Language and Literature \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0644\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0648\u0635\u0648\u0641\u0629 \u0628\u0623\u0646\u0647\u0627 'Students admitted from Fall or Spring 2025-2026 onwards'\u061f \u0645\u0639 \u0630\u0643\u0631 \u0645\u0635\u062f\u0631 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    "203.0.113.262",
    "ar",
  );
  assert.equal(mixedScriptArabicDegreeTotal.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(mixedScriptArabicDegreeTotal.payload.content), /120/u);
  assert.match(JSON.stringify(mixedScriptArabicDegreeTotal.payload.citations), /bachelor-of-arts-in-arabic-language-and-literature/u);
  assert.doesNotMatch(String(mixedScriptArabicDegreeTotal.payload.content), /temporarily unavailable|could not verify/u);

  const calendarFollowUp = await askMessages([
    { role: "user", content: "Where can I check UAEU academic calendar deadlines?" },
    { role: "assistant", content: "Which term, year, and applicant category do you mean?" },
    { role: "user", content: "year 2026 fall" },
  ], "203.0.113.223");
  assert.equal(calendarFollowUp.payload.stateLabel, "v3_verified_source_location");
  assert.match(String(calendarFollowUp.payload.content), /official UAEU academic calendar/i);
  assert.doesNotMatch(String(calendarFollowUp.payload.content), /refund|scholarship/i);

  const fridayLibraryFollowUp = await askMessages([
    { role: "user", content: "When can I visit the Main Library on a weekday?" },
    { role: "assistant", content: "The Main Library lists weekday and Friday opening hours." },
    { role: "user", content: "And on Friday?" },
  ], "203.0.113.222");
  assert.equal(fridayLibraryFollowUp.status, 200);
  assert.match(String(fridayLibraryFollowUp.payload.content), /Friday.*7:30 a\.m\..*12:00 noon/is);
  assert.doesNotMatch(String(fridayLibraryFollowUp.payload.content), /Monday|Thursday|Saturday|Sunday/i);
  assert.ok(String(fridayLibraryFollowUp.payload.content).length < 220,
    "a simple day follow-up should answer the requested hours without repeating the full library policy");
  assert.match(JSON.stringify(fridayLibraryFollowUp.payload.citations), /uaeu\.ac\.ae\/en\/library/);

  const medicineScopeFollowUp = resolveConversation([
    { role: "user", content: "What minimum CGPA does a bachelor's student need to graduate?" },
    { role: "assistant", content: "A bachelor's student needs a 2.00 CGPA, excluding the College of Medicine and Health Sciences." },
    { role: "user", content: "Would that also be the rule for medicine?" },
  ], "Would that also be the rule for medicine?");
  assert.equal(medicineScopeFollowUp.usedContext, true);
  assert.equal(medicineScopeFollowUp.subject?.key, "medicine");
  assert.match(medicineScopeFollowUp.query, /Requested fact: gpa/i);
  assert.doesNotMatch(medicineScopeFollowUp.query, /2\.00/);
  assert.ok(retrieveVerifiedEvidence(medicineScopeFollowUp.query, 6).some((row) => row.source === "answer:graduation-policy-applicability"),
    "a reviewed applicability answer must be retrievable when the student asks about medicine");
  const medicineScopeAnswer = await askMessages([
    { role: "user", content: "What minimum CGPA does a bachelor's student need to graduate?" },
    { role: "assistant", content: "A bachelor's student needs a 2.00 CGPA, excluding the College of Medicine and Health Sciences." },
    { role: "user", content: "Would that also be the rule for medicine?" },
  ], "203.0.113.226");
  assert.equal(medicineScopeAnswer.status, 200);
  assert.equal(medicineScopeAnswer.payload.stateLabel, "v3_reviewed_policy_applicability", "a fully reviewed applicability record should answer deterministically");
  assert.match(String(medicineScopeAnswer.payload.content), /excludes the College of Medicine and Health Sciences/i);
  assert.match(String(medicineScopeAnswer.payload.content), /does not state a numeric minimum graduation CGPA/i);
  assert.doesNotMatch(String(medicineScopeAnswer.payload.content), /2\.00/);
  assert.match(JSON.stringify(medicineScopeAnswer.payload.citations), /6_degree_completion_and_graduation-en\.pdf/);

  const admissionsDeadline = await ask("When is the admission deadline for Fall 2027?", "203.0.113.224");
  assert.equal(admissionsDeadline.payload.resolutionState, "CONDITIONAL");
  assert.equal(admissionsDeadline.payload.faqId, "admissions-application-deadline");
  assert.match(String(admissionsDeadline.payload.content), /applicant category/i);
  assert.match(JSON.stringify(admissionsDeadline.payload.citations), /ServiceCatalog\/details\?serviceId=89/);
  assert.doesNotMatch(String(admissionsDeadline.payload.content), /scholarship/i);

  const wrappedAdmissionsQuestion = await ask(
    "I need the current published UAEU answer, with its scope made clear: How do I apply to UAEU as a first-year undergraduate?",
    "203.0.113.228",
  );
  assert.equal(wrappedAdmissionsQuestion.payload.faqId, "admissions-apply-undergraduate");
  assert.equal(wrappedAdmissionsQuestion.payload.resolutionState, "VERIFIED");
  assert.match(String(wrappedAdmissionsQuestion.payload.content), /UAE nationals[\s\S]*International/i);
  assert.match(JSON.stringify(wrappedAdmissionsQuestion.payload.citations), /ServiceCatalog\/details\?serviceId=89/);

  const fall2026AdmissionsDeadline = await ask("When is the application deadline for Fall 2026 undergraduate admission?", "203.0.113.241");
  assert.equal(fall2026AdmissionsDeadline.status, 200);
  assert.equal(fall2026AdmissionsDeadline.payload.stateLabel, "v3_reviewed_answer");
  assert.equal(fall2026AdmissionsDeadline.payload.faqId, "admissions-fall-2026-cycle-status");
  assert.equal(fall2026AdmissionsDeadline.payload.resolutionState, "CONDITIONAL");
  assert.match(String(fall2026AdmissionsDeadline.payload.content), /Fall 2026 is already in progress/i);
  assert.match(String(fall2026AdmissionsDeadline.payload.content), /Spring 2027[\s\S]*15 December 2026/i);
  assert.match(String(fall2026AdmissionsDeadline.payload.content), /Do not assume this date applies to every applicant category/i);
  assert.match(String(fall2026AdmissionsDeadline.payload.content), /UAE nationals and children of Emirati mothers[\s\S]*Ministry portal/i);
  assert.match(JSON.stringify(fall2026AdmissionsDeadline.payload.citations), /ServiceCatalog\/details\?serviceId=89/);
  assert.match(JSON.stringify(fall2026AdmissionsDeadline.payload.citations), /uaeu\.ac\.ae\/en\//);
  assert.match(JSON.stringify(fall2026AdmissionsDeadline.payload.citations), /undergraduate-admissions-current-student\.shtml/);
  assert.match(JSON.stringify(fall2026AdmissionsDeadline.payload.citations), /calendar\/index\.shtml/);
  assert.doesNotMatch(String(fall2026AdmissionsDeadline.payload.content), /scholarship|course-registration date is the admission deadline/i);

  const prerequisiteOverride = await ask("Can I request a prerequisite override?", "203.0.113.223");
  assert.equal(prerequisiteOverride.payload.faqId, "prerequisite-override");
  assert.match(String(prerequisiteOverride.payload.content), /approval from the concerned Dean/i);
  assert.match(JSON.stringify(prerequisiteOverride.payload.citations), /undergraduate_registration_and_enrollment-en\.pdf/);

  const failedCourse = await ask("What can I do if I fail Data Structure course?", "203.0.113.222");
  assert.equal(failedCourse.status, 200);
  assert.equal(failedCourse.payload.faqId, undefined, "V3 must not return the legacy canonical FAQ answer");
  assert.notEqual(failedCourse.payload.stateLabel, "verified_answer");
  assert.ok(["UNSUPPORTED", "CONDITIONAL"].includes(String(failedCourse.payload.resolutionState)), "mock provider output is not an answer-quality evaluation");
  assert.doesNotMatch(String(failedCourse.payload.content), /CSBP319/, "V3 must not apply a guessed course identity");

  const failedTwice = await ask("What can I do if I fail Data Structures twice?", "203.0.113.225");
  assert.equal(failedTwice.status, 200);
  assert.notEqual(failedTwice.payload.stateLabel, "v3_missing_context", "a code must not block the general reviewed repeat policy");
  assert.doesNotMatch(String(failedTwice.payload.content), /CSBP319/, "repeat policy guidance must not assume a course code");

  const combinedFailedCourseAndNextCourse = await ask(
    "I failed CSBP319 Data Structures twice and I am in year 2. Can I take CSBP320 next semester, and what should I do first?",
    "203.0.113.254",
  );
  assert.equal(combinedFailedCourseAndNextCourse.status, 200);
  assert.equal(combinedFailedCourseAndNextCourse.payload.stateLabel, "v3_combined_academic_scenario");
  assert.match(String(combinedFailedCourseAndNextCourse.payload.content), /CSBP319 Data Structures[\s\S]*CSBP320 Data Mining[\s\S]*STAT210/);
  assert.match(String(combinedFailedCourseAndNextCourse.payload.content), /failed compulsory course must be repeated/i);
  assert.match(String(combinedFailedCourseAndNextCourse.payload.content), /all attempts and grades remain on the transcript/i);
  assert.match(JSON.stringify(combinedFailedCourseAndNextCourse.payload.citations), /4_grades_and_grading-en\.pdf/);
  assert.match(JSON.stringify(combinedFailedCourseAndNextCourse.payload.citations), /id=CSBP320/);

  const prerequisiteAssessment = await askMessages([
    { role: "user", content: "I passed STAT210 with D and ITBP301 with C." },
    { role: "assistant", content: "What course do you want to check?" },
    { role: "user", content: "Can I take ISEC421?" },
  ], "203.0.113.226");
  assert.equal(prerequisiteAssessment.status, 200);
  assert.equal(prerequisiteAssessment.payload.stateLabel, "v3_academic_rule_evaluation");
  assert.equal(prerequisiteAssessment.payload.resolutionState, "UNSUPPORTED");
  assert.match(String(prerequisiteAssessment.payload.content), /Official sources conflict on ISEC421 prerequisites/i);
  assert.match(String(prerequisiteAssessment.payload.content), /STAT210[\s\S]*ITBP301/);
  assert.match(String(prerequisiteAssessment.payload.content), /cannot give a personal eligibility verdict/i);
  assert.match(JSON.stringify(prerequisiteAssessment.payload.citations), /ISEC421 Risk Analysis and Management/);

  const incompletePrerequisites = await ask("Can I take ISEC421?", "203.0.113.227");
  assert.equal(incompletePrerequisites.payload.stateLabel, "v3_academic_rule_evaluation");
  assert.equal(incompletePrerequisites.payload.resolutionState, "UNSUPPORTED", "the unresolved official-source conflict remains the controlling limitation even when student grades are absent");
  assert.match(String(incompletePrerequisites.payload.content), /Official sources conflict on ISEC421 prerequisites/i);
  assert.match(String(incompletePrerequisites.payload.content), /STAT210[\s\S]*ITBP301/);

  const catalogPrerequisiteAssessment = await askMessages([
    { role: "user", content: "I passed FINC110 with B." },
    { role: "assistant", content: "Which course do you want to check?" },
    { role: "user", content: "Can I take FINC120?" },
  ], "203.0.113.243");
  assert.equal(catalogPrerequisiteAssessment.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(catalogPrerequisiteAssessment.payload.resolutionState, "CONDITIONAL");
  assert.match(String(catalogPrerequisiteAssessment.payload.content), /completion of FINC110/);
  assert.match(String(catalogPrerequisiteAssessment.payload.content), /modeled prerequisite is satisfied/);

  const contextualCatalogPrerequisite = await askMessages([
    { role: "user", content: "Can I register for FINC210?" },
    { role: "assistant", content: "Share the relevant completed and current courses." },
    { role: "user", content: "I passed ACCT111 with grade D, and I'm currently taking ECON105. Can I take that course?" },
  ], "203.0.113.253");
  assert.equal(contextualCatalogPrerequisite.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(contextualCatalogPrerequisite.payload.resolutionState, "CONDITIONAL");
  assert.match(String(contextualCatalogPrerequisite.payload.content), /ACCT111/);
  assert.match(String(contextualCatalogPrerequisite.payload.content), /modeled prerequisite is satisfied/i);
  assert.match(JSON.stringify(contextualCatalogPrerequisite.payload.citations), /course_2911\.shtml\?id=FINC210/);

  const courseThread: { role: "user" | "assistant"; content: string }[] = [];
  const courseThreadTurns = [
    { question: "Which classes do I need to pass before CSBP 319?", expectedCode: /CSBP319[\s\S]*CSBP219[\s\S]*CSBP221/ },
    { question: "And what about csbp-411?", expectedCode: /CSBP411[\s\S]*CSBP301.*minimum grade D/ },
    { question: "Does that one need a minimum grade?", expectedCode: /CSBP411[\s\S]*CSBP301.*minimum grade D/ },
    { question: "Remind me of the requirements for the first course I mentioned.", expectedCode: /CSBP319[\s\S]*CSBP219[\s\S]*CSBP221/ },
  ];
  const firstCourseFollowUp = [...courseThread, { role: "user" as const, content: courseThreadTurns[0].question }, { role: "assistant" as const, content: "verified" }, { role: "user" as const, content: courseThreadTurns[1].question }, { role: "assistant" as const, content: "verified" }, { role: "user" as const, content: courseThreadTurns[2].question }, { role: "assistant" as const, content: "verified" }, { role: "user" as const, content: courseThreadTurns[3].question }];
  assert.equal(isCoursePrerequisiteFollowUp(firstCourseFollowUp), true);
  assert.equal(catalogTargetCodeFromMessages(firstCourseFollowUp), "CSBP319");
  assert.equal(catalogTargetCodeFromMessages([
    { role: "user", content: "How can I take Data Structures in my Computer Science major?" },
    { role: "assistant", content: "I can help you check the course requirements." },
    { role: "user", content: "What are the prerequisites for this course?" },
  ]), "CSBP319", "a course named by title must remain available to a follow-up even without a course code in the first turn");
  for (const [index, turn] of courseThreadTurns.entries()) {
    const requestMessages = [...courseThread, { role: "user" as const, content: turn.question }];
    if (index > 0) assert.equal(isCoursePrerequisiteFollowUp(requestMessages), true, `course-thread turn ${index + 1} should inherit the prerequisite request`);
    if (index === 1) assert.equal(catalogTargetCodeFromMessages(requestMessages), "CSBP411", "the hyphenated follow-up course code must be recognized");
    const answer = await askMessages(requestMessages, `203.0.113.${180 + index}`);
    assert.equal(answer.status, 200);
    assert.equal(answer.payload.stateLabel, "v3_official_course_catalog_lookup", `course-thread turn ${index + 1} should use the official course catalog`);
    assert.equal(answer.payload.resolutionState, "VERIFIED");
    assert.match(String(answer.payload.content), turn.expectedCode, `course-thread turn ${index + 1} should preserve the intended course reference`);
    assert.match(JSON.stringify(answer.payload.citations), /uaeu\.ac\.ae\/en\/catalog\/courses\//);
    courseThread.push({ role: "user", content: turn.question }, { role: "assistant", content: String(answer.payload.content) });
  }

  const chme330PrerequisiteAssessment = await askMessages([
    { role: "user", content: "Can I register for CHME330? I passed PHYS105 with grade D, and am taking CHME300." },
  ], "203.0.113.254");
  assert.equal(chme330PrerequisiteAssessment.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(chme330PrerequisiteAssessment.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(chme330PrerequisiteAssessment.payload.content), /PHYS135/,
    "the exact reviewed source repair must retain the separately listed PHYS135 prerequisite");
  assert.match(String(chme330PrerequisiteAssessment.payload.content), /CHME300 is listed as current/,
    "a coordinated 'and am taking' clause must preserve current enrollment instead of falsely reporting it missing");
  assert.doesNotMatch(String(chme330PrerequisiteAssessment.payload.content), /PETE290 is not listed as current|No recognized completed grade was supplied for (?:CHME300|PETE290)/,
    "a satisfied CHME300 concurrent alternative must not be accompanied by irrelevant missing facts for PETE290 or completed CHME300");

  const passGradePrerequisiteAssessment = await askMessages([
    { role: "user", content: "I passed ACCT101 with P." },
    { role: "assistant", content: "Which course do you want to check?" },
    { role: "user", content: "Can I take ACCT103?" },
  ], "203.0.113.245");
  assert.equal(passGradePrerequisiteAssessment.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(passGradePrerequisiteAssessment.payload.resolutionState, "CONDITIONAL");
  assert.match(String(passGradePrerequisiteAssessment.payload.content), /completion of ACCT101/);
  assert.match(String(passGradePrerequisiteAssessment.payload.content), /modeled prerequisite is satisfied/);

  const numericGradePrerequisite = await ask("I passed CURR103 with grade 60. Can I take CURR232?", "203.0.113.242");
  assert.equal(numericGradePrerequisite.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(numericGradePrerequisite.payload.resolutionState, "CONDITIONAL");
  assert.match(String(numericGradePrerequisite.payload.content), /CURR103 with a minimum mark of 60/);
  assert.match(String(numericGradePrerequisite.payload.content), /modeled prerequisite is satisfied/);
  assert.match(JSON.stringify(numericGradePrerequisite.payload.citations), /course_2910\.shtml\?id=CURR232/);

  const passedWithoutLetterGrade = await ask("I passed PSYC304 and PSYC401. Can I take PSYC413?", "203.0.113.252");
  assert.equal(passedWithoutLetterGrade.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(passedWithoutLetterGrade.payload.resolutionState, "CONDITIONAL");
  assert.match(String(passedWithoutLetterGrade.payload.content), /modeled prerequisite is satisfied/i,
    "explicit passes without stated grades satisfy completion-only source requirements");

  const inlinePreCorequisite = await ask("I passed LNG100 with grade D and I'm currently taking SLP106. Can I take LNG450?", "203.0.113.253");
  assert.equal(inlinePreCorequisite.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(inlinePreCorequisite.payload.resolutionState, "CONDITIONAL");
  assert.match(String(inlinePreCorequisite.payload.content), /modeled prerequisite is satisfied/i,
    "an explicitly marked inline Pre/Co course can be satisfied by current enrollment");

  const unsupportedPrerequisiteAssessment = await ask("Can I take STAT488?", "203.0.113.244");
  assert.equal(unsupportedPrerequisiteAssessment.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(unsupportedPrerequisiteAssessment.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(unsupportedPrerequisiteAssessment.payload.content), /STAT480/);
  assert.match(String(unsupportedPrerequisiteAssessment.payload.content), /STAT482/);
  assert.match(String(unsupportedPrerequisiteAssessment.payload.content), /cannot determine/i);
  assert.match(String(unsupportedPrerequisiteAssessment.payload.content), /completion of, or current enrollment in, either STAT480 or STAT482/i);

  const completedCorequisite = await askMessages([
    { role: "user", content: "I passed STAT480 with B." },
    { role: "user", content: "Can I take STAT488?" },
  ], "203.0.113.251");
  assert.equal(completedCorequisite.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(completedCorequisite.payload.resolutionState, "CONDITIONAL");
  assert.match(String(completedCorequisite.payload.content), /STAT480/);
  assert.match(String(completedCorequisite.payload.content), /modeled prerequisite is satisfied/i);

  const concurrentCorequisite = await askMessages([
    { role: "user", content: "I am currently taking STAT482." },
    { role: "user", content: "Can I take STAT488?" },
  ], "203.0.113.252");
  assert.equal(concurrentCorequisite.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(concurrentCorequisite.payload.resolutionState, "CONDITIONAL");
  assert.match(String(concurrentCorequisite.payload.content), /STAT482/);
  assert.match(String(concurrentCorequisite.payload.content), /modeled prerequisite is satisfied/i);

  const catalogPrerequisites = await ask("What are the prerequisites for CSBP319?", "203.0.113.241");
  assert.equal(catalogPrerequisites.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.equal(catalogPrerequisites.payload.resolutionState, "VERIFIED");
  assert.match(String(catalogPrerequisites.payload.content), /CSBP219[\s\S]*Pre\/Co requirement[\s\S]*CSBP221/);
  assert.doesNotMatch(String(catalogPrerequisites.payload.content), /No recognized completed grade/);

  const arabicCatalogFact = await ask("\u0648\u0634 \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0645\u0627\u062f\u0629 ISEC-421 \u0648\u0643\u0645 \u0633\u0627\u0639\u062a\u0647\u0627\u061f", "203.0.113.238", "ar");
  assert.equal(arabicCatalogFact.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.equal(arabicCatalogFact.payload.resolutionState, "CONFLICTED");
  assert.match(String(arabicCatalogFact.payload.content), /ISEC421 Risk Analysis and Management[\s\S]*STAT210[\s\S]*ITBP301/);
  assert.ok(String(arabicCatalogFact.payload.content).includes("3 \u0633\u0627\u0639\u0627\u062a"));
  assert.match(String(arabicCatalogFact.payload.content), /\u0633\u0627\u0639\u062a\u064a\u0646/u,
    "the Arabic response must disclose the plan's two-credit value even when it spells out the numeral");
  assert.match(JSON.stringify(arabicCatalogFact.payload.citations), /course_2931\.shtml\?id=ISEC421/);
  assert.match(JSON.stringify(arabicCatalogFact.payload.citations), /(?:bsc_information_security_study_plan|bsc_in_is_study_plan_fall_2025_onwards)\.pdf/);

  const arabicCatalogTitle = await ask("\u0645\u0627 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0644\u0644\u0645\u0642\u0631\u0631 ARAG428 \u0641\u064a \u062f\u0644\u064a\u0644 \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a\u061f", "203.0.113.234", "ar");
  assert.equal(arabicCatalogTitle.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.match(String(arabicCatalogTitle.payload.content), /ARAG428[\s\S]*Animal Welfare/);

  const arabicCatalogPrerequisites = await ask("\u0645\u0627 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u0637\u0644\u0628 \u0627\u0644\u0633\u0627\u0628\u0642 \u0623\u0648 \u0627\u0644\u0645\u0635\u0627\u062d\u0628 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0644\u0644\u0645\u0642\u0631\u0631 CSBP319\u061f", "203.0.113.235", "ar");
  assert.equal(arabicCatalogPrerequisites.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.match(String(arabicCatalogPrerequisites.payload.content), /CSBP219[\s\S]*CSBP221/);

  const sameTermCourseRule = await ask("Can I take CSBP319 and its programming lab in the same semester?", "203.0.113.237");
  assert.equal(sameTermCourseRule.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.equal(sameTermCourseRule.payload.resolutionState, "VERIFIED");
  assert.match(String(sameTermCourseRule.payload.content), /CSBP221[\s\S]*(?:before|concurrently)/i);

  const missingNamedPrerequisite = await ask("I have passed CSBP119 but not CSBP219. Am I ready for Data Structures?", "203.0.113.236");
  assert.equal(missingNamedPrerequisite.payload.stateLabel, "v3_academic_rule_evaluation");
  assert.equal(missingNamedPrerequisite.payload.resolutionState, "CONDITIONAL");
  assert.match(String(missingNamedPrerequisite.payload.content), /CSBP219[\s\S]*not satisfied/i);

  const arabicPrerequisite = await ask("هل أستطيع تسجيل CSBP319؟", "203.0.113.239", "ar");
  assert.equal(arabicPrerequisite.payload.stateLabel, "v3_academic_rule_evaluation");
  assert.equal(arabicPrerequisite.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(arabicPrerequisite.payload.content), /CSBP219[\s\S]*CSBP221/);
  assert.doesNotMatch(String(arabicPrerequisite.payload.content), /No recognized completed grade|is listed as current/);

  const arabicAdmissionsDeadline = await ask("ما آخر موعد للتقديم في جامعة الإمارات؟", "203.0.113.240", "ar");
  assert.equal(arabicAdmissionsDeadline.payload.resolutionState, "CONDITIONAL");
  assert.match(String(arabicAdmissionsDeadline.payload.content), /فئة المتقدم/);
  assert.match(String(arabicAdmissionsDeadline.payload.content), /لا تحدد تاريخ إغلاق لدورة قبول بعينها/);
  assert.match(String(arabicAdmissionsDeadline.payload.content), /\u0623\u062E\u0628\u0631\u0646\u064A \u0628\u0641\u0626\u0629 \u0627\u0644\u0645\u062A\u0642\u062F\u0645/u);
  assert.match(JSON.stringify(arabicAdmissionsDeadline.payload.citations), /ServiceCatalog\/details\?serviceId=89/);
  assert.match(String(arabicAdmissionsDeadline.payload.content), /موعد تسجيل المساقات في التقويم ليس موعد القبول/);
  assert.doesNotMatch(String(arabicAdmissionsDeadline.payload.content), /موعد المنحة/);
  const currentDegreeCredits = await ask("How many credit hours do I need to graduate from Information Security?", "203.0.113.229");
  assert.equal(currentDegreeCredits.payload.stateLabel, "v3_program_credit_model");
  assert.equal(currentDegreeCredits.payload.resolutionState, "CONDITIONAL",
    `Information Security credit response must preserve the older-cohort caveat: ${JSON.stringify(currentDegreeCredits.payload)}`);
  assert.match(String(currentDegreeCredits.payload.content), /120 credit hours/);
  assert.match(String(currentDegreeCredits.payload.content), /21 credits/);
  assert.match(String(currentDegreeCredits.payload.content), /older assigned cohort plans may require 130/i);

  for (const [program, course, creditIp, courseIp, sourceSlug] of [
    ["Early Childhood Education", "CURR400", "198.51.100.51", "198.51.100.52", "bachelor-of-education"],
    ["Health and Physical Education", "PHED318", "198.51.100.53", "198.51.100.54", "bachelor-of-education"],
    ["Special Education", "SPED210", "198.51.100.55", "198.51.100.56", "bachelor-of-education"],
    ["Economics", "ECON460", "198.51.100.58", "198.51.100.59", "bachelor-of-economics"],
    ["Human Resources Management and Development", "HRMD430", "198.51.100.60", "198.51.100.61", "human-resources-management-and-development"],
    ["Supply Chain Management and Logistics", "SCML450", "198.51.100.62", "198.51.100.63", "supply-chain-management-and-logistics"],
    ["Entrepreneurship", "ENTR480", "198.51.100.64", "198.51.100.65", "bachelor-of-business-administration-in-entrepreneurship"],
  ] as const) {
    const credits = await ask(`How many credits are required to graduate from ${program}?`, creditIp);
    assert.equal(credits.payload.stateLabel, "v3_program_credit_model");
    assert.equal(credits.payload.resolutionState, "CONDITIONAL");
    assert.match(String(credits.payload.content), /120 credit hours/);

    const courses = await ask(`Which courses are required in ${program}?`, courseIp);
    assert.equal(courses.payload.stateLabel, "v3_program_requirement_model");
    assert.equal(courses.payload.resolutionState, "CONDITIONAL");
    assert.match(String(courses.payload.content), new RegExp(course));
    assert.match(JSON.stringify(courses.payload.citations), new RegExp(sourceSlug));
  }

  const childhood2025Plan = await askMessages([
    { role: "user", content: "I entered Early Childhood Education in the 2025 cohort." },
    { role: "assistant", content: "What degree requirement would you like to check?" },
    { role: "user", content: "Which courses are required in my assigned plan?" },
  ], "198.51.100.57");
  assert.equal(childhood2025Plan.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(childhood2025Plan.payload.resolutionState, "MISSING_CONTEXT",
    "the 2025 Early Childhood model is Fall-entry-specific and year-only context must ask for the entry term");
  assert.match(String(childhood2025Plan.payload.content), /specifically for Fall-entry students.*Did you start in Fall or Spring/i);
  assert.doesNotMatch(String(childhood2025Plan.payload.content), /CURR400/);

  const economics2025Plan = await askMessages([
    { role: "user", content: "I entered Economics in the 2025 cohort." },
    { role: "assistant", content: "Which degree requirement would you like to check?" },
    { role: "user", content: "Which courses are required in my assigned plan?" },
  ], "198.51.100.66");
  assert.equal(economics2025Plan.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(economics2025Plan.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(economics2025Plan.payload.content), /specifically for Fall-entry students.*Did you start in Fall or Spring/i);
  assert.doesNotMatch(String(economics2025Plan.payload.content), /ECON215/);

  const economicsFall2025Plan = await askMessages([
    { role: "user", content: "I entered Economics in the 2025 cohort." },
    { role: "assistant", content: "Which degree requirement would you like to check?" },
    { role: "user", content: "I was admitted in Fall 2025." },
    { role: "assistant", content: "What would you like to know about the plan?" },
    { role: "user", content: "Which courses are required in my assigned plan?" },
  ], "198.51.100.67");
  assert.equal(economicsFall2025Plan.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(economicsFall2025Plan.payload.resolutionState, "CONDITIONAL");
  assert.match(String(economicsFall2025Plan.payload.content), /ECON215/);
  assert.match(String(economicsFall2025Plan.payload.content), /three 3-credit Student choice Major Elective rows/);
  assert.match(String(economicsFall2025Plan.payload.content), /do not encode semester-by-semester ordering/i);

  const tuitionNeedsProgram = await ask("What is the tuition cost for the program I want?", "203.0.113.242");
  assert.equal(tuitionNeedsProgram.payload.stateLabel, "v3_verified_tuition_answer");
  assert.equal(tuitionNeedsProgram.payload.faqId, "tuition-program-cost");
  assert.equal(tuitionNeedsProgram.payload.resolutionState, "MISSING_CONTEXT");
  assert.equal(tuitionNeedsProgram.payload.disposition, "clarify");
  assert.match(String(tuitionNeedsProgram.payload.content), /tuition/i);

  const olderDegreeCredits = await askMessages([
    { role: "user", content: "I entered the Information Security program in the 2022 cohort." },
    { role: "assistant", content: "Which requirement do you want to check?" },
    { role: "user", content: "How many credits do I need to graduate?" },
  ], "203.0.113.229");
  assert.equal(olderDegreeCredits.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(olderDegreeCredits.payload.content), /130 credit hours/);
  assert.match(String(olderDegreeCredits.payload.content), /ITBP495/);
  assert.doesNotMatch(String(olderDegreeCredits.payload.content), /general education.*21 credits/i, "the incomplete 130-credit breakdown must not borrow the newer plan");

  const itCourses = await ask("Which courses are required in Information Technology?", "203.0.113.230");
  assert.equal(itCourses.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(itCourses.payload.resolutionState, "CONDITIONAL");
  assert.match(String(itCourses.payload.content), /CSBP340/);
  assert.match(String(itCourses.payload.content), /choose 1 from BIOC100 or CHEM111/);
  assert.match(JSON.stringify(itCourses.payload.citations), /Information Technology degree requirements/);

  const mechCourses = await ask("Which courses are required in Mechanical Engineering?", "203.0.113.231");
  assert.equal(mechCourses.payload.stateLabel, "v3_program_requirement_model");
  assert.match(String(mechCourses.payload.content), /MECH485/);
  assert.match(String(mechCourses.payload.content), /MECH490/);

  const electricalCourses = await ask("What courses are required in Electrical Engineering?", "203.0.113.242");
  assert.equal(electricalCourses.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(electricalCourses.payload.resolutionState, "CONDITIONAL");
  assert.match(String(electricalCourses.payload.content), /ELEC585/);
  assert.match(String(electricalCourses.payload.content), /ELEC485/);
  assert.doesNotMatch(String(electricalCourses.payload.content), /ISEC|Information Security/i, "a program-specific question must not receive another degree's canonical answer");
  assert.match(JSON.stringify(electricalCourses.payload.citations), /bachelor-of-science-in-electrical-engineering/);

  for (const [program, course, ip] of [
    ["Chemical Engineering", "CHME455", "203.0.113.243"],
    ["Civil Engineering", "CIVL585", "203.0.113.244"],
    ["Aerospace Engineering", "AERO585", "203.0.113.247"],
    ["Petroleum Engineering", "PETE585", "203.0.113.248"],
  ] as const) {
    const requiredCourses = await ask(`What courses are required in ${program}?`, ip);
    assert.equal(requiredCourses.payload.stateLabel, "v3_program_requirement_model");
    assert.equal(requiredCourses.payload.resolutionState, "CONDITIONAL");
    assert.match(String(requiredCourses.payload.content), new RegExp(course));
    assert.doesNotMatch(String(requiredCourses.payload.content), /ISEC|Information Security/i, "a named engineering degree must not receive an unrelated canonical record");
    assert.match(JSON.stringify(requiredCourses.payload.citations), new RegExp(program.toLowerCase().replaceAll(" ", "-")));
  }

  const petroleum2022 = await askMessages([
    { role: "user", content: "I entered Petroleum Engineering in 2022." },
    { role: "assistant", content: "Which requirement would you like to check?" },
    { role: "user", content: "How many credits do I need to graduate?" },
  ], "203.0.113.249");
  assert.equal(petroleum2022.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(petroleum2022.payload.content), /147 credit hours/);
  assert.match(String(petroleum2022.payload.content), /does not enumerate the eligible major-elective list/i);

  const petroleum2023 = await askMessages([
    { role: "user", content: "I entered Petroleum Engineering in 2023." },
    { role: "assistant", content: "Which requirement would you like to check?" },
    { role: "user", content: "How many credits do I need to graduate?" },
  ], "203.0.113.250");
  assert.equal(petroleum2023.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(petroleum2023.payload.content), /132 credit hours/);

  const psychologyRequirements = await ask("What courses are required in Psychology?", "203.0.113.245");
  assert.equal(psychologyRequirements.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(psychologyRequirements.payload.resolutionState, "CONDITIONAL");
  assert.match(String(psychologyRequirements.payload.content), /PSYC452/);
  assert.match(String(psychologyRequirements.payload.content), /maximum of 6 additional course credits/);
  assert.match(JSON.stringify(psychologyRequirements.payload.citations), /bachelor-of-arts-in-psychology/);

  const translationStudies = await ask("What are the requirements for Translation Studies?", "203.0.113.248");
  assert.equal(translationStudies.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(translationStudies.payload.resolutionState, "CONDITIONAL");
  assert.match(String(translationStudies.payload.content), /TRS490/);
  assert.match(String(translationStudies.payload.content), /choose five/);
  assert.match(JSON.stringify(translationStudies.payload.citations), /bachelor-of-arts-in-translation-studies/);

  const arabicRequirements = await ask("What courses are required in Arabic Language and Literature?", "203.0.113.251");
  assert.equal(arabicRequirements.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(arabicRequirements.payload.resolutionState, "CONDITIONAL");
  assert.match(String(arabicRequirements.payload.content), /ARB490/);
  assert.match(String(arabicRequirements.payload.content), /introductory summary on the same degree page conflicts with those detailed tables/i);
  assert.match(JSON.stringify(arabicRequirements.payload.citations), /bachelor-of-arts-in-arabic-language-and-literature/);

  const geographyConcentrations = await ask("What concentrations are available in Geography?", "203.0.113.252");
  assert.equal(geographyConcentrations.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(geographyConcentrations.payload.resolutionState, "CONDITIONAL");
  assert.match(String(geographyConcentrations.payload.content), /Environmental Geography/);
  assert.match(String(geographyConcentrations.payload.content), /Geoinformatics/);
  assert.match(String(geographyConcentrations.payload.content), /Urban Planning/);
  assert.match(JSON.stringify(geographyConcentrations.payload.citations), /bachelor-of-arts-in-geography/);

  const appliedSociologyRequirements = await ask("What concentrations are in Applied Sociology and Social Data Analytics?", "203.0.113.253");
  assert.equal(appliedSociologyRequirements.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(appliedSociologyRequirements.payload.resolutionState, "CONDITIONAL");
  assert.match(String(appliedSociologyRequirements.payload.content), /Sociology of Consumption/);
  assert.match(String(appliedSociologyRequirements.payload.content), /Theme 9 is not listed/i);
  assert.match(JSON.stringify(appliedSociologyRequirements.payload.citations), /bachelor-of-science-in-applied-sociology-and-social-data-analytics/);

  const medicineRequirements = await ask("What courses are required in Doctor of Medicine?", "203.0.113.254");
  assert.equal(medicineRequirements.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(medicineRequirements.payload.resolutionState, "CONDITIONAL");
  assert.match(String(medicineRequirements.payload.content), /233 total credits/);
  assert.match(String(medicineRequirements.payload.content), /cross-counting affects the individual degree audit/i);
  assert.match(JSON.stringify(medicineRequirements.payload.citations), /doctor-of-medicine\.shtml/);

  const psychologyAudit = await ask("What do I still need to graduate in Psychology?", "203.0.113.246");
  assert.equal(psychologyAudit.payload.stateLabel, "v3_degree_audit_preview");
  assert.equal(psychologyAudit.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(psychologyAudit.payload.content), /what year did you enter UAEU/i);

  const scopedPsychologyAudit = await askMessages([
    { role: "user", content: "I entered Psychology in the 2025 cohort." },
    { role: "user", content: "I passed PSYC100 with a C. What do I still need to graduate?" },
  ], "203.0.113.248");
  assert.equal(scopedPsychologyAudit.payload.stateLabel, "v3_degree_audit_preview");
  assert.equal(scopedPsychologyAudit.payload.resolutionState, "CONDITIONAL");
  assert.match(String(scopedPsychologyAudit.payload.content), /Entry year 2025/);
  assert.match(String(scopedPsychologyAudit.payload.content), /PSYC100/);
  assert.match(String(scopedPsychologyAudit.payload.content), /not an official degree audit/i);

  const partialDegreeAudit = await askMessages([
    { role: "user", content: "I passed PSYC100 with C." },
    { role: "user", content: "I passed PSYC200 with B." },
    { role: "user", content: "I am in Psychology." },
    { role: "user", content: "I entered UAEU in the 2025 cohort." },
    { role: "user", content: "What do I still need to graduate from my degree?" },
  ], "203.0.113.247");
  assert.equal(partialDegreeAudit.payload.stateLabel, "v3_degree_audit_preview");
  assert.equal(partialDegreeAudit.payload.resolutionState, "CONDITIONAL");
  assert.match(String(partialDegreeAudit.payload.content), /Entry year 2025/);
  assert.match(String(partialDegreeAudit.payload.content), /Preliminary requirement comparison/);
  assert.match(String(partialDegreeAudit.payload.content), /PSYC100/);
  assert.match(String(partialDegreeAudit.payload.content), /PSYC200/);
  assert.match(String(partialDegreeAudit.payload.content), /not an official degree audit/i);

  const degreeAuditMissingProgram = await askMessages([
    { role: "user", content: "I passed CSBP119 with C." },
    { role: "user", content: "What do I still need to graduate?" },
  ], "203.0.113.249");
  assert.equal(degreeAuditMissingProgram.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(degreeAuditMissingProgram.payload.content), /what is your major/i);

  const inProgressDegreeRequirement = await askMessages([
    { role: "user", content: "I am currently taking PSYC100." },
    { role: "user", content: "I am in Psychology." },
    { role: "user", content: "I entered UAEU in the 2025 cohort." },
    { role: "user", content: "What do I still need to graduate from my degree?" },
  ], "203.0.113.250");
  assert.match(String(inProgressDegreeRequirement.payload.content), /in progress: PSYC100/i);
  assert.doesNotMatch(String(inProgressDegreeRequirement.payload.content), /remaining\/not confirmed: [^\n]*PSYC100/i);

  const unmodeledDegreeAudit = await ask("What do I still need to graduate in Psychology?", "203.0.113.248");
  assert.equal(unmodeledDegreeAudit.payload.stateLabel, "v3_degree_audit_preview");
  assert.equal(unmodeledDegreeAudit.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(unmodeledDegreeAudit.payload.content), /what year did you enter UAEU/i);
  assert.doesNotMatch(String(unmodeledDegreeAudit.payload.content), /remaining courses?:\s+[A-Z]{2,8}\d{3,4}/i);

  const networkSecuritySubstitution = await ask(
    "In Computer Engineering, take Networking Security instead of Selected Topics in Computer Engineering.",
    "203.0.113.233",
  );
  assert.equal(networkSecuritySubstitution.payload.stateLabel, "v3_program_substitution_assessment");
  assert.equal(networkSecuritySubstitution.payload.resolutionState, "CONDITIONAL");
  assert.match(String(networkSecuritySubstitution.payload.content), /CENG532 Network Security.*CENG580 Selected Topics/i);
  assert.match(String(networkSecuritySubstitution.payload.content), /within this elective group/i);
  assert.match(String(networkSecuritySubstitution.payload.content), /provided your assigned plan uses it/i);
  assert.match(String(networkSecuritySubstitution.payload.content), /check current section availability/i);

  const computerEngineeringCredits = await ask("How many credits to graduate in Computer Engineering?", "203.0.113.234");
  assert.equal(computerEngineeringCredits.payload.stateLabel, "academic_program_identity_review");
  assert.equal(computerEngineeringCredits.payload.resolutionState, "MISSING_CONTEXT");
  assert.doesNotMatch(String(computerEngineeringCredits.payload.content), /131 credit hours|144 credit hours/);

  const correctedComputerEngineeringCredits = await askMessages([
    { role: "user", content: "How many credit hours do I need to graduate from Information Security?" },
    { role: "assistant", content: "Information Security requires 120 credits." },
    { role: "user", content: "Sorry, I meant Computer Engineering." },
  ], "198.18.1.239");
  assert.equal(correctedComputerEngineeringCredits.payload.stateLabel, "academic_program_identity_review");
  assert.equal(correctedComputerEngineeringCredits.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(correctedComputerEngineeringCredits.payload.content), /entry year/i,
    "the corrected Computer Engineering topic must inherit the original credit question and ask for cohort context");
  assert.doesNotMatch(String(correctedComputerEngineeringCredits.payload.content), /Information Security|120 credits/i,
    "a prior assistant answer must not leak the incorrect degree's facts into the corrected answer");

  const correctedComputerEngineeringCreditsArabic = await askMessages([
    { role: "user", content: "How many credit hours do I need to graduate from Information Security?" },
    { role: "assistant", content: "Information Security requires 120 credits." },
    { role: "user", content: "\u0644\u0627\u060c \u0623\u0642\u0635\u062f \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628." },
  ], "198.18.1.240", "ar");
  assert.equal(correctedComputerEngineeringCreditsArabic.payload.stateLabel, "academic_program_identity_review");
  assert.equal(correctedComputerEngineeringCreditsArabic.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(correctedComputerEngineeringCreditsArabic.payload.content), /[\u0600-\u06FF]/u,
    "Arabic correction must receive a localized response asking for the missing cohort details");

  const historicalComputerEngineeringCredits = await askMessages([
    { role: "user", content: "I entered Computer Engineering in 2022." },
    { role: "assistant", content: "What do you want to check about your program?" },
    { role: "user", content: "How many credit hours to graduate in Computer Engineering?" },
  ], "198.18.1.238");
  assert.equal(historicalComputerEngineeringCredits.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(historicalComputerEngineeringCredits.payload.content), /144 credit hours/);
  assert.match(String(historicalComputerEngineeringCredits.payload.content), /source-reported total does not confirm which conflicting plan is assigned/i);
  assert.doesNotMatch(String(historicalComputerEngineeringCredits.payload.content), /131 credit hours/);
  assert.match(JSON.stringify(historicalComputerEngineeringCredits.payload.citations), /cohort model study plan/);

  const computerEngineeringPathways = await ask("Which courses are required in Computer Engineering?", "203.0.113.235");
  assert.equal(computerEngineeringPathways.payload.stateLabel, "academic_program_identity_review");
  assert.equal(computerEngineeringPathways.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(computerEngineeringPathways.payload.content), /entry year/i);
  assert.doesNotMatch(String(computerEngineeringPathways.payload.content), /CENG532|CENG580/);

  const computerAiCredits = await ask("How many credits to graduate in Computer and AI Engineering?", "203.0.113.236");
  assert.equal(computerAiCredits.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(computerAiCredits.payload.content), /130 credit hours/);
  assert.match(JSON.stringify(computerAiCredits.payload.citations), /Computer and Artificial Intelligence Engineering/);

  const computerAiPathways = await ask("Which courses are required in Computer and AI Engineering?", "203.0.113.237");
  assert.equal(computerAiPathways.payload.stateLabel, "v3_program_requirement_model");
  assert.match(String(computerAiPathways.payload.content), /AI Systems Engineering concentration/);
  assert.match(String(computerAiPathways.payload.content), /Robotics and Autonomous Systems concentration/);
  assert.match(String(computerAiPathways.payload.content), /General Computer and AI Engineering Pathway/);

  const accountingCredits = await ask("How many credits to graduate with a Bachelor of Accounting?", "203.0.113.253");
  assert.equal(accountingCredits.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(accountingCredits.payload.content), /120 credit hours/);
  assert.match(JSON.stringify(accountingCredits.payload.citations), /bachelor-of-accounting/);

  const accountingTracks = await ask("Which courses are required in Accounting?", "203.0.113.254");
  assert.equal(accountingTracks.payload.stateLabel, "v3_program_requirement_model");
  assert.match(String(accountingTracks.payload.content), /Professional Management Accounting/);
  assert.match(String(accountingTracks.payload.content), /Professional Auditing/);
  assert.match(String(accountingTracks.payload.content), /75 completed credits before joining/i);

  const financeConcentrations = await ask("Which courses are required for Finance and Banking?", "203.0.113.255");
  assert.equal(financeConcentrations.payload.stateLabel, "v3_program_requirement_model");
  assert.match(String(financeConcentrations.payload.content), /Financial Management/);
  assert.match(String(financeConcentrations.payload.content), /Financial Technologies \(FinTech\)/);
  assert.match(String(financeConcentrations.payload.content), /FINC422/);

  const courseQuestion = await askMessages([
    { role: "user", content: "I am studying Computer Science." },
    { role: "assistant", content: "What do you want to know about the program?" },
    { role: "user", content: "What are the prerequisites for CSBP340?" },
  ], "203.0.113.232");
  assert.notEqual(courseQuestion.payload.stateLabel, "v3_program_requirement_model", "course-level questions must not be answered with the full program course list");
  assert.match(String(courseQuestion.payload.content), /CSBP323.*minimum grade D or CSBP319.*minimum grade D/i,
    "CSBP340 must return the current official catalog's two alternative minimum-D prerequisites");
  assert.doesNotMatch(String(courseQuestion.payload.content), /incomplete prerequisite|does not establish whether/i);

  const naturalCoursePrerequisite = await ask("What must I complete before csbp 219?", "203.0.113.239");
  assert.equal(naturalCoursePrerequisite.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.equal(naturalCoursePrerequisite.payload.resolutionState, "VERIFIED");
  assert.match(String(naturalCoursePrerequisite.payload.content), /CSBP119 with a minimum grade D/i);
  assert.match(JSON.stringify(naturalCoursePrerequisite.payload.citations), /course_2968\.shtml\?id=CSBP219/);
  assert.equal(naturalCoursePrerequisite.payload.provider, undefined, "a direct catalog fact must not invoke the language model");

  const biolCreditConflict = await ask("How many credits is BIOL210?", "203.0.113.240");
  assert.equal(biolCreditConflict.payload.stateLabel, "v3_official_course_catalog_lookup");
  assert.equal(biolCreditConflict.payload.resolutionState, "CONFLICTED");
  assert.match(String(biolCreditConflict.payload.content), /lists BIOL210 as 3 credits[\s\S]*lists it as 0\.00/i);
  assert.match(JSON.stringify(biolCreditConflict.payload.citations), /department_SC_SC_BIOL\.asp/);
  assert.match(JSON.stringify(biolCreditConflict.payload.citations), /marine-fisheries-and-animal-science\.shtml/);

  const elecCreditConflict = await ask("How many credits is ELEC490?", "203.0.113.241");
  assert.equal(elecCreditConflict.payload.resolutionState, "CONFLICTED");
  assert.match(String(elecCreditConflict.payload.content), /study plans list ELEC490 as 1 credit[\s\S]*list it as 0\.00/i);
  assert.match(JSON.stringify(elecCreditConflict.payload.citations), /coe_bsc_electrical_engineering_study_plan\.pdf/);
  assert.match(JSON.stringify(elecCreditConflict.payload.citations), /bachelor-of-science-in-communication-engineering\.shtml/);

  console.log("V3 route checks passed: selector bypass, deadline separation, repeat policy, and structured prerequisite and program models.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
