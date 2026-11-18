# UAEU Assistant V3 — Standalone Completion Target

**Status:** Working architecture for `feature/uaeu-v3-phase1`  
**Purpose:** Complete and validate a useful student assistant before requesting institutional approval or portal integration.  
**Production:** Out of scope; this branch does not change production.

## Product boundary

The V3 core must run without UAEU SSO, private student APIs, portal sessions, or an online website lookup during a conversation. It uses a locally stored, versioned knowledge base built from public and otherwise approved source snapshots. Public-source ingestion can run separately from the student-facing service. Every stored item keeps its source URL, captured/reviewed time, applicable term/cohort, and trust/freshness state.

Students can provide their major, catalog year, completed/current courses, grades when needed, and planning preferences directly in the session. These are user-provided inputs, never represented as verified university records. The app can compute a conditional audit or plan from them and show exactly which assumptions affect the result. Do not require an account or persist those details by default.

The standalone app can explain university procedures, prepare a checklist or request draft, and link to the relevant official service. It cannot claim to sign in, view a personal record, submit a request, register/drop a course, pay, or complete another portal transaction. Such operations require a later, separately approved integration.

“Answer any question” is not a factual guarantee. The target is broad UAEU student coverage plus ordinary general explanations, with a useful evidence-backed answer when the local record supports it and a precise limitation/next step when it does not. Unknowns, conflicts, stale evidence, discretionary decisions, and missing student inputs must not turn into invented answers.

## Runtime architecture

1. **Conversation understanding:** Resolve the current request and relevant prior turns, preserve named degree/course/term/category, and let explicit corrections replace earlier assumptions. Emit a structured execution plan rather than a canned answer.
2. **Capability router:** Select conversation, general explanation, UAEU factual lookup, academic rule evaluation, scenario comparison, local planning, procedure navigation, or human handoff. Private-record access and writes are unavailable capabilities in standalone mode.
3. **Local knowledge/evidence service:** Retrieve only scope-compatible, versioned source records from the local snapshot. Reject cross-topic matches (for example, scholarship deadlines for academic-calendar questions). Optional web discovery may propose records for ingestion; it is not required to answer.
4. **Deterministic academic services:** Use structured programs, cohort curricula, requirement groups, course identities/credits, prerequisite expressions, and policy applicability. Unknown or malformed rules stay unresolved.
5. **Planning service:** Produce one or more conditional schedules from explicit student-provided inputs, sourced course constraints, credit limits, and availability evidence. Unknown future offerings and unsupplied constraints remain visible assumptions.
6. **Verification and answer composition:** Check the requested facts, rule result, scope, source support, effective dates, conflicts, and claim/citation mapping before rendering. Return a clear resolution state and next step.
7. **Procedure navigator:** Give ordered official steps, service links, required documents, and an optional user-reviewed draft. Keep the final transaction in UAEU's own portal.
8. **Evaluation/operations:** Record privacy-safe outcome, failure category, evidence versions, latency, and reproducible test case IDs. No student personal inputs in operational logs.

## Six standalone phases and exit criteria

These phases track implementation completion. Close each phase against its specific capability and data conditions; use focused regression checks during implementation. Do not repeat the full question benchmark after every phase. Run the comprehensive acceptance benchmark once, after Phases 0–5 are implemented, against the final pinned candidate. Keep the initial supported curriculum scope to UAEU's published undergraduate programs; do not imply graduate degree-audit coverage until it has its own complete inventory. “Any question” is not a factual guarantee: the product must answer supported questions with evidence and give a useful, honest boundary for unsupported ones.

### Phase 0 — Reproducible baseline

- Pin the candidate branch revision, source/config identity, and fixed 100-case student-question fixture.
- Separate code correctness, route success, factual correctness, and safe abstention in reports.
- Preserve production as read-only throughout branch work.
- **Close when:** the candidate and fixed test set are reproducible, the report distinguishes code/HTTP success from factual correctness and safe abstention, and no production change was made. If the deployed production identity cannot be verified, report that gap; it does not block a standalone V3 baseline.

### Phase 1 — Trusted standalone information assistant

- The runtime answers from the local evidence store without depending on an LLM or live website for basic service/catalog facts.
- Time-sensitive facts carry a validity date or an explicit unknown/stale state.
- Exact-topic evidence filters, citation checks, conflict detection, and fail-safe responses pass English/Arabic regressions.
- Natural-language answers are tested against reviewed facts; mock route success is never reported as factual accuracy.
- **Implementation close when:** evidence-first routing, scope checks, citations, conflict states, and useful unresolved responses work without answer-time website access. The final comprehensive run must later label every captured case; route tests and HTTP success alone are not accuracy evidence.

### Phase 2 — Governed academic knowledge

- Inventory the 55 published undergraduate programs in the declared catalog snapshot; structure every available official curriculum version and its stated applicability evidence.
- Inventory the official catalog course records, source text, credits, prerequisites, corequisites, alternatives, and rule parser outcomes.
- Track coverage gaps by program/cohort/course. Do not silently use the newest plan for an older student.
- Resolve ambiguous source rules only with authoritative evidence; explicitly list unresolved cases.
- **Close when:** all 55 current undergraduate catalog degrees map to source-backed curriculum records; every available version has its published cohort label; source-conflicted versions and unknown applicability are explicitly listed; and every imported catalog course/prerequisite row is either parsed or listed as unresolved. A closed inventory does not claim every historical assigned plan is known.

