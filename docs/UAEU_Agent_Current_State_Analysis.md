# UAEU assistant: current-state analysis

**Review basis:** repository at `65cce4e` (production merge base), inspected 5 November 2026. This is a code-path review. There is no request-level production trace attached to the reported wrong answer, so the code explains demonstrated failure mechanisms but cannot identify the exact branch taken for that individual reply.

## Executive finding

The project is a source-grounded student-services chatbot with a collection of deterministic answers, an LLM-assisted record selector, lexical/optional vector retrieval, and a grounded generation path. It is not a complete autonomous university agent: it does not have authoritative live access to every UAEU system, a validated record of every student's degree audit, or permissioned portal transaction tools.

The most important quality defect is that topic detection, record selection, and evidence validation are separate heuristics that can each accept a broad or mixed topic. In particular, deadline checks use “any detected subject matches” logic. If the detected subject set contains both admissions and scholarships, an admissions source can pass even when the actual requested event is a scholarship deadline (and vice versa). The direct FAQ route also chooses the highest-scoring record without requiring a meaningful lead over the runner-up. LLM selection and a second LLM verifier add useful checks, but neither is an independent source of truth.

## Request lifecycle

1. `app/api/chat/route.ts` validates same-origin, rate limit, JSON size, message shape, locale, and optional account ownership/history. It retains a bounded conversation supplied by the browser; server-side chat history is conditional. The model does not inherently remember a conversation beyond the messages sent in that request.
2. It handles prior-question lookup, greetings/acknowledgments, safety, sensitive-record boundaries, human handoff, and course identity conflicts.
3. `resolveConversation` and `buildRoutingQuery` infer whether a follow-up uses context and construct a retrieval query. `lib/query-understanding.ts` extracts subjects, intents, terms, years, degree levels, and course codes using a large set of regular expressions.
4. A direct FAQ match is attempted. `lib/faq.ts` token/phrase scores the user text against records and accepts the best score above a threshold. It does not check the score gap to the second-best record.
5. Where the direct record is not enough, `lib/semantic-routing.ts` asks the configured model to select from approved answer IDs and validates the returned contract and allowed IDs. A canonical record can then be rendered without free-form factual generation.
6. Otherwise, `lib/knowledge-files.ts` retrieves verified-answer records and Markdown sections using lexical matching and optional embedding search. The route may select a canonical answer from recalled records or generate an answer constrained to retrieved evidence.
7. `lib/ai-provider.ts` handles the configured model provider and provider/key retry behavior. Generated claims are checked for evidence IDs, critical tokens, and sometimes by a model-based source-claim verifier. A retry may remove unsupported claims.
8. The response carries source and citation metadata for the UI. `components/UniversityChat.tsx` renders conversation, source links, account/access controls, and accessibility settings.

## Main components and their role

| Area | Files | What is useful | Main limitation |
|---|---|---|---|
| HTTP orchestration and safety | `app/api/chat/route.ts` | Request bounds, abuse controls, safety/privacy branches, handoff, provider failure response, citations | One large handler owns too many decisions; ordering/fallthroughs are difficult to audit independently |
| Conversation interpretation | `lib/query-understanding.ts`, conversation-resolution helpers | Explicit correction and context support; course, term, audience and intent hints | Regex-derived sets do not represent a primary target separately from incidental mentions; language coverage and scope rules are uneven |
| Canonical knowledge | `data/verified-answers/*.json`, `lib/faq.ts` | Reviewed answer records, source metadata, clarify dispositions, reusable canonical answers | Record schema and explicit scope metadata are inconsistent; aliases overlap; top-score selection has no ambiguity margin |
| Retrieval | `lib/knowledge-files.ts`, `knowledge/` | Verified sources, scoped Markdown sections, lexical/vector retrieval | Heuristic filtering and retrieval scores can admit semantically adjacent but wrong-domain evidence |
| Model selection/generation | `lib/semantic-routing.ts`, `lib/ai-provider.ts` | Closed record-ID selection, provider retries, evidence-bound generation | A model can select the wrong allowed record; another model verifier can share the same misunderstanding; citation presence is not claim entailment |
| Curriculum and services | `lib/curriculum*`, `lib/service-guides*`, data records | Existing plans, course identity checks, documented service steps | Coverage varies by program/cohort and freshness; public information cannot establish private student eligibility or portal state |
| Client and account | `components/UniversityChat.tsx`, auth/history routes | Usable bilingual chat, conversation history/account controls, accessibility features | The browser conversation is context passed to the API; it is not a trusted student record or persistent agent memory |
| Evaluation | `tests/`, `scripts/evaluate-*`, `data/*` | Offline regressions and live probe tooling | Earlier mock/cue-based scores are not a human factual-accuracy rate; the test prompt set must not be loaded as runtime knowledge |

