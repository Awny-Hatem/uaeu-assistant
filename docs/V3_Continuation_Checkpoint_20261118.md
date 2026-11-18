# V3 continuation checkpoint — 2026-11-18

This file is the current concise status record for continued phase work. Dated continuation logs below are historical; the status table and production gate here supersede older claims in this file and in `V3_Implementation_Status.md` / `V3_Release_Readiness_20261117.md`.

## Phase status

| Phase | Current evidence | Status |
| --- | --- | --- |
| 0. Reproducible baseline | Candidate and fixture identity are recorded. Production has since been deployed from the feature branch; see the live production gate below. | Closed |
| 1. Trusted standalone information assistant | Evidence-first reviewed answers, claim/source checks, bounded allowlisted official-site lookup, bilingual routes, and useful unresolved responses are implemented. Internal-transfer failure has a bilingual reviewed answer and live production regression. | Implementation closed; current-candidate factual acceptance remains a separate release gate |
| 2. Governed academic knowledge | 55/55 source-backed program mappings; 99 curriculum versions (95 structured, 4 unstructured); all applicability statuses explicit (18 verified, 81 unresolved); 1,481/1,491 prerequisite/corequisite expressions parsed and 10 unresolved. Unknowns are withheld or conditional. | Implementation closed to the documented inventory criteria; unresolved source records remain explicit data limitations |
| 3. Self-reported context and deterministic audit | Planner accepts editable self-reported program/cohort, course history, grades, repeats, transfers, and constraints; inputs are shown in the result, resettable, and not persisted by default. Browser and route regressions cover the input and reset boundaries. | Implementation closed; candidate-wide answer acceptance remains a separate gate |
| 4. Standalone degree and course planning | Published structured plans feed prerequisite/load/internship-aware planning; every advertised cohort or explicit version is checked. Unmapped cohort applicability, four unstructured plans, and unverified offerings are withheld or labeled conditional. | Implementation closed to the documented supported-scope criteria; data limitations remain visible |
| 5. Portal navigation and request preparation | All 16 in-scope bilingual workflows have sourced destinations/steps and checks for missing inputs, stale sources, and wrong intent. Portal authentication and transaction submission are outside the standalone boundary. | Implementation closed for the documented 16-workflow scope; broader service coverage is future scope |

### Phase closure decision

All six phases (0-5) are closed against the implementation exit criteria in `V3_Standalone_Architecture.md`. Phase closure means the documented standalone capabilities and explicit unsupported-data behavior exist; it does not mean every possible university fact is present or every answer is institutionally certified. The acceptance benchmark is the next gate and does not reopen phases unless it reproduces a concrete implementation defect.

## Production gate

Production is live at https://uaeu-assistant.vercel.app from branch commit 1d30ddb (Vercel deployment dpl_QqqY7zoeKjvwoopCsLCdgFKnGBnm, READY). Live /api/health reports live=true, ok=true, productionReady=true, mode=production, V3 enabled, legacy selector bypass for UAEU factual modes, OpenAI gpt-6.1-sol, and shared Upstash quotas/rate limits. English and Arabic internal college-transfer requests return the reviewed internal-college-transfer answer, citations, and matching quota headers; a third-year major-change request returns the corrected Spring 2027 window. Operational health is not proof of complete answer accuracy, full architecture acceptance, provider credit balance, or university approval.

Production uses shared Upstash quotas and rate limits, OpenAI `gpt-6.1-sol`, and public-source knowledge. It has no UAEU SSO integration or access to private student records. Server-side history is disabled in the live health contract. In commit `61e26f4`, transcript saving is off by default and the user can opt in; an explicit API flag is also required before a configured server history can write.

The live chat retrieves from the governed local snapshot and approved records first. When a UAEU factual request remains unresolved, or the student explicitly asks for current information, it sends a minimized topic/date query and fetches HTTPS pages only from a fixed allowlist of UAEU hosts represented in approved corpus sources. Discoveries remain unapproved with unknown publication freshness and are never ingested into the governed corpus. A short sitemap page is allowed for link discovery, while answer evidence requires a matching substantive passage. The separate real-answer capture remains an older source-baseline run, not acceptance of current Production.

### Branch follow-up: bounded official live research

