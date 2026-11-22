#!/usr/bin/env node
// Builds data/academic/faculty-expertise.json from official UAEU pages only:
//  - each college's department pages (faculty tables: name, position, email, extension, profile link),
//  - each faculty member's official profile (research areas), served by coreservices.uaeu.ac.ae,
//  - the CCAI research page (research groups and labs with coordinators, industry contact),
//  - the Research Collaborations page (Research and Sponsored Projects Office).
// Usage: node scripts/build-faculty-expertise.mjs [--colleges cit,eng] [--delay 250]
import fs from "node:fs";
import path from "node:path";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const BASE = "https://www.uaeu.ac.ae";
const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const delay = Number(argValue("--delay") ?? 250);
const COLLEGES = [
  { code: "cit", name: "College of Computing and Artificial Intelligence", shortName: "CCAI" },
  { code: "eng", name: "College of Engineering" },
  { code: "cos", name: "College of Science" },
  { code: "cbe", name: "College of Business and Economics" },
  { code: "chss", name: "College of Humanities and Social Sciences" },
  { code: "cedu", name: "College of Education" },
  { code: "cavm", name: "College of Agriculture and Veterinary Medicine" },
];
const only = argValue("--colleges")?.split(",");
const colleges = only ? COLLEGES.filter((c) => only.includes(c.code)) : COLLEGES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
      const text = await res.text();
      if (res.ok && !/<title>Request Rejected<\/title>/u.test(text)) return text;
    } catch { /* retry */ }
    await sleep(1000 * attempt);
  }
  throw new Error(`fetch failed: ${url}`);
}
const decode = (s) => s.replace(/&nbsp;|&#160;/gu, " ").replace(/&amp;/gu, "&").replace(/&#x([0-9a-f]+);/giu, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/gu, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/gu, '"').replace(/&#39;|&rsquo;/gu, "'").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">");
const text = (html) => decode(html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gu, " ").replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim();
const mainHtml = (html) => html.match(/<main[\s\S]*?<\/main>/u)?.[0] ?? html;

function departmentLinks(html, code) {
  const re = new RegExp(`href="(/en/${code}/departments/[a-z0-9_\\-]+\\.shtml)"`, "giu");
  return [...new Set([...html.matchAll(re)].map((m) => m[1]))].filter((p) => !/index(-old)?\.shtml$|undergraduate_programs|graduate_programs|childlab/iu.test(p));
}

function panels(html) {
  // Department pages use vertical tabs: data-name="...-<tab>-<n>-content".
  const out = [];
  const re = /data-name="[^"]*?-([a-z0-9-]+?)-\d+-content"[^>]*>/gu;
  const marks = [...html.matchAll(re)];
  for (let i = 0; i < marks.length; i += 1) {
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : html.indexOf("</main>", start) > 0 ? html.indexOf("</main>", start) : html.length;
    out.push({ tab: marks[i][1], html: html.slice(start, end) });
  }
  return out;
}

function facultyRows(html, pageUrl) {
  const rows = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gu) ?? []) {
    const cells = (tr.match(/<td[\s\S]*?<\/td>/gu) ?? []).map((c) => ({ html: c, text: text(c) }));
    if (cells.length < 3) continue;
    const mail = tr.match(/mailto:\s*([^"'?\s]+)/iu)?.[1] ?? tr.match(/email=\s*([^"&\s]+)/iu)?.[1] ?? cells.map((c) => c.text.match(/[\w.+-]+@uaeu\.ac\.ae/iu)?.[0]).find(Boolean);
    if (!mail) continue;
    const profileHref = tr.match(/href="([^"]*profile\.shtml\?email=[^"]*)"/iu)?.[1];
    const ext = cells.map((c) => c.text).find((t) => /^\d{4}$/u.test(t));
    rows.push({
      name: cells[0].text.replace(/\s+/gu, " ").trim(),
      position: cells[1].text,
      email: mail.trim().toLowerCase(),
      ...(ext ? { ext } : {}),
      ...(profileHref ? { profileUrl: new URL(profileHref.replace(/\s+|%20/gu, ""), pageUrl).href } : {}),
    });
  }
  return rows;
}

