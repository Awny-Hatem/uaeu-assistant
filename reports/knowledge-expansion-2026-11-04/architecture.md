# Answer sources and retrieval architecture

This local branch adds a second, explicitly indexed official-source corpus. It does not give the chatbot live access to UAEU student records or turn its model into a web crawler.

## All factual sources

| Source | Location / activation | Role |
|---|---|---|
| Existing reviewed Markdown | `data/knowledge/*.md`, loaded by `lib/knowledge-files.ts` | Precise academic plans, course rules, policies and prior QA fixes. The existing loader intentionally handles the root reviewed collection. |
| Reviewed answer packs | `data/verified-answers/*.json`, loaded by `lib/faq.ts` | Verified answers and per-source evidence summaries; exact and semantic routing. Prepared factual text now feeds generation rather than bypassing it. |
| Service workflow | `data/service-guides/*.json`, `lib/service-guides.ts` | Source-specific procedure evidence for tailored generation, with an optional structured checklist UI. It cannot submit a personal university transaction. |
| New provenance-linked Markdown | `data/knowledge/crawled/*.md`, approved list in `data/corpus/manifest.json` | Official HTML sections, course entries, policy/PDF page excerpts and recognized cohort model tables. Read through the separate corpus index, not the root Markdown loader. |
| New hybrid index | Local ignored `data/corpus/search.sqlite`, `lib/hybrid-rag.ts` | SQLite FTS5 BM25 + OpenAI512-dimensional dense cosine search, reciprocal rank fusion, hard scope filters, deterministic facet/diversity reranking. |
| Legacy optional vector index | Ignored `data/embeddings.json`, `lib/vector-rag.ts`, `scripts/ingest.ts` | Existing Gemini embedding path; explicitly opt-in. It is distinct from the new SQLite/OpenAI index. |
| Communications / safety routing | `lib/communications.ts`, chat-route guards | Curated support links, capability boundaries, service notices and clarification. These are not live official-record lookups. |
| Conversation context | Current sanitized user turns and browser history | Resolves follow-ups; assistant statements and user premises never become factual evidence. |

`lib/db.ts` stores prototype accounts/analytics and optional chat history. It is not an external university facts database. No hosted vector store or UAEU admissions/registration API was added. The factual answer path does not browse webpages at question time: refreshing sources happens in the offline crawler/ingester. OpenAI or optional Gemini provide generation/selection/verification; OpenAI provides the new dense embeddings.

## Request path

1. `app/api/chat/route.ts` validates the request and applies security, privacy, runtime and instance-rate limits. Browser question allowances are prototype UI limits.
2. Shared normalization resolves course codes, catalogue-backed course names, aliases, degree/year/facet and conversation scope. A new entity resolver recognizes programs/colleges/offices from approved corpus aliases. Ambiguous subjects ask for clarification.
3. Precise existing academic retrieval runs where its identity and scope match. A longer new program name must not inherit a shorter legacy program's evidence. Course/program, qualification, year/cohort and facet matter separately.
4. Common service/policy questions and college-program directories first try scoped reviewed records or a source-backed workflow. The closed-record selector may choose only approved IDs and must pass course, audience, year and requested-policy-facet checks. A GPA mention alone cannot substitute course-repeat rules for academic standing.
5. The expanded hybrid corpus fills uncovered academic and general evidence. English/Arabic is a preference, permitting faithful translation from an official source. Exact course prerequisite rules require that course's own record. Similar program names or other courses are not interchangeable. Current requests prefer the latest printed effective-date version of the same policy; access dates do not establish legal currency. Optional legacy Gemini vector/lexical retrieval remains available under its existing configuration.
6. `lib/source-evidence.ts` maps each excerpt/summary to its own citation and evidence ID. A multi-source bundle without source-specific evidence cannot support a claim.
7. The configured model writes a tailored factual response. `lib/source-evidence.ts` checks critical numbers/codes/contacts; `lib/academic-coverage.ts` checks requested academic conditions. `lib/claim-verifier.ts` verifies each claim against its assigned source, with up to four isolated checks at once and up to two checked rewrites, inside the same 54-second answer budget. Adjacent paragraphs attributed to the exact same individual source are verified together without changing their displayed text; evidence from different sources is never merged to justify a conditional permission.
8. The response includes only sources supporting the accepted claims. Failed support or provider outages remain visible failures, not claims that UAEU lacks the information. The checklist UI, clarification, safety notices and capability boundaries can remain deterministic; factual workflow prose goes through generation and support checks.

Program existence/college questions can project a single undergraduate identity from the verified program-finder XML fields. The title and English/Arabic college names remain attached to that exact XML reference; a combined routing summary or a differently named college on another page cannot overwrite them. Credit-only comparisons prefer source-specific degree breakdowns over unrelated cohort models, and retain published minimum qualifications.

There is no newly added answer cache. The small LRU caches query **embeddings**, so repeated wording can save an embedding request but still uses the factual writer/checker. Provider prompt caching, when reported, is billed separately and does not replay a previous chatbot answer. `lastVerified` records source access, not a policy effective date or assigned student cohort.

## Offline refresh

`crawl.py` → local raw bytes + SQLite discovery/audit queue → `ingest.py` → approved sectioned Markdown + metadata/aliases/course identities/coverage → `index.ts` (rebuilds chunks, reuses exact-input embeddings, atomically replaces SQLite index) → frozen live evaluations. See `scripts/knowledge/README.md` for commands and limitations.

The index is rebuildable from committed Markdown; raw crawl bodies, keys, query caches and machine-specific SQLite files are not committed. PDF table extraction is conservative and carries explicit partial/layout warnings. Fetching a page is not proof that every fact on it has been reliably extracted.
