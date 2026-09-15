# UAEU ChatBot Improvement Plan

This plan folds in the pasted upgrade brief and separates what is implemented now from what still needs official UAEU data or production infrastructure.

## Implemented In This Upgrade

- OpenAI support added as the primary AI provider, with Gemini kept as optional fallback and embedding support.
- `.env.example` now documents OpenAI, Gemini, quotas, and the server-history opt-in flag.
- Guest mode opens immediately, allows 10 local questions, and shows the login wall only after the allowance is used.
- Anyone can create an account; `@uaeu.ac.ae` and `@uea.ac.ae` accounts receive the extended local allowance.
- Guest and signed-in conversation history now stays in browser storage by default.
- Raw query log files are no longer the default analytics mechanism.
- Chat API returns structured citations instead of asking the model to invent source labels.
- Sensitive or low-confidence UAEU-specific questions escalate instead of silently relying on weak evidence.
- Guided Service Mode is implemented through `data/service-guides/*.json`.
- First guided workflow added: To Whom It May Concern / student document request, including Arabic trigger phrases.
- Contextual University Communications added as a structured official-link layer.
- Prototype analytics dashboard added at `/admin/analytics` using aggregate, non-identifying events.
- README and system report rewritten to avoid unsupported official-product claims.
- Automated tests added for FAQ, Arabic, mixed language, RAG, citations, escalation, invalid input, and guided services.
- Live Vercel deployment verified for health, Arabic guide answer, signup, logout, login, and session restoration.

## Next High-Value Product Improvements

1. **Verified Content Pack**
   - Replace placeholder admissions content with approved UAEU pages or PDFs.
   - Add verified content for registration, fees, housing, visas, library, counseling, career services, and IT support.
   - Add `lastVerified` and source-owner fields to every content item.

2. **More Guided Services**
   - Add transcript request, enrollment certificate, vehicle access permit, academic advising, and library help guides only after the current process is verified.
   - Keep each guide in JSON with official URL, audience, keywords, steps, and verification notes.
   - Add Arabic titles and Arabic steps once UAEU wording is confirmed.

3. **Content Review Workflow**
   - Add thumbs-up/thumbs-down feedback under answers.
   - Create an admin queue for unclear/outdated/wrong responses.
   - Let reviewers promote corrected answers into `faq.json` or knowledge files.

4. **Better Analytics Without PII**
   - Track broad question topics, answer source, unresolved category, language, and guide usage.
   - Add charts for repeated friction areas, such as document requests or admissions confusion.
   - Avoid storing raw questions unless there is explicit consent and a retention policy.

5. **Production Identity And Access**
   - Replace prototype auth with UAEU SSO.
   - Verify university affiliation through official identity, not only email text.
   - Move quotas and rate limits server-side for real abuse protection.

6. **RAG Pipeline**
   - Add an allowlisted crawler for official UAEU domains.
   - Add PDF/document ingestion for approved handbooks and policies.
   - Rebuild embeddings automatically when source content changes.
   - Add evaluations with real student questions and expected citations.

7. **Student Utility Features**
   - Save local bookmarks for useful answers.
   - Add deadline reminders after explicit consent.
   - Add a "who should I contact?" router with verified departments.
   - Add role-specific starters for applicants, current students, parents, alumni, and staff.

8. **Operational Readiness**
   - Replace temporary Vercel SQLite storage with a managed production database.
   - Add health checks for provider configuration, database access, and RAG source freshness.
   - Use PostgreSQL, Azure SQL, or UAEU-managed storage for production.
   - Add monitoring for provider errors and escalation spikes.

## Manual UAEU Information Still Needed

- Official English and Arabic text for admissions requirements.
- Current contact-routing map by department or service.
- Verified process steps for authenticated student document services.
- Current fee, deadline, graduation, visa, and registration policies.
- Permission to use UAEU branding in any public deployment.
- Production decision on identity, retention, hosting, and data governance.

## Learning-Oriented Build Path

- Start by reading `app/api/chat/route.ts` to understand orchestration.
- Read `lib/faq.ts`, then add one small FAQ item and test it.
- Read `data/service-guides/to-whom-it-may-concern.json`, then add a second verified guide.
- Read `components/UniversityChat.tsx`, then change one UI state such as the empty-state suggestions.
- Read `lib/analytics.ts`, then add one new aggregate metric without storing raw text.
- End each change by running `npm test`, `npm run lint`, and `npm run build`.
