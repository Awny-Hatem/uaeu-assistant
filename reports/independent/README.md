# Independent chatbot acceptance evidence

Open the HTML report in a browser to read or print it. Markdown is provided for repository review. JSON contains the full, unchanged HTTP responses, preceding conversation, execution order and endpoint identity.

**Current release status: final sample accepted for team prototype testing.** The [tenth real-provider run](post-repair-round-10.html) contains 95 verified substantive answers, two appropriate clarifications, three explicit information limitations and zero material failures. All 100 requests completed with stable build/content identity. This is not 100% information coverage or a universal accuracy guarantee. [Final engineering checks](release-final-checks-20260929.json) are separate evidence. Provider access was restored after the user added credits; no billing settings were changed. Earlier failures and diagnostics remain unchanged.

## Runs

| Run | Endpoint and purpose | Assessment |
| --- | --- | --- |
| [Baseline](baseline-before-repair.html) | Existing public deployment before repair | Historical actual responses; not retrospectively marked as verified. Endpoint revision was not exposed. |
| [First repaired run](post-repair-round-1.html) | Isolated production build, configured OpenAI gpt-4.1-mini, prototype deployment contract | 37 verified substantive answers; 2 appropriate clarifications; 1 safe information gap; 60 needing correction. Not accepted. |
| [Second repaired run](post-repair-round-2.html) | New isolated production build, same provider/model and unchanged 100-question fixture | 72 verified substantive answers; 2 appropriate clarifications; 2 safe information gaps; 24 needing correction. Not accepted. |
| [Third repaired run](post-repair-round-3.html) | Source-specific evidence and expanded procedure repairs; same provider/model and unchanged fixture | 81 verified substantive answers; 2 appropriate clarifications; 2 safe information gaps; 15 needing correction, including 4 HTTP errors. Not accepted. |
| [Fourth repaired run](post-repair-round-4.html) | Physically isolated source-claim verification and bounded rewrite; same provider/model and unchanged fixture | 75 verified substantive answers; 2 appropriate clarifications; 2 safe information gaps; 21 needing correction. Not accepted. |
| [Fifth repaired run](post-repair-round-5.html) | Canonical-first answer selection; same provider/model and unchanged fixture | 91 verified substantive answers; 2 appropriate clarifications; 2 safe information gaps; 5 needing correction. All requests completed, but not accepted. |
| [Sixth repaired run](post-repair-round-6.html) | Context/scope repairs and bounded full-answer recovery selection; same provider/model and unchanged fixture | 85 verified substantive answers; 2 appropriate clarifications; 3 safe information gaps; 10 needing correction, including 2 HTTP503 provider failures. Not accepted. |
| [Seventh repaired run](post-repair-round-7.html) | Restored provider access, shared scope/retry/citation repairs; same provider/model and unchanged fixture | 94 verified substantive answers; 2 appropriate clarifications; 2 safe information gaps; 2 needing correction. All requests completed, but not accepted. |
| [Interrupted eighth capture](post-repair-round-8-interruption.json) | Stopped after 22 turns when an offline calendar-overlap regression failed | Incomplete diagnostic, not a full acceptance run. Raw responses preserved; no factual pass score assigned. |
| [Ninth repaired run](post-repair-round-9.html) | Narrowed calendar scope, admissions follow-up repair; same real provider/model and unchanged fixture | 94 verified substantive answers; 2 appropriate clarifications; 3 safe information gaps; 1 transfer-credit context defect. All 100 requests completed; not accepted. |
| [Final tenth run](post-repair-round-10.html) | External-credit subject/context repair and full-body recovery; same real provider/model and unchanged fixture | 95 verified substantive answers; 2 appropriate clarifications; 3 safe information gaps; 0 material failures. Accepted for the tested prototype sample, with limitations retained. |

The first repaired run returned HTTP 200 for all 100 questions and had stable build/content identity. Neither of those facts is treated as factual correctness. Its failures include avoidable deflection, lost conversational references, wrong service selection, lost conditions and irrelevant/missing citations, including one critical missed emergency request.

All 100 questions were fixed before the repaired answers were examined. They cover 39 topic/language labels; groups execute in a seeded random order and follow-up turns retain their conversational order. The same questions are used to measure repair regressions. A later successful replay is not a fresh unseen sample or a guarantee about every possible question.

## Review integrity

- Raw run files are never overwritten by the evaluator.
- Assessments are bound to the SHA256 of the exact run JSON bytes.
- Separate reviewers inspect all answers and applicable source passages; no score is inferred from HTTP status, route names or source-link availability.
- A verified answer means its material claims were checked within the stated source scope. Older institutional documents still require an owner to certify supersession/current applicability.
- Clarification and safe limitation are not counted as full information coverage.
- Team browser-mechanics tests use mocked network responses; answer-quality runs do not.

The second run also returned HTTP 200 for every turn with stable build/content identity. The remaining 24 defects include missing procedure details, wrong-source attribution, applicant/context guard errors, irrelevant clarification, and source-limited uncertainty presented as a universal fact. Its raw outputs remain unchanged.

The third run preserved stable build/content identity, but four ordinary questions failed with HTTP 502. Review also found remaining wrong-source attribution, a reversed counseling-confidentiality exception, missing actionable details, and applicant/overload scope errors. Those are defects, not safe information gaps.

The fourth run shows why an additional model verifier is not factual proof. It rejected some answerable requests and still accepted several changed conditions or wrong-source attributions. The fifth run uses approved wording for covered facts and substantially reduces these defects, but five failures remain: medicine-policy inference, certificate equivalency, scholarship/housing relationship, graduation application selection, and an unsupported historical housing-price claim. None of these five completed repaired runs is a release approval.

The isolated larger-model diagnostic is preserved locally but excluded from publication because raw provider errors contain account identifiers. It is not one of the immutable 100-question acceptance runs and is not included in their scores.

Round six demonstrates remaining selection instability: an academic-standing question selected course-repeat rules; normal credit-load and overload-approval questions were not answered; an already supplied applicant category was requested again; a submission-capability question incorrectly became an evidence gap. Two provider429 failures surfaced as HTTP503, and a follow-up after one error lost its known library subject. One remote-access caveat also lacked its supporting policy in the returned citation bundle. The corrected `post-repair-round-6-reviews-v2.json` classifies that citation defect as needing correction; the earlier assessment, all component assessments and original captured response bytes are preserved.
