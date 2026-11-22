# UAEU agent pipeline

The [simplified pipeline image](./uaeu-agent-pipeline-simple.png) presents three plain-English stages: ask naturally, find trusted information, and get a clear answer. It highlights bilingual conversation, verified answers and service guides, grounded AI, source links, and clarification or official contact guidance when needed. It retains the platform logo and uses a plain layout. Created with the built-in image generation tool; the [simplified generation prompt](./uaeu-agent-pipeline-simple-prompt.txt) is included. The final image was visually checked for readable wording, correct flow, and the logo.

The [pipeline image](./uaeu-agent-pipeline.png) documents the implemented student-services prototype and includes the platform logo from `public/uaeu-chatbot-logo.png`. The PNG is 1536 × 1024 pixels.

## How a question is handled

1. **Receive the question.** The browser sends messages, the language preference, and optional student profile fields to `POST /api/chat`.
2. **Validate the request.** The server checks origin, rate, JSON size, message roles and length, and sanitizes profile fields. It retains at most 30 messages for routing.
3. **Resolve language and context.** Select English or Arabic, restore the subject of short follow-ups, and select relevant official communication links.
4. **Try direct routes in order.** Acknowledge conversational messages; clarify a missing subject; provide urgent safety guidance; respond to requests for human support; match a verified FAQ; then match a service guide. The first applicable route returns without an AI generation call.
5. **Retrieve evidence for unmatched questions.** Default retrieval ranks approved local Markdown sections by keywords and returns up to five excerpts. Optional Gemini vector retrieval requires explicit enablement and a compatible local index. Failed or empty vector retrieval falls back to keyword retrieval.
6. **Check evidence availability.** No retrieved excerpts, or a sensitive query without matching direct evidence, produces clarification or official contact guidance. This check is not comprehensive factual verification.
7. **Generate an answer.** The configured OpenAI or Gemini provider receives grounding instructions, the chosen language, excerpts, an optional profile marked as untrusted context, and the last 12 conversation messages. The prompt instructs the model to use supplied evidence only.
8. **Finalize and display.** For generated responses, the backend handles the model's escalation marker. It attaches source citations from application metadata and returns one JSON response. The browser displays the response, citations, relevant official links, and any applicable guide. Provider failures return an error response.

## Supporting flows

- **Knowledge:** Curated FAQs, service guides, and local UAEU excerpts supply answers. Markdown excerpts require approved status, an official UAEU source URL, and a verification date. Optional ingestion creates chunks, document embeddings, and a local JSON index whose source fingerprint is checked before use.
- **History:** Browser localStorage is the default. Server chat history is opt-in for signed-in users.
- **Analytics:** The backend records aggregate response categories and metadata rather than raw messages in the analytics table.
- **Support referrals:** The app provides official contact guidance. It does not create tickets or contact UAEU staff automatically.

## Implementation references

- [Chat interface](../../components/UniversityChat.tsx)
- [Chat orchestration](../../app/api/chat/route.ts)
- [Approved knowledge and keyword retrieval](../../lib/knowledge-files.ts)
- [Optional vector retrieval](../../lib/vector-rag.ts)
- [Optional index preparation](../../scripts/ingest.ts)
- [AI provider selection](../../lib/ai-provider.ts)
- [Grounding instructions](../../lib/prompts.ts)
- [Response finalization](../../lib/provider-response.ts)
- [Application citations](../../lib/citations.ts)
- [Analytics](../../lib/analytics.ts)

## Image production

Generated with the built-in image generation tool using the existing platform logo as the reference image. The complete generation prompt is saved in [uaeu-agent-pipeline-prompt.txt](./uaeu-agent-pipeline-prompt.txt), with the targeted correction in [uaeu-agent-pipeline-refinement.txt](./uaeu-agent-pipeline-refinement.txt). The final image was visually checked for readable labels and correct routing, including the unmatched-question connector into retrieval. Architecture checked against the repository on 2026-09-23.
