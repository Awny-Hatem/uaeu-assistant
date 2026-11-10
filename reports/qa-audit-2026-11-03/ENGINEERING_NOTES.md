# UAEU Assistant local QA fixes

Branch: `fix/qa-audit-2026-11-03`. Local work only. No push, deployment or pull request.

## What supplies answers

The application uses approved Markdown files in `data/knowledge`, 121 reviewed entries in `data/verified-answers`, and the service workflow in `data/services`. The chat route resolves user conversation context, performs scoped academic retrieval or exact FAQ matching, optionally uses a remote closed-catalog selector to recall reviewed records, then generates and checks answers against source-specific evidence. The optional Gemini vector index is inactive in this configuration (zero chunks); SQLite contains prototype account/history/analytics records, not university academic data. There is no authenticated UAEU student-record API or live registration/degree-audit connection.

The revised academic planner resolves program, qualification, course identity, cohort and requested facet. It retrieves evidence rather than composing a fixed paragraph. Nonexact reviewed-answer matches are also evidence for the AI writer. Simple exact FAQ matches retain their fast deterministic path. Generated factual claims carry their own evidence IDs and pass numeric/code/contact checks plus a separate source-support check; one bounded rewrite is allowed. These are safeguards, not proof of semantic truth.

## Knowledge changes and ingestion

25 approved Markdown documents were added: 16 program-specific degree records, masters admission conditions, dated MPA fees, three historical catalog links, historical diploma availability scope, general contacts, a graduation-attire evidence limit and a student-club overview. Doctor of Medicine and Data Science degree existence reuse existing reviewed evidence. Existing course/study-plan files were corrected or clarified without duplicating whole catalogs.

These are curated, sectioned factual summaries with frontmatter (`status`, `title`, `sourceUrl`, `lastVerified`, scope and, where applicable, qualification/program/aliases). They are not merely URLs pasted into a vector database. The source URLs point to official UAEU pages and PDFs. Historical catalogs are explicitly link/year records, not an ingestion of every page of each historical PDF. Each new document's source snapshot/hash is recorded in `knowledge-provenance.json`; its facts were checked against the official source. The source map distinguishes official ground truth from nonauthoritative discovery links.

The existing file loader reads approved Markdown and rejects invalid/unapproved/stale sources. No embedding ingestion was necessary for the active file-based path. The server was rebuilt/restarted for code and cached reviewed-answer changes. No embeddings were created and no external vector store was populated.

## Five focus areas

- Missing knowledge: program-qualified records, graduate admission conditions, historical catalog links, dated fees, club examples and general contacts. Preserve publication/cohort limits; no current diploma intake or ceremony dress code invented.
- Phrasing sensitivity: validated course-code normalization (spaces, case, hyphens and CSPB transposition), semester/prerequisite typos, Arabic/mixed facets, programme aliases, qualification and college-versus-degree disambiguation.
- FAQ-like replies: keep simple exact matches, but use checked generation for nonexact questions. Requested credits, topics, prerequisites, required status and electives are distinct retrieval facets. Identical short answers to equivalent numeric questions can still occur naturally.
- Weird cases: user-history follow-ups, ambiguous comparisons, unknown course/program identities, future dates, private-record boundaries and cross-program/source separation.
- Weaknesses: source-specific citations, course/number/contact support, material-condition completeness, prerequisite-versus-pre/corequisite checks, honest failures and recorded latency. Generation/verification can still time out or withhold an answer; a verifier can also make a semantic error. Live attempts are retained rather than rewritten into successes.

## How validation is interpreted

The original published human audit was 47 correct / 17 partial / 38 incorrect. A separate unmodified-local baseline was captured before application edits. `baseline-final-rubric.json` applies the same final expected-fact/citation checks to those preserved raw baseline answers. It is not a replacement for the published human audit.

`final-retest.json` is the final complete actual-provider localhost API run, with full conversations, response metadata, timings, health snapshots and before/after runtime fingerprints. Earlier full/partial production rounds and targeted attempts are retained separately. An interrupted/sleeping request, provider timeout or rejected answer is a failure for that attempt. A later passing attempt does not erase it. Browser transcripts are additional evidence; any divergence is reported.

Offline suites use explicitly fake providers to test routing, evidence availability, rejection contracts, security and source attribution. Their passing counts are not live accuracy scores. The old common/alignment scripts now label generated-mock cases as retrieval-only because their placeholder text contains no university facts. Live accuracy and natural wording are evaluated by actual API/browser conversations separately.

## Running locally

`npm run build -- --webpack` builds successfully; default Turbopack build failed in this environment while trying to bind a CSS worker port. `npm run start -- --hostname 127.0.0.1 --port 3000` runs the local production build. The process receives a temporary authentication-cookie secret in memory; no secret was written into source or reports.

`npm run eval:qa-audit -- --base http://127.0.0.1:3000 --label review-run` runs the 195-case local-only evaluator. It refuses nonlocal targets. `npm run test:offline` runs contract/security/retrieval tests, and `npm run test:qa-audit` runs the new focused regressions. All semantic assessments still require review against official evidence.

## Risks and limits

Nonexact questions usually require a writer and one or more source-verification calls; rewrites add cost and latency. Exact FAQs can remain instant. Source changes require re-verification; the loader's 180-day freshness guard can remove stale files from retrieval. The IT catalog's 120-credit total and the Fall 2025–26 model's 130-credit label remain a disclosed publication/cohort conflict. MPA fees are explicitly dated through 2025–26. Current individual eligibility, live sections/seats, current diploma intake and ceremony attire remain unverified. No test score proves that all possible questions are correct.
