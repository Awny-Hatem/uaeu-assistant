# Handoff — feat/student-profiles-and-power

Brief: `~/Downloads/claude_code_prompt_profiles_and_power.md`. Local only: no push, deploy or PR until Ali says so.

## Where the work lives
- Worktree: `/Users/aliabdullah/Documents/Codex/2026-10-06/referenced-chatgpt-conversation-this-is-an/student-profiles-and-power`
- Branch: `feat/student-profiles-and-power`, based on `feat/uaeu-knowledge-expansion` at f6af176.
- `data/corpus/search.sqlite` is a symlink to the main checkout's index (929 MB, gitignored).
- Codex started this task and hit its usage limit. Its uncommitted work was saved as commit 3fdd0cf. Claude continues from there. Do not let Codex resume in this worktree at the same time.

## Status by phase
| Phase | Status |
|---|---|
| 1. Six test cases, meta/greeting/history, program-filtered retrieval | Done. All six behave as expected on after-six-v3/v4 (case 6 now asks the admit year once, then answers from the newest plan). Added: goodbye, "can you access Degree Works", "what did you say about X", bare self-descriptions, role-aware greetings, IT/CS abbreviations, graduate admission not asked the UG category. |
| 2. Study-plan and catalog parsing | Mostly done. All 54 official bachelor plan PDFs fetched; 224 cohort plans for 45 programs parsed (146 pass every printed total; the rest are flagged, never repaired). Names mapped to the registry, concentrations read as tracks. 9 PDFs yield no tables (different layout: e.g. Biology, Law, Veterinary Medicine, Nutrition, Dietetics, Food Science, Horticulture, Marine Fisheries, BBA Marketing/HR/SCM) — listed as gaps. |
| 3. Profiles, tester page, 10 accounts | Built by Codex; fixture audit passes for all 10 accounts. Degree-total-only conflicts now still show the semester with the conflict stated. |
| 4. Source cleanup, freshness, guest roles | Ended calendar terms are dropped from retrieval; partnerships record added; CMHS directory fixed. sources-freshness.md (Codex) needs regenerating with the new plan validation. Guest roles: greetings tailored; guest-role selector exists on /tester (Codex). |
| 5. 150+ new test cases | 172 cases in test-cases/power-172.json; v2 run: 0 HTTP errors, 0 robotic/unverified replies; hand review found and fixed 9 defect types. Verdicts in the Field/Details markdown still need filling. |
| 6. Comparison vs general AI | Not run yet (scripts/profiles/compare-general.mjs exists). |

## Test results so far (latest: v6 build, commit c94fddd)
- Six cases (after-six-v6): all six behave as the brief expects.
- 172 new cases (power-results-v6): 0 errors. Hand-reviewed verdicts: 162 correct, 10 partial, 0 incorrect
  (test-cases/power-results-v6.md, overrides with reasons in test-cases/verdict-overrides-v6.json).
  The 10 partials are the Arabic "credits left" answers that kept English requirement-block names; fixed after v6 (blockTitleAr).
- Comparison vs general AI (comparison-vs-general-ai.md, 50 cases): ours 43, general 6, tie 1; correctness 1.90 vs 1.04;
  hallucinations 3 vs 27; invented course codes 0 vs 6; official link 22 vs 7. Of the 6 general wins, 4 are judge errors
  (hand-checked), 2 fair (POWER112 corequisite definition — no official definition source; POWER154 structure — guide card now attached).
- Final suites (examiner 600, phrasing 399, regression 1,782, memory 94, browser examiner, browser memory): running via
  scratchpad final-suites.sh; outputs labelled *-profiles in reports/.

## API spend
Real balance reported by Ali: $33.63 (17 Nov), i.e. $1.62 spent then. App estimates since: ~$0.33 (v6) + final suites (~$7 est.). Floor: keep the account above $5.

## Final suites (run on the build before commits 1530dab and 9bd2efd)
Stopped at 22:03 on 17 Nov: "OpenAI could not be reached" ×5, then the Mac went to sleep at 22:05 (lid/user sleep; caffeinate cannot stop that). No quota or 429 errors.
| Suite | (answers, verdicts) |
|---|---|
| examiner 600 | (600, {'correct': 565, 'partial': 28, 'incorrect': 7}) |
| phrasing 399 | (399, {'correct': 378, 'partial': 15, 'incorrect': 6}) |
| regression part 1 | (594, {'correct': 580, 'partial': 8, 'incorrect': 6}) |
| regression part 2 | (595, {'correct': 581, 'incorrect': 8, 'partial': 6}) |
| regression part 3 (stopped) | (134, {'correct': 126, 'partial': 1, 'incorrect': 7}) |
| memory 94 | (94, {'correct': 92, 'partial': 2}) |
Not run yet: rest of regression part 3, browser examiner, browser memory.
Regressions found vs v11 and already fixed in code (not yet re-measured live):
- EX090 ×4 prompt injection hijacked the program directory ("STEM" matched inside "system").
- EX052 ×6 "Which college offers X" used the old college name from the XML feed → programOfferAnswer from the registry.
- KE161 Minor in Chemistry borrowed the Master's record; KE156 micro-credential lost corpus evidence → qualification guard + conditional short-circuit in hybridRetrieve.
- KE306 Fall 2035 exams: reviewed calendar answer now says unpublished terms have no dates.
Not bot errors: EX013/EX035-V4/V5/EX052 expect the raw XML feed as source (Part 4 removed XML citations); EX035 expects the old name "Information Security" (now Cybersecurity).
Open: EX079-V2/V3 transcript with ungrammatical wording (match phrases need ≥70% token coverage; passed in v11 via retrieval); POWER112 corequisite definition (no official source).

## Next step (paused 01:05, 18 Nov — Mac kept sleeping)
A focused rerun (scratchpad final2.sh) started at 00:02 on a build with all fixes, but the Mac slept at 00:34 and 00:52 (lid closed?), so it was stopped. Partial rerun files exist with the label suffix "-rerun" in reports/knowledge-expansion-2026-11-04/ (few answers each); the fixed cases seen so far pass (e.g. EX052 now via the registry, KE306).
1. With the Mac awake and plugged in (lid open), rerun scratchpad final2.sh. It rebuilds, starts 3012/3013, reruns only non-correct cases per suite with --resume (continues the partial files), resumes regression part 3, then browser examiner and browser memory, stopping on ≥5 provider/network failures.
2. Compare with v11 baselines; hand-review what stays non-correct.
3. Google Doc continuation section + END OF TESTING; final report.

## How to resume
1. `cd` into the worktree above. Check `git status` and `git log -5`.
2. Read this file and `budget-log.md`.
3. Offline checks: `npm run test:offline` and `npm run test:profiles` (free, mock provider).
4. Live server: `node scripts/profiles/serve-local.mjs <port> production` after `npx next build`.
