# V3 continuation checkpoint — 2026-11-18

This file is the current concise status record for continued phase work. Older entries in `V3_Implementation_Status.md` and `V3_Release_Readiness_20261117.md` are historical where their counts or statuses differ.

## Phase status

| Phase | Current evidence | Status |
| --- | --- | --- |
| 0. Reproducible baseline | Candidate and fixture identity are recorded; production remains untouched. | Closed |
| 1. Trusted standalone information assistant | Evidence-first routes, source-bound answers, scope/conflict handling, safe limits, and no live website dependency during student chat are implemented. The final-v3c capture has 10,000 saved answers and 10,000 six-criteria automated triage records, with 0 pending; 591 are marked needs-fix by automated triage. This is not independent factual adjudication, and the saved capture predates current worktree changes. | Implementation present; acceptance open |
| 2. Governed academic knowledge | `npm run audit:standalone` reports 55/55 program mappings; 99 curriculum versions; 95 structured and 4 source-conflicted/unstructured; 1,481/1,491 course-relation records parsed and 10 listed as unresolved; 71 individual-plan applicability mappings explicitly unresolved. `phase2InventoryGate.status` is `coverage-inventory-complete-with-explicit-limitations`, with no inventory errors. | Inventory exit closed with explicit limitations; source certification remains open |
| 3. Self-reported context and deterministic audit | Planner accepts editable self-reported inputs and returns conditional/unavailable results when evidence or applicability is missing. Browser coverage checks edits, reset, no local persistence, and an empty planner after reload; API checks exercise the real sequence route. | Implementation exit met; final candidate acceptance remains open |
| 4. Standalone degree and course planning | Structured plans feed prerequisite/load/internship-aware planning; unsupported requirements and unverified offerings remain conditional or withheld. Route tests cover all advertised curriculum versions; unresolved/source-conflicted plans remain unavailable or conditional. | Implementation exit met for the supported structured scope; source/content certification remains open |
| 5. Portal navigation and request preparation | 16 structured bilingual workflows have source, destination, steps, documents/deadline/handoff, missing-input, stale-source, and wrong-intent checks. Portal authentication and submission remain out of scope. | Implementation exit met for the 16 in-scope workflows; source certification and broader service coverage remain open |

## Production gate

The live production health endpoint returned `live=true`, `ok=true`, and `productionReady=false` on 2026-11-18. It reports `mode=prototype`, browser-local quotas, instance-local rate limits, unknown build revision, and OpenAI `gpt-4.1-mini`. The HTTP `ok` field means the deployed service is responding; it does not mean production readiness or provider-credit status.

The current local branch no longer requires university SSO or a durable chat-history database for the standalone public-information service. It calculates readiness from actual blockers and requires shared Redis for production abuse controls. Chat and authentication routes use an atomic Upstash Redis REST limiter when valid HTTPS credentials are configured, and fail closed in production if Redis is missing or unavailable. A read-only Vercel environment listing now shows `KV_REST_API_URL` and `KV_REST_API_TOKEN` assigned to both Production and Preview; the deployed branch preview independently reports shared Upstash quotas/rate limits. The preview still runs an older revision (`eddd706`) with the earlier durable-storage and managed-identity blockers. The production alias remains on the older legacy build, whose runtime does not consume these shared Redis variables. Marketplace acceptance did not deploy application code.

No production code was deployed. The saved 10,000-answer capture predates the current worktree and was not rerun during this continuation.

## Checks on current working tree

- `npm run test:offline` — the latest end-to-end run reached the final V3 selector-bypass test and failed on a regression where a quoted cohort label containing “model plan applies from” was mistaken for personal course-planning intent. The route guard was narrowed. After the fix, the complete `npm run test:v3` suite passed; the previously completed offline-suite segments passed, and `test:eval-reviews`, `eval:common` (100/100), and `eval:alignment` (80/80) passed separately. The full chained `test:offline` command has not yet been rerun end-to-end after the fix. Mock-route passes are not factual evaluations of generated answers.
- `npm run audit:standalone` — passed with the explicit inventory limitations above.
- `npm run test:academic-catalog` — passed.
- `npm run test:catalog-import` — passed; parser coverage 1,481/1,491, with unsupported source text retained.
- `npm run test:academic-model` — passed.
- `npm run test:security` — passed, 23/23 UI/auth/security checks, 52/52 ownership checks, and the shared quota/rate-limit checks.
- `npm run test:deadline` — passed, 12/12 provider-deadline checks and 29/29 provider retry/key-rotation checks; all provider calls were synthetic with zero external network.
- `npm run test:academic-rules`, `npm run test:academic-sequence`, `npm run test:answer-scope`, and `npm run test:answer-quality` — passed.
- `npm run test:v3` — passed, including selector bypass, evidence, conversation context, student-data boundary, and offline runtime checks.
- `npm run test:content` — passed, including 34 academic content checks, 48 bilingual curated-service content checks, all 48 service-workflow routes plus 32 English/Arabic missing-input routes, 32 English/Arabic wrong-intent routes, stale-source checks, and 6 knowledge-portability checks.
- `npm run test:academic-sequence` — passed for the planner engine and all 55 catalog degree IDs, with all advertised versions checked for conditional selection.
- `npm run test:catalog-import` — passed; 1,481/1,491 prerequisite/corequisite relation records parse, and 10 remain unresolved.
- `npm run eval:common` and `npm run eval:alignment` — passed 100/100 and 80/80 mock-route regression cases. These are not generated-answer factual evaluations.
- `npm run eval:scale` — completed 10,000 local mock-route cases: 9,869 passed and 131 failed (98.69% structural route-fixture agreement). This is not answer accuracy: 129 failing expectations are inherited, explicitly unreviewed legacy-route fixtures, while 2 are sourced curriculum snapshot cases; every failure needs triage before attributing it to the app. The corpus is correlated rather than 10,000 independent questions. Arabic text was verified as valid UTF-8, not mojibake.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — passed after the shared-rate-limit work.

