import fs from "node:fs";
import path from "node:path";
import { normalizeQuery } from "@/lib/query-understanding";
import type { Citation } from "@/lib/prototype-types";

export type UndergraduateProgram = {
  id: string;
  title: string;
  college: string;
  url: string;
  curriculumStatus: "modelled" | "legacy_model_review_required" | "not_modelled";
};

type ProgramCatalog = {
  schemaVersion: 1;
  catalogUrl: string;
  verifiedAt: string;
  catalogPageLastUpdated: string;
  scopeNote: string;
  curriculumRecordsRequiringIdentityReview: Array<{ id: string; note: string }>;
  programs: UndergraduateProgram[];
};

const CATALOG_PATH = path.join(process.cwd(), "data", "academic", "undergraduate-program-catalog.json");

function officialUaeuUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "uaeu.ac.ae" || url.hostname.endsWith(".uaeu.ac.ae"));
  } catch {
    return false;
  }
}

export function loadUndergraduateProgramCatalog(): ProgramCatalog {
  const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as ProgramCatalog;
  if (raw.schemaVersion !== 1 || !officialUaeuUrl(raw.catalogUrl) || !Array.isArray(raw.programs) || !raw.programs.length) {
    throw new Error("Invalid UAEU undergraduate program catalog metadata.");
  }
  const ids = new Set<string>();
  for (const program of raw.programs) {
    if (!program.id || ids.has(program.id) || !program.title || !program.college || !officialUaeuUrl(program.url)) {
      throw new Error(`Invalid or duplicate UAEU program catalog entry: ${program.id || "unknown"}`);
    }
    ids.add(program.id);
  }
  return raw;
}

const COLLEGE_ALIASES: Record<string, string[]> = {
  "College of Business and Economics": ["business and economics", "business", "cbe"],
  "College of Education": ["college of education", "education"],
  "College of Engineering": ["college of engineering", "engineering"],
  "College of Agriculture and Veterinary Medicine": ["agriculture and veterinary medicine", "agriculture", "veterinary medicine"],
  "College of Humanities and Social Sciences": ["humanities and social sciences", "humanities", "social sciences"],
  "College of Information Technology": ["college of information technology", "information technology", "computing and artificial intelligence", "cit"],
  "College of Law": ["college of law", "law"],
  "College of Medicine and Health Sciences": ["medicine and health sciences", "health sciences", "medicine"],
  "College of Science": ["college of science", "science"],
};

