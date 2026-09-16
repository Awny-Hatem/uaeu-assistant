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

- **Ask:** Deterministic, source-linked answers for common UAEU questions, with grounded RAG for supported paraphrases.
- **Guide:** Structured guided workflow for student document requests, including To Whom It May Concern letters.
- **Escalate:** Sensitive, low-confidence, or human-requested cases route users to official contact options.
- **Discover:** Relevant official links such as academic calendar, events, and service navigation can appear beside answers.
- **Guest mode:** Visitors can ask 10 questions before sign-in is required.
- **UAEU account boost:** Accounts using `@uaeu.ac.ae` receive the extended local allowance.
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
4. Retrieve only approved UAEU knowledge, using a compatible fingerprinted vector index when available and strict lexical retrieval otherwise.
5. Ask the configured AI provider to answer only from the retrieved excerpts.
6. Escalate instead of guessing when direct evidence is missing.

The model does not invent citation names. The backend returns structured citations like:

```json
{
  "content": "...",
  "source": "rag",
  "citations": [{ "title": "...", "url": "...", "lastVerified": "2026-09-16" }]
}
```

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
# NEXT_PUBLIC_UAEU_ACCOUNT_QUESTION_LIMIT=200
# CHATBOT_DATA_DIR=./data
# CHATBOT_DB_PATH=./data/chatbot.db
# SERVER_CHAT_HISTORY=enabled
# ADMIN_ANALYTICS_TOKEN=your-long-random-admin-token
# AUTH_COOKIE_SECRET=replace-with-a-unique-random-secret
```

Set `AI_PROVIDER=openai` or `AI_PROVIDER=gemini` explicitly in deployment. A missing key for that selected provider is an error; it does not silently switch vendors. Cross-provider fallback is disabled unless `AI_PROVIDER_FALLBACK=enabled`; enabling it means the retained conversation context may be sent to the second configured vendor after the first fails. Provider calls default to a 20-second timeout and can be changed with `AI_PROVIDER_TIMEOUT_MS`.

Live Gemini embedding search is separately opt-in through `GEMINI_EMBEDDING_SEARCH=enabled`. `AUTH_COOKIE_SECRET` is required for account/session features, must be a dedicated random value of at least 32 characters, and seals device-local auth cookies with authenticated encryption. Generate a different secret for every environment (for example, `openssl rand -base64 48`) and never commit it. Server-side raw chat history is disabled unless `SERVER_CHAT_HISTORY=enabled`. Local development stores SQLite in `data/chatbot.db`; Vercel uses temporary `/tmp` storage because the bundled project directory is read-only.

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