The repository contains 137 verified-answer records across the current academic and student-service JSON files (81 academic, 50 student-service and 6 knowledge-gap entries at this snapshot), plus Markdown knowledge documents and separate curriculum material. These counts describe files, not complete coverage of every UAEU rule or portal workflow.

## Why answers can go wrong

### 1. Deadline topics are represented as an unordered set

`understandQuery()` can return multiple subjects. It does not say which process owns the date the student is asking for, nor which terms are merely earlier context or a comparison. `faqScopeAllows()` accepts a deadline record when **any** specific subject found in the query overlaps the record's question topics. `evidenceIsRelevant()` likewise uses an any-overlap rule for deadline domains. These are permissive checks where deadline identity requires an exact event-domain match.

For example, if context yields `{admissions, scholarship}` and the newest turn asks about an admissions date, the admissions answer passes the overlap test. If the retrieval winner is instead the scholarship record, that record can also pass the same broad test. Which wrong record is selected depends on the particular scores, context and model route; the permissive validation makes the error possible rather than proving which route produced a specific screenshot.

### 2. The top FAQ score wins even when it is ambiguous

`matchFaq()` returns the highest score at or above 700. It does not require a minimum score margin or use the entry's `excludePhrases` as a universal hard exclusion. Many questions share words such as “application,” “deadline,” “requirements,” “Fall,” and “status.” A scholarship deadline and admission deadline can therefore be lexically close even though they are different university processes.

### 3. Search relevance is not the same as evidence relevance

Lexical/vector retrieval can find a relevant-looking passage. The current fact check often verifies that words such as “deadline” occur, not that the source establishes the correct deadline event, population, intake, and date. The retrieved item may be adjacent to the question without proving the requested fact.

### 4. Model selection and model verification are probabilistic

The selector is constrained to approved record IDs, which limits invention of new records but cannot ensure it picked the right record. A generated claim can cite an allowed evidence ID while still misreading that evidence. Model-based verification is another probabilistic judgment, not a formal proof. Canonical answer bodies also contain multiple claims; record-level selection does not independently verify every sentence against its own source.

### 5. Context can preserve the wrong premise

The full conversation is sent for follow-up interpretation. This helps with “what about that deadline?” but can also carry an earlier, corrected or incidental domain into a later request. The code has correction handling, but there is no single structured dialogue state with explicit fields for “current target,” “mentioned but not requested,” and “superseded.”

### 6. Evidence coverage and freshness have limits

The answer database is curated but finite. A record can describe a procedure without publishing a current deadline. Some records intentionally ask for category, intake or cohort. Live dates, portal state, section availability, individual degree progress, scholarship eligibility and application status require current authoritative data or authenticated access. A model cannot safely infer those from neighboring pages.

### 7. A high benchmark score was overstated

Previous local evaluations include mock-provider and cue-based checks. These are useful for regressions and routing signals, but they do not prove that a human-reviewed answer is fully correct. A passing “contains a date/source cue” score is not claim-by-claim verification. Read prior percentages as results for those specific automated checks, not as the probability that the agent answers an arbitrary student question correctly.

## Limits of this diagnosis

No production request ID, selected FAQ ID, selector output, evidence IDs, model response, or deployment log was supplied for the reported examples. Production logging is privacy-limited. Therefore the review cannot truthfully claim “the model used route X for that exact screenshot.” It can identify the code paths and validation defects that make the reported failure mode plausible and reproducible. The new branch adds a strict, latest-turn deadline scope guard as a first correction; the broader rebuild plan addresses architecture and evidence contracts.

## Reusable code

Keep and refactor: request/security guards, locale handling, provider adapters and retries, source/citation UI, accessibility and account controls, human handoff, privacy boundaries, reviewed answer records, curriculum assets, course identity checks, public-source ingestion, and existing regression harness pieces. Replace or modularize: the monolithic request handler, broad regex-to-subject-set as the primary router, unambiguous-top-score FAQ selection, permissive any-domain evidence checks, and benchmark scoring that can be mistaken for factual approval.
