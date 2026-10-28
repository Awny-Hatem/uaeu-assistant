import assert from "node:assert/strict";

process.env.CHATBOT_DB_PATH = ":memory:";
process.env.AI_PROVIDER = "mock";
process.env.GEMINI_EMBEDDING_SEARCH = "";
process.env.SERVER_CHAT_HISTORY = "";
process.env.CHATBOT_DEPLOYMENT_MODE = "prototype";
process.env.CHATBOT_DURABLE_STORAGE = "";
process.env.TRUST_PROXY_HEADERS = "enabled";

async function main() {
  const { POST } = await import("../app/api/chat/route");
  const { loadKnowledgeMarkdown } = await import("../lib/knowledge-files");
  const { retrieveCurriculumAnswer } = await import("../lib/curriculum-retrieval");
  const documents = loadKnowledgeMarkdown();
  const priorDocuments = documents.filter(({ curriculum }) => !curriculum);
  const cases: [string, RegExp, string][] = [
    ["According to UAEU's published model plan, what courses should a Mechanical Engineering student take in the first semester?", /MATH130.*PHYS105.*CHEM111/, "27-mechanical-engineering-first-semester.md"],
    ["In UAEU's Fall 2025 Computer Science study plan, what courses are in the first semester?", /GEAE101.*MATH105.*CSBP119.*CSBP121/, "29-computer-science-first-semester.md"],
    ["How many total credit hours are required for the UAEU Mechanical Engineering major?", /132 credit hours/, "26-mechanical-engineering-degree-requirements.md"],
    ["How many total credit hours are required for the UAEU Computer Science major?", /120 credit hours/, "28-computer-science-degree-requirements.md"],
    ["How many total credit hours are required for the UAEU Information Technology major?", /120 credit hours.*130 total credit hours/, "30-information-technology-degree-requirements.md"],
    ["Is CSBP319 Data Structures required for the UAEU Computer Science major?", /CSBP319.*mandatory college requirement/, "28-computer-science-degree-requirements.md"],
    ["Is CSBP340 Database Systems required for the UAEU Information Technology major?", /CSBP340.*mandatory major requirement/, "30-information-technology-degree-requirements.md"],
    ["Is ISEC421 Risk Analysis and Management required for Information Security, and in which semester is it normally taken?", /ISEC421.*required.*Semester 7/, "32-information-security-first-semester.md"],
    ["Is CSBP411 Machine Learning a required course or an elective in UAEU Computer Science?", /CSBP411.*mandatory, not an elective/, "28-computer-science-degree-requirements.md"],
    ["What are the required courses in UAEU Mechanical Engineering?", /MECH305.*MECH590/, "26-mechanical-engineering-degree-requirements.md"],
    ["What courses can count as Mechanical Engineering major electives at UAEU?", /MECH520.*AERO563/, "26-mechanical-engineering-degree-requirements.md"],
    ["What courses can count as Computer Science major electives at UAEU?", /CSBP320.*CSBP477/, "28-computer-science-degree-requirements.md"],
    ["What courses can count as Information Technology major electives at UAEU?", /CSBP483.*ITBP430/, "30-information-technology-degree-requirements.md"],
    ["How many Mechanical Engineering credits are university requirements, college requirements, major requirements, and electives?", /21 credit hours[\s\S]*35 credit hours[\s\S]*68 credit hours[\s\S]*6 credit hours/, "26-mechanical-engineering-degree-requirements.md"],
    ["What courses are in the first semester of UAEU's Information Technology study plan?", /GEAE101.*MATH105.*CSBP119.*CSBP121/, "31-information-technology-first-semester.md"],
    ["What courses are in the first semester of UAEU's Information Security 2025-2026 model plan?", /GEAE101.*MATH105.*GEIT113.*CSBP121/, "32-information-security-first-semester.md"],
    ["What prerequisite must I complete before MECH305 Mechanics of Materials in Mechanical Engineering?", /MECH305.*CIVL240.*minimum grade of D/, "33-mechanical-engineering-course-prerequisites.md"],
    ["Does MECH348 Fluid Mechanics Lab have a corequisite or pre/corequisite?", /MECH348.*MECH210.*MECH340.*Pre\/Co/, "33-mechanical-engineering-course-prerequisites.md"],
    ["Can I take MECH340 Fluid Mechanics without completing CIVL240 Statics first?", /MECH340.*CIVL240.*not supported/, "33-mechanical-engineering-course-prerequisites.md"],
  ];

  for (const [index, [question, expected, filename]] of cases.entries()) {
    const result = retrieveCurriculumAnswer(question);
    assert.ok(result, question);
    assert.match(result.content, expected, question);
    assert.ok(result.evidenceId.includes(filename), question);
    assert.ok(result.citation.url);
    assert.match(result.citation.url, /^https:\/\/(?:www\.)?uaeu\.ac\.ae\//);
    assert.equal(retrieveCurriculumAnswer(question, priorDocuments), null, `ablation: ${question}`);
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `198.18.8.${index + 1}` },
      body: JSON.stringify({ messages: [{ role: "user", content: question }], locale: "auto" }),
    }));
    assert.equal(response.status, 200, question);
    const answer = await response.json();
    assert.equal(answer.source, "rag", question);
    assert.equal(answer.stateLabel, "curriculum_extract", question);
    assert.match(answer.content, expected, question);
    assert.ok(answer.evidenceIds.includes(result.evidenceId), question);
    assert.equal(answer.citations[0].url, result.citation.url, question);
  }
  for (const question of [
    "What are the prerequisites for CSBP319 Data Structures?",
    "Does CSBP221 Programming Lab II have a corequisite in the Computer Science Fall 2025 plan?",
    "What courses are in the second semester of the Fall 2025 Computer Science plan?",
  ]) assert.equal(retrieveCurriculumAnswer(question), null);
  assert.equal(retrieveCurriculumAnswer("What is the first semester Mechanical Engineering plan for 2022?"), null);
  assert.equal(retrieveCurriculumAnswer("What courses are required for admission to Computer Science?"), null);
  assert.match(retrieveCurriculumAnswer("Is CIVL240 a prerequisite for MECH340 Fluid Mechanics?")?.content ?? "", /MECH340.*CIVL240.*minimum grade of D/);
  console.log(`Curriculum retrieval: ${cases.length} routed cases and source ablations passed.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
