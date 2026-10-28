import { loadKnowledgeMarkdown, splitIntoSections, type KnowledgeDocument } from "@/lib/knowledge-files";
import { courseCodes, understandQuery } from "@/lib/query-understanding";
import type { Citation } from "@/lib/prototype-types";

type CurriculumKind = "first-semester" | "degree-credits" | "course-status" | "semester-placement" | "electives" | "required-courses" | "prerequisites";

export type CurriculumAnswer = {
  content: string;
  citation: Citation;
  evidenceId: string;
};

function requestedKind(query: string): CurriculumKind | null {
  const normalized = understandQuery(query).normalized;
  const hasCode = courseCodes(query).length > 0;
  if (hasCode && /\b(?:prerequisite|corequisite|pre corequisite|without completing|before taking|before mech)\b/u.test(normalized)) return "prerequisites";
  if (hasCode && /\b(?:which|what) semester\b|\bin which semester\b|\bnormally taken\b/u.test(normalized)) return "semester-placement";
  if (hasCode && /\b(?:required|mandatory|elective|part of|belongs? to|need to take|to graduate)\b/u.test(normalized)) return "course-status";
  if (/\bfirst semester\b|\bsemester one\b|\bsemester 1\b/u.test(normalized)) return "first-semester";
  if (/\b(?:total|minimum|how many|breakdown|divided|university requirements|college requirements)\b.{0,100}\b(?:credit|hour|degree|major)\b|\b(?:credit|hour)\b.{0,100}\b(?:required|university requirements|college requirements|major requirements)\b/u.test(normalized)) return "degree-credits";
  if (/\belectives?\b/u.test(normalized)) return "electives";
  if (/\b(?:required|mandatory) courses?\b|\bcourses? (?:required|needed)\b/u.test(normalized)) return "required-courses";
  return null;
}

export function retrieveCurriculumAnswer(query: string, documents: KnowledgeDocument[] = loadKnowledgeMarkdown()): CurriculumAnswer | null {
  const meaning = understandQuery(query);
  if (meaning.subjects.includes("admissions")) return null;
  const programs = meaning.subjects.filter((subject) => ["mechanical-engineering", "computer-science", "information-technology", "information-security"].includes(subject));
  if (!programs.length && courseCodes(query).some((code) => code.startsWith("MECH"))) programs.push("mechanical-engineering");
  if (programs.length !== 1) return null;
  const kind = requestedKind(query);
  if (!kind) return null;
  const codes = courseCodes(query);
  const code = codes.find((candidate) => documents.some((document) =>
    document.curriculum && document.scope?.subjects?.includes(programs[0]) &&
    splitIntoSections(document.content).some((section) => section.split("\n", 1)[0].includes(candidate)),
  )) ?? codes[0];
  const year = meaning.years[0];
  const matches: { section: string; filename: string; title: string; sourceUrl: string; lastVerified: string }[] = [];

  for (const document of documents) {
    if (!document.curriculum || !document.scope?.subjects?.includes(programs[0])) continue;
    for (const section of splitIntoSections(document.content)) {
      const heading = section.split("\n", 1)[0].toLowerCase();
      if (!heading.startsWith("## ")) continue;
      if (kind === "first-semester" && !heading.includes("first semester")) continue;
      if (kind === "degree-credits" && !heading.includes("credit breakdown")) continue;
      if (kind === "electives" && !heading.includes("major electives")) continue;
      if (kind === "required-courses" && !heading.includes("required") && !heading.includes("internship requirement")) continue;
      if (kind === "semester-placement" && (!heading.includes("placement") || !code || !section.includes(code))) continue;
      if (kind === "prerequisites" && (!code || !heading.includes(code.toLowerCase()) || !heading.includes("prerequisite"))) continue;
      if (kind === "course-status" && (!code || !section.includes(code) || !(heading.includes("required") || heading.includes("electives")))) continue;
      if (year && kind === "first-semester" && !heading.includes(String(year))) continue;
      matches.push({ section, filename: document.filename, title: document.title, sourceUrl: document.sourceUrl, lastVerified: document.lastVerified });
    }
  }

  if (!matches.length) return null;
  const selected = kind === "first-semester" && !year
    ? [matches.sort((left, right) => right.section.split("\n", 1)[0].localeCompare(left.section.split("\n", 1)[0]))[0]]
    : kind === "required-courses" ? matches.filter((match) => /required (?:general education components|(?:college|major) courses)|internship requirement/i.test(match.section.split("\n", 1)[0]))
    : [matches[0]];
  if (!selected.length) return null;
  const content = selected.map(({ section }) => section).join("\n\n");
  if (content.length > 5500) return null;
  const reference = selected[0];
  return {
    content: `${content}\n\nThis is the published curriculum, not a check of your individual degree audit or current course eligibility.`,
    citation: { title: reference.title, url: reference.sourceUrl, lastVerified: reference.lastVerified, sourceSection: reference.section.split("\n", 1)[0].slice(3) },
    evidenceId: `knowledge:${[...new Set(selected.map(({ filename }) => filename))].join(",")}`,
  };
}
