# UAEU Assistant knowledge-gap audit — 6 October 2026

## Scope and baseline

The project is a Next.js chatbot. Its approved knowledge lives in `data/verified-answers/*.json`, `data/knowledge/*.md`, and `data/service-guides/*`. The chat route checks canonical verified answers before grounded Markdown retrieval. `scripts/ingest.ts` can build `data/embeddings.json` with a Gemini embedding key; no embedding cache or Gemini key was available, so this audit used the built-in lexical retrieval. The new verified-answer pack loads automatically and needs no indexing step.

The existing repository already contained six untracked Markdown knowledge records (`20`–`25`) and a retrieval test before this audit. They were preserved. I asked the same seven questions against (1) a clean `HEAD` snapshot, (2) the working tree with those Markdown records but without the new verified-answer pack, and (3) the working tree after adding the pack. The first two sets gave materially the same wrong answers. The last set used the application's actual `POST /api/chat` handler with the configured real provider, a fresh single-turn request for each question, and lexical retrieval enabled. All requests returned HTTP 200; the answer text and citation were reviewed against the linked UAEU source. These are direct handler calls, not browser or deployed-site tests.

## Questions that failed before

| Question asked verbatim | Before: actual status | Official UAEU source | After: retested status |
| --- | --- | --- | --- |
| At UAEU, how far in advance must I request a Library Companion, and what are its Friday hours? | Incorrect Main Library opening-hours answer; omitted companion notice and hours. | [Library Club](https://uaeu.ac.ae/en/library/library-club.shtml) | **Pass:** says at least 48 hours in advance and Friday 9:00–10:00 a.m.; cites Library Club. |
| What is the UAEU Library's copyright limit for an online scan request? Include the item rule and percentage limit. | Answered borrowing limits, not scan copyright limits. | [Scan Service Online Form](https://uaeu.ac.ae/en/library/scanservice.shtml) | **Pass:** one article per issue or one chapter per book per day, within 10% of printed work; cites scan form. |
| I lost my UAEU student ID card. Which office must I report it to, and is the replacement free or paid? | Answered degree-certificate replacement instead of student ID. | [Undergraduate Admissions Procedures, §6(c)](https://uaeu.ac.ae/en/about/policies/pdf/admission/2_undergraduate_admissions-en.pdf) | **Pass:** report promptly to Admission and Registration Deanship; replacement has a fee of unspecified amount; cites policy. |
| A book is unavailable in UAEU Library but exists as a printed LIWA item. What should I do before submitting a purchase request? | Answered ordinary borrowing limits and missed the LIWA route. | [Resource Purchase Request](https://uaeu.ac.ae/en/library/forms/requesttitle.shtml) | **Pass:** check LIWA and request the printed item through Tipasa before a purchase request; cites purchase page. |
| Through LIWA Tipasa, how many items may a UAEU student borrow, for how long, and how many renewals are allowed? | Escalated with an irrelevant request to name the service. | [Library FAQ, Tipasa section](https://uaeu.ac.ae/en/library/faqs.shtml) | **Pass:** 10 items per visit, one month, two renewals; cites Tipasa FAQ. |
| Can UAEU alumni use electronic academic library resources with their university account? | Gave generic off-campus login instructions without establishing alumni eligibility. | [Main Library, alumni resources](https://uaeu.ac.ae/en/library/) | **Pass:** confirms alumni access with a university account and avoids claiming every database is included; cites library page. |
| هل يمكنني طلب مرافق في مكتبة جامعة الإمارات لأصحاب الهمم؟ وما مهلة تقديم الطلب وساعات يوم الجمعة؟ | Discussed general disability support and Main Library hours; did not answer companion request. | [Arabic Library Club](https://uaeu.ac.ae/ar/library/library-club.shtml), [English Library Club](https://uaeu.ac.ae/en/library/library-club.shtml) | **Pass:** Arabic answer gives companion service, 48-hour notice, Friday 9:00–10:00 a.m.; cites Library Club. |

The response source after repair is `faq` for all seven; the matching answer ID is the intended new record. The review checked the requested facts and citation URL, not just HTTP status.

## Changes

| Repository path | Action |
| --- | --- |
| `data/verified-answers/knowledge-gaps.json` | Added six bilingual, source-linked canonical answers so the chatbot can select the facts already present in the Markdown records. |
| `tests/pipeline-regressions.ts` | Extended the existing uncommitted retrieval checks with seven end-to-end route assertions; enabled trusted synthetic forwarded addresses in this test to keep the expanded run within per-client rate limits. |
| `reports/knowledge-gap-audit-2026-10-06.md` | Added this source and test change log. |
| `reports/rag-knowledge-base-handoff.md` | Added a pointer to this retest, because its earlier claim that Markdown retrieval alone closed these gaps was not borne out by live answers. |

The pre-existing untracked `data/knowledge/20-library-companion-people-of-determination.md`, `21-library-scan-service-copyright-limits.md`, `22-student-id-card-loss-and-replacement.md`, `23-library-resource-purchase-request.md`, `24-liwa-tipasa-interlibrary-loan.md`, and `25-alumni-library-electronic-resources.md` were not created or edited in this audit. Three other pre-existing untracked records (`15`–`17`) were also left intact.

## Commands and validation

- `git archive HEAD | tar -x -C <temporary baseline directory>`: made an isolated clean baseline; linked existing dependencies and copied the local provider configuration into the private temporary directory.
- `node --env-file=.env.local node_modules/tsx/dist/cli.mjs /Users/aliabdullah/Documents/Codex/2026-10-06/referenced-chatgpt-conversation-this-is-an/work/knowledge-gap-audit.ts /Users/aliabdullah/Documents/Codex/2026-10-06/referenced-chatgpt-conversation-this-is-an/work/<phase>-results.json`: asked the seven questions against the baseline (`baseline`), pre-fix working tree (`current`), and after-fix working tree (`after`). The script called the actual chat route and saved raw response payloads in this task's `work/` directory.
- `npm run test:pipeline`: passed after the new assertions (32 route calls plus scope checks). One intermediate run hit HTTP 429 because seven added route checks crossed the local 30-request limit; the test now uses distinct synthetic addresses.
- `npm run test:content`: passed.
- `npm run eval:common`: 100/100 mock route regressions passed, covering academics, admissions, registration, programs, calendar/deadlines, services, housing, transport, IT, library, scholarships, facilities, contacts, and related topics. This is routing coverage, not a new factual review of all 100 answers.
- `npm run eval:alignment`: 80/80 mock alignment cases passed across 31 categories.
- `npx tsc --noEmit`: passed.
- `npm run dev -- --port 3100` and `npm run build`: attempted, but this environment hit file-watch and local-process port restrictions. The actual chat handler was tested directly instead.
- `npm run ingest`: not run; no Gemini embedding key was configured, and the active retrieval path uses lexical evidence. The new verified-answer pack requires no reindex.

## Remaining limits

The 100 broad questions were re-run in mock mode; only the seven listed gaps received current, real-provider direct-handler before-and-after tests and manual source review. The live deployment was not tested. UAEU's student-ID procedure is dated 2018 with a next-review date of 2021; an institutional owner should confirm whether it remains governing and the current replacement fee amount. The prior project review also identifies unverified Spring 2028 start date, parking-warning suspension threshold, and current MD-specific numeric graduation GPA in `reports/independent/open-information-gaps.md`; this audit did not invent answers for them.
