# V3 release readiness checkpoint — 2026-11-17

## Decision

Do not deploy this branch to production yet. The live production health endpoint reports `productionReady=false`, with managed university identity and shared server-side quotas/rate limits still missing. The production runtime still reports `gpt-4.1-mini`; this branch has not been deployed to production.

The current branch work is local and uncommitted on `feature/uaeu-v3-phase1`. Production is untouched.

## Failure review and fixes

The saved curriculum residuals were reproducible routing defects, not random one-off behavior. They were caused by intent routing that depended too heavily on English framing, failure to recognize some quote delimiters around published cohort labels, missing localized credit-distribution phrases, and Arabic request framing that obscured the underlying question. The branch now recognizes those query forms and preserves the intended curriculum/version before selecting evidence.

Evidence:

- Seven saved curriculum residual cases route to their expected curriculum version in `reports/acceptance/v3-scale-postfix-curriculum-residual-20261117.jsonl`.
- All 591 items labeled `needs-fix` by the pre-fix automated triage replay to their expected deterministic route/fallback state in `reports/acceptance/v3-scale-postfix-failed-subset-20261117.summary.json` (failures: 0). This is a routing check with mock AI, not a factual-answer regrade.
- The 10,000-answer capture's automated triage is complete: 8,677 verified, 223 safe-limitation, 509 appropriate clarification, and 591 needs-fix. Pending: 0. Criterion means (out of 5): accuracy/evidence 4.85, relevance/context 4.98, completeness 4.57, actionability 4.07, clarity 4.96, safety/scope 5.00. These are automated triage results, not an accuracy percentage or independent human/UAEU certification. The 591 disposition labels describe the pre-fix capture and have not been replaced by post-fix answer assessments.

## UI and prompt checks

- Light-only appearance is verified; no dark-mode toggle is present.
- Language selection controls are absent. Automatic question-language recognition remains enabled.
- Accessibility controls include keyboard skip navigation, reduced-motion handling, and text sizing from 100% to 125%.
- All four suggested prompts populate the intended question. The exact routes are covered by the V3 route regressions; all 16 structured workflows passed 48/48 English/Arabic route checks with official citations. This proves route selection and source attachment in local tests; it does not guarantee every answer is perfect or current beyond its cited evidence.

## Checks run

- `npm run build` — passed.
- `npm run test:v3` — passed, including selector bypass, deadline separation, repeat policy, prerequisite and program models.
- `npm run test:academic-model` — passed.
- `npm run test:content` — passed, including academic content and 48/48 bilingual service-guide routes.
- `npm run audit:standalone` — completed with no inventory errors; limitations remain for four unstructured curriculum versions, 10 unresolved prerequisite records, and 72 unresolved individual-plan applicability records.
- `npm run test:browser` — 33/33 passed after starting the local development server.

## Release boundary

The branch is suitable for continued preview testing, not production promotion. The architecture remains a standalone prototype: the health endpoint reports browser-local quotas and instance-local rate limits, without managed university identity or shared rate limiting. The production gate must not be bypassed based on local tests or the automated 10,000-answer triage.

## Failure-set accounting note

The saved residual curriculum replay named above contains seven cases. I did not find a separate manifest identifying an eight-question set, so I can substantiate the seven-case replay and the 591-case pre-fix needs-fix subset, but I cannot claim that a distinct eight-case list was individually verified.

## Follow-up review — 2026-11-18

The 591 cases labeled `needs-fix` were replayed through the current local mock route with the evaluator's expected-content checks. The first corrected-code run passed 588/591. All 63 Arabic-answer failures from the earlier replay were resolved by localizing the explicitly selected curriculum-version response, and the corrupted student-visa Arabic answer was restored. The remaining three cases were accessibility-guide paraphrases that routed to the correct guide and returned its content; the evaluator had incorrectly omitted `guide.id` when checking the expected answer ID. After correcting that evaluator fallback, the same three cases passed 3/3. Captures are in `reports/coverage/v3-scale-route-eval-2026-11-17-20261118-finalfix591-targeted.jsonl` and `reports/coverage/v3-scale-route-eval-2026-11-17-20261118-accessibility-harness-fix3-targeted.jsonl`.

Additional regressions cover actual line breaks and program/college identity in curriculum snapshot answers, Arabic output for selected curriculum variants, accessibility phrase matching, and Arabic student-visa answer integrity. These are local deterministic route/content checks. They are not a live-provider factual-quality regrade of the original 10,000 captured answers.

Validation after these fixes: production build passed; `npm run test:academic-model`, `npm run test:content`, `npm run test:v3`, and `npm run audit:standalone` passed. The standalone audit remains explicitly limited: it reports 55 undergraduate programs, 98 curriculum records, 2,796 course records, and 1,491 prerequisite records, while still marking four curriculum versions unstructured, 10 prerequisites unresolved, and 72 cohort-to-student-plan applicability mappings unresolved. These are coverage counts, not completeness certification.

### 10,000-answer review integrity recheck

The exact `final-v3c` capture and its review were revalidated on 2026-11-18 with `node scripts/validate-answer-reviews.mjs reports/acceptance/v3-scale-answers-20261117-final-v3c.jsonl reports/acceptance/v3-scale-answers-20261117-final-v3c.six-criteria-review.json`. The validator passed: 10,000 capture rows, source-evidence sidecar, endpoint identity, zero capture errors, matching run hash, 10,000 scored assessments, zero pending assessments, and exact assessment ID/question matching. Two Arabic graduate-course credit answers used the documented “Codex-local source-text fallback”; both are scored and bound to capture-side official course-catalog snapshots. The review remains automated triage requiring human review. Its existing criteria means (accuracy/evidence 4.8497, relevance/context 4.9789, completeness 4.5669, actionability 4.0692, clarity 4.9645, safety/scope 4.9997) are rubric scores, not answer accuracy percentages or institutional acceptance.