- The scoped researcher now checks the relevant passage itself for the requested topic, event category, term, and year; it does not accept a page based on a keyword elsewhere in the first portion of the page. Admissions and scholarship deadline scopes are separated, including negative-scope text.
- Live findings are combined with, not substituted for, locally reviewed evidence. Their source IDs and trust/freshness metadata remain intact; discovered sources are labeled as untrusted factual candidates in the grounding prompt and answers disclose that publication freshness was not verified.
- Fetches are HTTPS-only, redirect-checked, byte/time limited, and restricted to the 12 UAEU hosts already represented in approved corpus sources. Sitemap pages may be short for link discovery, but answer pages must contain substantive text.
- `tests/v3/official-research-checks.ts` covers a relevant passage deep in a long page, semester-heading context, opening-date versus deadline distinction, admissions-versus-scholarship separation, date/event scope, off-domain redirect rejection, and rejection of unknown UAEU subdomains. `tests/v3/standalone-runtime-checks.ts` confirms ordinary requests do not browse and current-information requests use only the allowlisted sites.
- A read-only fetch through `researchOfficialUaeu` against UAEU's live `coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en` page returned the dated “Last day to add courses” passage in its Fall 2026 section with `trustStatus=discovered` and `freshnessStatus=unknown`. During that check, an opening event was initially misclassified as a deadline and a too-short neighboring snippet masked the valid passage; both are now covered by focused regressions.
- After the real-site parser corrections, `npm run test:v3`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, and `npm run build` passed. The broader `npm run test:offline` chain is running. This is branch implementation evidence only; no Preview or Production deployment has been made for these uncommitted edits.
- The older answer capture reached 3,825/10,000 with 4 recorded HTTP errors at manifest update `2026-11-18T05:00:02Z`. It is still running against the `2b18e9a` baseline, so it does not evaluate this branch's live-research implementation.

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

### Production transfer-answer correction (2026-11-18)

- Production logs for the reported transfer question showed zero usable claims; the answer-quality reviewer rejected the empty draft. The user supplied enough context, but the local knowledge base lacked a direct reviewed internal-transfer answer.
- Added bilingual reviewed answer internal-college-transfer, grounded in UAEU's Inter-college Transfer service, College Transfer guide, and academic calendar. It states published baseline requirements and portal steps, and does not invent a universal Engineering GPA/threshold.
- Corrected major-change answers and workflow dates: UAEU's New Students page lists **16–27 November 2026** for Spring 2027 internal-transfer applications. The calendar's **19–30 April 2027** event is no longer labeled as the Spring 2027 application window.
- Verification: academic content 35/35; curated-service content 48/48; service workflow checks passed all 48 localized routes, missing-input and excluded-intent routes, and stale-source cases; knowledge portability 6/6; V3 selector-bypass route suite passed. TypeScript, lint, and production build passed.
- Commit 1d30ddb is deployed to Production. Live English and Arabic requests both returned v3_reviewed_answer with faqId=internal-college-transfer; quota remaining decremented in sync. The third-year question returned the corrected November date.

### Shared daily cap runtime proof

- Server enforcement now reads the private `CHATBOT_*_QUESTION_LIMIT` variables; `NEXT_PUBLIC_*` values only inform the UI display.
- A live request to the refreshed Preview answered the official calendar-location question with HTTP 200 and response headers `X-Chat-Quota-Limit: 10`, `X-Chat-Quota-Used: 1`, and `X-Chat-Quota-Remaining: 9`. This confirms the configured shared counter was reachable for the test request. It does not verify a full multi-instance concurrency or abuse-load test.
- Preview remains prototype mode and `productionReady=false`; Production remains untouched. The deployment was built from the dirty working tree and reports the Git HEAD revision, so it is not a pinned candidate build.

## Separate acceptance work (does not reopen Phases 0-5)

Phases 0-5 meet their documented implementation exit criteria. Do not reopen them to demand complete historical records or universal factual accuracy: those are represented as explicit unresolved data limitations. Remaining work is a separate acceptance gate: run natural student-phrasing probes against the current pinned candidate, save each response, classify any fallback/reviewer/provider failure, independently source-review consequential answers, and report factual metrics separately from route tests. The 10,000-answer artifact is from an older candidate and its automated rubric scores are triage, not independent accuracy certification. A new benchmark does not change phase implementation status unless it reveals a concrete regression in a phase capability.