function catalogRequest(query: string): boolean {
  const text = normalizeQuery(query);
  // Keep transactional admissions requests out of the program inventory path.
  // The broad "what ... degree" window below otherwise mistakes questions
  // like "what do I need to apply for an undergraduate degree?" for a catalog.
  if (/\b(?:tuition|fees?|cost|price|payment|scholarship|deadline|admission|admissions|applicant|application|apply|applying)\b/u.test(text)) return false;
  if (/\b(?:my|i am|am i|completed|courses?|classes?|coursework|prerequisites?|requirements?|credits?|gpa|eligible|eligibility|switch|change my|study plan|degree audit)\b/u.test(text)) return false;
  // Inventory requests need explicit availability/offer/list intent. A broad
  // "which ... degree" match hijacks questions about one named degree's title,
  // college, published plan, or requirements and returns an unrelated college
  // list instead.
  const asksForProgramInventory = /\b(?:which|what)\s+(?:(?:undergraduate|bachelor(?:'s)?)\s+)?(?:programs?|degrees?|majors?)\b.{0,70}\b(?:available|offered|offer|list|provide)\b/u.test(text) ||
    /\b(?:list|show)\s+(?:all\s+)?(?:(?:undergraduate|bachelor(?:'s)?)\s+)?(?:programs?|degrees?|majors?)\b/u.test(text) ||
    /\b(?:programs?|degrees?|majors?)\b.{0,70}\b(?:available|offered|offer|list)\b/u.test(text);
  return asksForProgramInventory && /\b(?:uaeu|university|college|undergraduate|bachelor|major|program|degree|degrees)\b/u.test(text);
}

function asksNamedProgramIdentity(query: string): boolean {
  const text = normalizeQuery(query);
  return /\b(?:degree\s+)?(?:title|name|college|school)\b.{0,70}\b(?:recorded|listed|published|catalog)\b|\b(?:recorded|listed|published)\b.{0,70}\b(?:degree\s+)?(?:title|name|college|school)\b/u.test(text) ||
    /(?:اسم|عنوان).{0,50}(?:الدرجة|البرنامج|التخصص)|(?:أي|ما).{0,50}كلية.{0,50}(?:البرنامج|التخصص)/u.test(text);
}

function requestedCollege(query: string): string | undefined {
  const text = normalizeQuery(query);
  const matches = Object.entries(COLLEGE_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => ` ${text} `.includes(` ${normalizeQuery(alias)} `)))
    .map(([college]) => college);
  return matches.length === 1 ? matches[0] : undefined;
}

export type ProgramCatalogAnswer = { content: string; citation: Citation; college?: string; count: number };

/** Return the official catalog inventory only for explicit program-list questions. */
export function answerProgramCatalogQuestion(query: string, locale: "ar" | "en"): ProgramCatalogAnswer | null {
  const catalog = loadUndergraduateProgramCatalog();
  // Specific identity queries take precedence over inventory requests. This is
  // essential when a degree title itself contains a college alias (e.g.
  // "Bachelor of Science") that would otherwise filter to the wrong college.
  if (asksNamedProgramIdentity(query)) {
    const normalizedQuery = normalizeQuery(query);
    const matchingProgram = catalog.programs.find((program) => {
      const normalizedTitle = normalizeQuery(program.title);
      return normalizedTitle.length >= 12 && ` ${normalizedQuery} `.includes(` ${normalizedTitle} `);
    });
    if (!matchingProgram) return null;
    const content = locale === "ar"
      ? `**${matchingProgram.title}**\n- الكلية المسجلة في دليل البرامج الجامعية الحالي: **${matchingProgram.college}**.\nهذه معلومة تعريفية من الدليل؛ ولا تحدد الخطة الدراسية المطبقة على دفعة بعينها أو أهلية الطالب.`
      : `**${matchingProgram.title}**\n- College listed in UAEU's current undergraduate catalog: **${matchingProgram.college}**.\nThis identifies the catalog entry; it does not establish which curriculum applies to a particular cohort or student.`;
    return {
      content,
      citation: { title: matchingProgram.title, url: matchingProgram.url, lastVerified: catalog.verifiedAt },
      college: matchingProgram.college,
      count: 1,
    };
  }
  if (!catalogRequest(query)) return null;
  const college = requestedCollege(query);
  const programs = catalog.programs.filter((program) => !college || program.college === college);
  const grouped = new Map<string, UndergraduateProgram[]>();
  for (const program of programs) grouped.set(program.college, [...(grouped.get(program.college) ?? []), program]);
  const sections = [...grouped.entries()].map(([name, entries]) =>
    `### ${name}\n${entries.map(({ title, url }) => `- [${title}](${url})`).join("\n")}`,
  );
  const intro = locale === "ar"
    ? college
      ? `يعرض دليل جامعة الإمارات ${programs.length} برنامجاً جامعياً في **${college}** ضمن لقطة الدليل المحدّثة ${catalog.catalogPageLastUpdated}. هذه قائمة البرامج فقط، وليست إثباتاً لفتح القبول أو أهلية الطالب أو خطة دفعته.`
      : `يعرض دليل جامعة الإمارات ${programs.length} برنامجاً جامعياً عبر تسع كليات ضمن لقطة الدليل المحدّثة ${catalog.catalogPageLastUpdated}. هذه قائمة البرامج فقط، وليست إثباتاً لفتح القبول أو أهلية الطالب أو خطة دفعته.`
    : college
      ? `The UAEU undergraduate catalog lists **${programs.length} degree programs** for ${college} in its ${catalog.catalogPageLastUpdated} snapshot. This is a degree inventory, not confirmation of an open intake, personal eligibility, or a cohort-specific study plan.`
      : `The UAEU undergraduate catalog lists **${programs.length} degree programs across ${grouped.size} colleges** in its ${catalog.catalogPageLastUpdated} snapshot. Minors and micro-credentials are excluded. A listing does not establish an open intake, personal eligibility, or a cohort-specific study plan.`;
  return {
    content: `${intro}\n\n${sections.join("\n\n")}`,
    citation: { title: "UAEU Undergraduate Programs Catalog", url: catalog.catalogUrl, lastVerified: catalog.verifiedAt },
    ...(college ? { college } : {}),
    count: programs.length,
  };
}
