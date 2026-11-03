# UAEU Agent 99% Execution Plan

**Target branch:** `feature/autonomous-agent-foundation`

**Benchmark history:** 3 November 2026, 100 sophisticated cases against production and the branch preview

**Target:** Make the branch a materially better, evidence-grounded UAEU student agent, with a minimum 99% result on the reviewed in-scope benchmark and no shared critical failures.

## 1. Baseline and conclusion

The first 100-case comparison produced:

| Measure | Production | Branch |
|---|---:|---:|
| Average automated score | 91.4 | 91.6 |
| Passes | 90 | 90 |
| Partial results | 7 | 8 |
| Failures | 3 | 2 |
| Case wins | 2 | 1 |
| Ties | 95 | 95 |
| Shared failures | 2 | 2 |

At baseline, the branch was only marginally better. That result did not prove autonomous-agent capability because the branch and production shared almost all answer behavior. The next work must improve the underlying evidence, reasoning, and workflow tools—not only prompts or visual polish.

### Current branch status after Sprint 1

The first execution slice is complete. Two deterministic reviewed records were added for the shared transcript and password/MFA failures, and source-grounding rejection was changed from a generic 502 into a safe structured escalation. The deployed rerun produced:

| Measure | Production | Branch after fixes |
|---|---:|---:|
| Average automated score | 91.1 | **92.8** |
| Passes | 89 | **91** |
| Partial results | 8 | 9 |
| Failures | 3 | **0** |
| Branch wins | — | **4** |
| Ties | — | 96 |
| Shared failures | — | **0** |

The branch is now safer and measurably better, but 92.8 is not close enough to claim 99%. The remaining score is concentrated in partial-quality planning, clarification, policy-scope, and generated-answer variance—not the two former hard failures. The report is stored in `reports/sophisticated/2026-11-03-after-composite-fixes.md`.

### Deployed benchmark after the targeted coverage slice

The next deployed revision (`785bede`) was evaluated against the same 100-case fixture. Production scored **90.9** with 89 passes, 8 partials and 3 failures; the branch scored **94.2** with **96 passes, 4 partials and 0 failures**. The branch won 17 cases, production won 5, 78 tied, and there were no shared failures. This is still an automated triage result rather than a claim of factual 94.2% accuracy; the captured report is `reports/sophisticated/2026-11-03-after-targeted-coverage.md`.

The subsequent planning and workflow coverage revision (`750f091`) scored **95.6** on the same automated fixture: **99 passes, 1 partial and 0 failures** for the branch, versus production at 91.4 with 91 passes, 6 partials and 3 failures. The branch won 21 cases, production won 2, 77 tied, and there were no shared failures. The one remaining partial was the financial-aid draft/privacy-control workflow; it is now covered by a deterministic answer and local regression test, pending the next deployment benchmark.

The two shared failures that drove Sprint 1 were:

1. **S029 — transcript follow-up:** request a transcript, then ask its cost while preserving current-student versus alumni context. Both deployments returned a source-grounding error instead of a useful answer.
2. **S053 — password and MFA recovery:** the student forgot a password and replaced their phone, so MFA cannot complete. Both deployments returned a source-grounding error instead of separating self-service recovery from UITS escalation.

Other observed differences:

- **S019:** production failed with a 502 in the baseline run while the branch produced a partial clarification; repeated runs show provider variance, so this remains a stability case.
- **S013:** course-planning scope remains a partial-quality priority.
- **S083:** Arabic graduation behavior remains a variance and claim-quality priority.

## 2. The path from 92.8% to 99%

Use staged gates instead of trying to jump directly from the current score to 99:

| Milestone | Required result | Main work |
|---|---|---|
| **95%** | 95/100 strict passes, zero branch failures, no critical defects | Remove remaining generic clarifications; stabilize generated-answer variance; add canonical records for the most frequent partial cases |
| **97%** | 97/100 strict passes across repeated runs, zero critical defects | Add claim ledgers, source/scope validation, complete pilot-domain coverage, and deterministic course/program reasoning |
| **99%** | 99/100 reviewed passes across three runs, zero critical defects | Add degree-audit planning, authenticated read-only portal data, action boundaries, and human claim-level approval |

Do not count a case as passing if it succeeds only because it contains expected keywords. A case must satisfy contract, evidence, decision-quality, and safety checks.

## 3. What “99%” must mean

