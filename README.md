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

- **Ask:** FAQ and RAG-based answers for UAEU student-service questions.
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
  ai-provider.ts            OpenAI primary provider, Gemini fallback, mock tests
  faq.ts                    Keyword FAQ matching
  knowledge-files.ts        Markdown retrieval fallback
  vector-rag.ts             Optional Gemini embedding retrieval
  service-guides.ts         Structured guide loading and matching
  analytics.ts              Privacy-safe aggregate analytics
  access.ts                 Quota and UAEU email classification

data/
  faq.json                  Curated bilingual FAQ answers
  knowledge/*.md            Local RAG source text
  service-guides/*.json     Guided service definitions
  communications.json       Official links surfaced beside answers
```

## Retrieval Flow

1. Match curated FAQ answers first.
2. Match guided service workflows when the question maps to a known service.
3. Retrieve local UAEU knowledge by vector search when embeddings exist, then lexical fallback.
4. Ask the configured AI provider to answer only from retrieved context.
5. Escalate instead of guessing when evidence is missing or the topic is sensitive.

The model does not invent citation names. The backend returns structured citations like:

```json
{
  "content": "...",
  "source": "rag",
  "citations": [{ "title": "...", "url": "...", "lastVerified": "2026-09-15" }]
}
```

## Guided Service Mode

Guides are stored as data, not hard-coded React text. The first implemented guide is:

- To Whom It May Concern Letter / Student Document Request

Each guide includes an official link, last verified date, keywords, and step-by-step instructions. Exact portal labels are marked as requiring verification when authenticated UAEU portal access is needed.

Future UAEU integration could expose stable UI markers such as `data-help-id="document-request"` inside official portals. An embedded assistant could then highlight the relevant page area, but this prototype does not bypass portal security or inspect authenticated pages.

## Environment

Create `.env.local` from `.env.example`:

```bash
OPENAI_API_KEY=your-openai-api-key
# AI_PROVIDER=openai
# OPENAI_CHAT_MODEL=gpt-4.1-mini
# GEMINI_API_KEY=your-gemini-api-key
# GEMINI_EMBEDDING_SEARCH=enabled
# NEXT_PUBLIC_GUEST_QUESTION_LIMIT=10
# NEXT_PUBLIC_STANDARD_ACCOUNT_QUESTION_LIMIT=50
# NEXT_PUBLIC_UAEU_ACCOUNT_QUESTION_LIMIT=200
# CHATBOT_DATA_DIR=./data
# CHATBOT_DB_PATH=./data/chatbot.db
# SERVER_CHAT_HISTORY=enabled
# ADMIN_ANALYTICS_TOKEN=your-long-random-admin-token
# AUTH_COOKIE_SECRET=your-long-random-cookie-signing-secret
```

`OPENAI_API_KEY` is the primary chat provider. Gemini is optional for fallback chat and embedding ingest. Live Gemini embedding search is opt-in through `GEMINI_EMBEDDING_SEARCH=enabled`, which is useful only when the Gemini key has available quota. `AUTH_COOKIE_SECRET` signs device-local auth cookies for deployments that do not have durable database storage. Server-side raw chat history is disabled unless `SERVER_CHAT_HISTORY=enabled`. Local development stores SQLite in `data/chatbot.db`; Vercel uses temporary `/tmp` storage because the bundled project directory is read-only.

## Local Setup

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

Open http://localhost:3000 for the chat. The aggregate analytics page at http://localhost:3000/admin/analytics is locked unless `ADMIN_ANALYTICS_TOKEN` is configured and supplied as the `x-admin-token` request header.

## Security And Privacy

- Store real keys only in `.env.local` or deployment secrets.
- `.env.local` is ignored by git.
- Guest and account conversation history use browser storage by default.
- Auth and chat API routes validate JSON content type, limit request size, apply basic rate limits, and reject cross-origin browser posts.
- Sessions and device-local account fallback use signed, HTTP-only, same-site cookies.
- Security headers are configured in `next.config.ts`, including CSP, clickjacking protection, `nosniff`, referrer policy, and permissions policy.
- Analytics stores aggregate fields only: source, topic, locale, guide ID, escalation reason, and timestamp.
- The analytics dashboard is locked by `ADMIN_ANALYTICS_TOKEN`; leave it unset to keep the page closed.
- Prototype auth is not a replacement for UAEU SSO.
- Production should use UAEU identity, managed infrastructure, server-side abuse controls, and a formal privacy policy.

## Current Limitations

- The public UAEU service page confirms the student document service area, but exact authenticated portal steps still need official verification.
- The local knowledge base is intentionally small and must be expanded with approved UAEU content.
- The analytics page is a token-locked prototype dashboard, not a production admin system.
- The public Vercel demo uses signed device-local cookies for prototype account continuity and temporary serverless SQLite only as a best-effort store. Use PostgreSQL, Azure SQL, Supabase, Neon, or UAEU-managed storage before relying on persistent production accounts across devices.
- Current rate limiting is in-memory per server instance. Use a shared store such as Redis or a managed edge rate limiter before high-traffic production use.

## Future UAEU Integration

- UAEU SSO and role-aware permissions.
- Approved page crawler restricted to UAEU domains.
- Scheduled source freshness checks.
- Official ticket or live-chat handoff.
- PostgreSQL, Azure SQL, or UAEU-managed database storage.
- Content-owner workflow for approving FAQ and service-guide updates.
