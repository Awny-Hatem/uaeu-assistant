import assert from "node:assert/strict";

process.env.AI_PROVIDER = "mock";
process.env.UAEU_AGENT_V3_ENABLED = "enabled";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";

async function main() {
  const { POST } = await import("../../app/api/chat/route");

  async function askMessages(messages: { role: "user" | "assistant"; content: string }[], ip: string) {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ locale: "en", messages }),
    }));
    return { status: response.status, payload: await response.json() as Record<string, unknown> };
  }
  const ask = (question: string, ip: string) => askMessages([{ role: "user", content: question }], ip);

  const calendar = await ask("Where can I check UAEU academic calendar deadlines?", "203.0.113.221");
  assert.equal(calendar.status, 200);
  assert.equal(calendar.payload.stateLabel, "v3_verified_source_location");
  assert.equal(calendar.payload.resolutionState, "VERIFIED");
  assert.match(String(calendar.payload.content), /official UAEU academic calendar/i);
  assert.match(JSON.stringify(calendar.payload.citations), /coreservices\.uaeu\.ac\.ae/);

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
  assert.equal(incompletePrerequisites.payload.resolutionState, "UNSUPPORTED");
  assert.match(String(incompletePrerequisites.payload.content), /STAT210[\s\S]*ITBP301/);

  const currentDegreeCredits = await ask("How many credit hours do I need to graduate from Information Security?", "203.0.113.228");
  assert.equal(currentDegreeCredits.payload.stateLabel, "v3_program_credit_model");
  assert.equal(currentDegreeCredits.payload.resolutionState, "CONDITIONAL", "a published total is not a personal degree audit");
  assert.match(String(currentDegreeCredits.payload.content), /120 credit hours/);
  assert.match(String(currentDegreeCredits.payload.content), /21 credits/);
  assert.match(String(currentDegreeCredits.payload.content), /older assigned cohort plans may require 130/i);

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

  const networkSecuritySubstitution = await ask(
    "In Computer Engineering, take Networking Security instead of Selected Topics in Computer Engineering.",
    "203.0.113.233",
  );
  assert.equal(networkSecuritySubstitution.payload.stateLabel, "v3_program_substitution_assessment");
  assert.equal(networkSecuritySubstitution.payload.resolutionState, "CONDITIONAL");
  assert.match(String(networkSecuritySubstitution.payload.content), /CENG532 Network Security/);
  assert.match(String(networkSecuritySubstitution.payload.content), /CENG580 Selected Topics in Computer Engineering/);
  assert.match(String(networkSecuritySubstitution.payload.content), /choosing 4 courses/);
  assert.doesNotMatch(String(networkSecuritySubstitution.payload.content), /concentration|pathway/i);
  assert.match(JSON.stringify(networkSecuritySubstitution.payload.citations), /Bachelor of Science in Computer Engineering/);

  const computerEngineeringCredits = await ask("How many credits to graduate in Computer Engineering?", "203.0.113.234");
  assert.equal(computerEngineeringCredits.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(computerEngineeringCredits.payload.content), /131 credit hours/);
  assert.match(String(computerEngineeringCredits.payload.content), /45 credits/);
  assert.match(JSON.stringify(computerEngineeringCredits.payload.citations), /Bachelor of Science in Computer Engineering/);

  const computerEngineeringPathways = await ask("Which courses are required in Computer Engineering?", "203.0.113.235");
  assert.equal(computerEngineeringPathways.payload.stateLabel, "v3_program_requirement_model");
  assert.match(String(computerEngineeringPathways.payload.content), /Major electives/);
  assert.match(String(computerEngineeringPathways.payload.content), /choose 4 \(12 credits\)/);
  assert.match(String(computerEngineeringPathways.payload.content), /CENG532/);
  assert.match(String(computerEngineeringPathways.payload.content), /CENG580/);

  const computerAiCredits = await ask("How many credits to graduate in Computer and AI Engineering?", "203.0.113.236");
  assert.equal(computerAiCredits.payload.stateLabel, "v3_program_credit_model");
  assert.match(String(computerAiCredits.payload.content), /130 credit hours/);
  assert.match(JSON.stringify(computerAiCredits.payload.citations), /Computer and Artificial Intelligence Engineering/);

  const computerAiPathways = await ask("Which courses are required in Computer and AI Engineering?", "203.0.113.237");
  assert.equal(computerAiPathways.payload.stateLabel, "v3_program_requirement_model");
  assert.match(String(computerAiPathways.payload.content), /AI Systems Engineering concentration/);
  assert.match(String(computerAiPathways.payload.content), /Robotics and Autonomous Systems concentration/);
  assert.match(String(computerAiPathways.payload.content), /General Computer and AI Engineering Pathway/);

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