On 2026-11-18, the 100-case route regression found that "When does course registration open for next semester?" was misclassified as a degree semester-plan request and asked for the student's program. The semester-plan intent guard now excludes administrative registration-opening questions. The focused academic-model regression passes; `eval:common` is 100/100, `test:v3` passes, and `eval:alignment` is 80/80. This does not establish real-model factual accuracy.

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

- Added the official Visual Studies 2022-2023 cohort model as a separate 120-credit version; Fall 2024 maps to that version and Fall 2025 onward maps to the 2025-2026 version. Curriculum tests and inventory audit passed; corpus generation and validation now cover 99/99 curriculum versions. The 71 unresolved applicability count in that earlier audit was superseded by the later 99-version inventory, which explicitly lists 81 unresolved mappings.
- Fixed the personal-planning intent guard so the word “from” inside a quoted official “model plan applies from…” cohort label no longer diverts a published-credit question. The V3 selector-bypass suite passes after the fix; a direct route regression returns `v3_program_credit_model`, 120 credits, and evidence ID `academic-program:agricultural-resource-management:arm-2022-model-plan`.
- Deployed the updated worktree to isolated Preview `https://uaeu-assistant-27eziek4o-awnyhatem40-gmailcoms-projects.vercel.app` (deployment `dpl_4KSWWNSpPzS2DAJm4aAe3xzmv49s`, READY). Vercel build and type-check passed. Live health reports V3 enabled, OpenAI configured, shared Upstash quotas/rate limits, and `productionReady=false` because the deployment mode is `prototype`.
- `npx tsc --noEmit`, `npm run lint`, complete `npm run test:v3`, `test:eval-reviews`, `eval:common` (100/100), and `eval:alignment` (80/80) passed. The full `test:offline` chain needs one final end-to-end rerun.
- `npm run test:browser` passed 33/33 in a local Chromium run, including light-only UI, accessibility controls, planner version selection, four suggested prompts, student context reset, and account/history ownership boundaries.
- At this earlier checkpoint, Production had not yet been changed; later deployment notes and the current Production gate above supersede that statement. The 71 unresolved applicability count here was also superseded by the later 99-version inventory, which lists 81. Phase 1 factual acceptance remains open.

### Pinned branch and Production deployment (2026-11-18)

- Committed the reviewed source/data/test snapshot as `2b18e9a592d974e3eeede2a9f4d1871ec6a7adb4` on `feature/uaeu-v3-phase1` and pushed it to `origin/feature/uaeu-v3-phase1`. Generated 10,000-answer captures/reviews remain local artifacts; the fixed 10,000-question corpus, manifest, and rubric are committed.
- The pinned Preview `https://uaeu-assistant-4vkhjtb8e-awnyhatem40-gmailcoms-projects.vercel.app` reached `READY`. Its `/api/health` revision matched `2b18e9a`, V3 was enabled, OpenAI was configured, and Upstash shared quotas/rate limits were active.
- At the user's explicit request, added Production-only `CHATBOT_DEPLOYMENT_MODE=production` and `UAEU_AGENT_V3_ENABLED=enabled`, then deployed commit `2b18e9a` to Production. Vercel reports deployment `dpl_HPV9kc1aRZZdpA91ErZ3upZs11DZ` as `READY` and aliased to `https://uaeu-assistant.vercel.app`.
- Live Production `/api/health` returned `ok=true`, revision `2b18e9a`, V3 enabled, `mode=production`, `productionReady=true`, no deployment blockers, shared Upstash quotas/rate limits, and OpenAI model `gpt-6.1-sol`.
- Live Production chat returned a verified UAEU academic-calendar link and matching citation; the Agricultural Resource Management 2022 plan returned 120 credits with its version-specific evidence ID; Computer Engineering Fall 2025 returned the scoped 131-credit model with the official cohort/internship discrepancy disclosed.
- Operational health and smoke answers do not constitute institutional approval or a new full factual benchmark. Phase 1's 10,000-answer capture predates this pinned commit; its automated review is not independent human/UAEU adjudication. Historical outputs remain available locally under `reports/acceptance` and `reports/coverage`; they were excluded from Git history because the report tree is approximately 815 MB. At that pinned-candidate checkpoint, 71 cohort-applicability entries were unresolved; the subsequent 99-version inventory supersedes that count with 81 unresolved entries, which are handled conditionally by the agent.
