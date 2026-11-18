import assert from "node:assert/strict";
import { isServiceGuideCurrent, loadServiceGuides } from "../lib/service-guides";

process.env.AI_PROVIDER = "mock";
process.env.UAEU_AGENT_V3_ENABLED = "enabled";
process.env.CHATBOT_DB_PATH = ":memory:";
process.env.TRUST_PROXY_HEADERS = "enabled";
process.env.AUTH_COOKIE_SECRET = "test-only-auth-cookie-secret-with-at-least-32-characters";

async function main() {
  const { POST } = await import("../app/api/chat/route");
  const guides = loadServiceGuides();
  const auditDate = new Date("2026-11-14T12:00:00Z");
  assert.equal(isServiceGuideCurrent("2026-11-14", auditDate), true);
  assert.equal(isServiceGuideCurrent("2026-05-01", auditDate), false, "stale guide evidence must be rejected");
  assert.equal(isServiceGuideCurrent("2026-11-16", auditDate), false, "future-dated guide evidence must be rejected");
  assert.equal(isServiceGuideCurrent("not-a-date", auditDate), false, "invalid verification dates must be rejected");
  const arabicText = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;
  let checked = 0;

  for (const [index, guide] of guides.entries()) {
    const arabicQuery = guide.keywords
      .filter((keyword) => arabicText.test(keyword))
      .sort((left, right) => right.length - left.length)[0];
    assert.ok(arabicQuery, `${guide.id} needs an Arabic route phrase`);

    const framedArabicTitle = `أجب استناداً إلى مصدر رسمي لجامعة الإمارات، ووضّح حدود المعلومة: كيف أستخدم خدمة جامعة الإمارات: ${guide.titleAr ?? guide.title}؟`;
    for (const [locale, query, identity] of [
      ["en", guide.keywords[0], `198.51.100.${index + 1}`],
      ["ar", arabicQuery, `203.0.113.${index + 1}`],
      ["ar", framedArabicTitle, `192.0.2.${index + 1}`],
    ] as const) {
      const response = await POST(new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-forwarded-for": identity,
        },
        body: JSON.stringify({ locale, messages: [{ role: "user", content: query }] }),
      }));
      const payload = await response.json();
      assert.equal(response.status, 200, `${guide.id}/${locale} should return HTTP 200`);
      assert.equal(payload.source, "guide", `${guide.id}/${locale} should use the structured guide`);
      assert.equal(payload.guide?.id, guide.id, `${guide.id}/${locale} should not collide with another workflow`);
      assert.ok(payload.citations?.some((citation: { url?: string }) => citation.url === guide.officialUrl),
        `${guide.id}/${locale} must cite its official destination`);
      for (const sourceUrl of new Set(guide.steps.map((step) => step.url).filter(Boolean))) {
        assert.ok(payload.citations?.some((citation: { url?: string }) => citation.url === sourceUrl),
          `${guide.id}/${locale} must cite the source linked from each step`);
      }
      assert.match(payload.content ?? "", locale === "ar" ? arabicText : /[A-Za-z]/u,
        `${guide.id}/${locale} should render in the requested language`);
      assert.doesNotMatch(payload.content ?? "", /[ØÙ]/u, `${guide.id}/${locale} must not contain mojibake`);
      const requestDetails = payload.guide?.requestDetails;
      assert.ok(requestDetails, `${guide.id}/${locale} must expose structured request facts`);
      for (const key of ["documents", "deadline", "handoff"] as const) {
        const localizedFact = requestDetails[key]?.[locale];
        assert.ok(typeof localizedFact === "string" && localizedFact.length > 0,
          `${guide.id}/${locale} must include ${key} guidance`);
        assert.ok((payload.content ?? "").includes(localizedFact),
          `${guide.id}/${locale} must render ${key} guidance`);
      }
      checked += 1;
    }

    const sourceExpiresAt = new Date(Date.parse(`${guide.lastVerified}T00:00:00.000Z`) + 181 * 86_400_000);
    assert.equal(isServiceGuideCurrent(guide.lastVerified, sourceExpiresAt), false,
      `${guide.id} must expire when its verification is older than 180 days`);

    const personalized = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${index + 101}` },
      body: JSON.stringify({
        locale: "en",
        messages: [{ role: "user", content: `${guide.keywords[0]} for my personal situation` }],
      }),
    }));
    const personalPayload = await personalized.json();
    assert.equal(personalPayload.source, "guide", `${guide.id} should retain the correct workflow when personal facts are missing`);
    assert.equal(personalPayload.guide?.id, guide.id, `${guide.id} should not substitute another workflow`);
    for (const key of ["documents", "deadline", "handoff"] as const) {
      assert.ok(personalPayload.content?.includes(guide.requestDetails[key].en),
        `${guide.id} should expose its known or unpublished ${key} details without guessing personal facts`);
    }
    assert.doesNotMatch(personalPayload.content ?? "", /(?:your request|application) (?:was|has been) approved|submitted successfully/i,
      `${guide.id} must not claim a personal request was completed`);

    const arabicPersonalized = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "x-forwarded-for": `192.0.2.${index + 101}` },
      body: JSON.stringify({
        locale: "ar",
        messages: [{ role: "user", content: `${arabicQuery} \u0644\u062d\u0627\u0644\u062a\u064a \u0627\u0644\u0634\u062e\u0635\u064a\u0629` }],
      }),
    }));
    const arabicPersonalPayload = await arabicPersonalized.json();
    assert.equal(arabicPersonalPayload.source, "guide", `${guide.id} should keep its matching workflow for a personal Arabic follow-up`);
    assert.equal(arabicPersonalPayload.guide?.id, guide.id, `${guide.id} should not switch to a neighboring Arabic workflow`);
    assert.match(arabicPersonalPayload.content ?? "", arabicText, `${guide.id} should answer in Arabic when personal details are missing`);
    for (const key of ["documents", "deadline", "handoff"] as const) {
      assert.ok(arabicPersonalPayload.content?.includes(guide.requestDetails[key].ar),
        `${guide.id} should expose its Arabic ${key} details without inventing personal facts`);
    }

    const excludedIntent = guide.excludeKeywords?.[0];
    if (excludedIntent) {
      const wrongIntent = await POST(new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `203.0.113.${index + 101}` },
        body: JSON.stringify({ locale: "en", messages: [{ role: "user", content: excludedIntent }] }),
      }));
      const wrongPayload = await wrongIntent.json();
      assert.notEqual(wrongPayload.guide?.id, guide.id,
        `${guide.id} must not claim its configured excluded intent: ${excludedIntent}`);

      const arabicWrongIntent = await POST(new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", "x-forwarded-for": `192.0.2.${index + 151}` },
        body: JSON.stringify({ locale: "ar", messages: [{ role: "user", content: excludedIntent }] }),
      }));
      const arabicWrongPayload = await arabicWrongIntent.json();
      assert.notEqual(arabicWrongPayload.guide?.id, guide.id,
        `${guide.id} must reject the excluded intent when Arabic is requested`);
    }

    if ((index + 1) % 4 === 0 || index === guides.length - 1) {
      console.log(`Service workflow progress: ${index + 1}/${guides.length} guides; ${checked}/${guides.length * 3} localized routes checked.`);
    }
  }

  const RealDate = globalThis.Date;
  const futureTimestamp = RealDate.parse("2027-06-01T12:00:00.000Z");
  class FutureDate extends RealDate {
    constructor(...args: ConstructorParameters<typeof RealDate>) {
      if ((args as unknown[]).length === 0) super(futureTimestamp);
      else super(...args);
    }
    static now() { return futureTimestamp; }
  }
  globalThis.Date = FutureDate as DateConstructor;
  try {
    assert.equal(loadServiceGuides().length, 0, "out-of-date workflow snapshots must be withheld");
    const staleResponse = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.249" },
      body: JSON.stringify({ locale: "en", messages: [{ role: "user", content: "How do I register for a course?" }] }),
    }));
    const stalePayload = await staleResponse.json();
    assert.notEqual(stalePayload.source, "guide", "a stale workflow must never be presented as current instructions");
    assert.notEqual(stalePayload.guide?.id, "register-for-a-class");
    const staleArabicResponse = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "x-forwarded-for": "192.0.2.248" },
      body: JSON.stringify({ locale: "ar", messages: [{ role: "user", content: "\u0643\u064a\u0641 \u0623\u0633\u062c\u0644 \u0641\u064a \u0645\u0642\u0631\u0631\u061f" }] }),
    }));
    const staleArabicPayload = await staleArabicResponse.json();
    assert.notEqual(staleArabicPayload.source, "guide", "stale workflows must also be withheld from Arabic responses");
    assert.match(staleArabicPayload.content ?? "", arabicText, "the stale-source limitation should remain in Arabic");
  } finally {
    globalThis.Date = RealDate;
  }

  const unspecifiedRequest = await POST(new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.250" },
    body: JSON.stringify({ locale: "en", messages: [{ role: "user", content: "How do I apply?" }] }),
  }));
  const clarification = await unspecifiedRequest.json();
  assert.equal(clarification.source, "escalated", "an unspecified application request must ask which service");
  assert.match(clarification.content ?? "", /service name or course code/i);
  assert.notEqual(clarification.guide?.id, "undergraduate-admission-application");

  assert.equal(checked, guides.length * 3);
  console.log(`Service guide workflow checks passed: ${checked}/${checked} bilingual happy-path routes with citations; ${guides.length * 2} English/Arabic missing-personal-input routes; ${guides.length * 2} English/Arabic excluded-intent routes; stale-source checks for all ${guides.length} guides plus English/Arabic stale responses; and unspecified-intent clarification.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
