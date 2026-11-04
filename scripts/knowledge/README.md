# Refreshing public UAEU knowledge

Work on a local branch. These scripts never push or deploy. Read `coverage_map.md` and the latest report before interpreting a coverage count as completeness.

## Crawl

Python 3.11+ with `pip install -r scripts/knowledge/requirements.txt` is required. The Codex bundled Python already supplies lxml and pypdf in this workspace.

```sh
python3 scripts/knowledge/test_crawl.py
python3 scripts/knowledge/crawl.py --cache .uaeu-crawl --seed-map reports/qa-audit-2026-11-03/uaeu_source_map.md
```

The crawler reads the official sitemap and follows public official links, including the legacy catalog and PDFs. It reads each host's robots.txt, honors wildcard disallow/allow and crawl delay, and waits at least one second between requests to a host. A 404 robots file means no supplied rules; network/server failures fail closed. Redirects must remain on permitted official UAEU hosts. It rejects webtest/CMS, authenticated/private routes, tracking queries, static assets, duplicate flipbook viewers and repeated-language-path crawl traps. News/events/employment are link-only. It neither signs in nor accesses student records. Do not run two crawlers against the same cache.

The SQLite queue and original response bytes are local, ignored artifacts. All discovered pending/failed/blocked/link-only sources remain visible. The default crawl has no page-count completion shortcut. `--max-pages N` intentionally limits one run; the remaining frontier is still missing, not complete. Rerunning resumes. `--export-only` writes a manifest without fetching. An explicit fresh crawl into another cache re-verifies dates; the scripts never pretend an old cached download was fetched today. Dates in this initial dataset are pinned to the actual research session, 2026-11-04; change the session date when doing a future fresh crawl.

If extraction changes, stop the crawler, run `python3 scripts/knowledge/reextract.py .uaeu-crawl`, then resume. Never run ingestion against a changing index to manufacture a frozen evaluation.

## Ingest and index

```sh
python3 scripts/knowledge/ingest.py --cache .uaeu-crawl
npx tsx scripts/knowledge/index.ts
```

Ingestion preserves the existing approved front-matter format under `data/knowledge/crawled/`, one source per document, with language, verification, program, qualification, college, catalog-year, audience, temporal status, source checksum and section headings. HTML table rows retain cells/headings. PDF text retains page numbers and a layout-review caution; extraction is not proof of an arrow's meaning or a cross-column prerequisite. Scanned/empty/error sources are excluded and reported. Exact extracted duplicates share a canonical source; already curated source URLs retain their existing reviewed summaries rather than being blindly duplicated. Historical/undated content does not establish current eligibility or availability. Minors/microcredentials are separate qualification types, not full degrees.

`data/corpus/aliases.json` contains observed names, program-name reductions and language equivalents connected to the same official topic. No unofficial translation is presented as an official Arabic page. Each fact stays tied to its own exact source/section/page. `coverage_map.md` and the JSON coverage report enumerate missing fields and sources; an HTTP 200 or fetched page alone is not a guarantee of full topic coverage.

The index uses SQLite FTS5 BM25 and `text-embedding-3-small` embeddings with 512 dimensions, reciprocal rank fusion, hard course/qualification/year filters, facet scoring and a source diversity quota. Reranking is deterministic, not a separately trained neural model. Document embeddings are cached by content hash/model/dimensions. The OpenAI key comes only from the local environment and is never written to the corpus. `--no-embeddings` deliberately creates a lexical-only index for offline development and is not full hybrid readiness. Generated SQLite indexes and chunk JSONL are ignored. See the index regeneration command in the final report if rebuilding from only committed Markdown.

The existing reviewed academic planner remains the precise first retrieval path where it already has scoped evidence. The expanded hybrid corpus fills its gaps and general-topic retrieval. Retrieved material and prepared answers are evidence for tailored generation; they do not bypass source attribution or claim checks. Embedding outages retain lexical retrieval, never manufacture a fact. Provider outages remain service failures, not a declaration of missing university knowledge.

Set `ANSWER_USAGE_DIAGNOSTICS=enabled` in a local test process to return per-answer successful-call token usage and an estimated USD cost. Pricing sources and verification date are included. This is not a billing statement; failed transport calls and provider adjustments are unknown. Unknown model prices return `null`.

## Validate

```sh
npx tsc --noEmit
npm run test:offline
npm run build -- --webpack
npm run eval:qa-audit -- --base http://127.0.0.1:3000 --label local-review
```

Live evaluations use the real configured provider. Offline mock tests are routing/contract tests, not factual accuracy evidence. Review complete conversations against specific official sources, especially Arabic, PDF tables, cohort conflicts and multi-source comparisons, before marking fixes verified. Keep separate before/after artifacts, source/index/code fingerprints, timings, actual token usage and unresolved cases.
