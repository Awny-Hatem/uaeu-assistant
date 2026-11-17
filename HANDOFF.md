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

## Test results so far (build at commit after b801a2d)
- Six cases (after-six-v5): all six behave as expected.
- 172 new cases (power-results-v4): 0 HTTP errors, 0 robotic replies, 1 refusal (POWER168 faculty contacts).
  LLM verdicts (power-results-v4-graded.json, gpt-4.1-mini vs rubric + official reference): 135 correct, 32 partial, 5 incorrect.
  Hand check so far: the 5 "incorrect" and most "partial" are judge/rubric errors, not bot errors:
  - POWER147/148 (CMHS lists) and POWER105 (CSPB219 typo) are correct; the grader reference matched "Science" inside "Health Sciences" (same bug as the old directory) and has no typo mapping.
  - POWER009/029/049/059/069/079 flag "Gen Ed course (Cluster 1…)" labels, but the official plan PDFs print exactly those labels; the reference omits course types.
  - Several conversation/guest rubrics written by Codex ask for things the brief does not (e.g. a greeting must mention the 2025 IT source conflict).
  Still to review by hand: POWER003, 025, 038/048/078 (registration answers lack the eServices link), 051, 064, 086, 098, 168.
- Comparison vs general AI (comparison-50-v2-graded.json, 50 matched cases, same base model gpt-4.1-mini without retrieval):
  ours 42 wins, general 8, ties 0; correctness 1.90 vs 1.02 (0–2), completeness 1.76 vs 0.94; answers with a hallucination 4 vs 27;
  invented course codes 2 vs 13; official UAEU link cited 21 vs 7. Of the 8 general wins, 2 are judge errors (POWER105, 158), 1 is a tie in
  substance (POWER011), 5 were fair: credits-left answers were terse (fixed after this run: per-block breakdown), the calendar answer lacked the
  URL in text (fixed), and the international-application answer is less step-by-step than the general model's (open).
- Offline: test:offline passed earlier in this session; test:profiles 21/21 + 16/16.

## API spend
budget-log.md: about $1.51 of the $20 cap (well inside; balance should be about $33.7).

## Next step (as of commit after 6d6eb8c, usage paused at 89%)
Latest live run: test-cases/power-results-v5.json; automatic verdicts: test-cases/power-results-v5-graded.json → 131 correct, 41 partial, 0 incorrect.
Most partials are grader artefacts: the judge reference has no requirement blocks (so the new per-block credits breakdown is marked "unsupported"), Codex's generic rubrics ask greetings/guest answers to "distinguish public guidance from live private access", and department grouping comes from the official registry's department field.
1. Hand-review the 41 partials; write overrides to test-cases/verdict-overrides.json as {"POWERxxx": {"verdict": "correct|partial|incorrect", "comment": "..."}} — only after checking each against the official source.
   Real issues seen so far: registration answers (POWER028/038/048/078) lack the explicit eServices steps/link; POWER078 says students "must insert courses into Degree Works" (check against the registration guide); POWER051/071 next-semester prerequisite flags.
2. node scripts/profiles/merge-verdicts.mjs test-cases/power-results-v5.json test-cases/power-results-v5-graded.json test-cases/verdict-overrides.json test-cases/power-results-v5-final.json
   node scripts/profiles/render-cases.mjs test-cases/power-results-v5-final.json test-cases/power-results-v5.md
3. Write comparison-vs-general-ai.md from test-cases/comparison-50-v2.json + comparison-50-v2-graded.json (ours 42 / general 8; scores in the earlier section).
4. Final suites once (examiner 600, regression 1,782, memory 94) or a representative sample within budget; Google Doc log; final report.

## How to resume
1. `cd` into the worktree above. Check `git status` and `git log -5`.
2. Read this file and `budget-log.md`.
3. Offline checks: `npm run test:offline` and `npm run test:profiles` (free, mock provider).
4. Live server: `node scripts/profiles/serve-local.mjs <port> production` after `npx next build`.
