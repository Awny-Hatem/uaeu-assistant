import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const ROOT = "https://www.uaeu.ac.ae/en/catalog/courses/";
const OUTPUT = path.join(process.cwd(), "data", "academic", "course-catalog.json");
const CACHE = path.join(tmpdir(), "uaeu-course-catalog-import-cache-v1.json");
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
  const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => stripHtml(match[1])).filter(Boolean);
  return items.length ? items : [stripHtml(body)].filter(Boolean);
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
  const signature = createHash("sha256").update(JSON.stringify(links)).digest("hex");
  const records = new Array(links.length);
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
      const i = next++;
      if (i >= links.length) return;
      if (records[i]) continue;
      try {
        const html = await fetchOfficial(links[i].url);
        records[i] = parseCoursePage(html, links[i], verifiedAt);
      } catch (error) {
        failures.push({ code: links[i].code, error: String(error) });
      }
      finished++;
      if (finished % 50 === 0) {
        console.log(`Fetched ${finished}/${links.length}`);
        await checkpoint();
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await checkpoint();
  if (failures.length || records.length !== links.length) {
    console.error(JSON.stringify({ listed: links.length, parsed: records.length, failures }, null, 2));
    throw new Error(`Course catalog import incomplete: ${failures.length} failures`);
  }
  const output = { schemaVersion: 1, title: "UAEU official course catalog snapshot", verifiedAt, sourceIndex: ROOT, courseCount: records.length, courses: records };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await rm(CACHE, { force: true });
  console.log(`Wrote ${records.length} official course records to ${OUTPUT}`);
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}` || process.argv[1]?.endsWith("import-official-course-catalog.mjs")) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
