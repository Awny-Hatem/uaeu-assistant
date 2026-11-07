import fs from "node:fs";
import path from "node:path";
import { correctQueryTypos, dropLinkWords, foldArabicSpelling } from "@/lib/query-understanding";
import { BASE_PROGRAMS } from "@/lib/academic-retrieval";

// Profile validation uses the same official program/college aliases that
// retrieval uses (data/corpus/aliases.json, built from the UAEU catalog), so a
// saved major is always a real catalog program name.

type AliasRow = { alias: string; canonical: string; program: string; qualification: string; equivalents: string[]; entityType?: string };
export type ProgramMatch = { program: string; qualification: string; college: string | null };
export type Resolution<T> = { ok: true; value: T } | { ok: false; reason: "unknown" | "ambiguous"; candidates: string[] };

const norm = (s: string) => dropLinkWords(foldArabicSpelling(correctQueryTypos(s).toLowerCase().normalize("NFKC")))
  .replace(/[ً-ْـ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/(^|\s)ال(?=\p{L}{2})/gu, "$1").replace(/\s+/g, " ").trim();

let cache: { programs: Map<string, ProgramMatch>; programAliases: Map<string, Set<string>>; acronyms: Map<string, Set<string>>; colleges: Map<string, string> } | null = null;

function load() {
  if (cache) return cache;
  const rows = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/corpus/aliases.json"), "utf8")) as AliasRow[];
  const colleges = new Map<string, string>(); // normalized alias -> canonical English college
  for (const r of rows) if (r.entityType === "college" && /^College of /.test(r.canonical)) {
    colleges.set(norm(r.alias), r.canonical);
    colleges.set(norm(r.canonical), r.canonical);
  }
  const collegeOf = (equivalents: string[]) => {
    for (const e of equivalents) {
      const exact = colleges.get(norm(e));
      if (exact) return exact;
    }
    return null;
  };
  const programs = new Map<string, ProgramMatch>();
  const programAliases = new Map<string, Set<string>>();
  const acronyms = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.program) continue;
    if (r.entityType === "program-acronym") {
      const key = norm(r.alias);
      if (!acronyms.has(key)) acronyms.set(key, new Set());
      acronyms.get(key)!.add(r.program);
    }
    if (!programs.has(r.program)) programs.set(r.program, { program: r.program, qualification: r.qualification, college: collegeOf(r.equivalents ?? []) });
    else if (!programs.get(r.program)!.college) programs.get(r.program)!.college = collegeOf(r.equivalents ?? []);
    for (const name of [r.alias, r.program, ...(r.equivalents ?? []).filter((e) => !/^(?:college of|كلية|قسم)/iu.test(e) && !e.includes(" - "))]) {
      const key = norm(name);
      if (key.length < 2) continue;
      if (!programAliases.has(key)) programAliases.set(key, new Set());
      programAliases.get(key)!.add(r.program);
    }
  }
  // Hand-curated aliases used by retrieval (incl. Arabic names) for core programs.
  for (const p of BASE_PROGRAMS) {
    if (!programs.has(p.label)) continue;
    for (const name of p.aliases) {
      const key = norm(name);
      if (!programAliases.has(key)) programAliases.set(key, new Set());
      programAliases.get(key)!.add(p.label);
    }
  }
  cache = { programs, programAliases, acronyms, colleges };
  return cache;
}

export function listColleges(): string[] {
  return [...new Set(load().colleges.values())].sort();
}

export function resolveCollege(input: string): Resolution<string> {
  const key = norm(input);
  const { colleges } = load();
  const hit = colleges.get(key) ?? colleges.get(norm(`college of ${input}`)) ?? colleges.get(norm(`كلية ${input}`));
  if (hit) return { ok: true, value: hit };
  const partial = [...new Set([...colleges.entries()].filter(([k]) => key.length >= 4 && k.includes(key)).map(([, v]) => v))];
  return partial.length === 1 ? { ok: true, value: partial[0] } : { ok: false, reason: partial.length ? "ambiguous" : "unknown", candidates: partial.slice(0, 6) };
}

/**
 * Resolve a typed major to one catalog program. A level hint (undergraduate or
 * graduate, from the academic year) breaks ties such as "Mathematics".
 */
export function resolveProgram(input: string, level?: "undergraduate" | "graduate", exactOnly = false): Resolution<ProgramMatch> {
  const { programs, programAliases, acronyms } = load();
  const key = norm(input);
  let names = [...(acronyms.get(key) ?? programAliases.get(key) ?? [])];
  if (!names.length && key.length >= 3 && !exactOnly) {
    // Every typed word must appear in one known name of the program
    // ("law" -> Bachelor of Law, "علوم الحاسوب" -> its Arabic catalog name).
    const words = key.split(" ");
    const hits = new Set<string>();
    for (const [alias, owners] of programAliases) {
      const tokens = new Set(alias.split(" "));
      if (words.every((w) => tokens.has(w))) owners.forEach((o) => hits.add(o));
    }
    names = [...hits];
  }
  const levelOk = (p: string) => {
    const q = programs.get(p)!.qualification;
    if (!level) return true;
    return level === "undergraduate" ? /bachelor|undergrad/i.test(q) && !/Accelerated|Micro-Credential|Minor/i.test(p) : /master|doctor|graduate|diploma/i.test(q);
  };
  if (names.length > 1) {
    const plainDegrees = names.filter((p) => !/Accelerated|Micro-Credential|Minor|Concentration|\bModel\b|\bPlan\b/i.test(p));
    if (plainDegrees.length) names = plainDegrees;
    const leveled = names.filter(levelOk);
    if (leveled.length) names = leveled;
  }
  if (names.length === 1) return { ok: true, value: programs.get(names[0])! };
  return { ok: false, reason: names.length ? "ambiguous" : "unknown", candidates: names.slice(0, 6) };
}
