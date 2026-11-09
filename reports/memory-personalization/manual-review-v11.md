# memory-v11: fixes for the three v10 manual-review defects

Date: 9 November 2026. Local build memory-v11, branch feat/memory-personalization.

## Fixes
- **MF19 (was incorrect).** "What was the minimum grade you mentioned?" after a translation turn lost the subject and cited GEOL220.
  - Translation exchanges are now skipped when the next follow-up is resolved (`withoutTranslationTurns`).
  - A question about the previous answer ("you mentioned", "you said", "التي ذكرتها") is answered from that answer only (`recallFromPrevious`), with no new facts. It falls back to normal routing when the answer doesn't contain the fact.
  - Now: "a minimum grade of D in CSBP119, the prerequisite for CSBP219".
- **MP02 (was partly correct).** The year 1 semester 2 plan included Culture Elective 1, which is a first-semester course.
  - Cause: study-plan PDFs print two semesters side by side, and the extracted text interleaves the columns.
  - `lib/study-plan-columns.ts` now splits each two-column block into one list per semester before the text reaches the model.
  - 38 study-plan chunks are affected, and no word is lost or reordered within a line.
  - Now: CENG202, MATH110, CSBP219, CENG205, CSBP221, MATH140 (16 credits), matching the official PDF.
- **MF06 (was partly correct).**
  - An Arabic request starting with أخبرني plus an English program name got an English reply. أخبرني/حدثني/عرفني/قل لي/ممكن/ابي/ابغى are now Arabic request frames.
  - The translator now has a fixed rendering of the university's name, so it no longer says "University of Emirates".

## Results
- **Focused (MF19, MP02, MF06):** correct in all 3 runs on the final build, plus a 4th MF19 run after the wording tweak. Outputs were checked by hand against the official sources.
- **Full memory suite, 94 scenarios:**
  - First pass: 85 correct. 8 failures were HTTP 429 from the app's own rate limiter, because the regression cases ran at the same time (a test setup error), plus one source-check rejection.
  - Rerun of those 9 alone: 8 correct, 1 partial (M2-CQ076).
  - M2-CQ076 is correct on manual review: all six first-semester courses and 16 credits, but without the literal words "first semester".
  - Automated: 93 correct, 1 partly correct, 0 incorrect. Manual: 94 correct.
- **Study-plan regression cases (43 cases, 96 answers including variants).**
  - Compared with the earlier results for the same cases, 6 that passed before failed here. 3 of those (KE265-V3, KE274-V3, KE292-V3) only failed because I ran the base fixture, whose checks are English-only, against Arabic answers that are correct.
  - CQ100 and CQ060 were rerun with the regression fixture: correct 2 of 2 each.
  - KE263-V3 (scholarship, not a study plan) was correct in 1 of 2 runs. It's an intermittent selection miss; the splitter doesn't change those chunks.
- **Offline:** tsc and lint pass, along with all check suites and the memory follow-up checks (13, including 4 new).
- **Not rerun:** the browser memory test and the full 600 examiner + 1,782 regression suites.
