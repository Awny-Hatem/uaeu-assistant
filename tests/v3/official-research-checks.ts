import assert from "node:assert/strict";
import { researchOfficialUaeu } from "../../lib/research/official-research";
import type { EvidenceQuery } from "../../lib/v3/contracts";

const sitemapUrl = "https://www.uaeu.ac.ae/en/website/index.shtml";
const calendarUrl = "https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en";
const sitemap = `<!doctype html><html><head><title>UAEU Sitemap</title></head><body><main>
  <a href="${calendarUrl}">Academic Calendar and semester deadlines</a>
  <a href="https://www.uaeu.ac.ae/en/admission/undergraduate-scholarships.shtml">Scholarship deadlines</a>
  <a href="https://uaeu.ac.ae.attacker.example/calendar">Academic Calendar mirror</a>
  <p>University admissions academics student services libraries colleges research directory and official information for students.</p>
</main></body></html>`;
const calendar = `<!doctype html><html><head><title>UAEU Academic Calendar</title></head><body><main>
  <h1>Academic Calendar Fall 2026</h1><p>Course registration and add/drop deadlines are listed for Fall 2026. The last day to drop without failure is September 18, 2026. This page contains official university-wide dates; verify personal account deadlines in the student portal.</p>
</main></body></html>`;
const requests: string[] = [];
const fetcher: typeof fetch = async (input) => {
  const url = String(input);
  requests.push(url);
  if (url === sitemapUrl) return new Response(sitemap, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  if (url === calendarUrl) return new Response(calendar, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  return new Response("", { status: 404 });
};
const query: EvidenceQuery = {
  request: "What is the UAEU course registration deadline for Fall 2026?",
  requestedFacts: ["registration deadline"],
  scope: { domain: "calendar", eventType: "calendar_deadline", term: "fall", year: 2026 },
  freshnessRequirement: "current",
};

async function main() {
const items = await researchOfficialUaeu(query, { fetcher, seedUrls: [], now: () => new Date("2026-11-11T08:00:00.000Z") });
assert.equal(items.length, 1);
assert.equal(items[0].sourceType, "official_web");
assert.equal(items[0].trustStatus, "discovered", "web discovery must not silently approve a new rule");
assert.equal(items[0].freshnessStatus, "unknown", "fetch time alone must not imply the page's policy is current");
assert.equal(items[0].retrievedAt, "2026-11-11T08:00:00.000Z", "retain the observed retrieval timestamp");
assert.equal(items[0].authority, "UAEU");
assert.equal(items[0].scope?.domain, "calendar");
assert.equal(items[0].scope?.year, 2026);
assert.match(items[0].excerpt, /Fall 2026/);
assert.ok(requests.every((url) => url === sitemapUrl || url === calendarUrl), "research must not fetch off-domain URLs");

const redirectCalls: string[] = [];
const redirectFetcher: typeof fetch = async (input) => {
  const url = String(input);
  redirectCalls.push(url);
  if (url === sitemapUrl) return new Response(`<html><title>UAEU</title><body><main>${"Sitemap official university links ".repeat(10)}</main></body></html>`, { status: 200, headers: { "content-type": "text/html" } });
  return new Response(null, { status: 302, headers: { location: "https://uaeu.ac.ae.attacker.example/collect" } });
};
const rejectedRedirect = await researchOfficialUaeu({ ...query, scope: { domain: "calendar" } }, {
  fetcher: redirectFetcher,
  seedUrls: [calendarUrl],
});
assert.equal(rejectedRedirect.length, 0, "off-domain redirects must be rejected");
assert.ok(redirectCalls.every((url) => !url.includes("attacker.example")));

console.log("V3 official research checks passed: UAEU allowlist, freshness metadata, event/year scope, and redirect rejection.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
