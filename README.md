# UAEU Intelligent Student Services Assistant

Student project prototype for a UAE University student-services chatbot. It helps students ask questions, find verified source links, start guided service workflows, and escalate sensitive or uncertain cases to official UAEU support channels.

This is not an official UAEU service.

## Problem

Students often need quick answers about services, deadlines, documents, support channels, and university procedures. A normal FAQ page can be hard to search, while a general AI chatbot can answer too confidently without verified university context.

This prototype tests a safer model:

- Let first-time visitors ask questions before account creation.
- Prioritize curated UAEU source material.
- Show citations separately from model text.
- Guide students through service processes step by step.
- Escalate questions that need official confirmation.
- Track only aggregate improvement signals.

## Demo

Live demo: https://uaeu-assistant.vercel.app

Local demo: http://localhost:3000 after running `npm run dev`.

## Main Capabilities

- **Ask:** Reviewed bilingual answers, selected by exact/scoped matching or closed-catalog semantic interpretation. Covered facts retain their approved wording; guarded generation handles remaining supported cases.
- **Guide:** Structured guided workflow for student document requests, including To Whom It May Concern letters.
- **Escalate:** Sensitive, low-confidence, or human-requested cases route users to official contact options.
- **Discover:** Relevant official links such as academic calendar, events, and service navigation can appear beside answers.
- **Guest mode:** Visitors can ask 10 questions before sign-in is required.
- **Unverified prototype accounts:** Self-entered email addresses do not establish university identity; all local accounts use the standard displayed allowance.
- **Local history:** Guest and signed-in conversations stay in browser `localStorage` by default.

## Architecture

```text
app/
  page.tsx                  Chat app entry
  api/
    chat/route.ts           Chat orchestration
    auth/*                  Prototype signup, login, session, logout
    health/route.ts         Provider and knowledge-base health snapshot
    admin/analytics         Aggregate analytics dashboard

components/
  UniversityChat.tsx        Main chat UI, guest quota, local history
  AuthModal.tsx             Prototype account creation and login
  ServiceGuide.tsx          Citations, communications, guided workflow UI

lib/
  ai-provider.ts            Explicit OpenAI/Gemini selection, timeout, mock tests
  faq.ts                    Verified-answer loading and scored intent matching
  query-understanding.ts    Course normalization, context and applicability guards
  semantic-routing.ts       Same-provider closed-catalog query interpretation
  source-evidence.ts        Per-source facts and bounded claim consistency checks
  knowledge-files.ts        Approved-source validation and lexical retrieval
  vector-rag.ts             Fingerprinted optional Gemini embedding retrieval
  service-guides.ts         Structured guide loading and matching
  analytics.ts              Privacy-safe aggregate analytics
  access.ts                 Quota and UAEU email classification

data/
  verified-answers/*.json   Curated bilingual answers with direct citations
  evals/*.json              Pinned question-and-answer regression cases
  knowledge/*.md            Approved, source-linked RAG excerpts
  service-guides/*.json     Guided service definitions
  communications.json       Official links surfaced beside answers
```

## Retrieval Flow

1. Resolve the response language and carry the subject of short follow-up questions forward.
2. Handle urgent safety language and explicit human-support requests before ordinary routing.
3. Match a narrowly-scoped guided service or a verified deterministic answer.
4. For paraphrases and follow-ups, use the configured provider's compact-catalog selection as a recall hint. The original context-resolved user request remains authoritative; a model rewrite cannot discard its requested fact or change its scope.
5. For nondirect answers, make one final relevance selection over at most six eligible full approved answers. Check identity, category, year and requested-fact applicability, then render the chosen localized text without model rewriting. Supporting candidates are not automatically included. If no eligible canonical answer is selected, retrieve only approved source-specific evidence. Generated claims pass deterministic and isolated per-claim model checks with at most one rewrite; rejected claims are withheld. A provider outage is reported as an availability problem, not as evidence that university policy is missing.
6. Clarify missing user scope or explain a specific evidence gap when the requested fact is unavailable. Do not invent a date, charge, rule, personal status or booking.

The model does not invent citation names. The backend returns structured citations like:

```json
{
  "content": "...",
  "source": "rag",
  "citations": [{ "title": "...", "url": "...", "lastVerified": "2026-09-16" }]
}
```

