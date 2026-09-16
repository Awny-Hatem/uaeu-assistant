# Learning Software Through This Project

Use this project as your course. The goal is not to memorize Next.js; the goal is to learn how a real app moves data from a user action, through the backend, into storage, and back into the interface.

## How To Work

- Read one file at a time.
- Change one small thing.
- Run the app and tests.
- Explain the change in your own words.
- Then rewrite the code slightly cleaner.

## Week 1: What The App Is

**Read:** `app/page.tsx`, `app/layout.tsx`, `components/UniversityChat.tsx`

**Learn:**
- `app/page.tsx` is the first screen.
- `app/layout.tsx` wraps every page and sets fonts/metadata.
- `UniversityChat.tsx` is the main browser UI.

**Do:**
1. Run `npm run dev`.
2. Open http://localhost:3000.
3. Find the text shown in the first assistant message.
4. Change one sentence.
5. Refresh the browser and explain why it changed.

**Your explanation prompt:** "The browser shows this message because..."

## Week 2: State And Local Storage

**Read:** the storage helpers in `components/UniversityChat.tsx`

**Learn:**
- React `useState` stores live UI state.
- `localStorage` keeps guest/account history on the device.
- The quota counter is frontend state plus local persistence.

**Do:**
1. Ask one guest question.
2. Refresh the page.
3. Find where the message was saved.
4. Change the guest limit in `.env.local` using `NEXT_PUBLIC_GUEST_QUESTION_LIMIT=5`.
5. Restart the dev server and verify the UI changes.

**Rewrite task:** Rename one helper in your own style, then update every place that calls it.

## Week 3: API Routes

**Read:** `app/api/chat/route.ts`

**Learn:**
- The browser sends messages to `/api/chat`.
- The API validates input.
- It chooses guide, FAQ, RAG, escalation, or provider error.
- It returns JSON to the frontend.

**Do:**
1. Add `console.log("chat route reached")` temporarily.
2. Ask a question.
3. Watch the terminal.
4. Remove the log.
5. Run `npm test`.

**Your explanation prompt:** "A POST request is..."

## Week 4: Data Files

**Read:** `data/verified-answers/academic.json`, `data/verified-answers/student-services.json`, and `data/service-guides/to-whom-it-may-concern.json`

**Learn:**
- Not everything belongs in code.
- FAQ answers and guide steps live in data files so non-UI content is easier to update.
- The UI can render many guides from the same component.

**Do:**
1. Add one safe FAQ for "Where do I find official UAEU sources?"
2. Add keywords.
3. Ask a matching question in the app.
4. Add a test for it in `tests/prototype-checks.ts`.

**Rewrite task:** Make the FAQ answer shorter without changing its meaning.

## Week 5: Retrieval And Trust

**Read:** `lib/faq.ts`, `lib/knowledge-files.ts`, `lib/citations.ts`

**Learn:**
- FAQ matching is keyword scoring.
- RAG retrieval finds relevant knowledge sections.
- Citations come from backend metadata, not model imagination.

**Do:**
1. Ask: "What is the prototype privacy model?"
2. Confirm it returns `source: rag` in the test.
3. Add one source-backed sentence to an approved file in `data/knowledge/`, preserving its official `sourceUrl` and `lastVerified` front matter.
4. Ask a new question that retrieves that sentence.

**Your explanation prompt:** "RAG is useful because..."

## Week 6: AI Provider Boundary

**Read:** `lib/ai-provider.ts`

**Learn:**
- The app should not spread provider-specific code everywhere.
- OpenAI, Gemini, and mock tests share one interface.
- Tests use `AI_PROVIDER=mock` to avoid spending credits.

**Do:**
1. Find `generateAssistantResponse`.
2. Explain what each provider returns.
3. Change the mock response text.
4. Run `npm test` and see which test notices.

**Rewrite task:** Add a comment above the hardest function in your own words.

## Week 7: Database And Privacy

**Read:** `lib/db.ts`, `lib/analytics.ts`

**Learn:**
- SQLite stores prototype accounts, sessions, and aggregate analytics.
- Raw conversations are local by default.
- Aggregate analytics can improve the product without exposing student text.

**Do:**
1. Ask three different questions.
2. Open http://localhost:3000/admin/analytics.
3. Find which topic count changed.
4. Add one new topic in `lib/analytics.ts`.
5. Add or update a test.

**Your explanation prompt:** "This is safer than raw logs because..."

## Week 8: Build A Small Feature

Pick one:

- Add a verified transcript-request guide.
- Add answer feedback buttons.
- Add a bookmark button that saves an answer locally.
- Add an admin chart for guide usage.

**Feature recipe:**
1. Write the user story in one sentence.
2. Identify the files you need.
3. Make the smallest code change.
4. Add one test.
5. Run `npm test`, `npm run lint`, and `npm run build`.
6. Explain what broke and what you fixed.

## The One File To Dig Deep Into

Start with `app/api/chat/route.ts`.

Read it in this order:

1. The request body types.
2. The input validation.
3. The human handoff check.
4. The guided-service check.
5. The FAQ check.
6. The RAG retrieval.
7. The provider call.
8. The response JSON.

Then write a plain-English version:

```text
When a student asks a question, the backend first...
Then it...
If it cannot...
Finally it returns...
```

Bring that explanation back, and we can rewrite one section together.
