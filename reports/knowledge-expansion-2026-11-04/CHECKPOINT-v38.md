# Knowledge expansion checkpoint — 5 November 2026

This is an unfinished-work checkpoint, not the final Examiner report.

The approved corpus contains 8,379 documents (8,312 crawled and 67 curated), 143,834 indexed sections, 154 reviewed answer records, 11 service guides and 16,982 aliases. Counts have not changed since the preceding progress update. See `progress-counts.json`, `architecture.md`, `coverage-summary.md` and `data/knowledge/INDEX.md` for scope and provenance. Coverage is broad, not a claim that every UAEU fact has been captured.

Local commits: `a533c50` saves the expanded corpus; `281c687` saves retrieval and source ownership fixes; `accc609` saves reproducible evaluation fixtures and stricter reviewer safeguards. No push, deployment, PR or teammate message has been performed.

## What is verified locally

The full offline suites, knowledge integration checks, TypeScript, ESLint and webpack production build passed. Their logs are preserved in `validation-v38/`. The reviewer contract has 16 passing local fault checks; these do not demonstrate model judgment accuracy. The latest app is running at http://localhost:3000/ with revision `feat-uaeu-knowledge-expansion-v38-awaiting-live-retest`. Health was checked without requesting a generated answer. This QA server uses temporary in-memory prototype accounts and disabled server chat-history storage, not the user's private database. The health endpoint's provider-configured flag does not prove available API credit.

## Why live verification is incomplete

The provider returned `OPENAI_QUOTA_EXHAUSTED` (credit or account/project usage limit). Paid tests were stopped and the user was asked to restore access. The v37 run stopped at 454/600 Examiner submissions, regression shards at 446 and 450 out of a combined 1,782, and browser tests at 23/100 main cases. These interrupted runs are preserved. Local v38 fixes have not received a live retest. No new fix is marked proven solely because an offline test passes.

Historical v34 completed all 600 Examiner submissions and both regression shards. Its automated Examiner counts were 535 correct, 27 partial and 38 incorrect. Those are older-build provisional rubric results, not current semantic certification. The same run contains 151 literal factual-answer reuse pairs and 242 near-similarity flags, so strict anti-FAQ success has not been established.

The original v1 secondary reviewer falsely graded reference information as if it were present in known-bad actual answers. Its three review artifacts are explicitly invalidated by `reviewer-v1-invalidation.json`; their pass counts must not be used in a final success claim. The replacement requires quotes from the actual answer and checks only actually cited original sources. Its positive live calibration is still blocked by the provider limit. Calibration failures are not treated as passing.

Under the corrected current rubric, all 600 preserved Examiner baseline submissions and all 1,782 regression baseline submissions match the exact questions; no baseline response was invented. Regression baseline reassessment is 370 correct, 223 partial and 1,189 incorrect. This is derived automated grading, not independent factual certification. The lost temporary v9 crawl snapshot cannot be reconstructed or silently substituted: the reproducible Git `15a7e6f` data-only control contains 55 curated documents, 121 answer records, one guide and zero new crawled-index documents. A final causal comparison must disclose that distinction and use identical final code on both sides.

## Remaining steps

1. Restore provider access; calibrate the stricter reviewer on actual positive and negative controls.
2. Live-test v38 fixes, then run a frozen full 600-submission Examiner set and 1,782-submission regression set, plus all 100 browser main cases.
3. Rebuild the old-data control with identical final code; distinguish new source facts from structuring, retrieval fixes, rubric corrections and provider errors.
4. Adjudicate source support, omissions and answer repetition honestly. Do not reuse invalidated reviewer pass counts.
5. Finish the full change inventory, before/after evidence, commands, latency, cost, source coverage and remaining uncertainties.
6. Add all final conversations to linked continuation Google Docs, verify existing content is preserved, then add the final bold red END OF TESTING marker.

The shared continuation log contains the current unfinished status and preserves all preceding content: https://docs.google.com/document/d/10lWlUnyx4mJrcVWIqJsaFe-Ya0aEOecZcSwiXV0p1hc/edit . It does not yet contain the full final 600-case before/after log, and no completion marker has been added.

Known metered cost is a lower bound of $24.88206782. This includes spent evaluation, embedding, diagnostic and invalidated-review calls. It is not an account billing statement; unmetered browser calls and lost responses remain unknown.

## Queued request

The memory and personalization request was read. It explicitly starts only after this knowledge-expansion task and Examiner report are finished. The memory branch, audit and `memory_plan.md` have not been started. No production storage provider has been chosen.

Manual questions: `examiner-scenarios/examiner_100.md`. Each current status warns that v38 live verification is pending; historical scores remain labelled as historical.