For noncanonical wording, the configured provider selects existing approved record IDs and resolves the student's question; its interpretation is not evidence. Scope guards retain course identity, year/term, degree and applicant category. Canonical answers use reviewed localized text and record-level citation bundles: this does not claim that every citation supports every sentence. When generation is needed, individual factual claims reference separate source summaries; unmapped multi-source references cannot certify a claim. The additional source checks are safeguards, not proof of entailment. Independent source-based review must check both selection and factual applicability.

## Guided Service Mode

Guides are stored as data, not hard-coded React text. The first implemented guide is:

- To Whom It May Concern Letter / Student Document Request

Each guide includes an official link, last-verified date, audience, narrowly scoped trigger phrases, exclusions, and step-by-step instructions.

Future UAEU integration could expose stable UI markers such as `data-help-id="document-request"` inside official portals. An embedded assistant could then highlight the relevant page area, but this prototype does not bypass portal security or inspect authenticated pages.

## Environment

Create `.env.local` from `.env.example`:

```bash
OPENAI_API_KEY=your-openai-api-key
# AI_PROVIDER=openai
# OPENAI_CHAT_MODEL=gpt-4.1-mini
# AI_PROVIDER_TIMEOUT_MS=20000
# GEMINI_API_KEY=your-gemini-api-key
# AI_PROVIDER_FALLBACK=enabled
# GEMINI_EMBEDDING_SEARCH=enabled
# NEXT_PUBLIC_GUEST_QUESTION_LIMIT=10
# NEXT_PUBLIC_STANDARD_ACCOUNT_QUESTION_LIMIT=50
# CHATBOT_DATA_DIR=./data
# CHATBOT_DB_PATH=./data/chatbot.db
# SERVER_CHAT_HISTORY=enabled
# ADMIN_ANALYTICS_TOKEN=your-long-random-admin-token
# AUTH_COOKIE_SECRET=replace-with-a-unique-random-secret
```

Set `AI_PROVIDER=openai` or `AI_PROVIDER=gemini` explicitly in deployment. A missing key for that selected provider is an error; it does not silently switch vendors. Cross-provider fallback is disabled unless `AI_PROVIDER_FALLBACK=enabled`; enabling it means the retained conversation context may be sent to the second configured vendor after the first fails. Provider calls default to a 20-second timeout and can be changed with `AI_PROVIDER_TIMEOUT_MS`.

