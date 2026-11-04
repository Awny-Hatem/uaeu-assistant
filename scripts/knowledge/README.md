# Refreshing public UAEU knowledge

Work on a local branch. These scripts never push or deploy. Read `coverage_map.md` and the latest report before interpreting a coverage count as completeness.

## Crawl

Python 3.11+ with `pip install -r scripts/knowledge/requirements.txt` is required. The Codex bundled Python already supplies lxml and pypdf in this workspace.

```sh
python3 scripts/knowledge/test_crawl.py
python3 scripts/knowledge/crawl.py --cache .uaeu-crawl --seed-map reports/qa-audit-2026-11-03/uaeu_source_map.md
```

The crawler reads the official sitemap and follows public official links, including the legacy catalog and PDFs. It reads each host's robots.txt, honors wildcard disallow/allow and crawl delay, and waits at least one second between requests to a host, with three workers by default. Optional `--workers 6` processes slow PDF responses concurrently without increasing that per-host start rate. A 404 robots file means no supplied rules; network/server failures fail closed. Redirects must remain on permitted official UAEU hosts. It rejects webtest/CMS, authenticated/private routes, tracking queries, static assets, duplicate flipbook viewers and repeated-language-path crawl traps. News/events/employment are link-only. It neither signs in nor accesses student records. Do not run two crawlers against the same cache.

The SQLite queue and original response bytes are local, ignored artifacts. All discovered pending/failed/blocked/link-only sources remain visible. Individual theses, news, jobs and newsletters are reference links, not current institutional requirements. Duplicate flipbook page viewers and split-page downloads are excluded; complete catalog PDFs remain eligible. The default crawl has no page-count completion shortcut. `--max-pages N` intentionally limits one run; the remaining frontier is still missing, not complete. Rerunning resumes. Create a file named `STOP` inside the cache to stop after outstanding downloads are saved, and remove it before resuming. `--export-only` writes a manifest without fetching. An explicit fresh crawl into another cache re-verifies dates; the scripts never pretend an old cached download was fetched today. Fresh-download dates use Asia/Dubai calendar time. Cached sources retain their own earlier verification date; a future run does not silently freshen them.

If extraction changes, stop the crawler, run `python3 scripts/knowledge/reextract.py .uaeu-crawl`, then resume. Never run ingestion against a changing index to manufacture a frozen evaluation.

`--retry-transient` explicitly requeues one attempt for previously timed-out,429 or5xx public sources, preserving the previous failure metadata. It does not automatically loop and does not requeue permanent404errors. Source responses that look like not-found pages despite HTTP200are logged as soft404, not accepted as knowledge.

## Ingest and index

```sh
python3 scripts/knowledge/ingest.py --cache .uaeu-crawl
npx tsx scripts/knowledge/index.ts
python3 scripts/knowledge/coverage-summary.py --cache .uaeu-crawl
python3 scripts/knowledge/readable-index.py
python3 scripts/knowledge/source-map.py --cache .uaeu-crawl
```

Ingestion preserves the existing approved front-matter format under `data/knowledge/crawled/`, one source per document, with language, verification, program, qualification, college, catalog-year, audience, temporal status, source checksum and section headings. HTML table rows retain cells/headings. Recognized model-plan grids are split by cohort, entry term, semester and unambiguous course row; clipped/slash-code cells are flagged rather than guessed. Other PDF text retains page numbers and a layout-review caution; extraction is not proof of an arrow's meaning or a cross-column prerequisite. Scanned/empty/error sources are excluded and reported. Exact extracted duplicates share a canonical source; already curated source URLs retain their existing reviewed summaries rather than being blindly duplicated. Historical/undated content does not establish current eligibility or availability. Minors/microcredentials are separate qualification types, not full degrees.

`data/corpus/aliases.json` contains observed names, program-name reductions and language equivalents connected to the same official topic. No unofficial translation is presented as an official Arabic page. Each fact stays tied to its own exact source/section/page. `coverage_map.md` and the JSON coverage report enumerate missing fields and sources; an HTTP 200 or fetched page alone is not a guarantee of full topic coverage.

The index uses SQLite FTS5 BM25 and `text-embedding-3-small` embeddings with 512 dimensions, reciprocal rank fusion, hard course/qualification/year filters, facet scoring and a source diversity quota. Language is a preference so verified English evidence can answer an Arabic question. Reranking is deterministic, not a separately trained neural model. Document embeddings are cached by the complete exact embedding input, model and dimensions; metadata changes invalidate affected entries. Batches contain at most 64 sections, with bounded retries and resumable successful batches. The OpenAI key comes only from the local environment and is never written to the corpus. `--no-embeddings` deliberately creates a lexical-only index for offline development and is not full hybrid readiness. Generated SQLite indexes and chunk JSONL are ignored. `npx tsx scripts/knowledge/index.ts` rebuilds JSONL from committed approved Markdown before indexing, so cloning the repository does not require re-downloading old sources.

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

```sh
node evals/run-knowledge-expansion.mjs --base http://127.0.0.1:3000 --label expansion-review --concurrency 3
```

The default is sequential. Optional concurrency is capped at three, with a shared minimum 2.3-second interval between request starts. Compare latency only under equivalent load; keep serial benchmarks separate from throughput batches. Each scenario includes alternate phrasings and saves all actual responses. `--variants main` selects only primary scenarios; `--ids KE001,KE002` selects cases; `--resume` requires the identical fixture checksum. Never edit code, approved data or the live index during a frozen evaluation. `--serving-snapshot` fingerprints the actual immutable baseline checkout. Identical-content source equivalences are audited separately; similar topics or different course IDs are not interchangeable sources. Source fixtures corrected after a run must be rerun with a new label, preserving invalid original attempts.

For causal checks, start an otherwise identical local process with `CORPUS_SEARCH=disabled` and retest identical questions. This ablates the added index, not the legacy reviewed knowledge. Keep the ablation results separate from final results. Token diagnostics are cost estimates, and missing diagnostics are unknown rather than zero.

For a complete data-only ablation, run the exact same compiled code against a copied earlier approved data snapshot (reviewed answers, guides, aliases, root Markdown and corpus SQLite together). Disabling only the corpus does not remove newly reviewed facts or guides. Separate code fixes, data fixes and rubric corrections in the report.

The November4 local browser QA build used the existing `NEXT_PUBLIC_GUEST_QUESTION_LIMIT=1000` setting so isolated browser tests can run without repeated site-data resets. This command-specific local test profile does not change the source default of10, authentication or the30-request/minute server limit. Build again without the override for the normal default. Do not carry the QA environment setting into deployment by accident.

`scripts/knowledge/report.mjs --after <actual-run.json> --output <report-prefix>` joins exact question/expected-source pairs to the preserved baselines and writes JSON/HTML test entries. It never fabricates a missing before run. `--allow-partial` is only for clearly labelled intermediate reports. Supply reviewed semantic/source decisions through the report's `reviewed-results.json`; unreviewed regex scores remain provisional. Never present an interrupted candidate run as the completed final evaluation. If the shared Google Doc's character limit is insufficient, preserve prior entries and use the user's selected overflow arrangement rather than silently omitting conversations.