The target is not 99% keyword matching. A case passes only when the answer is useful, correctly scoped, supported by applicable evidence, and safe for the requested action.

### Release thresholds

- At least **99/100 reviewed in-scope cases** pass the strict benchmark.
- **Zero shared failures** on the benchmark.
- **Zero HTTP 5xx responses** for answerable in-scope questions.
- **100%** of high-stakes claims have current applicable evidence or a precise unavailable/handoff response.
- **100%** of personal eligibility, degree-audit, balance, deadline, and submission answers distinguish published rules from student-specific verification.
- **100%** of portal writes require explicit confirmation immediately before execution.
- **100%** of submitted actions have an official receipt or are reported as not submitted.
- **Zero** wrong-student, wrong-course, wrong-program, wrong-catalog-year, privacy, or fabricated-action outcomes.
- At least **98% claim-level factual accuracy** on independent human review.
- At least **95% correct intent, entity, language, and scope resolution** on held-out paraphrases.
- Accessibility gates pass for keyboard, screen reader, zoom/reflow, reduced motion, forced colors, dark mode, and Arabic/RTL.

If the automated score reaches 99 but any critical safety, privacy, authorization, or fabricated-action test fails, the release still fails.

## 4. Workstream A — eliminate the current shared failures first

### A1. Add deterministic service handlers

Create reviewed canonical handlers for:

- transcript, enrollment certificate, document request, document cost, and current-student/alumni distinctions;
- password reset, Password Self-Service, lost/replaced phone, MFA recovery, and UITS escalation;
- service ownership, opening the official destination, required inputs, and expected outcome.

Each handler must return typed evidence, not only prose:

```text
service
audience
knownSteps[]
requiredInputs[]
feesOrUnknown
officialDestination
escalationOffice
sourceIds[]
freshness
answerStatus
```

### A2. Replace grounding rejection with a useful failure contract

The current source-support rejection can become an HTTP 502 with a generic message. Change the contract so that:

- provider outage or transport failure is a genuine 5xx;
- source-support rejection becomes a typed `answerStatus: "needs-review"` or `answerStatus: "unavailable"` response;
- the student still receives verified stored guidance when available;
- the response names the missing or conflicting evidence and the official next step;
- no unsupported claim is shown;
- the event is logged with a safe reason code, not student content.

### A3. Add regression tests before changing prompts

Add tests for:

- transcript followed by “how much does it cost?”;
- transcript followed by an alumni/current-student switch;
- password reset with a working phone;
- password reset after a phone replacement;
- MFA failure with and without a recovery channel;
- service questions that must not inherit a course or admissions context;
- retry after a grounding rejection.

**Gate A:** S029 and S053 pass on production-like local tests, and neither endpoint returns a 5xx for an answerable service request.

## 5. Workstream B — make the benchmark strict enough to trust

The first benchmark is an excellent diagnostic, but its cue-based score can still reward a response that mentions some expected words without proving the requested claims.

### B1. Introduce reviewed claim ledgers

For every case, store:

- atomic claims that must be present;
- claims that must not be present;
- required source IDs and source scope;
- expected disposition;
- expected action boundary;
- acceptable clarification questions;
- severity if wrong;
- a human-reviewed reference answer or answer outline.

### B2. Score at three levels

1. **Contract:** HTTP status, typed response, non-empty content, language, disposition, and citation shape.
2. **Evidence:** every material claim maps to an applicable source with matching audience, term, program, and effective date.
3. **Decision quality:** the answer resolves the student’s scenario, gives the next action, avoids unsupported certainty, and respects privacy/authorization.

### B3. Add deterministic reruns and variance tracking

Run each hard case at least three times against each deployment. Record:

- score distribution;
- provider/model;
- source IDs;
- response mode;
- latency and retries;
- grounding reason codes;
- whether the result changed across runs.

An answer that passes once and fails twice is not a 99% answer.

### B4. Expand the suite

Keep the 100-case set as a smoke benchmark, then add:

- 100 academic identity/prerequisite cases;
- 100 degree-audit and multi-term planning cases;
- 75 admissions, calendar, finance, and financial-aid cases;
- 75 portal and service-navigation cases;
- 50 Arabic/RTL and mixed-language cases;
- 50 privacy, prompt-injection, and authorization cases;
- 50 draft/confirm/cancel/retry/duplicate/receipt cases.

**Gate B:** every score is reproducible, every pass has claim-level evidence, and no critical case passes only because of keyword overlap.

