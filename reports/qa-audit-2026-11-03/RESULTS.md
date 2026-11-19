# UAEU Assistant local fix results

Branch: `fix/qa-audit-2026-11-03`. Local only; nothing pushed or deployed.

| Case set | Correct | Partial | Incorrect |
|---|---:|---:|---:|
| Published original audit | 47 | 17 | 38 |
| Unmodified local API baseline, final automatic rubric | 48 | 21 | 33 |
| Fixed original 102, automatic checks | 97 | 3 | 2 |
| Unmodified additional 93, automatic checks | 24 | 11 | 58 |
| Fixed additional 93, automatic checks | 89 | 3 | 1 |
| Fixed original 102, Codex source review | 95 | 5 | 2 |
| Additional 93, Codex source review | 81 | 11 | 1 |

Automatic checks do not prove semantic correctness. Codex reviewed the captured answers against official-source facts and kept language, naming, completeness and real knowledge gaps visible. This is not independent human/expert certification. The final runtime fingerprint was unchanged: `8d396399ba76ea58a4ea8c62d0ae656c842fce2f62c8d731e2603d29c826fff0`.

44 of the 47 previously correct cases remain complete passes. CQ021 and CQ023 omit the explicit 16-credit total while listing the correct courses; CQ073 omits the related journal-article clause while correctly refusing a whole-textbook scan. These remain partial under the fixed checks rather than being silently promoted.

The final original failures are CQ015 (provider/verification unavailable) and CQ042 (source-support rejection on lab concurrency). No failed response is labelled fixed because another attempt passed. Earlier failures and raw responses remain available.

## Remaining cases

- CQ015 — ❌ Incorrect — HTTP 504 / verification_unavailable
- CQ021 — ⚠️ Partly correct — The course list is right but the explicit 16-credit total is omitted.
- CQ023 — ⚠️ Partly correct — The course list is right but the explicit 16-credit total is omitted.
- CQ042 — ❌ Incorrect — HTTP 502 / contradiction
- CQ073 — ⚠️ Partly correct — The whole-textbook refusal and chapter/10% limit are right, but the related one-article-per-issue clause is omitted.
- CQ082 — ⚠️ Partly correct — Required-course status is right, but the Arabic answer invents the proper college name كلية علوم الحاسوب; the supplied source establishes a college requirement for the CS degree, not that college name.
- CQ087 — ⚠️ Partly correct — The prior MECH210 minimum D and MECH340 Pre/Co relationship are right, but the answer omits the source-listed minimum D for MECH340.
- NQ111 — ⚠️ Partly correct — The course list is right but the explicit 16-credit total is omitted.
- NQ112 — ⚠️ Partly correct — The course list is right but the explicit 16-credit total is omitted.
- NQ113 — ⚠️ Partly correct — The course list is right but the explicit 16-credit total is omitted.
- NQ149 — ⚠️ Partly correct — Degree total and source are right, but the Arabic-framed question receives an English answer.
- NQ155 — ⚠️ Partly correct — Degree total and source are right, but the Arabic-framed question receives an English answer.
- NQ175 — ⚠️ Partly correct — States the prerequisite, but the explicit pre/corequisite part is not answered. An inspected-entry corequisite statement is still needed for CSBP219.
- NQ183 — ⚠️ Partly correct — Mandatory IT course status is right, but the Arabic-framed mixed-language question receives English.
- NQ187 — ❌ Incorrect — HTTP 503 / selection_unavailable
- NQ188 — ⚠️ Partly correct — Application steps are supported, but a published 5-minute/immediate service target is described as typical completion. It must be labelled a published target rather than observed or guaranteed room-assignment timing.
- NQ190 — ⚠️ Partly correct — Honest limits and official links, but the requested current sports/recreation schedule remains unverified. Passing the abstention check does not mean the schedule was found.
- NQ193 — ⚠️ Partly correct — The exam-period opening hours remain unverified. The answer gives a season-unspecified table before its caveat; it should not present that table as the current exam schedule.
- NQ194 — ⚠️ Partly correct — No attire rules are invented and an official lookup source is cited, but the actual ceremony-specific guidelines remain unverified. The honest abstention is useful, not a completed knowledge answer.

## Changes and evidence

25 official-source Markdown records added; five existing knowledge files and one reviewed tuition summary updated. Scoped academic retrieval, validated code/alias normalization, qualification/cohort separation, grounded nonexact answers, follow-up handling, source attribution and completeness checks were added or corrected. See [engineering notes](ENGINEERING_NOTES.md), [source provenance](knowledge-provenance.json), [source map](uaeu_source_map.md), [all conversations](local-retest-log.html), [commands](COMMANDS.md), [raw final run](final-retest.json), and [source review](source-review.json). Exact paths are listed in `changed-files.json`.

The full offline suite passed before the last relationship-guard refinement; affected unit, grounding, pipeline, semantic, canonical, content and security suites passed again after it. The final webpack production build, TypeScript and targeted lint passed. Offline mocks are contract tests, not answer-accuracy evidence. Full live API response median 2.556 seconds; per-turn timings and errors are preserved.

All 55 required browser scenarios were captured; individual attempts and any failures are preserved. Browser retests and shared-document append verification are recorded separately. More generation/verification calls increase cost and latency. Current attire, sports schedules, exam library hours, diploma intake, assigned student eligibility and the IT 120/130 publication conflict remain qualified or unresolved.

The shared Google Doc now contains the new retest section with all 195 API cases and 58 browser scenarios (all 55 required IDs plus three added probes). Export readback preserved the complete pre-existing Markdown prefix, verified every captured conversation and source URL, and confirmed the final END OF TESTING paragraph is bold red in the document XML and screenshot. See `shared-doc-verification.json`.

Code commit: `598deff`. No push, deployment or PR.
