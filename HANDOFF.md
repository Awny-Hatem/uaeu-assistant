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

## Test results so far
- Six cases: all as expected (after-six-v3).
- 172 cases (v2, before the latest fixes): 166 clean, 6 clarifications (2 were defects, now fixed).
- Offline: test:offline passes; test:profiles 21/21 regressions + 16/16 academic checks.

## API spend
See budget-log.md. Total so far: about $0.72 of the $20 cap.

## Next step
Grade the latest 172-case run into Field/Details verdicts, regenerate sources-freshness.md, then run the general-AI comparison (≈50 questions) within budget, then the final suites.

## How to resume
1. `cd` into the worktree above. Check `git status` and `git log -5`.
2. Read this file and `budget-log.md`.
3. Offline checks: `npm run test:offline` and `npm run test:profiles` (free, mock provider).
4. Live server: `node scripts/profiles/serve-local.mjs <port> production` after `npx next build`.
