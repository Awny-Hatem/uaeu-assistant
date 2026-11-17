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
| 1. Six test cases, meta/greeting/history, program-filtered retrieval | Mostly done by Codex: cases 1–5 now pass on the after-six-v2 run. Case 6 loops on "what year were you admitted?" (fix in progress). |
| 2. Study-plan and catalog parsing | Codex: plan extractor with total validation, `data/academic/study-plans.json`, `course-versions.json`; flagged plans whose printed totals don't reconcile. Needs review. |
| 3. Profiles, tester page, 10 accounts | Codex: `lib/academic-profile/`, `/tester`, `/api/tester`, `/api/profile/academic`, `tester-accounts.md` (10 fictional accounts). Fixture prerequisite audit not fully clean. |
| 4. Source cleanup, freshness, guest roles | `sources-freshness.md` exists (Codex). Guest roles: started. |
| 5. 150+ new test cases | Codex: `test-cases/power-172.json` and one live run (`power-results-v1`), all verdicts still "unreviewed". |
| 6. Comparison vs general AI | Script exists (`scripts/profiles/compare-general.mjs`); not run. |

## Test results so far
- Six cases (after-six-v2): 1–5 behave as expected; 6 fails (repeats the admit-year question).
- 172 new cases: run once, not yet graded.

## API spend
See `budget-log.md`. Total so far: $0.43 of the $20 cap.

## Next step
Fix the case-6 loop, rerun the six cases, then grade power-results-v1 and fix failures.

## How to resume
1. `cd` into the worktree above. Check `git status` and `git log -5`.
2. Read this file and `budget-log.md`.
3. Offline checks: `npm run test:offline` and `npm run test:profiles` (free, mock provider).
4. Live server: `node scripts/profiles/serve-local.mjs <port> production` after `npx next build`.
