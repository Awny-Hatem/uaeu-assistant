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

## Full-suite results on memory-v11 (10 November 2026)
- **Totals** combine the full run with two reruns of every non-correct case. Details are in `full-suite-v11-summary.json`.
  - Examiner, all 600: 600 / 0 / 0 (v10: 599/1/0).
  - Phrasing (399): 394 / 4 / 1 (v10: 391/5/3).
  - Regression (1,782): 1765 / 12 / 5 (v10: 1764/11/7).
  - Browser examiner: 100/100, and every rendered page matches the API.
  - Browser memory: 17/17.
- **Interruptions.** The first full run (9 November) was disrupted when the Mac went to sleep on battery, so OpenAI couldn't be reached and about 380 requests failed. The reruns were made with `caffeinate`, time limits per suite, and a stop on provider or 429 signals.
  - That watchdog stopped the browser examiner at 95 of 100 after 5 network timeouts. There was no 429 or quota error, and a direct API call returned 200. The browser run was then resumed and finished.
- **Remaining misses, reviewed by hand:**
  - KE148 (3 phrasings) and KE269-V4: the source check withheld the answer (a safe refusal). KE148 already failed this way on v10.
  - EX077-V3 asks for clarification instead of answering, the same as on v10.
  - NQ190 gives the same answer on v9, v10 and v11 (Student Activities page, no note of the source date), and its grade flips between partly correct and incorrect.
  - KE277-V3 and KE260-V3 are correct on manual review; only the check wording failed.
  - The other partly correct cases are unchanged from v10.
- **Google Doc.** The v11 summary, the MF06, MF19 and MP02 retests, and the browser memory test were added. My earlier END OF TESTING line was moved to the end. Codex's earlier content was checked as unchanged, and the added text matches `google-doc-entries-v11.txt`.
