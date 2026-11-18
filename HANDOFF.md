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

## IN PROGRESS (18 Nov): merging Awny's V3 branch (upstream/feature/v3-course-answer-scope)
Awny's main had no new commits; Ali chose to merge feature/v3-course-answer-scope (161 commits) and to **adopt V3's sign-in/session/history design** (Ali's answer: "Adopt V3's design").
- Pre-merge state is saved as branch `backup/profiles-before-v3`. Merge is in progress (`git merge --no-commit`), not committed.
- Already resolved: auth login/logout/signup (took V3: `await rateLimitGuard`), health route (took V3), lib/language.ts (combined: V3 preamble + first-letter rule and our Arabic-frame rules).
- Plan for the rest:
  1. Auth: V3's session cookie (`lib/session-cookie.ts` restored from V3, accounts in lib/db). Our `currentAccountId()` (lib/auth/current.ts) reads the V3 session cookie user id, so profile/tester/academic/topics routes keep working.
  2. Our libSQL tables (profiles, topic_history, academic_profiles) reference `accounts(id)`: upsert a libSQL `accounts` row with the V3 user id on first use (ensureStoreAccount) so FKs hold.
  3. Tester switch route: issue the V3 session cookie (as V3 login does: encodeSessionCookie + registerSession) instead of our JWT.
  4. Memory (FR3): keep our memory cookie/store, keyed by the V3 user id; keep V3's opt-in `saveMessage` history too.
  5. Route: take V3's quota/guest-id/respond wrapper/orchestrator (behind isV3Enabled) and re-insert our handlers (dialogue, directory/offer/CE, academicAnswer, translation/recall, own-ID/remaining courses, memory open/remember).
  6. Then typecheck, lint, offline suites; commit the merge; merge the same into feat/uaeu-knowledge-expansion; rerun the final suites.
- Progress (18 Nov, later): restored V3 lib/session-cookie.ts, lib/auth-session.ts, lib/chat-history.ts; took V3 auth login/signup/logout/session and /api/history routes; lib/auth/current.ts now reads the V3 session cookie and mirrors the user into libSQL accounts (ensureStoreAccount in lib/auth/accounts.ts); tester switch issues the V3 session cookie; profile routes await the now-async rateLimitGuard; health uses authCookieSecretConfigured.
- route.ts decision: take V3's route.ts as the base (`git checkout upstream/feature/v3-course-answer-scope -- app/api/chat/route.ts`) and re-insert our features, rather than resolving 18 interleaved hunks. Our features to port (see `git diff $(git merge-base backup/profiles-before-v3 upstream/feature/v3-course-answer-scope) backup/profiles-before-v3 -- app/api/chat/route.ts`):
  a. POST wrapper `withAnswerUsage` → handleChat with MemoryRequest (memory open/serverConversation merge, rememberExchange, withProfileNote, recordTopic).
  b. Profile: getProfile/getAccount for userId, personalizeQuery + profileNote, level-switch/compare/facet/registration hints (lib/memory/followups), profile-aware locale.
  c. Early handlers in order: dialogueReply (history/meta/greetings/bye/Degree Works), programDirectoryAnswer ?? programOfferAnswer ?? currentCEAnswer, academicAnswer (planner), translation (translatePrevious), recall (refersToPreviousAnswer), own student ID, remaining courses, withoutTranslationTurns, corpusFollowUp.
  d. Retrieval/evidence: preparedRecord + exact-record fallback, graduateAdmission guard on the UG applicant-category question, own-program clarification, academicCoverageViolations, coalesceSourceClaims/MAX_GROUNDING_REWRITES usage.
  Drop our `saveMessage` removal: V3's opt-in saveMessage stays.
- Route port status: app/api/chat/route.ts is currently V3's file (taken with git checkout). Our full route changes are saved in `.merge-our-route.patch` (diff from merge base to our pre-merge route; 35 hunks). Everything else in the merge is resolved and staged (data files: V3 blocks + union of password-reset questions; faq.ts: V3; query-understanding: combined; source-evidence: V3 web label + our corpus label; package.json: union incl. test:memory, test:profiles, db:setup, V3 test:v3 etc.; scripts and tests: V3).
- Porting checklist onto V3 route (anchors in V3 file: `export async function POST` ~737, `parsedBody` ~753, `sanitized` ~799, `latest` ~804, `const locale = resolveLocale(latest, localePref)` ~808, `const resolution = resolveConversation` ~973):
  1. Rename V3 POST to `async function handleChat(req, memory: MemoryRequest)`; add our POST wrapper (withAnswerUsage → handleChat → withProfileNote → rememberExchange) and helpers MemoryRequest, openRequestMemory, rememberExchange, withProfileNote (from the patch hunks around old lines 661–760).
  2. After V3's userId: `memory.userId = userId`; load account/profile (getAccount/getProfile); visitor-role cookie context (patch hunk @@ -681).
  3. Before `sanitized`: openRequestMemory + serverConversation merge; `originalLatest`; typo-corrected sanitized; personalization (personalizeQuery, profileNote) and level/compare/facet/registration rewrites (hunk @@ -711).
  4. Replace V3 `const locale = resolveLocale(latest, localePref)` with our profile-aware locale; set memory.latestOriginal.
  5. Early handlers, before V3's academic/orchestrator handlers: dialogueReply (with stored dialogueHistory), programDirectoryAnswer ?? programOfferAnswer ?? currentCEAnswer, academicAnswer, translation, recall, own student ID, remaining courses, withoutTranslationTurns, corpusFollowUp-based resolution/routingQuery (make V3's `const resolution`/`routingQuery` use ours).
  6. Keep V3 explainPrerequisiteCorequisite (fixes POWER112) and its other handlers; keep V3 saveMessage calls.
  7. Later: generalRequest/weather, secretRequest/liveSeatRead/privateGraduationDecision blocks, own-program clarification (preparedForLatest/asksAboutOwnProgram), preparedRecord/exact-record evidence, graduateAdmission guard (hunks @@ -804 … -1112) — port where V3 has no equivalent.
  8. Imports for all of the above (hunks @@ -1 and -8).