### Phase 3 — Self-reported student context and deterministic audit

- No SSO or private student API required. Accept an ephemeral, user-entered profile and course history.
- Distinguish each user assertion from official evidence; show the input values used in calculations and allow corrections.
- Calculate only against a cohort-matched curriculum and supported requirements. Return conditional/unavailable status for missing cohort mappings, grades, transfer credit, exceptions, or unsupported rules.
- Keep profile data in memory/session state only unless the user explicitly opts into a locally controlled saved plan; provide clear delete/reset behavior.
- **Close when:** students can enter and edit program/version, cohort, course history, grades, repeats, transfers, and planning constraints; calculations show those reported inputs; unknown cohort or unsupported requirement returns conditional/unavailable; reset clears all entries; and none are persisted by default.

### Phase 4 — Standalone degree and course planning

- Select requirement groups/electives from cohort-matched plans where cohort applicability is sourced. Where a published version has structured requirements but no source-backed cohort mapping, let the student explicitly select that version and label the result as conditional; never infer the student's assigned plan. Keep non-current continuing-student programs separate from the current program-finder catalog.
- Build prerequisite-aware schedules and offer alternatives for different loads/preferences.
- Support all covered programs, explicit completed/current courses, repeats where sourced, term loads, internship constraints, and student constraints.
- Mark confirmed offerings separately from assumed future offerings. Without a governed live section feed, label schedules as planning scenarios and check timetable/capacity externally.
- Compare alternatives with clear tradeoffs and list blockers and assumptions.
- **Close when:** every fresh structured curriculum version is selectable by cohort or explicit version; the planner respects modeled course rules, load limits, repeats, and internship constraints; unknown offerings and personal applicability are labeled as assumptions; and unstructured/stale/conflicted records are withheld or conditional. The result is a planning scenario and preliminary requirements comparison, not a Degree Works audit or graduation approval.

### Phase 5 — Portal navigation and request preparation

- Model high-volume student procedures as structured, source-backed workflows (entry conditions, steps, documents, deadlines, destination, and escalation contact).
- Generate a user-reviewed request draft/checklist and link directly to the official portal page.
- Do not automate login or submission, store portal credentials, or claim transaction completion. A manual handoff to the university portal is the standalone completion boundary.
- Validate each supported workflow with happy path, missing-input, changed-policy, and incorrect-intent tests.
- **Close when:** each of the 16 in-scope workflows has an official destination, sourced steps, required inputs/documents/deadlines or an explicit “not published” state, a handoff, and bilingual normal/missing-detail/stale/wrong-intent handling. Authentication and submission remain in UAEU services.

## Evidence and quality gates

- After the six implementation phases, build the requested 5,000–10,000-case **scale evaluation set**, not a memorized question-answer router. Cases should vary wording, context, language, cohort, scenario, and deceptively similar topics. This is an expanded acceptance exercise, not a prerequisite for implementing the six phases.
- Each case has an independently reviewed expected conclusion, allowed conditions, required evidence, forbidden claims, and correct abstention/handoff behavior.
- Report factual correctness, evidence support, scope correctness, context resolution, safe-abstention precision/recall, citation validity, latency, and service availability separately.
- Gate releases on no critical fabricated-policy answer; high factual and citation performance on answerable cases; correct abstention on unsupported/conflicted cases; and no material regression against the prior accepted build.
- Automated LLM graders can triage but do not replace human review of consequential policy, deadline, and academic-rule cases.
- The existing `npm run eval:scale` is only a deterministic mock-route and fixture-coverage check. Its 10,000 rows are not real generated answers and its pass count is not accuracy. Preserve it as a structural diagnostic; do not substitute it for the one final pinned-candidate answer capture and six-criteria review described above.

## Offline knowledge maintenance loop

The live site is contacted only by a maintainer-initiated discovery command, never by a student chat request:

```powershell
npm run research:official -- calendar "UAEU Fall 2026 registration dates"
```

Results are labeled unapproved research leads with retrieval time and unknown freshness. A maintainer must inspect the official page and its scope, update the governed local record by hand, and run the relevant content/catalog checks plus `npm run audit:standalone`. No discovery result is ingested or shown as authoritative automatically. If source discovery fails, the existing local snapshot remains in use; the student-facing assistant reports gaps/staleness rather than calling the website.

## Final institutional integration gate (after standalone acceptance)

Only after the standalone product passes its evidence and usability gates should UAEU decide whether to approve integration. Optional adapters may then add managed SSO, read-only personal records, live course offerings, and eventually explicitly authorized transactions. Each adapter has separate scopes, consent, privacy/retention, audit, confirmation, rollback, incident, and kill-switch requirements. The standalone core remains useful if any integration is unavailable.

## Honest limitations

- Public-source snapshots can become stale; the app must show verification dates and require source refresh/review.
- Student-entered history can be incomplete or incorrect and cannot establish official eligibility, standing, graduation, or approval.
- Without live offerings, registration windows, or timetable data, plans are conditional scenarios, not guaranteed feasible registrations.
- UAEU-only questions with no reliable stored evidence remain unresolved with an official next step. General model knowledge must not be dressed up as UAEU policy.
- “Complete architecture” means every standalone capability above is implemented and validated. Institutional approval and portal execution are a later product phase, not a hidden prerequisite for the standalone demo.
