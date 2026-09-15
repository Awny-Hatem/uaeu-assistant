# UAEU Intelligent Student Services Assistant Report

## 1. Executive Summary

This project is a polished student prototype for a UAEU student-services assistant. It supports guest-first chat, FAQ answers, local knowledge retrieval, structured citations, guided service workflows, human escalation, contextual official links, and privacy-safe aggregate analytics.

The system is not an official UAEU deployment. It is designed to show how an official student-services assistant could work after approved UAEU content, identity, hosting, and governance are added.

## 2. Problem Statement

Students often need quick help with university services, documents, dates, and support channels. Information may be spread across websites, portals, departments, and documents. A useful assistant must therefore be convenient, but also careful: it should avoid inventing policies, deadlines, fees, or procedures.

## 3. Student Experience Problem

The assistant should reduce friction for common questions without forcing immediate account creation. First-time users can ask as guests, while account creation remains available for longer usage. UAEU-affiliated email domains receive a larger local allowance.

## 4. Proposed Assistant

The prototype communicates four capabilities:

- **Ask:** answer from FAQ and local verified context.
- **Guide:** walk students through structured service steps.
- **Escalate:** route uncertain or sensitive questions to official support.
- **Discover:** surface relevant official links such as calendar, services, and events.

## 5. System Architecture

The project uses Next.js App Router, React, Tailwind CSS, SQLite, OpenAI, optional Gemini, and local JSON/Markdown content files.

Main modules:

- `components/UniversityChat.tsx`: chat UI, guest mode, quota display, local history.
- `app/api/chat/route.ts`: backend chat orchestration.
- `lib/ai-provider.ts`: OpenAI primary provider, Gemini fallback, mock test provider.
- `lib/faq.ts`: curated FAQ matching.
- `lib/knowledge-files.ts` and `lib/vector-rag.ts`: local retrieval.
- `lib/service-guides.ts`: guided service matching.
- `lib/analytics.ts`: aggregate analytics.

## 6. Verified Knowledge/RAG Architecture

The assistant follows a layered retrieval flow:

1. Guided service match for known workflows.
2. FAQ match for curated answers.
3. Local knowledge retrieval through vector search if embeddings exist.
4. Lexical fallback over Markdown knowledge files.
5. AI answer generation using only retrieved local context.
6. Escalation when evidence is missing or the topic is sensitive.

Citations are returned by the backend as structured metadata. The model is not asked to invent source names.

## 7. Guided Service Mode

Guided Service Mode is implemented through JSON files in `data/service-guides`. The first guide supports To Whom It May Concern / student document request navigation.

The guide includes:

- Official service URL.
- Last verified date.
- Audience and keywords.
- Step-by-step checklist.
- Verification note where authenticated portal labels still need confirmation.

The React UI renders guides through reusable components, so future workflows can be added through data instead of custom components.

## 8. Human Escalation

Escalation now has explicit reasons:

- Low confidence.
- Sensitive policy.
- Requires human authorization.
- Technical support problem.
- Student requests a person.

The UI shows an official UAEU contact link rather than pretending the prototype can create tickets or contact staff automatically.

## 9. Contextual Communications

The project includes a structured communications layer in `data/communications.json`. It can surface relevant official links such as the academic calendar, events, and service navigation. These links are separate from the answer and do not affect the factual content.

## 10. Analytics And Continuous Improvement

The prototype analytics dashboard is available at `/admin/analytics`. It stores aggregate event fields only:

- Answer source.
- Broad topic.
- Locale.
- Guide ID.
- Escalation reason.
- Timestamp.

It does not store raw student questions in the analytics table.

## 11. Bilingual Support

The interface and FAQ layer support English and Arabic. Locale can be selected manually or auto-detected. Arabic/RTL rendering is preserved with `dir="auto"` in message bubbles and an Arabic-capable font in the layout.

## 12. Security And Privacy Considerations

Real API keys belong in `.env.local` or deployment secrets. `.env.example` documents required variables without secrets.

Conversation history is stored locally in the browser by default for both guests and signed-in accounts. Server-side chat history is disabled unless `SERVER_CHAT_HISTORY=enabled` is explicitly set.

Prototype authentication is suitable for demonstration only. A real university deployment should integrate with UAEU SSO and formal data-governance controls.

## 13. Prototype Vs Production Architecture

Current prototype storage uses SQLite and local files. That is acceptable for local development, but not the intended university-scale architecture.

Production should consider:

- UAEU SSO.
- Managed database infrastructure such as PostgreSQL, Azure SQL, or UAEU-managed storage.
- Server-side rate limiting.
- Approved content ingestion.
- Monitoring and incident response.
- A published retention/privacy policy.

## 14. Testing

The automated suite in `tests/prototype-checks.ts` covers:

- Guest limit.
- UAEU email allowance.
- Provider mock mode.
- English FAQ.
- Arabic FAQ.
- Mixed Arabic/English FAQ.
- Guided-service detection.
- Arabic guided-service detection.
- Guided-service step data.
- RAG citation response.
- Sensitive-topic escalation.
- Human handoff.
- Invalid API input.

The suite uses `AI_PROVIDER=mock` so tests do not consume OpenAI or Gemini credits.

The HTTP smoke suite in `tests/http-smoke.mjs` verifies the deployed API path for Arabic guide answers, signup, logout, login, and session restoration.

## 15. Current Limitations

- The local knowledge base still needs approved UAEU source expansion.
- Exact authenticated portal steps for student documents require official verification.
- The analytics dashboard is a prototype, not a secured production admin system.
- The public Vercel demo at `https://uaeu-assistant.vercel.app` is live with the latest routes and UI.
- On Vercel, prototype SQLite storage uses temporary `/tmp` runtime storage. Account creation and sign-in can be tested, but production account persistence needs a managed database.
- Guest quota is enforced in the browser; production needs server-side protection.

## 16. Future UAEU Integration

Future official integration could add stable portal markers such as `data-help-id="document-request"` so an embedded assistant can guide a student inside approved UAEU systems. This prototype does not inspect authenticated UAEU pages or bypass browser security.

Other future integrations include official ticket creation, approved document ingestion, deadline reminders after consent, and content-owner review workflows.

## 17. Conclusion

The project now demonstrates a more realistic student-services assistant: helpful on first visit, safer around university-specific facts, clear about sources, and ready for iterative expansion through verified content and guided workflows.