This verified state supersedes stale progress text elsewhere claiming 9,998/10,000 with two pending rows. No independent reviewer or UAEU adjudication is recorded for the full run.

### 100-case source review completion — 2026-11-18

The 14 cases previously pending in `reports/independent/20261117-v3-current-openai-100-source-audit.json` were reviewed against their exact captured responses, linked UAEU evidence, and the official source pages available on 2026-11-18. The review addendum [`20261118-v3-current-openai-100-source-review-completion.json`](../reports/independent/20261118-v3-current-openai-100-source-review-completion.json) is bound to capture SHA-256 `85fbb9e68d607ebe5e4db6107c9e609959d1183b6a5c416080737574582d2cb1` and records 100/100 cases reviewed, 0 pending. Outcomes preserve necessary limits: AE-05's overdue review date, the old password-reset interface evidence, Wi-Fi setup not established by the 2023 handbook, and the transcript-fee conflict are explicitly called out. The source review is assistant-conducted, not independent human or UAEU adjudication, and the capture predates later branch edits.

### 2026-11-18 follow-up routing and regression checks

The full `npm test` route suite passed after correcting two source-expectation mismatches and one real postgraduate scope-recognition gap. “Graduate application deadline” was being rejected by the postgraduate scope gate because “graduate” was not recognized as a degree-level phrase; the question parser now recognizes graduate application/admission phrasing and the exact regression passes. The emergency citation test now matches the official UAE government handling-emergencies URL actually attached to the correct answer. Visa-deadline and visa-renewal assertions were aligned with the current saved source wording; the English visa answer's stray apostrophe encoding was corrected.

The first `npm run test:offline` pass stopped at a stale health-test count (it expected 1,482 prerequisite relations, 1,480 parsed and 2 unresolved). After updating it to the current audited values (1,491; 1,481 parsed; 10 unresolved), the security group passed 20/20 UI/auth/security checks plus 52/52 account-ownership cases. The remaining offline-suite commands passed in order: deadline/provider retry, source response, integrity, agent contract, academic model/rules/catalog/sequence, catalog import/parser, answer scope/quality, V3, evaluation-review tooling, 100 common-question mock routes (100/100), and 80 alignment mock routes (80/80). The previously run pipeline (52 route calls), semantic (30/30), canonical (29/29), content (34 academic and 48 service checks plus workflow/portability), targeted retrieval (15/15), grounding (18/18 and 23/23), and admission/calendar (33/33) groups also passed after their respective fixes. The final build and lint passed; `npm run test:browser` passed 33/33 once the local dev server was started. Its initial attempt had only failed because the server was not running. ESLint was also updated to skip generated `.next-agent-*` build directories and local `tmp/` scratch scripts; `/tmp/` is now git-ignored to keep those untracked files out of a release. These are functional/local evidence checks and mock-route outcomes, not a newly generated 10,000-answer capture or factual regrade.

The current audit snapshot is [`v3-standalone-coverage-20261118.json`](../reports/coverage/v3-standalone-coverage-20261118.json); its inventory limitations are summarized in [`V3_Current_Inventory_Update_20261118.md`](V3_Current_Inventory_Update_20261118.md). The production health endpoint was checked again on 2026-11-18: `live=true`, `generation=true`, and `configuration=true`, but `productionReady=false`, `mode=prototype`, `identity=self-reported-unverified`, `quotas=browser-local`, and `rateLimits=instance-local`. The root cause is explicit in `lib/runtime-contract.ts`: `productionReady` is hardcoded false and the two integrations are declared absent. The linked Vercel production environment lists OpenAI provider/model and key aliases plus auth-cookie secret, but no managed identity, durable/shared database, or distributed rate-limit configuration. Vercel reports OpenAI configured with `gpt-4.1-mini`; this is not a billing-credit check. API availability does not clear these deployment gates. No production deploy was made.

### 2026-11-18 production-gate and shared-rate-limit follow-up

The previous statement that the flag was hardcoded false is now corrected in the branch: readiness is computed from explicit blockers. Production mode still cannot be enabled because durable storage, shared rate limiting, managed UAEU identity, and server-side user quotas are not all integrated. Production chat/auth endpoints fail closed when the deployment mode is production but the current runtime contract does not allow it.

The chat and authentication routes now support atomic shared rate limiting through Upstash Redis REST using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Credentials are sent only over HTTPS, request identities are hashed before becoming Redis keys, the operation has a 2-second timeout, and a configured-but-unavailable backend returns 503 instead of silently falling back to instance-local memory. Prototype mode retains its local limiter. The route security suite passes 22/22 and ownership checks pass 52/52; TypeScript, lint, and production build pass.

The live production health endpoint still reports the deployed revision as unknown and `productionReady=false`, with instance-local limits. The production environment variable inventory contains no Upstash/shared store variables. Therefore the limiter code is not active in production, and deploying the current branch as-is would not satisfy the deployment gates. No production deployment was made. Even after supplying the shared store, the remaining identity, durable-storage, and server-side quota gates require real integrations before the readiness flag can truthfully become true. The 10,000-answer capture was not rerun.