function profileAreas(html) {
  const panel = html.match(/id="tab-research"[\s\S]*?(?=id="tab-publications"|$)/u)?.[0] ?? "";
  const items = [...panel.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gu)].map((m) => text(m[1])).filter(Boolean);
  const bio = text(html.match(/id="tab-biography"[\s\S]*?(?=id="tab-education"|$)/u)?.[0] ?? "").replace(/^BIOGRAPHY\s*/u, "");
  const interests = bio.split(/(?<=\.)\s+/u).filter((s) => /research (interests?|areas?|focus)|interested in|research (is|includes|focuses)/iu.test(s)).slice(0, 2).join(" ");
  return { researchAreas: [...new Set(items)], ...(interests ? { researchInterests: interests.slice(0, 600) } : {}) };
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const departments = [];
  const faculty = new Map();
  for (const college of colleges) {
    const indexUrl = `${BASE}/en/${college.code}/departments/`;
    const indexHtml = await get(indexUrl);
    for (const rel of departmentLinks(indexHtml, college.code)) {
      const url = `${BASE}${rel}`;
      await sleep(delay);
      let html;
      try { html = await get(url); } catch (error) { console.warn(String(error)); continue; }
      const main = mainHtml(html);
      const rawName = text(main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/u)?.[1] ?? html.match(/<title>([\s\S]*?)<\/title>/u)?.[1] ?? rel);
      const bare = rawName.replace(/^department of\s+/iu, "").replace(/\s+department$/iu, "").trim();
      // Where a page's own heading is wrong or shortened, use the name its Overview states.
      const NAME_FROM_OVERVIEW = { "/en/chss/departments/lang_lterature.shtml": "Department of Languages and Literature", "/en/eng/departments/chemical.shtml": "Department of Chemical and Petroleum Engineering", "/en/eng/departments/eru.shtml": "Engineering Requirements Unit" };
      const name = NAME_FROM_OVERVIEW[rel] ?? `Department of ${bare}`;
      const tabs = panels(main);
      const facultyTab = tabs.find((t) => /faculty|staff|people/u.test(t.tab));
      const rows = facultyRows(facultyTab?.html ?? main, url);
      const facilities = tabs.filter((t) => /facilit|lab|research/u.test(t.tab)).map((t) => text(t.html)).join(" ").slice(0, 6000);
      departments.push({ college: college.code, collegeName: college.name, name, url, ...(facultyTab ? { facultyTab: true } : {}), ...(facilities ? { facilities } : {}), facultyCount: rows.length });
      for (const row of rows) {
        const existing = faculty.get(row.email);
        if (existing) { existing.departments.push({ name, url, position: row.position }); continue; }
        faculty.set(row.email, { ...row, college: college.code, department: name, departmentUrl: url, departments: [] });
      }
      console.log(`${college.code} ${name}: ${rows.length}`);
    }
  }
  let done = 0;
  for (const person of faculty.values()) {
    await sleep(delay);
    try {
      const html = await get(`https://coreservices.uaeu.ac.ae/Faculty/Profile?email=${encodeURIComponent(person.email)}&culture=en`);
      Object.assign(person, profileAreas(html));
    } catch (error) { person.profileError = String(error); }
    done += 1;
    if (done % 25 === 0) console.log(`profiles ${done}/${faculty.size}`);
  }

  // CCAI research groups / labs and industry contact (official CCAI research page).
  const researchUrl = `${BASE}/en/cit/research.shtml`;
  const researchHtml = mainHtml(await get(researchUrl));
  const researchGroups = [];
  for (const tr of researchHtml.match(/<tr[\s\S]*?<\/tr>/gu) ?? []) {
    const cells = (tr.match(/<td[\s\S]*?<\/td>/gu) ?? []).map(text);
    const email = cells.find((c) => /@uaeu\.ac\.ae/u.test(c));
    if (cells.length >= 4 && email) researchGroups.push({ college: "cit", group: cells[0], coordinator: cells[1], position: cells[2], email: email.toLowerCase(), ext: cells.find((c) => /^\d{4}$/u.test(c)) });
  }
  const researchText = text(researchHtml);
  const industry = researchText.match(/For more information, please contact:\s*(.*?)\s+Phone:\s*([+\d ]+?)\s+Email:\s*([\w.@-]+)/u);
  const collaborationsUrl = `${BASE}/en/research/research-and-sponsored-projects-office/collaborations.shtml`;
  const collabText = text(mainHtml(await get(collaborationsUrl)));
  const officeEmail = collabText.match(/explore collaboration opportunities\.?\s*([\w.-]+@uaeu\.ac\.ae)/u)?.[1] ?? null;

  const out = {
    retrievedAt,
    sources: { profiles: "https://coreservices.uaeu.ac.ae/Faculty/Profile (official UAEU faculty profiles)", collaborationsUrl, ccaiResearchUrl: researchUrl, researchCentersUrl: `${BASE}/en/research/centers/` },
    researchOffice: { name: "Research and Sponsored Projects Office", email: officeEmail, url: collaborationsUrl, collaborationTypes: ["joint research grants (national and international)", "International Research Collaboration Transformation (IRC-T) projects", "industry-funded research projects", "government and community-focused research", "intellectual property, technology transfer and commercialization"] },
    collegeContacts: industry ? [{ college: "cit", collegeName: "College of Computing and Artificial Intelligence", role: industry[1].replace(/\s+College of Computing.*$/u, "").trim(), phone: industry[2].trim(), email: industry[3], url: researchUrl, note: "CCAI contact for industry cooperation, joint research and consultancy" }] : [],
    researchGroups,
    colleges: colleges.map(({ code, name, shortName }) => ({ code, name, ...(shortName ? { shortName } : {}), departmentsUrl: `${BASE}/en/${code}/departments/` })),
    departments,
    faculty: [...faculty.values()],
  };
  const file = path.join(process.cwd(), "data/academic/faculty-expertise.json");
  fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
  const withAreas = out.faculty.filter((f) => f.researchAreas?.length).length;
  console.log(`wrote ${file}: ${departments.length} departments, ${out.faculty.length} faculty (${withAreas} with research areas), ${researchGroups.length} research groups, office ${officeEmail}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
