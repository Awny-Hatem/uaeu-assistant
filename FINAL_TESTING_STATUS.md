# Chatbot repair and testing handoff

**Final 100-question prototype acceptance completed on 29 September 2026: no material failures observed in the final run.** This is evidence for the tested sample, not a universal accuracy or production-readiness guarantee.

## Document to share

Open the [complete question-and-answer report](reports/independent/post-repair-round-10.html) in a browser to read or print it. A [Markdown copy](reports/independent/post-repair-round-10.md) and [unchanged raw responses](reports/independent/post-repair-round-10.json) are included. Every question, actual answer, citation, assessment and timing is retained; the answers were not replaced with ideal responses.

| Final assessment | Questions |
| --- | ---: |
| Verified substantive answers | 95 |
| Appropriate clarifications requiring user context | 2 |
| Explicit source-information limitations | 3 |
| Material failures requiring correction | 0 |

All 100 requests returned HTTP200. Three reviewers assessed the actual answers against applicable sources; HTTP success and working citations were not treated as factual proof. Reviews are bound to the exact raw-response SHA256.

The sample covers 39 topic/language labels, with 80 standalone questions and 20 follow-up turns in eight conversations. Groups execute in seeded random order. The independently authored fixture was reused to measure repairs; later replays are not new unseen samples. All earlier failed runs and the interrupted 22-turn capture remain in the [evidence index](reports/independent/README.md).

## What was repaired

- Reviewed English/Arabic answers now retain exact prerequisites, grades, AND/OR conditions, fees, procedures and source-specific citations.
- Conversation handling preserves course/service identity, applicant category, degree, term and year, without carrying unrelated topics forward.
- Degree applications, graduation, external-credit recognition, housing transfers and calendar dates are kept distinct. Empty initial model selection no longer strands the covered transfer-credit question.
- Provider failures have bounded deadlines/retries and are distinguished from missing university facts. Restored credits were verified without changing billing settings.
- Account/history ownership, cross-tab transitions, late replies, request bounds, password limits and Arabic/mobile interactions have regression coverage.

The [review plan](CHATBOT_REVIEW_AND_FIX_PLAN.md), [implementation notes](IMPLEMENTATION_AND_VALIDATION_NOTES.md) and [source review](content-source-review.md) retain the root causes and evidence.

## Verification

The final application source is `ccceaa6c2adcee1b47ff6fdeabbe1d22d4fcfeaf80a343b84735d7d33fcb5fd3`; its content fingerprint is `ad61f1c419e35210499f51108cc152296f2c870848c1f5ea0d4df3d5c07d3a15`. Source and endpoint identity remained unchanged throughout capture.

Passed: production build, ESLint, TypeScript, full offline suite (including 100 common and 80 alignment regressions), 23 mocked browser tests, 10 synthetic HTTP/authentication checks and 77 source URL/type/redirect checks. The printable report has 100 complete sections and no horizontal overflow at 1280px/390px; Arabic RTL rendering was visually inspected. See the [final engineering record](reports/independent/release-final-checks-20260929.json). Mock tests and source availability are not substitutes for the real-provider factual review.

Publish through a fresh Git-based cloud build only; do not upload local traced/prebuilt artifacts that may include ignored runtime data. Compare the deployed `/api/health` revision with Git main and the content fingerprint above. Release/deployment identity is separate from the local acceptance result.

## Remaining boundaries

The three [information gaps](reports/independent/open-information-gaps.md) are Spring 2028's start date, the parking-warning suspension threshold and the current MD-specific numeric graduation GPA. Two questions deliberately require clarification of conflicting or missing course identity. These five responses are not counted as full information coverage. Older policies and the 2023 handbook still need institutional supersession confirmation.

This is a team prototype, not an official university-record agent. It cannot access private grades, submit official requests, book appointments or verify university membership from a self-entered email. Institutional SSO, managed multi-instance persistence and shared server-enforced quotas/rate limits remain production prerequisites. Use synthetic profiles and test new wording using [TEAM_TESTING.md](TEAM_TESTING.md).

Private credentials, runtime databases/logs, account-identifying diagnostics and the user's existing `docs/` diagrams are excluded from publication. Temporary local test servers were stopped.
