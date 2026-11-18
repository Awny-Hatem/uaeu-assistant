import { hasProgramCreditIntent, type AcademicProgram } from "@/lib/academic/program-curricula";

export type PublishedCurriculumSnapshotAnswer = {
  disposition: "answer" | "clarify";
  content: string;
  versionId?: string;
  cohortMappingUnresolved?: boolean;
  citations: AcademicProgram["sources"];
};

function normalizeLabel(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function publishedCurriculumSnapshotAnswer(
  programs: AcademicProgram[],
  programId: string,
  request: string,
  locale: "en" | "ar" = "en",
): PublishedCurriculumSnapshotAnswer | null {
  const program = programs.find((item) => item.id === programId);
  if (!program) return null;
  const text = request.normalize("NFKC").toLocaleLowerCase("en");
  const asksPublishedLabel = !hasProgramCreditIntent(text) && /\b(?:applicability statement|published cohort label|published plan label)\b|\u0645\u0627\s+(?:\u0639\u0628\u0627\u0631\u0629|\u062a\u0633\u0645\u064a\u0629)\s+\u0627\u0644\u0627\u0646\u0637\u0628\u0627\u0642/iu.test(text);
  const asksProgramIdentity = /\b(?:degree (?:name|title)|program identity|name of the degree and college|degree and college|which college)\b|\u0645\u0627\s+\u0627\u0633\u0645\s+\u0627\u0644\u062f\u0631\u062c\u0629\s+\u0648\s*\u0627\u0644\u0643\u0644\u064a\u0629|\u0627\u0633\u0645\s+\u0627\u0644\u062f\u0631\u062c\u0629\s+\u0648\s*\u0627\u0644\u0643\u0644\u064a\u0629/iu.test(text);
  if (!asksPublishedLabel && !asksProgramIdentity) return null;

  const quotedLabels = [...text.matchAll(/[\u0027\u201c\u00ab]([^\u0027\u201d\u00bb]{8,})[\u0027\u201d\u00bb]/g)].map((match) => normalizeLabel(match[1]));
  const quotedCreditTotals = quotedLabels.flatMap((label) => [...label.matchAll(/\b(\d{2,3})\s+credit(?:s| hour)?\b/g)].map((match) => Number(match[1])));
  const namesPublishedVersion = /\b(?:source variant|model plan|published curriculum|cohort described|plan label|version specific)\b/i.test(text);
  const ranges = [...new Set((text.match(/20\d{2}\s*[-–]\s*20\d{2}/g) ?? []).map((range) => range.replace(/\s+/g, "")))];
  const years = [...new Set((text.match(/20\d{2}/g) ?? []).map(Number))];
  const labelVersions = program.curriculumVersions.filter((version) => {
    const label = normalizeLabel(version.cohortLabel);
    return quotedLabels.some((quoted) => quoted.length >= 8 && (label === quoted || label.includes(quoted) || quoted.includes(label)));
  });
  const creditVersions = namesPublishedVersion
    ? program.curriculumVersions.filter((version) => quotedCreditTotals.includes(version.totalCredits))
    : [];
  const dateVersions = program.curriculumVersions.filter((version) => {
    const versionText = `${version.id} ${version.version} ${version.cohortLabel}`.normalize("NFKC").toLocaleLowerCase("en");
    if (ranges.length === 1) return versionText.replace(/\s+/g, "").includes(ranges[0].replace(/[\u2010-\u2015-]/g, "-"));
    return years.length === 1 && version.effectiveFrom.startsWith(String(years[0]));
  });
  // An exact quoted source label takes precedence over any other year mentioned
  // inside that label (for example, an older plan describing its replacement).
  const versions = labelVersions.length ? labelVersions : creditVersions.length ? creditVersions : dateVersions;
  const version = versions.length === 1 ? versions[0] : undefined;

  if (asksPublishedLabel) {
    const personal = /\b(?:which|what) (?:published )?(?:plan|cohort)(?: label)? applies to me\b|\bmy (?:assigned )?(?:plan|cohort)\b|\bam i (?:assigned|in) (?:this|the) (?:plan|cohort)\b|\u0623\u064a\s+\u062e\u0637\u0629\s+(?:\u062a\u0646\u0637\u0628\u0642|\u0645\u062e\u0635\u0635\u0629)\s+\u0644\u064a|\u062e\u0637\u062a\u064a\s+(?:\u0627\u0644\u0645\u0639\u064a\u0646\u0629|\u0627\u0644\u0645\u062e\u0635\u0635\u0629)|\u0647\u0644\s+\u0623\u0646\u0627\s+(?:\u0645\u0633\u062c\u0644|\u0636\u0645\u0646)\s+(?:\u0647\u0630\u0647|\u0627\u0644\u062e\u0637\u0629)/iu.test(text);
    if (personal) return {
      disposition: "clarify",
      content: locale === "ar"
        ? "\u0644\u0627 \u0623\u0633\u062a\u0637\u064a\u0639 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u0639\u064a\u0651\u0646\u0629 \u0644\u0643 \u0645\u0646 \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0645\u0646\u0634\u0648\u0631. \u064a\u0645\u0643\u0646\u0646\u064a \u062a\u0648\u0636\u064a\u062d \u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629\u060c \u0644\u0643\u0646 Degree Works \u0647\u0648 \u0627\u0644\u0645\u0631\u062c\u0639 \u0644\u062a\u0639\u064a\u064a\u0646 \u062e\u0637\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629. \u0645\u0627 \u0633\u0646\u0629 \u0648\u0641\u0635\u0644 \u0627\u0644\u062a\u062d\u0627\u0642\u0643\u060c \u0623\u0648 \u0645\u0627 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0644\u0643 \u0641\u064a Degree Works?"
        : "I cannot determine your assigned plan from the published catalog. I can report the published plan label, but Degree Works controls your personal assignment. What were your entry year and semester, or which plan does Degree Works show?",
      citations: program.sources,
    };
    if (!version) return null;
    const unresolved = version.cohortMapping === "unresolved" || /\b(?:unresolved|not identified|not established)\b/i.test(version.cohortLabel);
    return {
      disposition: unresolved ? "clarify" : "answer",
      content: locale === "ar"
        ? `**\u0627\u0644\u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0644\u0644\u062e\u0637\u0629: ${program.name}**\n\n\u062a\u0635\u0641 \u0627\u0644\u062c\u0627\u0645\u0639\u0629 \u0647\u0630\u0647 \u0627\u0644\u0646\u0633\u062e\u0629 \u0628\u0623\u0646\u0647\u0627: **${version.cohortLabel}**. \u0647\u0630\u0647 \u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0641\u0642\u0637\u060c \u0648\u0644\u0627 \u062a\u062b\u0628\u062a \u0623\u0646 \u0627\u0644\u062e\u0637\u0629 \u0645\u0639\u064a\u0651\u0646\u0629 \u0644\u0643 \u0634\u062e\u0635\u064a\u0627\u064b. \u062a\u062d\u0642\u0642 \u0645\u0646 \u062e\u0637\u062a\u0643 \u0641\u064a Degree Works.${unresolved ? " \u0648\u0644\u0627 \u064a\u062d\u062f\u062f \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0627\u0646\u0637\u0628\u0627\u0642\u0647\u0627 \u0639\u0644\u0649 \u062f\u0641\u0639\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629." : ""}`
        : `**Published plan label: ${program.name}**\n\nThe source describes this version as: **${version.cohortLabel}**. This is the published label only; it does not verify that the plan is assigned to you personally. Confirm your assigned plan in Degree Works.${unresolved ? " The published source does not establish applicability to your personal cohort." : ""}`,
      versionId: version.id,
      cohortMappingUnresolved: unresolved,
      citations: program.sources,
    };
  }

  const unresolved = version?.cohortMapping === "unresolved" || Boolean(version && /\b(?:unresolved|not identified|not established)\b/i.test(version.cohortLabel));
  return {
    disposition: "answer",
    content: locale === "ar"
      ? `**\u0647\u0648\u064a\u0629 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629**\n\n\u0627\u0633\u0645 \u0627\u0644\u062f\u0631\u062c\u0629: **${program.name}**. \u0627\u0644\u0643\u0644\u064a\u0629: **${program.college}**.${version ? ` \u0627\u0644\u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0629 \u0644\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0645\u0630\u0643\u0648\u0631\u0629: **${version.cohortLabel}**.` : ""}${unresolved ? " \u0644\u0627 \u064a\u062b\u0628\u062a \u0630\u0644\u0643 \u0627\u0646\u0637\u0628\u0627\u0642 \u0627\u0644\u062e\u0637\u0629 \u0639\u0644\u0649 \u062f\u0641\u0639\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629\u061b \u062a\u062d\u0642\u0642 \u0645\u0646 \u062e\u0637\u062a\u0643 \u0641\u064a Degree Works." : ""}`
      : `**Published program identity**\n\nDegree: **${program.name}**. College: **${program.college}**.${version ? ` Published label for the referenced version: **${version.cohortLabel}**.` : ""}${unresolved ? " This does not establish applicability to your personal cohort; confirm your plan in Degree Works." : ""}`,
    ...(version ? { versionId: version.id, cohortMappingUnresolved: unresolved } : {}),
    citations: program.sources,
  };
}
