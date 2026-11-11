import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const ROOT = "https://www.uaeu.ac.ae/en/catalog/courses/";
const OUTPUT = path.join(process.cwd(), "data", "academic", "course-catalog.json");
const SUPPLEMENTS = path.join(process.cwd(), "data", "academic", "course-catalog-supplements.json");
const CACHE = path.join(tmpdir(), "uaeu-course-catalog-import-cache-v3.json");
const CODE = /^[A-Z]{2,8}\s?\d{3,4}[A-Z]?$/;

export function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function stripHtml(value = "") {
  return decodeHtml(value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/[\u200b\u00ad]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function relationBlockItems(section, headingName) {
  const regex = new RegExp(`<h3\\b[^>]*>\\s*${headingName}\\s*<\\/h3>([\\s\\S]*?)(?=<h3\\b|$)`, "i");
  const body = section.match(regex)?.[1];
  if (!body) return [];
  const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripHtml(addAndBetweenAdjacentCourseLinks(match[1])))
    .filter(Boolean);
  if (!items.length) return [stripHtml(body)].filter(Boolean);
  // Some UAEU course pages contain visible linked requirements outside the
  // surrounding <li> elements. Keep that residual text so downstream rule
  // parsing fails closed instead of silently dropping a prerequisite.
  const unlistedText = stripHtml(body.replace(/<li\b[^>]*>[\s\S]*?<\/li>/gi, " "));
  return unlistedText ? [...items, unlistedText] : items;
}

function addAndBetweenAdjacentCourseLinks(itemHtml) {
  const text = stripHtml(itemHtml);
  const courses = [...text.matchAll(/\b[A-Z]{2,8}\s?\d{3,4}[A-Z]?\b/giu)];
  const insertions = [];
  for (let index = 0; index < courses.length - 1; index++) {
    const current = courses[index];
    const next = courses[index + 1];
    const gap = text.slice((current.index ?? 0) + current[0].length, next.index);
    if (/\b(?:and|or)\b|\bpre\s*[\/&]\s*co\b/i.test(gap)) continue;
    // Only bridge a blank or grade-threshold-only gap. Descriptive or
    // malformed text remains unsupported by the Boolean rule parser.
    if (!/^(?:\s*(?:(?:with\s+)?(?:a\s+)?minimum\s+grade\s+[A-F](?:[+-])?\s*)?)*$/i.test(gap)) continue;
    insertions.push(next.index ?? 0);
  }
  let normalized = text;
  for (const position of insertions.reverse()) {
    normalized = `${normalized.slice(0, position)} and ${normalized.slice(position)}`;
  }
  return normalized;
}

export function extractCourseCodes(indexHtml) {
  const courses = new Map();
  for (const match of indexHtml.matchAll(/<a\b[^>]*href=["']([^"']*course_\d+\.shtml\?id=([^"']+))["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = new URL(decodeHtml(match[1]), ROOT);
    const code = decodeURIComponent(match[2]).trim().toUpperCase().replace(/\s+/g, "");
    if (!CODE.test(code) || url.protocol !== "https:" || url.hostname !== "www.uaeu.ac.ae" || !url.pathname.includes("/catalog/courses/")) continue;
    url.searchParams.set("id", code);
    if (!courses.has(code)) courses.set(code, { code, url: url.href });
  }
  return [...courses.values()];
}

export function groupCoursesByPage(courses) {
  const groups = new Map();
  for (const course of courses) {
    const url = new URL(course.url);
    const key = `${url.origin}${url.pathname}`;
    const group = groups.get(key) ?? { url: course.url, courses: [] };
    group.courses.push(course);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function mergeCourseCatalogSupplements(records, supplements) {
  if (!Array.isArray(supplements)) throw new Error("Course catalog supplements must be a JSON array.");
  const merged = [...records];
  const mergedCodes = new Set(records.map(({ code }) => code));
  const supplementCodes = new Set();
  for (const record of supplements) {
    let officialSource = false;
    try {
      const sourceUrl = new URL(record?.source?.url);
      officialSource = sourceUrl.protocol === "https:" && (
        (sourceUrl.hostname === "www.uaeu.ac.ae" && sourceUrl.pathname.startsWith("/en/catalog/courses/")) ||
        (sourceUrl.hostname === "www.uaeu.ac.ae" && sourceUrl.pathname === "/en/eng/pdf/coe_bsc_electrical_engineering_study_plan.pdf") ||
        (sourceUrl.hostname === "webapps.uaeu.ac.ae" && [
          "/catalog/auto/department_HS_HS_SOCW.asp",
          "/catalog/auto/department_SC_SC_BIOL.asp",
        ].includes(sourceUrl.pathname))
      );
    } catch { /* Invalid source URLs are rejected below. */ }
    if (!record || !CODE.test(record.code) || supplementCodes.has(record.code) || !record.title || !officialSource || !record.source?.verifiedAt ||
      (record.creditHours !== null && (!Number.isFinite(record.creditHours) || record.creditHours < 0)) ||
      !Array.isArray(record.prerequisiteItems) || !Array.isArray(record.corequisiteItems) || !Array.isArray(record.preCorequisiteItems)) {
      throw new Error(`Invalid, duplicate, or unsourced course catalog supplement: ${record?.code ?? "unknown"}`);
    }
    supplementCodes.add(record.code);
    if (mergedCodes.has(record.code)) continue;
    merged.push(record);
    mergedCodes.add(record.code);
  }
  return merged;
}

function getSection(html, code) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const open = new RegExp(`<div\\b(?=[^>]*\\bid\\s*=\\s*["']\\s*${escaped}\\s*["'])[^>]*>`, "i").exec(html);
  if (!open) return null;
  const start = open.index + open[0].length;
  const nextSection = html.slice(start).search(/<div\b[^>]*\bid\s*=\s*["'][^"']+["'][^>]*>/i);
  const close = html.indexOf("</div>", start);
  const end = nextSection < 0 ? close : Math.min(close, start + nextSection);
  if (close < 0 || end < start) return null;
  return html.slice(start, end);
}

export function parseCoursePage(html, course, verifiedAt = new Date().toISOString().slice(0, 10)) {
  const section = getSection(html, course.code);
  if (!section) throw new Error(`No course section found for ${course.code}`);
  const heading = section.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const headingText = stripHtml(heading);
  const title = headingText.replace(new RegExp(`\\s*\\(${course.code}\\)\\s*$`, "i"), "").trim();
  if (!title || !headingText.toUpperCase().includes(course.code)) throw new Error(`Missing or mismatched title for ${course.code}`);
  const rawDescription = section.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const description = rawDescription ? stripHtml(rawDescription) : null;
  const creditsMatch = section.match(/<h3\b[^>]*>[\s\S]*?Credit\s*Hours?\s*:\s*([\d.]+)\s*<\/h3>/i);
  const creditHours = creditsMatch ? Number(creditsMatch[1]) : null;
  const prerequisiteItems = relationBlockItems(section, "Prerequisites");
  const corequisiteItems = relationBlockItems(section, "Corequisites");
  const preCorequisiteItems = relationBlockItems(section, "Pre\\s*[/&]\\s*Co(?:requisites)?");
  const regularPrerequisites = [];
  const concurrentAlternatives = [...preCorequisiteItems];
  for (const item of prerequisiteItems) {
    const preCo = item.match(/^Pre\s*\/\s*Co\s+(.+)$/i);
    if (preCo) concurrentAlternatives.push(preCo[1].trim());
    else regularPrerequisites.push(item);
  }
  const prerequisiteText = regularPrerequisites.length ? regularPrerequisites.join("; ") : null;
  const corequisiteText = corequisiteItems.length ? corequisiteItems.join("; ") : null;
  const preCorequisiteText = concurrentAlternatives.length ? concurrentAlternatives.join("; ") : null;
  return {
    code: course.code,
    title,
    description,
    descriptionStatus: description ? "published" : "not-present-in-catalog-section",
    creditHours,
    prerequisiteText,
    prerequisiteItems: regularPrerequisites,
    corequisiteText,
    corequisiteItems,
    preCorequisiteText,
    preCorequisiteItems: concurrentAlternatives,
    source: { title: `UAEU Course Catalog — ${course.code}`, url: course.url, verifiedAt },
  };
}

async function fetchOfficial(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "www.uaeu.ac.ae") throw new Error(`Refusing non-official catalog URL: ${url}`);
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "UAEU-ChatBot-course-catalog-import/1.0" } });
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429) throw new Error(`HTTP ${response.status} for ${url}`);
        throw new Error(`Retryable HTTP ${response.status} for ${url}`);
      }
      if (new URL(response.url).hostname !== "www.uaeu.ac.ae") throw new Error(`Unexpected redirect from official catalog: ${response.url}`);
      return response.text();
    } catch (error) {
      lastError = error;
      if (String(error).includes("HTTP 4") && !String(error).includes("HTTP 429")) break;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    }
  }
  throw lastError;
}