## 2026-11-18 continuation note

- Excluded stale `.next-agent-*` build caches from Vercel uploads. Dry-run upload changed from 229,526,178 bytes / 1,411 files to 24,106,236 bytes / 326 files.
- Deployed the current local branch snapshot to an isolated Vercel Preview: `https://uaeu-assistant-d3w2m6c4w-awnyhatem40-gmailcoms-projects.vercel.app` (deployment `dpl_8XA9LtyFZvc4qZhoNvfLVL398AGS`, READY). Health returned `ok=true`, `live=true`, V3 enabled, shared Upstash quotas/rate limits active, and deployment mode `prototype` as expected for Preview. Homepage returned HTTP 200.
- Verified the Preview homepage returns HTTP 200 and a deterministic library-help request returns the reviewed `ask-a-librarian-research-help` guide with `VERIFIED` state and two citations. No model generation was needed for this route.
- Production was not changed. The preview was deployed from the local working tree, not from a committed, pinned branch revision. Do not treat this deployment as the final release candidate.

### Shared daily cap runtime proof

- Server enforcement now reads the private `CHATBOT_*_QUESTION_LIMIT` variables; `NEXT_PUBLIC_*` values only inform the UI display.
- A live request to the refreshed Preview answered the official calendar-location question with HTTP 200 and response headers `X-Chat-Quota-Limit: 10`, `X-Chat-Quota-Used: 1`, and `X-Chat-Quota-Remaining: 9`. This confirms the configured shared counter was reachable for the test request. It does not verify a full multi-instance concurrency or abuse-load test.
- Preview remains prototype mode and `productionReady=false`; Production remains untouched. The deployment was built from the dirty working tree and reports the Git HEAD revision, so it is not a pinned candidate build.

## Next phase work

Continue focused final-candidate checks for Phases 1–5, reconcile current automated-triage findings against the latest candidate and source records, and keep malformed course rules or unknown cohort assignments explicitly unresolved. The current worktree is not deployed and is not a reviewable release commit. Do not promote it until the documented phase gates, a pinned-candidate acceptance review, production environment configuration, and deployed health verification are satisfied.

### Server-enforced question allowance configuration

`app/api/chat/route.ts` now reads authoritative daily caps through `lib/server-quota.ts` from server-only `CHATBOT_GUEST_QUESTION_LIMIT`, `CHATBOT_STANDARD_QUESTION_LIMIT`, and `CHATBOT_UAEU_QUESTION_LIMIT` variables (defaults 10/50/200). The existing `NEXT_PUBLIC_*` values are display-only; changing them in a browser cannot change the server-enforced quota. Shared Upstash Redis remains the cross-instance counter store. Regression coverage verifies that a conflicting browser-visible value cannot override the server cap. `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed after this change. The updated code has not been committed or deployed; Preview and Production still need a refreshed deployment before runtime verification.

### Readiness-flag recheck (2026-11-18)

- Read-only health request to the latest known V3 Preview returned `ok=true`, `mode=prototype`, `v3Enabled=true`, and shared Upstash quotas/rate limits. `productionReady=false` is expected in that mode; the deployment was not configured as a production-mode candidate.
- The Production alias remains on an older legacy deployment, whose health still reports prototype mode and instance-local controls. Vercel has Upstash variable names assigned to both environments, but the legacy production runtime does not consume the shared counter implementation.
- The Preview's deployed Git revision is `eddd7069950833f0304c5d6b9f94ef2fe43e4245`, while this worktree has additional uncommitted changes. It is therefore not the current candidate.
- Updated `app/api/health/route.ts` so `productionBlockers` explicitly includes `Deployment mode is prototype` whenever appropriate; this explains why a healthy functional Preview can still have `productionReady=false`. Added a regression assertion in `tests/ui-security-checks.ts`.
- Verification after that change: `npm run test:security` passed (23 UI/auth/security, 52 account ownership, 6 shared quota checks); `npx tsc --noEmit` passed. Lint was invoked and returned without reported errors. The updated health response has not yet been redeployed for live confirmation.
- No Production deployment or alias change was made. Upstash stores shared counters; the app controls the three private server-side daily caps and enforces them.

### Refreshed Preview proof

- Deployed the current local worktree to isolated Preview `https://uaeu-assistant-ksu073wnt-awnyhatem40-gmailcoms-projects.vercel.app` (deployment `dpl_DymFdEiYzwFAy8setynU8eM2Vav6`, READY). This was a Preview deployment only.
- Live `/api/health` returned `ok=true`, `mode=prototype`, `productionReady=false`, `v3=true`, `quotas=shared-upstash`, `rateLimits=shared-upstash`, and blocker `Deployment mode is prototype`. This confirms the false readiness flag is explained by the Preview's mode; shared Redis is active and there are no store configuration blockers.
- Local `npm run build`, `npm run test:security`, `npx tsc --noEmit`, and `npm run lint` passed after the health change.
- Vercel reports the Preview build revision as `eddd7069950833f0304c5d6b9f94ef2fe43e4245`; the deployment used the current uploaded tree, but its Git revision remains the HEAD identifier and does not pin the dirty changes. The worktree is still uncommitted and this is not a release candidate.