## 6. Workstream C — build the authoritative UAEU knowledge plane

The branch cannot reach reliable broad coverage with 121 verified answers and a small Markdown corpus alone.

### C1. Create a coverage registry

Track every college, department, degree, program, concentration, catalog year, course, prerequisite, corequisite, restriction, repeat rule, service, form, portal workflow, office, contact, fee, deadline, and accessibility service.

Each record must include:

- stable ID and aliases;
- source URL and exact passage/page/section;
- owner and approval status;
- publication, effective, and review dates;
- audience and scope;
- superseded/conflicting records;
- English and Arabic availability;
- freshness and confidence state.

### C2. Normalize academic facts

Do not leave course facts in prose only. Store machine-readable expressions for:

- prerequisite AND/OR logic;
- corequisites;
- minimum grades;
- course restrictions;
- elective pools;
- credit and residency rules;
- transfer equivalency;
- catalog-year differences;
- term availability when officially published.

### C3. Add source conflict and freshness handling

When pages disagree, the agent must show the conflict, use the authority/effective-date policy, and answer only the uncontested portion until the owner resolves it. Stale or superseded sources must not remain silently retrievable.

### C4. Add Arabic parity

Arabic answers must use the same evidence and scope rules as English answers. Do not solve Arabic cases by translating an unsupported English answer. Include RTL rendering and Arabic course/service aliases in retrieval tests.

**Gate C:** every pilot domain has a measured coverage percentage, no unowned critical record, no silently stale policy, and held-out course/program identity tests fail closed on ambiguity.

## 7. Workstream D — deterministic academic planning and graduation

This is the core capability that differentiates the product from a normal ChatGPT account.

### D1. Build the degree-audit model

Inputs:

- authenticated student program and catalog year;
- completed, in-progress, failed, repeated, withdrawn, and transfer courses;
- grades and earned credits;
- concentration/elective choices;
- holds and system-confirmed restrictions;
- target graduation term and load constraints.

Unverified student statements remain assumptions until confirmed by an official record.

### D2. Build a constraint solver

The solver must compute:

- requirements satisfied and remaining;
- prerequisite chains and minimum-grade implications;
- allowed alternatives and elective pools;
- no double counting;
- term sequencing;
- credit/load and probation limits;
- summer and availability assumptions;
- earliest feasible and target-term plans;
- conflicts and infeasible targets.

The model may explain the solver result but may not invent course facts or modify the plan without recomputation.

### D3. Make every plan explainable

Each recommended course must show:

- why it is needed;
- which requirement it satisfies;
- what prerequisites are met or missing;
- the source/catalog year;
- whether availability is verified or assumed;
- alternatives;
- what could invalidate the plan.

The interface must say “conditional plan” until the official degree audit and registration system confirm eligibility.

**Gate D:** independent academic reviewers approve representative plans for each pilot program, including transfer credit, failed prerequisites, catalog changes, probation, summer terms, and target-term infeasibility.

## 8. Workstream E — controlled website and portal agent

### E1. Start read-only

Implement approved tools for:

- finding official pages and current source sections;
- schedule, holds, degree audit, outstanding documents, balance, deadlines, and application status;
- opening the correct public or authenticated portal destination.

Never send passwords, MFA codes, recovery codes, or session tokens to the model.

### E2. Add draft-only workflows

Prioritize transcript/document requests, financial-aid applications, scholarship documents, registration planning, graduation applications, housing, visa, IT, library, wellbeing, appointments, and accessibility services.

Draft mode must validate fields and files, show missing requirements, calculate known fees, and create a reviewable preview without submitting.

### E3. Add confirmed actions last

For every write action:

1. Authenticate and verify authorization.
2. Inspect the current official state.
3. Prepare a structured draft.
4. Show target service, fields, files, fees, deadline, and consequences.
5. Require explicit immediate confirmation.
6. Submit once with an idempotency key.
7. Verify the official result or receipt.
8. Tell the student exactly what happened.

**Gate E:** no unauthorized or unconfirmed write succeeds; duplicate/retry tests are safe; every successful action has a verified receipt; every failed action clearly reports “not submitted.”

## 9. Workstream F — accessibility and trust UX

Keep the existing dark-mode and accessibility work, then complete:

