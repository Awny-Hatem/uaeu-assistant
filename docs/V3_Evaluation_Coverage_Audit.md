# V3 evaluation coverage and limits

**Current status (2026-11-18):** The current-candidate `final-v3c` actual-provider capture and six-criteria automated review are complete and integrity-validated; see [`V3_Release_Readiness_20261117.md`](V3_Release_Readiness_20261117.md). The capture's review is triage, not an accuracy percentage, independent human certification, or institutional approval. This document preserves earlier evaluation notes; entries explicitly labeled as earlier runs or snapshots are historical.

## What the corpus covers

The 10,000 rows are evaluation-only synthetic cases. The corpus deliberately mixes Arabic and English (4,000 each) with 500 probes each in Hindi, Urdu, French, and Spanish. The app currently implements English and Arabic response paths; the other language groups are support probes and must not be counted as successful multilingual service without language-specific answer verification.

The checked-in corpus represents these source inventories:

- **2,796/2,796** course-catalog records, with the corrected generator assigning every course at least one case across English and Arabic.
- **99/99** published curriculum versions in the regenerated evaluation corpus, including the newly cataloged Visual Studies 2022–2023 model. The corpus has 10,000 cases and remains an evaluation set, not captured agent answers or an accuracy score.
- **57/57** program records represented by those curriculum versions.
- **16/16** structured service-guide workflows.
- **33** named question domains, including admissions, registration, academic deadlines, fees, scholarships, financial aid, documents, graduation, campus services, safety, accessibility, international students, and alumni.

The current synthetic counts are heavily source-fact oriented: 6,400 course-catalog cases and 2,000 curriculum cases. Many remaining domains reuse a small number of existing common/alignment fixtures; some have only one unique seed. Reworded or context-framed copies are correlated probes, not independent questions. The counts for admissions (172), registration (112), financial aid (14), and accessibility (14) are too small to support claims of thorough coverage. Therefore ?10,000? does not establish comprehensive scenario coverage.

Knowledge inventory must also be distinguished from personalized planning coverage. The current 2026-11-18 local audit inventories 55 undergraduate-catalog programs, 99 curriculum versions, 2,796 courses, and 1,491 course records with prerequisite/corequisite text. It reports 95 versions with structured requirement groups, four without, 10 prerequisite records unresolved by the parser, and 71 curriculum applicability mappings explicitly unresolved. This supersedes older counts in the historical sections below. It does not establish the assigned plan for every student or every degree; the two legacy continuing-student curricula are tracked separately from the current program-finder catalog. These are stated boundaries, not completed personalized coverage.

## What each evaluation step proves

1. **Corpus validation** checks unique interaction IDs, source-snapshot agreement, language/domain counts, and representation of every course, curriculum version, and service guide.
2. **Mock route evaluation** saves the complete question/conversation, answer text, expected facts, citations, route state, and mechanical errors. It checks that the route reached the expected source and included required facts/evidence. It does not test real-provider generation, certify policy accuracy, or judge usefulness.
3. **Six-criterion answer review** uses `data/evals/answer-review-rubric.json`: factual accuracy/evidence, relevance/context, completeness/specificity, actionability, clarity/simplicity, and safe scope/uncertainty. The review template and validator bind each assessment to the exact run hash and require all six scores, written rationales, and evidence. A schema check is not an answer review; ratings must be clearly labeled human review or automated triage.
4. **Correction loop** groups failures by route/domain/language/error, fixes the underlying source or routing behavior, adds regression tests, and captures a new immutable run. Old results remain as diagnostics and are not reused as proof after code changes.

The searchable local HTML report is generated from one exact run: `npm run eval:scale:report -- reports/coverage/<run>.jsonl [reviews.json]`. It presents the saved question and answer with citations, expected facts, automated errors, and any attached rubric scores. “Tied to the same run” means the review file's SHA-256 must match the exact JSONL bytes; it prevents reviews from silently being attached to a changed response set.

In addition to the scale corpus, a focused pass captured 259 English and Arabic prompts from the curated verified-answer entries, saving every answer. It checks route/citation contracts, not generated-answer factuality. This closes a specific fixture-selection gap; it does not cover every real-world phrasing or every conceivable scenario.