Transient OpenAI network, rate-limit and server failures receive at most two retries within the existing absolute answer deadline. Backoff respects a valid server minimum and declines excessive waits; confirmed billing/quota, credential and invalid-request errors are not retried. Missing rate-limit subtype is labelled unclassified rather than guessed. Retry handling follows the [official rate-limit guidance](https://developers.openai.com/api/docs/guides/rate-limits); it cannot restore exhausted account credits or guarantee availability. Claim-verification batches settle all bounded sibling calls before returning.

Live Gemini embedding search is separately opt-in through `GEMINI_EMBEDDING_SEARCH=enabled`. `AUTH_COOKIE_SECRET` is required for account/session features, must be a dedicated random value of at least 32 characters, and seals device-local auth cookies with authenticated encryption. Generate a different secret for every environment (for example, `openssl rand -base64 48`) and never commit it. Server-side raw chat history is disabled unless `SERVER_CHAT_HISTORY=enabled`. Local development stores SQLite in `data/chatbot.db`; Vercel uses temporary `/tmp` storage because the bundled project directory is read-only.

### Deployment and account contract

The default `CHATBOT_DEPLOYMENT_MODE=prototype` is suitable for team evaluation, not trusted institutional identity. Browser allowances are not server-enforced daily account quotas. The API has instance-local request limiting, and prototype session revocation cannot survive every serverless cold start. Health reports these limitations separately from liveness/readiness.

For persistent self-hosted SQLite only, `CHATBOT_DURABLE_STORAGE=enabled` enables registered sessions checked against the database and disables device-local account fallback. Never enable it on Vercel temporary storage or `:memory:`. `TRUST_PROXY_HEADERS=enabled` is only for a controlled proxy that sanitizes forwarded addresses; do not enable it merely to evade a limiter. Explicit `CHATBOT_DEPLOYMENT_MODE=production` fails closed until durable managed identity and shared quota/rate-limit integrations are implemented. No external identity or database service is provisioned by this repository.

Deploy this release through a fresh Git-based cloud build only. Local Next.js file tracing currently includes ignored runtime SQLite files, logs and the generated embeddings cache when those files exist in the workspace. They are excluded from Git and are not publication candidates, but ignore rules do not remove them from a local traced bundle. Do not upload a local `.next`, standalone or prebuilt artifact. Artifact-based deployment needs explicit tracing exclusions and a bundle-content regression first. After a Git deployment, compare `/api/health` build revision and content fingerprint with the accepted release; a successful push alone does not verify deployment.

### Independent acceptance evidence

The prototype is approved for team testing. The [final real-provider 100-question report](reports/independent/post-repair-round-10.html) records **95 verified substantive answers, two appropriate clarifications, three safe information gaps and zero defects** in the reviewed sample. All 100 actual responses were checked; clarification and missing information are not counted as substantive answers. The same fixture was reused across repair rounds, so this is regression acceptance, not an unseen-sample guarantee. Earlier failed runs and the interrupted eighth capture remain unchanged.

The accepted application source is `ccceaa6c2adcee1b47ff6fdeabbe1d22d4fcfeaf80a343b84735d7d33fcb5fd3`. Build, lint, TypeScript, the complete offline suite, 23 mocked browser checks, 10 synthetic HTTP/authentication checks and 77 source-availability checks passed; see the [source-bound engineering record](reports/independent/release-final-checks-20260929.json). These engineering results are separate from factual review. See [the final handoff](FINAL_TESTING_STATUS.md) for release details and remaining prototype boundaries. Git publication and cloud deployment are separate steps: confirm the public `/api/health` commit revision and accepted content fingerprint before treating the live demo as this release.

`data/evals/independent-questions.json` contains 100 independently authored mixed-topic turns, including Arabic and follow-up conversations. Its groups execute in a reproducible seeded random order. It is a broad acceptance sample, not a statistical guarantee about every possible question.

```powershell
# Start the chosen build with its real provider configured, then run:
$env:EVAL_BASE_URL='http://localhost:3000'
$env:EVAL_RUN_LABEL='team-acceptance-unique-label'
npm run eval:independent
npm run eval:report -- reports/independent/team-acceptance-unique-label.json
npm run test:browser
```

The HTTP evaluator refuses mock acceptance mode, respects request pacing, preserves complete request contexts and actual responses, and never awards factual correctness from an HTTP success code. Reports include all questions, actual answer text, citations, configuration, timing and review status. Add a separate reviewer JSON to `eval:report` as its second argument to attach claim-level assessments. Unanswered evidence gaps and necessary clarifications remain separate from verified substantive answers. Do not overwrite a previous run to hide failures.

Set `CHATBOT_BUILD_REVISION` to the tested build's immutable identity when it is not supplied by `VERCEL_GIT_COMMIT_SHA`. The runner compares endpoint build/content/provider identity and readiness at both boundaries, as well as a local application/configuration hash. These checks establish what was tested; a local Git HEAD alone does not identify a remote deployment. `EVAL_CASE_IDS` is diagnostic-only when fewer than 100 cases are selected and cannot split conversation groups.

Reviewer files use `{ "schemaVersion": 1, "runSha256": "SHA256 of exact run JSON bytes", "reviews": { "Q001": { "status": "verified", "note": "Specific claim and scope checks", "evidence": ["official source URL"] } } }`. Missing reviews stay pending. Altered responses invalidate that review binding. The renderer rejects successful assessments for execution failures, mock responses or unresolved run-integrity failures; it never silently turns a missing review into a pass.

The repository's `.gitattributes` disables Git text conversion for report JSON and the independent question fixture, preserving their exact bytes across Windows and Unix checkouts. Do not reformat those immutable evidence files after review.

The browser suite uses isolated mocked responses to test interaction mechanics; it is not an answer-quality evaluation. The older `eval:common` and `eval:alignment` suites are deterministic route regressions, not substitutes for independent real-provider review.

See [the acceptance evidence index](reports/independent/README.md) for unchanged baseline and repaired-run answers, [implementation notes](IMPLEMENTATION_AND_VALIDATION_NOTES.md) for failures and release limitations, and [team testing instructions](TEAM_TESTING.md) for independent retesting.

`npm run test:offline` runs the prototype, pipeline, semantic, canonical-rendering, grounding, security, source-response, deadline, report-integrity and legacy route suites. Pipeline checks include degree-application/category follow-ups and academic-calendar versus other-service variants. These checks do not call a real provider and are not factual acceptance. `test:canonical` verifies immutable localized output and rejects invalid selections without calling a factual writer. `test:grounding` includes source-token checks and deliberately malformed/negative verifier responses; a model's false positive is still possible. `eval:sources` checks redirects, PDF signatures and soft-404 pages, not the truth or current applicability of a claim. Browser tests require a running local server; a real answer-quality run requires the separately configured provider and independent review.

## Local Setup

```bash
npm install
npm run dev
npm test
npm run eval:common
npm run lint
npm run build
```

Open http://localhost:3000 for the chat. The aggregate analytics page at http://localhost:3000/admin/analytics is locked unless `ADMIN_ANALYTICS_TOKEN` is configured and supplied as the `x-admin-token` request header.

## Security And Privacy

- Store real keys only in `.env.local` or deployment secrets.
- `.env.local` is ignored by git.
- Guest and account conversation history use browser storage by default.
- The UI stores at most 80 messages in that browser, warns against pasting sensitive records, and provides a Clear Conversation control. If server history is explicitly enabled, the same control deletes it.
- Auth and chat API routes validate JSON content type, limit request size, apply basic rate limits, and reject cross-origin browser posts.
- Sessions and device-local account fallback use purpose-bound AES-256-GCM sealed, HTTP-only, same-site cookies with strict payload validation; a dedicated `AUTH_COOKIE_SECRET` is mandatory. Deploying this version intentionally invalidates older local auth cookies, so existing local users must sign in again.
- Cross-provider AI fallback is off by default so a failed provider does not silently forward chat context to another vendor.
- Security headers are configured in `next.config.ts`, including CSP, clickjacking protection, `nosniff`, referrer policy, and permissions policy.
- Analytics stores aggregate fields only: source, topic, locale, guide ID, escalation reason, and timestamp.
- The analytics dashboard is locked by `ADMIN_ANALYTICS_TOKEN`; leave it unset to keep the page closed.
- Prototype auth is not a replacement for UAEU SSO.
- Production should use UAEU identity, managed infrastructure, server-side abuse controls, and a formal privacy policy.

## Content Quality And Evaluation

- Every deterministic answer has a stable ID, response disposition, direct official citation, and verification date.
- `data/evals/common-questions.json` pins exactly 100 representative questions, including Arabic and multi-turn follow-ups.
- `npm run eval:common` calls the real chat route with the mock model and validates routing, answer IDs, citations, required facts, language, and safe dispositions.
- `npm run eval:alignment` adds independent paraphrase, typo, Arabic, ambiguity, safety, and context-isolation cases; generic fallback copy fails this gate.
- Knowledge Markdown is excluded unless its front matter says `status: approved` and contains a direct official UAEU URL plus an ISO verification date.
- Generated embeddings are accepted only when their schema, model, dimensions, and source fingerprint match the current approved corpus.

## Current Limitations

- The 100 canonical questions are a regression baseline, not proof that every possible student question is covered. The independent alignment suite exercises paraphrases and adversarial wording; unsupported or ambiguous requests receive a focused clarification instead of a guessed answer.
- The analytics page is a token-locked prototype dashboard, not a production admin system.
- The public Vercel demo uses encrypted device-local cookies for prototype account continuity and temporary serverless SQLite only as a best-effort store. Use UAEU SSO plus PostgreSQL, Azure SQL, Supabase, Neon, or UAEU-managed storage before relying on persistent production accounts across devices.
- Current rate limiting is in-memory per server instance. Use a shared store such as Redis or a managed edge rate limiter before high-traffic production use.
- Source content still needs an institutional owner and a scheduled review workflow before production use.

## Future UAEU Integration

- UAEU SSO and role-aware permissions.
- Approved page crawler restricted to UAEU domains.
- Scheduled source freshness checks.
- Official ticket or live-chat handoff.
- PostgreSQL, Azure SQL, or UAEU-managed database storage.
- Content-owner workflow for approving FAQ and service-guide updates.
