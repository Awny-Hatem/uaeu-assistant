import assert from "node:assert/strict";
import { researchOfficialUaeu } from "../../lib/research/official-research";
import { needsEvidenceQualification } from "../../lib/v3/evidence-quality";
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
assert.equal(needsEvidenceQualification([items[0]]), true);
assert.equal(needsEvidenceQualification([{ freshnessStatus: "current", trustStatus: "approved" }]), false);
assert.equal(needsEvidenceQualification([{ freshnessStatus: "unknown", trustStatus: "approved" }]), true);
assert.equal(items[0].authority, "UAEU");
assert.equal(items[0].scope?.domain, "calendar");
assert.equal(items[0].scope?.year, 2026);
assert.match(items[0].excerpt, /Fall 2026/);
assert.match(items[0].excerpt, /last day to drop without failure/i);
assert.doesNotMatch(items[0].excerpt, /University admissions academics student services/i,
  "the evidence excerpt should contain the matched passage, not merely the beginning of the page");
assert.ok(requests.every((url) => url === sitemapUrl || url === calendarUrl), "research must not fetch off-domain URLs");

const registrationQuery: EvidenceQuery = {
  request: "UAEU official course registration deadline Fall 2026",
  requestedFacts: ["course registration deadline"],
  scope: { domain: "registration", eventType: "registration_deadline", term: "fall", year: 2026 },
  freshnessRequirement: "current",
};
const registrationItems = await researchOfficialUaeu(registrationQuery, { fetcher, seedUrls: [calendarUrl] });
assert.equal(registrationItems.length, 1, "the planner's registration-specific deadline scope should accept relevant calendar evidence");
assert.match(registrationItems[0].excerpt, /registration and add\/drop deadlines/i);

const sectionGroupedCalendar = `<html><body><main><div class="accordion-title"><button><span>Fall Semester 2026</span></button></div><div class="accordion-content"><ul><li><time>28 Aug</time><div><h3>Last day to add courses</h3><div><span>Friday, 28 August</span></div></div></li></ul></div><div class="accordion-title"><button><span>Spring Semester 2027</span></button></div><div class="accordion-content"><ul><li><h3>Registration begins</h3><span>04 January</span></li></ul></div></main></body></html>`;
const sectionGroupedFetcher: typeof fetch = async (input) => {
  const url = String(input);
  if (url === sitemapUrl) return new Response(sitemap, { status: 200, headers: { "content-type": "text/html" } });
  if (url === calendarUrl) return new Response(sectionGroupedCalendar, { status: 200, headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 });
};
const sectionGroupedItems = await researchOfficialUaeu(registrationQuery, { fetcher: sectionGroupedFetcher, seedUrls: [calendarUrl] });
assert.equal(sectionGroupedItems.length, 1, "semester heading context should scope calendar events that omit their year");
assert.match(sectionGroupedItems[0].excerpt, /Fall Semester 2026[\s\S]*Last day to add courses[\s\S]*28 August/);
assert.doesNotMatch(sectionGroupedItems[0].excerpt, /Spring Semester 2027/);

const openingOnlyPage = `<html><body><main><h2>Fall Semester 2026</h2><ul><li><h3>Registration begins</h3><span>Monday, 06 April 2026</span></li></ul></main></body></html>`;
const openingOnlyFetcher: typeof fetch = async (input) => {
  const url = String(input);
  if (url === sitemapUrl) return new Response(sitemap, { status: 200, headers: { "content-type": "text/html" } });
  if (url === calendarUrl) return new Response(openingOnlyPage, { status: 200, headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 });
};
const openingOnlyItems = await researchOfficialUaeu(registrationQuery, { fetcher: openingOnlyFetcher, seedUrls: [calendarUrl] });
assert.equal(openingOnlyItems.length, 0, "a registration opening date must not be misreported as a registration deadline");

const scholarshipUrl = "https://www.uaeu.ac.ae/en/admission/undergraduate-scholarships.shtml";
const admissionsQuery: EvidenceQuery = {
  request: "UAEU admission application deadline for Fall 2026",
  requestedFacts: ["admission application deadline"],
  scope: { domain: "admissions", eventType: "admissions_deadline", term: "fall", year: 2026 },
  freshnessRequirement: "current",
};
const categoryFetcher: typeof fetch = async (input) => {
  const url = String(input);
  if (url === sitemapUrl) return new Response(sitemap, { status: 200, headers: { "content-type": "text/html" } });
  if (url === scholarshipUrl) return new Response(`<html><body><main><h1>Scholarship deadlines</h1><p>Fall 2026 scholarship application deadline and award submission dates. The university scholarship office publishes the closing date for each scholarship separately; this is not an admission application deadline.</p></main></body></html>`, { status: 200, headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 });
};
const admissionResults = await researchOfficialUaeu(admissionsQuery, { fetcher: categoryFetcher, seedUrls: [scholarshipUrl] });
assert.equal(admissionResults.length, 0, "a scholarship deadline page must not satisfy an admission deadline query");

const longPage = `<html><body><main>${"<p>General UAEU student information.</p>".repeat(300)}<h2>Fall 2026 course registration</h2><p>Fall 2026 course registration deadline is September 18, 2026. Students can check the official calendar for the last day to drop without failure.</p></main></body></html>`;
const longPageFetcher: typeof fetch = async (input) => {
  const url = String(input);
  if (url === sitemapUrl) return new Response(sitemap, { status: 200, headers: { "content-type": "text/html" } });
  if (url === calendarUrl) return new Response(longPage, { status: 200, headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 });
};
const longPageResults = await researchOfficialUaeu(query, { fetcher: longPageFetcher, seedUrls: [calendarUrl] });
assert.equal(longPageResults.length, 1, "a relevant passage near the end of a long page should remain discoverable");
assert.match(longPageResults[0].excerpt, /September 18, 2026/);
assert.doesNotMatch(longPageResults[0].excerpt, /General UAEU student information/);

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

const unknownSubdomainCalls: string[] = [];
const unknownSubdomain = await researchOfficialUaeu({ ...query, scope: { domain: "calendar" } }, {
  fetcher: async (input) => { unknownSubdomainCalls.push(String(input)); return new Response("", { status: 404 }); },
  seedUrls: ["https://arbitrary.uaeu.ac.ae/internal"],
});
assert.equal(unknownSubdomain.length, 0);
assert.ok(!unknownSubdomainCalls.some((url) => url.includes("arbitrary.uaeu.ac.ae")), "unknown UAEU subdomains must not be fetched");

console.log("V3 official research checks passed: UAEU allowlist, freshness metadata, event/year scope, and redirect rejection.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