## V3 merge — status 2026-11-18 (uncommitted, both checkouts mid-merge)
- Profiles worktree: all conflicts resolved and staged except later edits; tsc + lint clean.
  Ported onto V3 route: guards (weather/general, live seats, graduation confirmation), own-program clarification,
  prepared record evidence, graduate-admission guard, profile prompt block + memory notes, role-override framing,
  coalesceSourceClaims / MAX_GROUNDING_REWRITES / academic coverage, XML citation filter, hybrid corpus in retrieveContext,
  scoped academic evidence (legacy path only), history route = V3 opt-in history OR FR3 memory.
- Fixes: memoized understandQuery/courseNames (merged matchFaq was 16x slower); V3 bug: Arabic "ما متطلبات مقرر X"
  dropped prerequisites (fixed in lib/academic/course-catalog.ts); registrationWhenHint skipped when a reviewed record matches;
  3 service answers regained eval terms (reset / dining / الوظائف); auth-profile test moved to V3 sessions.
- Took V3 tests: curriculum-retrieval, canonical-rendering, service-content.
- OPEN DESIGN QUESTION (asked Ali): V3 renders matched reviewed answers verbatim (canonical); KE routed them through the
  writer as evidence. Remaining failures depend on it: test:canonical (course comparison), test:qa-audit (medicine
  exclusion), test:v3 (Urdu eligibility question), test:security (health activePath string), test (graduate-application-help Arabic),
  test:content (56 vs 55 service records: ours adds housing-graduate-availability).
