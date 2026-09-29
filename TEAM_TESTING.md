# Team testing handoff

## Current acceptance status

The prototype is approved for team testing. The [final round-ten report](reports/independent/post-repair-round-10.html) contains 95 verified substantive answers, two appropriate clarifications, three safe information gaps and zero defects across all 100 reviewed responses. The accepted source is `ccceaa6c2adcee1b47ff6fdeabbe1d22d4fcfeaf80a343b84735d7d33fcb5fd3`. Earlier failures and the interrupted 22-turn eighth capture remain preserved in the [report index](reports/independent/README.md), not relabelled as passed. Reusing the same questions measures repair regressions; it does not prove every new wording is covered or make this an institutional production service.

Build, lint, TypeScript, the full offline suite, 23 mocked browser checks, 10 synthetic HTTP/authentication checks and 77 source-availability checks all passed on the accepted source. Git publication and cloud deployment still have separate identities: verify the public `/api/health` commit revision and content fingerprint before testing the live demo as this release. A successful push alone is not deployment verification.

Open a report's `.html` file in a browser to read or print all questions, actual answers, assessments and sources. The matching `.json` preserves the full request history, returned metadata and build/content identity. The Markdown version is useful for comments in the repository.

## What to try

- Ask your own phrasing across courses, admissions, registration, fees, documents, housing, library, IT, wellbeing and student life. Do not limit testing to the known example wording.
- Continue conversations: ask about another course, refer back to the first one, correct a course code, change applicant category and switch languages. Check that the answer follows the intended subject.
- Try degree-application paraphrases, then supply your applicant category and ask for documents. A master's/PhD request must not silently become undergraduate, and a rule "applying to" a student must not become an admissions question.
- After asking about a course prerequisite, switch to recognition of courses from a former university. The answer must follow the transfer-credit question, not treat "previous university" as "previous course." Conversely, a genuine "previous course" reference should still work; a housing-room transfer is not academic credit transfer.
- Ask when an unpublished future semester starts, then refer to "that term." The answer must retain your year/term and name the missing calendar fact, without substituting a known year's schedule. Housing, visa and application deadlines must not borrow semester-start dates.
- Check actionable details, not fluent wording: prerequisites and grades, AND versus OR, applicant/program scope, dates and term, exact portal steps, fees and exceptions.
- Open each citation and check whether that source supports the particular statement. A related page or working link is not sufficient evidence.
- Try clear history and sign-in/sign-out while a reply is pending. A late answer must not reappear in a different conversation or account.
- During sign-in, the dialog cannot close while the account-changing request is unresolved. If the response is interrupted after a cookie arrives, the app checks session status; an unavailable check pauses account actions and provides a status-retry button.
- Switch accounts in another tab, then send a question, clear history or sign out in the old tab. The old request must stop and the tab must load only the current account's conversation, without moving old messages or replaying the question. If session reconciliation fails, chat must remain paused until its explicit status check succeeds.
- Use mobile width, Arabic/RTL, keyboard navigation and refresh after the guest's tenth answer. Existing answers must remain readable.

For a defect, record the full conversation leading to it, exact expected versus actual behavior, screenshot, language, approximate timestamp, browser, and `/api/health` build/content identity. Identify the official source/section if a factual claim is wrong. Do not edit a returned answer when reporting it.

## Important boundaries

- This remains a **prototype**, not an authenticated university-record agent. Self-entered university email does not prove university membership. It cannot retrieve grades, issue documents, book appointments, pay fees or submit official requests.
- Use synthetic test profiles. Do not enter real student IDs, passwords, medical details or another student's private records.
- The configured external language-model provider processes chat text. Cross-provider fallback is disabled unless explicitly enabled. Local browser history and prototype identity/quota limits are disclosed in the application and health endpoint.
- Guest chat deliberately omits authentication cookies, including when startup session discovery fails. Authenticated chat, history GET/DELETE and sign-out send `x-chat-account-id` matching the account shown in the UI. The server compares it with the validated session cookie before model work or history/session mutation; a mismatch returns a non-identifying `409 account_changed`. This header is a consistency assertion, **not authentication or authorization**. Direct API clients must send the ID returned by sign-in/session for these authenticated operations. Reconciliation invalidates pending replies and replaces, never merges, account conversations.
- Managed institutional identity, shared multi-instance account/session storage and server-enforced quotas/rate limits require an agreed production deployment design. Do not call the prototype production-ready.
- Server history, when enabled, has a 30-day read window and bounded message count; physical age-based pruning occurs during writes, not through a scheduled deletion/backups policy. Legacy accounts with passwords over bcrypt's 72-byte limit still need a verified recovery process. Neither is an implemented institutional production service.
- Some questions need user context, and some need university-owned information that is not established in the available sources. See the [information-gap register](reports/independent/open-information-gaps.md). Those cases must not be filled with guessed facts.

## Reproducing the evidence

Use the setup and test commands in [README.md](README.md). A real-provider evaluation requires a running configured server, a unique `EVAL_RUN_LABEL`, and `EVAL_BASE_URL`. The evaluator refuses to overwrite previous runs. Keep the tested source unchanged during capture, and review every actual answer against applicable sources before assigning factual assessments. Browser-mechanics tests use mocked API traffic and are not answer-quality evidence.

The [final source-bound engineering record](reports/independent/release-final-checks-20260929.json) identifies the exact build and results. Earlier source-bound check records are preserved separately. Later source edits need separately identified results; these passes are not silently attributed to another build. Preserve report/fixture JSON bytes: `.gitattributes` disables line-ending conversion, and manual reformatting would invalidate review hashes.

This release permits only a fresh Git-based cloud build. Do not upload local `.next`, standalone or prebuilt artifacts: local file tracing can include ignored runtime SQLite files, logs and generated embeddings. Those inputs are not tracked or staged, so a clean Git checkout does not contain them; artifact packaging needs separate tracing exclusions and verification. Preserve user-owned `docs/` files outside the change set. After deployment, verify the public health endpoint's build revision and content fingerprint against the accepted release before calling the public demo updated.