The latest valid 100-answer actual-provider run is `reports/independent/20261115-v3-post-housing-boundary-openai-100.json`, with a hash-bound six-criterion assessment and searchable HTML archive. Original scores are automated triage; live source audits corrected Q032, Q092, and Q093 and are recorded separately per answer. This 100-answer sample does not substitute for a reviewed 10,000-answer provider evaluation.

## Release and acceptance boundary

“Every possible question” cannot be exhaustively proven by a finite corpus. Product coverage must be stated as measured inventories and tested scenario families, with a safe path for missing or conflicting evidence. A passing route run is not an accuracy percentage. Consequential academic and policy claims require source-level review, and automated judges are triage only. Enterprise/security/privacy acceptance and adoption can only be granted by UAEU's authorized reviewers; this repository cannot certify it.

No production deployment is authorized by these evaluation results. Release requires a named candidate snapshot, passing functional checks, no unresolved critical defects, reviewed factual outcomes, privacy/security review, and a separate deployment decision.

## 2026-11-15 captured-answer review

The actual-provider run `reports/independent/20261115-v3-post-fixes-openai-ready-100.json` captured 100/100 HTTP 200 responses from the local V3 branch using OpenAI `gpt-4.1-mini`; its health check was ready. Its exact six-criteria machine-triage review is hash-bound to that file and rendered as a searchable HTML archive. The pre-fix run flagged the Fall 2026 undergraduate admission-deadline reply because it asked only for applicant category, without giving the supported general rule, source, or explaining why calendar registration dates are not admission deadlines.

The route now falls back to the reviewed `admissions-application-deadline` answer when that scope is missing. It states that the public application service does not publish a verified intake-specific cutoff, distinguishes academic-calendar registration dates from admission application deadlines, and links the official application service. English and Arabic regression assertions pass. The corrected-answer capture is `reports/independent/20261115-v3-after-admission-deadline-fix-openai-100.json`; its current review is preliminary automated triage, not an independent factual sign-off.

A route diagnostic then showed that generated prompts prefixed with "I need the current published UAEU answer, with its scope made clear" were failing to match otherwise relevant reviewed admission answers. FAQ normalization now removes that non-substantive wrapper before matching. The focused mock-route capture `reports/coverage/v3-scale-route-eval-2026-11-15-admission-prefix-fix-v2-targeted.json` passed all 12 selected admission/registration probes. This verifies route selection and expected text/citations for those cases only; it does not establish generated-answer accuracy or general coverage.

Mixed-script Arabic curriculum probes also exposed two generic routing defects: auto-detection could switch to English when an Arabic question included a long English degree title, and the Arabic phrase for credit distributions did not enter the structured curriculum assessment. Detection now follows the question's opening script, and those Arabic credit-intent phrases enter the same structured assessment. Three targeted Arabic curriculum probes passed in `reports/coverage/v3-scale-route-eval-2026-11-15-arabic-curriculum-intent-fix-targeted.json`.

Integrity limits: the corrected capture reports a local source change during the run and the local health endpoint's build revision is `unknown`. Treat it as a diagnostic capture, not a release-gate result. The 10,000-row route run recorded its candidate identity before the admission-answer correction; it is useful as a broad pre-fix route probe, not evidence for the final wording. Neither run is an answer-accuracy percentage, a universal-coverage proof, nor UAEU enterprise approval.

The later pinned capture `reports/independent/20261115-v3-final-pinned-openai-100.json` is internally consistent for the candidate it captured: 100/100 HTTP 200 responses, OpenAI `gpt-4.1-mini`, stable reported endpoint identity, no run-integrity issues, and no source changes during the capture. Its local health report still says `productionReady: false` because managed university identity and shared server-side quotas/rate limits are absent. The six-criterion review is bound to this exact capture, but only 41/100 cases were machine-triaged; the remaining 59 are pending after OpenAI returned an authentication error. It has no complete score and is not an accuracy certification. The subsequent FAQ-wrapper and Arabic-routing fixes changed the source, so this pinned capture is now a historical baseline; a new provider capture is required before describing those fixes as provider-tested.