- KE checkout (/Users/aliabdullah/Documents/uaeu-assistant): merge in progress; conflicts resolved by copying the profiles
  resolutions + KE-specific route draft; must re-copy the later fixes (route, history, course-catalog, query-understanding,
  student-services.json, tests) once the profiles merge is final.

### Update at 90% usage (2026-11-18, ~10:05 +04)
- Ali chose "V3 verbatim first": V3 selector + verbatim reviewed answers first; our scoped academic evidence, corpus
  search (hybridRetrieve inside retrieveContext) and the writer cover the rest. Implemented.
- More fixes: typo corrector skips French/Spanish and inflected forms ("scheduled"); program directory no longer lists a
  college when one program is named; CE rename note defers to V3's program credit model; V3 password-reset answer text taken;
  tests adjusted (selector call counts, embeddings excluded from fetch counts, Medicine-as-exclusion, calendar path).
- Offline suites now passing: pipeline, semantic, canonical, phase1, grounding, qa-audit, observed-source-scope, memory,
  profiles, source-response, deadline, integrity, agent, academic-*, catalog-import, answer-scope/quality, v3, eval-reviews,
  eval:common, eval:alignment (verify with a full run).
- STILL FAILING (next steps):
  1. `npm test` (prototype-checks): graduate-application-help Arabic query routes to rag, not its reviewed record.
  2. `test:content`: expects 55 service records; ours has 56 (housing-graduate-availability) -> update count to 56.
  3. `test:security`: health activePath string; set the non-V3 path label to describe the merged order and update test.
- Then: full `npm run test:offline`, commit, re-apply to KE checkout (copy changed files from this worktree: route
  [minus profile-only lines, see scratch ke draft], history route, query-understanding, course-catalog, program-registry is
  profile-only, student-services.json, tests), run KE suites, commit. Then rerun final suites (paid) under budget rules.

## 18 Nov 2026 — Dr. Fady fixes, regression fix, current state (stopped at 90% usage)
- Commits (local, not pushed): profiles e3f339d (V3 merge done), d7dd18f + 68f709e (Dr. Fady 10 cases, 35/35),
  eff302a (scoped-first order, stale-source filter, Ali's corrections). KE: c5cadab, 38cb0d0, 746e527, 32fcbca, cc278fb.
- Ali's corrections applied: full section → college academic advisor with student ID + CRN first, or MyUAEU
  Registration Override (https://my.uaeu.ac.ae/service-catalog/service/registration-override; e-services list
  https://www.uaeu.ac.ae/en/eservices/index.shtml?categoryId=2); offerings → Student Registration > Browse Classes
  (https://eservices.uaeu.ac.ae/StudentRegistrationSsb/ssb/registration); next-semester choice → catalog study plan,
  Degree Works worksheet/plans (sign-in), assigned advisor, student-responsibility note; no 2014–17 registration PDFs;
  English answers with Arabic terms render LTR; message links open in a new tab.
- Phrasing 399: before merge 378 correct; after merge (selector-first) 271; after first fix 324. Causes: loose V3
  selector picking unrelated records, V3 credit model answering one-term questions, citation to college page instead
  of catalog. Fixes in eff302a; recheck RUNNING: scratchpad fix3-run.sh → reports/.../examiner-phrasing-fix3.json and
  test-cases/fady-after-graded.json (check FIX3_DONE in scratchpad fix3-phrasing.log).
- NEXT: read fix3 results; if phrasing ≥ ~375 run the remaining final suites (final3.sh: examiner, regression 1–3,
  memory, browser examiner/memory) under budget rules; regenerate test-cases/fady-google-doc-entries.txt and update
  cases 2, 3, 4, 6 in the shared log (answers changed) — keep one END OF TESTING at the end.
- Port 3000 (Ali's manual testing) serves the KE checkout build at cc278fb.

- fix3 result: phrasing 329/35/35 (target ~378; still below — investigate remaining canonical/snapshot/grounding cases before final suites); Fady graded 25/25 (check why 25 not 35 entries).