### Latest candidate check after cohort-label routing fix (2026-11-18)

- Added the official Visual Studies 2022-2023 cohort model as a separate 120-credit version; Fall 2024 maps to that version and Fall 2025 onward maps to the 2025-2026 version. Curriculum tests and inventory audit passed; corpus generation and validation now cover 99/99 curriculum versions. This does not mean all 71 individualized cohort applicability mappings are resolved.
- Fixed the personal-planning intent guard so the word “from” inside a quoted official “model plan applies from…” cohort label no longer diverts a published-credit question. The V3 selector-bypass suite passes after the fix; a direct route regression returns `v3_program_credit_model`, 120 credits, and evidence ID `academic-program:agricultural-resource-management:arm-2022-model-plan`.
- Deployed the updated worktree to isolated Preview `https://uaeu-assistant-27eziek4o-awnyhatem40-gmailcoms-projects.vercel.app` (deployment `dpl_4KSWWNSpPzS2DAJm4aAe3xzmv49s`, READY). Vercel build and type-check passed. Live health reports V3 enabled, OpenAI configured, shared Upstash quotas/rate limits, and `productionReady=false` because the deployment mode is `prototype`.
- `npx tsc --noEmit`, `npm run lint`, complete `npm run test:v3`, `test:eval-reviews`, `eval:common` (100/100), and `eval:alignment` (80/80) passed. The full `test:offline` chain needs one final end-to-end rerun.
- `npm run test:browser` passed 33/33 in a local Chromium run, including light-only UI, accessibility controls, planner version selection, four suggested prompts, student context reset, and account/history ownership boundaries.
- Production remains untouched. Vercel Production does not currently list `CHATBOT_DEPLOYMENT_MODE` or `UAEU_AGENT_V3_ENABLED`; both must be configured for a V3 production deployment. The production readiness gate must not be forced true without configuring and verifying the release environment. Current worktree changes remain uncommitted/unpinned, and Phase 1 factual acceptance plus the 71 explicitly unresolved cohort applicability records remain open.

### Pinned branch and Production deployment (2026-11-18)

- Committed the reviewed source/data/test snapshot as `2b18e9a592d974e3eeede2a9f4d1871ec6a7adb4` on `feature/uaeu-v3-phase1` and pushed it to `origin/feature/uaeu-v3-phase1`. Generated 10,000-answer captures/reviews remain local artifacts; the fixed 10,000-question corpus, manifest, and rubric are committed.
- The pinned Preview `https://uaeu-assistant-4vkhjtb8e-awnyhatem40-gmailcoms-projects.vercel.app` reached `READY`. Its `/api/health` revision matched `2b18e9a`, V3 was enabled, OpenAI was configured, and Upstash shared quotas/rate limits were active.
- At the user's explicit request, added Production-only `CHATBOT_DEPLOYMENT_MODE=production` and `UAEU_AGENT_V3_ENABLED=enabled`, then deployed commit `2b18e9a` to Production. Vercel reports deployment `dpl_HPV9kc1aRZZdpA91ErZ3upZs11DZ` as `READY` and aliased to `https://uaeu-assistant.vercel.app`.
- Live Production `/api/health` returned `ok=true`, revision `2b18e9a`, V3 enabled, `mode=production`, `productionReady=true`, no deployment blockers, shared Upstash quotas/rate limits, and OpenAI model `gpt-6.1-sol`.
- Live Production chat returned a verified UAEU academic-calendar link and matching citation; the Agricultural Resource Management 2022 plan returned 120 credits with its version-specific evidence ID; Computer Engineering Fall 2025 returned the scoped 131-credit model with the official cohort/internship discrepancy disclosed.
- Operational health and smoke answers do not constitute institutional approval or a new full factual benchmark. Phase 1's 10,000-answer capture predates this pinned commit; its automated review is not independent human/UAEU adjudication. Historical outputs remain available locally under `reports/acceptance` and `reports/coverage`; they were excluded from Git history because the report tree is approximately 815 MB. The latest 71 cohort applicability entries remain explicitly unresolved and are handled conditionally by the agent.
