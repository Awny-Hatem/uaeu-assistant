import assert from "node:assert/strict";

process.env.AI_PROVIDER = "mock";
process.env.UAEU_AGENT_V3_ENABLED = "enabled";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";

async function main() {
  const { POST } = await import("../app/api/chat/route");
  const ask = async (messages: { role: "user" | "assistant"; content: string }[], locale: "en" | "ar" = "en", ip = "198.18.12.1") => {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ locale, messages }),
    }));
    assert.equal(response.status, 200);
    return response.json() as Promise<{
      content: string;
      stateLabel: string;
      resolutionState?: string;
      disposition?: string;
      citations?: { url?: string; sourceSection?: string }[];
      evidenceIds?: string[];
    }>;
  };

  const fall = await ask([{ role: "user", content: "I study Computer Engineering. Use the 2022-2023 cohort onwards plan; I entered in Fall. What courses are in semester 5?" }], "en", "198.18.12.11");
  assert.equal(fall.stateLabel, "v3_program_semester_plan");
  assert.equal(fall.resolutionState, "CONDITIONAL");
  assert.equal(fall.disposition, "answer");
  assert.match(fall.content, /ELEC370.*ELEC375.*CENG328.*CENG329.*CENG530/s);
  assert.match(fall.content, /17 credits/);
  assert.equal(fall.citations?.length, 1);
  assert.match(fall.citations?.[0]?.url ?? "", /cit_bsc_computer_engineering_study_plan\.pdf/);
  assert.match(fall.citations?.[0]?.sourceSection ?? "", /2022-2023.*Fall entry/i);
  assert.match(fall.evidenceIds?.[0] ?? "", /ce-144-2022-onward-fall-entry:5/);

  const springArabic = await ask([{ role: "user", content: "\u0623\u0646\u0627 \u0623\u062f\u0631\u0633 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628. \u0623\u0631\u064a\u062f \u062e\u0637\u0629 2022-2023 \u0648\u0645\u0627 \u0628\u0639\u062f\u0647\u0627\u060c \u062f\u062e\u0644\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0631\u0628\u064a\u0639\u064a. \u0645\u0627 \u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062e\u0627\u0645\u0633\u061f" }], "ar", "198.18.12.12");
  assert.equal(springArabic.stateLabel, "v3_program_semester_plan");
  assert.equal(springArabic.resolutionState, "CONDITIONAL");
  assert.match(springArabic.content, /CENG320.*CENG324.*CENG325.*CENG530/s);
  assert.match(springArabic.content, /17 \u0633\u0627\u0639\u0629/);
  assert.doesNotMatch(springArabic.content, /ELEC370/);
  assert.match(springArabic.citations?.[0]?.url ?? "", /cit_bsc_computer_engineering_study_plan\.pdf/);

  const missingVersion = await ask([{ role: "user", content: "For Computer Engineering, what courses are in semester 5?" }], "en", "198.18.12.13");
  assert.equal(missingVersion.stateLabel, "v3_program_semester_plan");
  assert.equal(missingVersion.resolutionState, "MISSING_CONTEXT");
  assert.equal(missingVersion.disposition, "clarify");
  assert.match(missingVersion.content, /Which published cohort\/source label applies/);
  assert.doesNotMatch(missingVersion.content, /\bELEC370\b|\bCENG320\b/);
  assert.equal(missingVersion.citations?.length, 2, "clarification cites both conflicting source plans");

  const missingEntry = await ask([{ role: "user", content: "For Computer Engineering, use the 2022-2023 cohort onwards plan. What courses are in semester 5?" }], "en", "198.18.12.14");
  assert.equal(missingEntry.resolutionState, "MISSING_CONTEXT");
  assert.match(missingEntry.content, /separate Fall-entry and Spring-entry sequences/);
  assert.doesNotMatch(missingEntry.content, /\bELEC370\b|\bCENG320\b/);

  const followUp = await ask([
    { role: "user", content: "For Computer Engineering, what courses are in semester 5?" },
    { role: "assistant", content: missingVersion.content },
    { role: "user", content: "Use the 2022-2023 cohort onwards plan; I entered in Spring." },
  ], "en", "198.18.12.15");
  assert.equal(followUp.resolutionState, "CONDITIONAL");
  assert.match(followUp.content, /CENG320.*CENG324.*CENG325.*CENG530/s);
  assert.match(followUp.evidenceIds?.[0] ?? "", /ce-144-2022-onward-spring-entry:5/);

  const archArabic = await ask([{
    role: "user",
    content: "\u0623\u062f\u0631\u0633 \u0627\u0644\u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u0645\u0639\u0645\u0627\u0631\u064a\u0629. \u062e\u0637\u0629 2022-2023 \u0648\u0645\u0627 \u0628\u0639\u062f\u0647\u0627. \u062f\u062e\u0644\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0631\u0628\u064a\u0639\u064a. \u0645\u0627 \u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0623\u0648\u0644\u061f",
  }], "ar", "198.18.12.16");
  assert.equal(archArabic.stateLabel, "v3_program_semester_plan");
  assert.equal(archArabic.resolutionState, "CONDITIONAL");
  assert.match(archArabic.content, /ESPU107.*MATH1110\/130/s);
  assert.match(archArabic.citations?.[0]?.url ?? "", /coe_bsc_architectural_engineering_study_plan\.pdf/);

  const commFall = await ask([{
    role: "user",
    content: "For Communication Engineering, use the 2022-2023 plan. I entered in Fall. What courses are in semester 1?",
  }], "en", "198.18.12.17");
  assert.equal(commFall.stateLabel, "v3_program_semester_plan");
  assert.equal(commFall.resolutionState, "CONDITIONAL");
  assert.match(commFall.content, /ESPU107.*ISLM100 or ISLM101/s);
  assert.match(commFall.content, /Individual course credits are not specified/);
  assert.match(commFall.citations?.[0]?.url ?? "", /coe_bsc_communication_engineering_study_plan\.pdf/);

  const commFollowUp = await ask([
    { role: "user", content: "For Communication Engineering, what courses are in semester 1?" },
    { role: "assistant", content: "Which published cohort/source label applies to your Communication Engineering plan?" },
    { role: "user", content: "For Communication Engineering, use the 2022-2023 plan, Fall entry." },
  ], "en", "198.18.12.18");
  assert.equal(commFollowUp.stateLabel, "v3_program_semester_plan");
  assert.equal(commFollowUp.resolutionState, "CONDITIONAL");
  assert.match(commFollowUp.content, /ESPU107.*ISLM100 or ISLM101/s);
  assert.match(commFollowUp.evidenceIds?.[0] ?? "", /communication-engineering-2022-plan-147-fall-spring-fall-entry:1/);

  const commSpringArabic = await ask([{
    role: "user",
    content: "\u0623\u062f\u0631\u0633 \u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a. \u062e\u0637\u0629 2022-2023. \u062f\u062e\u0644\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0631\u0628\u064a\u0639\u064a. \u0645\u0627 \u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0623\u0648\u0644\u061f",
  }], "ar", "198.18.12.19");
  assert.equal(commSpringArabic.stateLabel, "v3_program_semester_plan");
  assert.equal(commSpringArabic.resolutionState, "CONDITIONAL");
  assert.match(commSpringArabic.content, /MATH1110.*MATH130/);
  assert.match(commSpringArabic.content, /17 \u0633\u0627\u0639\u0629/);
  assert.match(commSpringArabic.citations?.[0]?.url ?? "", /coe_bsc_communication_engineering_study_plan\.pdf/);

  console.log("Academic semester-plan chat runtime passed: CE, Architectural, and Communication Engineering sequences; English/Arabic, citations, missing-context clarification, and contextual follow-up.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
