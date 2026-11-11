import assert from "node:assert/strict";

process.env.AI_PROVIDER = "mock";
process.env.UAEU_AGENT_V3_ENABLED = "enabled";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";

async function main() {
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

  const calendar = await ask("Where can I check UAEU academic calendar deadlines?", "203.0.113.221");
  assert.equal(calendar.status, 200);
  assert.equal(calendar.payload.stateLabel, "v3_verified_source_location");
  assert.equal(calendar.payload.resolutionState, "VERIFIED");
  assert.match(String(calendar.payload.content), /official UAEU academic calendar/i);
  assert.match(JSON.stringify(calendar.payload.citations), /coreservices\.uaeu\.ac\.ae/);

  const studentDocument = await ask("How do I request a To Whom It May Concern letter?", "203.0.113.229");
  assert.equal(studentDocument.status, 200);
  assert.equal(studentDocument.payload.stateLabel, "guided_service");
  assert.equal(studentDocument.payload.resolutionState, "VERIFIED");
  assert.equal(studentDocument.payload.faqId, undefined, "a V3 service workflow must not use canonical answer selection");
  assert.equal((studentDocument.payload.guide as { id?: string } | undefined)?.id, "to-whom-it-may-concern");
  assert.match(String(studentDocument.payload.content), /Current Students Documents/i);
  assert.match(JSON.stringify(studentDocument.payload.citations), /serviceId=92/);

  const libraryResearchHelp = await ask("How can UAEU students get library or research help?", "203.0.113.230");
  assert.equal(libraryResearchHelp.payload.stateLabel, "guided_service");
  assert.equal(libraryResearchHelp.payload.resolutionState, "VERIFIED");
  assert.equal(libraryResearchHelp.payload.faqId, undefined, "the V3 service guide is not canonical answer selection");
  assert.equal((libraryResearchHelp.payload.guide as { id?: string } | undefined)?.id, "ask-a-librarian-research-help");
  assert.match(String(libraryResearchHelp.payload.content), /one-hour email-response target/i);
  assert.match(JSON.stringify(libraryResearchHelp.payload.citations), /serviceId=98/);

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

  const calendarFollowUp = await askMessages([
    { role: "user", content: "Where can I check UAEU academic calendar deadlines?" },
    { role: "assistant", content: "Which term, year, and applicant category do you mean?" },
    { role: "user", content: "year 2026 fall" },
  ], "203.0.113.223");
  assert.equal(calendarFollowUp.payload.stateLabel, "v3_verified_source_location");
  assert.match(String(calendarFollowUp.payload.content), /official UAEU academic calendar/i);
  assert.doesNotMatch(String(calendarFollowUp.payload.content), /refund|scholarship/i);

  const admissionsDeadline = await ask("When is the admission deadline for Fall 2027?", "203.0.113.224");
  assert.equal(admissionsDeadline.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(admissionsDeadline.payload.content), /applicant category/i);
  assert.doesNotMatch(String(admissionsDeadline.payload.content), /scholarship/i);

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

  const prerequisiteAssessment = await askMessages([
    { role: "user", content: "I passed STAT210 with D and ITBP301 with C." },
    { role: "assistant", content: "What course do you want to check?" },
    { role: "user", content: "Can I take ISEC421?" },
  ], "203.0.113.226");
  assert.equal(prerequisiteAssessment.status, 200);
  assert.equal(prerequisiteAssessment.payload.stateLabel, "v3_academic_rule_evaluation");
  assert.equal(prerequisiteAssessment.payload.resolutionState, "CONDITIONAL");
  assert.match(String(prerequisiteAssessment.payload.content), /STAT210[\s\S]*ITBP301/);
  assert.match(String(prerequisiteAssessment.payload.content), /does not confirm registration eligibility/i);
  assert.match(JSON.stringify(prerequisiteAssessment.payload.citations), /ISEC421 Risk Analysis and Management/);

  const incompletePrerequisites = await ask("Can I take ISEC421?", "203.0.113.227");
  assert.equal(incompletePrerequisites.payload.stateLabel, "v3_academic_rule_evaluation");
  assert.equal(incompletePrerequisites.payload.resolutionState, "MISSING_CONTEXT");
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

  const passGradePrerequisiteAssessment = await askMessages([
    { role: "user", content: "I passed ACCT101 with P." },
    { role: "assistant", content: "Which course do you want to check?" },
    { role: "user", content: "Can I take ACCT103?" },
  ], "203.0.113.245");
  assert.equal(passGradePrerequisiteAssessment.payload.stateLabel, "v3_catalog_prerequisite_evaluation");
  assert.equal(passGradePrerequisiteAssessment.payload.resolutionState, "CONDITIONAL");
  assert.match(String(passGradePrerequisiteAssessment.payload.content), /completion of ACCT101/);
  assert.match(String(passGradePrerequisiteAssessment.payload.content), /modeled prerequisite is satisfied/);

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

  const arabicPrerequisite = await ask("هل أستطيع تسجيل CSBP319؟", "203.0.113.239", "ar");
  assert.equal(arabicPrerequisite.payload.stateLabel, "v3_academic_rule_evaluation");
  assert.equal(arabicPrerequisite.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(arabicPrerequisite.payload.content), /CSBP219[\s\S]*CSBP221/);
  assert.doesNotMatch(String(arabicPrerequisite.payload.content), /No recognized completed grade|is listed as current/);

  const arabicAdmissionsDeadline = await ask("ما آخر موعد للتقديم في جامعة الإمارات؟", "203.0.113.240", "ar");
  assert.equal(arabicAdmissionsDeadline.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(arabicAdmissionsDeadline.payload.content), /فئة المتقدم/);
  assert.match(String(arabicAdmissionsDeadline.payload.content), /الفصل الدراسي أو السنة الدراسية/);
  assert.doesNotMatch(String(arabicAdmissionsDeadline.payload.content), /applicant category|academic year|deadline process/i);

  const currentDegreeCredits = await ask("How many credit hours do I need to graduate from Information Security?", "203.0.113.228");
  assert.equal(currentDegreeCredits.payload.stateLabel, "v3_program_credit_model");
  assert.equal(currentDegreeCredits.payload.resolutionState, "CONDITIONAL", "a published total is not a personal degree audit");
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
  assert.equal(childhood2025Plan.payload.resolutionState, "CONDITIONAL");
  assert.match(String(childhood2025Plan.payload.content), /course requirements are not structured/i);
  assert.doesNotMatch(String(childhood2025Plan.payload.content), /CURR400/);

  const economics2025Plan = await askMessages([
    { role: "user", content: "I entered Economics in the 2025 cohort." },
    { role: "assistant", content: "Which degree requirement would you like to check?" },
    { role: "user", content: "Which courses are required in my assigned plan?" },
  ], "198.51.100.66");
  assert.equal(economics2025Plan.payload.stateLabel, "v3_program_requirement_model");
  assert.equal(economics2025Plan.payload.resolutionState, "CONDITIONAL");
  assert.match(String(economics2025Plan.payload.content), /course requirements are not structured/i);
  assert.doesNotMatch(String(economics2025Plan.payload.content), /ECON215/);

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
  assert.match(String(petroleum2022.payload.content), /course list is not fully structured/i);

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
  assert.notEqual(psychologyAudit.payload.resolutionState, "UNSUPPORTED");
  assert.doesNotMatch(String(psychologyAudit.payload.content), /do not have a structured curriculum model for .*Psychology/i);

  const partialDegreeAudit = await askMessages([
    { role: "user", content: "I passed CSBP119 with C." },
    { role: "user", content: "I passed MATH105 with B." },
    { role: "user", content: "I am in Information Technology." },
    { role: "user", content: "What do I still need to graduate from my degree?" },
  ], "203.0.113.247");
  assert.equal(partialDegreeAudit.payload.stateLabel, "v3_degree_audit_preview");
  assert.equal(partialDegreeAudit.payload.resolutionState, "CONDITIONAL");
  assert.match(String(partialDegreeAudit.payload.content), /Preliminary requirement comparison/);
  assert.match(String(partialDegreeAudit.payload.content), /CSBP119/);
  assert.match(String(partialDegreeAudit.payload.content), /MATH105/);
  assert.match(String(partialDegreeAudit.payload.content), /not an official degree audit/i);

  const degreeAuditMissingProgram = await askMessages([
    { role: "user", content: "I passed CSBP119 with C." },
    { role: "user", content: "What do I still need to graduate?" },
  ], "203.0.113.249");
  assert.equal(degreeAuditMissingProgram.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(degreeAuditMissingProgram.payload.content), /what is your major/i);

  const inProgressDegreeRequirement = await askMessages([
    { role: "user", content: "I am currently taking BIOC100." },
    { role: "user", content: "I am in Information Technology." },
    { role: "user", content: "What do I still need to graduate from my degree?" },
  ], "203.0.113.250");
  assert.match(String(inProgressDegreeRequirement.payload.content), /Choose one science course/);
  assert.match(String(inProgressDegreeRequirement.payload.content), /IN_PROGRESS/);

  const unmodeledDegreeAudit = await ask("What do I still need to graduate in Psychology?", "203.0.113.248");
  assert.equal(unmodeledDegreeAudit.payload.stateLabel, "v3_degree_audit_preview");
  assert.equal(unmodeledDegreeAudit.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(unmodeledDegreeAudit.payload.content), /cannot see your academic record/i);
  assert.match(String(unmodeledDegreeAudit.payload.content), /course codes you passed/i);
  assert.doesNotMatch(String(unmodeledDegreeAudit.payload.content), /remaining courses?:\s+[A-Z]{2,8}\d{3,4}/i);

  const networkSecuritySubstitution = await ask(
    "In Computer Engineering, take Networking Security instead of Selected Topics in Computer Engineering.",
    "203.0.113.233",
  );
  assert.equal(networkSecuritySubstitution.payload.stateLabel, "academic_program_identity_review");
  assert.equal(networkSecuritySubstitution.payload.resolutionState, "MISSING_CONTEXT");
  assert.match(String(networkSecuritySubstitution.payload.content), /entry year/i);

  const computerEngineeringCredits = await ask("How many credits to graduate in Computer Engineering?", "203.0.113.234");
  assert.equal(computerEngineeringCredits.payload.stateLabel, "academic_program_identity_review");
  assert.equal(computerEngineeringCredits.payload.resolutionState, "MISSING_CONTEXT");
  assert.doesNotMatch(String(computerEngineeringCredits.payload.content), /131 credit hours|144 credit hours/);

  const historicalComputerEngineeringCredits = await askMessages([
    { role: "user", content: "I entered Computer Engineering in 2022." },
    { role: "assistant", content: "What do you want to check about your program?" },
    { role: "user", content: "How many credit hours to graduate in Computer Engineering?" },
  ], "203.0.113.238");
  assert.equal(historicalComputerEngineeringCredits.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(historicalComputerEngineeringCredits.payload.content), /144 credit hours/);
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

  console.log("V3 route checks passed: selector bypass, deadline separation, repeat policy, and structured prerequisite and program models.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