async function main() {
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const index = await fetchOfficial(ROOT);
  const links = extractCourseCodes(index);
  if (links.length < 1000) throw new Error(`Catalog index returned suspiciously few courses (${links.length})`);
  const pages = groupCoursesByPage(links);
  const signature = createHash("sha256").update(JSON.stringify(links)).digest("hex");
  const records = new Array(links.length);
  const indexByCode = new Map(links.map((link, index) => [link.code, index]));
  const failures = [];
  try {
    const cache = JSON.parse(await readFile(CACHE, "utf8"));
    if (cache.signature === signature && Array.isArray(cache.records)) {
      const byCode = new Map(cache.records.map((record) => [record.code, record]));
      links.forEach((link, index) => { records[index] = byCode.get(link.code); });
      console.log(`Resuming from ${records.filter(Boolean).length} cached course records`);
    }
  } catch { /* No valid checkpoint; start a clean import. */ }
  let cacheWrite = Promise.resolve();
  const checkpoint = () => {
    const snapshot = JSON.stringify({ signature, records: records.filter(Boolean) });
    cacheWrite = cacheWrite.then(async () => {
      const temporary = `${CACHE}.tmp`;
      await writeFile(temporary, snapshot, "utf8");
      await rename(temporary, CACHE);
    });
    return cacheWrite;
  };
  let next = 0;
  let finished = records.filter(Boolean).length;
  const worker = async () => {
    while (true) {
      const pageIndex = next++;
      if (pageIndex >= pages.length) return;
      const page = pages[pageIndex];
      const pageIndexes = page.courses.map(({ code }) => indexByCode.get(code));
      if (pageIndexes.every((index) => index !== undefined && records[index])) continue;
      for (const index of pageIndexes) if (index !== undefined) records[index] = undefined;
      try {
        const html = await fetchOfficial(page.url);
        const parsedPageRecords = page.courses.map((course) => parseCoursePage(html, course, verifiedAt));
        pageIndexes.forEach((index, offset) => {
          if (index !== undefined) records[index] = parsedPageRecords[offset];
        });
      } catch (error) {
        failures.push({ url: page.url, courseCodes: page.courses.map(({ code }) => code), error: String(error) });
      }
      finished = records.filter(Boolean).length;
      console.log(`Fetched ${finished}/${links.length} course records (${pageIndex + 1}/${pages.length} pages)`);
      await checkpoint();
    }
  };
  await Promise.all(Array.from({ length: 2 }, worker));
  await checkpoint();
  if (failures.length || records.some((record) => !record)) {
    console.error(JSON.stringify({ listed: links.length, parsed: records.filter(Boolean).length, pages: pages.length, failures }, null, 2));
    throw new Error(`Course catalog import incomplete: ${failures.length} failures`);
  }
  const supplements = JSON.parse(await readFile(SUPPLEMENTS, "utf8"));
  const merged = mergeCourseCatalogSupplements(records, supplements);
  const output = { schemaVersion: 1, title: "UAEU official course catalog snapshot", verifiedAt, sourceIndex: ROOT, courseCount: merged.length, courses: merged };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await rm(CACHE, { force: true });
  console.log(`Wrote ${records.length} central catalog records and ${supplements.length} governed supplements to ${OUTPUT}`);
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}` || process.argv[1]?.endsWith("import-official-course-catalog.mjs")) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