- WCAG 2.2 AA automated checks;
- keyboard-only navigation and visible focus;
- NVDA/VoiceOver testing;
- reduced motion and forced-colors testing;
- 200% zoom and reflow;
- RTL layout and Arabic screen-reader labels;
- live answer status without disruptive focus changes;
- accessible citation/source expansion;
- plain-language “verified / computed / needs confirmation” labels;
- confirmation dialogs that identify the exact action and consequence;
- accessible error recovery for rejected or unavailable answers.

**Gate F:** no critical accessibility defect, and users with disabilities can complete the pilot read-only and draft workflows without assistance.

## 10. Branch implementation sequence

### Sprint 1 — stabilize failures — completed

- Implement the S029/S053 canonical service handlers.
- Change grounding rejection into a useful typed response.
- Add targeted route tests and browser-visible error states.
- Re-run the 100-case smoke suite: branch reached 92.8/100 with zero failures.

### Targeted coverage slice — completed

Before the full evaluation-hardening sprint, the branch received deterministic coverage for the highest-value partial cases identified in the 92.8 run:

- course-planning capability boundaries, national-curriculum equivalency, and unscoped graduation-deadline rumors;
- housing records versus academic transfer credit and lost-student-ID fee uncertainty;
- credential reuse refusal and authenticated personal-hold boundaries;
- direct portal-action review/confirmation boundaries, including requests that attempt to skip review;
- bilingual privacy/action-boundary handling and regression tests for every new route.

The complete offline suite passes after this slice: common questions 100/100, alignment 80/80, and all agent, grounding, security, integrity, content, deadline/retry, and canonical checks pass. The last full 100-case deployed benchmark remains 92.8 until a new deployment is evaluated; no 99% claim is made from local regression results alone.

### Sprint 2 — strengthen evaluation — next

- Add claim ledgers and severity.
- Add three-run variance testing.
- Add human-review fields and a failure dashboard.
- Block merges when critical cases regress.

Immediate partial-case priorities are S013 (course-plan scope), S032 (graduation conditions), S067/S072/S073/S074 (multi-turn/privacy boundaries), and S100 (agent workflow ordering). Each must receive an independently reviewed answer outline before changing routing or prompts.

### Sprint 3 — improve evidence coverage

- Finish the coverage registry for pilot domains.
- Normalize course/program/service entities and aliases.
- Add source freshness, conflict, and Arabic parity checks.
- Replace unsupported generic clarifications with targeted missing-input questions.

### Sprint 4 — implement the first degree planner

- Choose two pilot programs.
- Load complete requirements for one catalog year each.
- Implement prerequisite expression evaluation and requirement accounting.
- Add conditional plan UI, alternatives, and explainability.

### Sprint 5 — add read-only portal tools

- Integrate UAEU identity and consent.
- Add degree audit, schedule, holds, documents, and application-status reads.
- Keep every response explicit about whether data is published, student-provided, or system-confirmed.

### Sprint 6 — draft and action workflows

- Add document and financial-aid drafts.
- Add preview, confirmation, receipt verification, audit events, and safe retry.
- Pilot with synthetic and consenting accounts only.

### Sprint 7 — 99% release review

- Run the expanded benchmark three times per deployment.
- Conduct claim-level human review of every failure and a sample of passes.
- Compare against production and a normal ChatGPT baseline using identical prompts and evidence requirements.
- Release only if all critical gates pass.

## 11. Definition of done

The branch is ready to claim “99%” only when:

- S029 and S053 are fixed and remain fixed across repeated runs; this is now true for the first deployed rerun and must remain a permanent regression gate;
- the branch wins materially against production on the expanded held-out benchmark;
- the score reflects claim-level evidence, not keyword coverage alone;
- all high-stakes answers are sourced or explicitly unavailable with a concrete handoff;
- degree plans are computed by deterministic rules and clearly marked conditional;
- portal actions are permissioned, confirmed, idempotent, receipt-verified, and audited;
- Arabic, dark mode, keyboard, screen reader, zoom, RTL, and reduced-motion behavior pass accessibility review;
- no critical privacy, authorization, wrong-record, stale-source, or fabricated-action defect remains;
- every unsupported domain has an owner, coverage status, and user-facing resolution path.

The practical conclusion is simple: the branch has moved from 91.6 to 92.8 and eliminated its two hard failures. The path from 92.8 to 99 is primarily a data, deterministic-planning, tool-integration, variance-control, and human-review problem. Prompt tuning alone will not produce a trustworthy UAEU agent.

