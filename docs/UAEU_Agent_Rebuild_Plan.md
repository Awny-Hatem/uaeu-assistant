# UAEU Student Agent: rebuild plan

## Product goal

Build a UAEU-specific student assistant that answers from approved university evidence, understands corrections and multi-turn context, explains decisions and next actions, and uses tools only where UAEU has authorized a reliable source or workflow. It should be measurably safer and more useful than a general chatbot for UAEU tasks. No system can guarantee a correct response to every possible question; the release standard must include correct clarification and abstention when evidence is insufficient.

## Operating principles

1. **University facts come from university evidence.** The language model interprets the request and explains applicable evidence; it is not the source of policy.
2. **An event has one explicit identity.** “Admission application deadline,” “scholarship deadline,” “course add/drop deadline,” and “tuition payment deadline” are different fact types even when their dates coincide.
3. **Context is structured and correctable.** Store the current target, requested fact, program/course, cohort, applicant category, term/year, unresolved fields, and provenance. Mark mentioned entities separately from the target. “Sorry, I meant Computer Engineering” replaces the active program slot.
4. **Retrieval filters before ranking.** Apply hard constraints for domain, population, program, cohort, effective date, source authority and freshness before semantic/lexical ranking. Never let a score override a scope conflict.
5. **Answer the requested decision.** Extract only the relevant policy clauses, explain what they mean for the student's stated situation, list assumptions and next actions, and cite the exact supporting source beside each material claim.
6. **Ask one useful question when a required slot is missing.** Do not fill missing facts from a nearby category. If official sources conflict or are stale, say so and route to the responsible office.
7. **Tools have bounded authority.** Public browsing can read public UAEU pages. Authenticated portal functions require UAEU-approved integration, least-privilege scopes, user consent, action preview, confirmation for changes, and a receipt/status check. The agent must never request passwords or MFA codes in chat.
8. **Planning is conditional until private records are verified.** A degree plan can use a validated curriculum graph and student-provided completion data. It must show prerequisites, term offerings and assumptions; a graduation claim requires an authorized degree audit.

## Target architecture

### A. Domain knowledge and provenance layer

Create a canonical knowledge schema with: stable fact ID; owner office; process/domain and event type; applicant/student population; program and cohort/catalog year; term/intake; jurisdiction/campus; effective-from/to; last verified; authoritative source URL and exact passage/page; language; exceptions; content approver; review due date; and superseded-by link. Distinguish policy, procedure, live date, service catalogue, curriculum, portal instructions and advisory explanation. Ingest public pages/PDFs through a repeatable pipeline with extraction checks and human approval before promotion.

### B. Conversation frame

Parse each turn into typed fields: user goal, primary target, fact requested, entities merely mentioned, student/applicant category, program/course, catalog year/cohort, term/intake/year, personal-data dependency, and confidence/ambiguity. Keep turns and state provenance. Corrections replace a field; short follow-ups inherit only fields that remain applicable. If two deadline domains are present without a clear comparison request, clarify.

### C. Retrieval and evidence assembly

1. Resolve the target domain and requested fact.
2. Apply hard filters to evidence metadata (domain/event type, audience, program/cohort, term/year, effective date, source authority/freshness).
3. Rank only the surviving evidence using hybrid lexical and semantic search.
4. Detect conflicts, missing slots, stale sources, and unsupported requested details.
5. Return a typed evidence packet with source spans and scope metadata, not a plain text blob.

### D. Decision and answer layer

Use deterministic code for catalog lookup, course prerequisites, credit totals, policy thresholds, date comparisons and schedule constraints wherever the inputs are structured. Use a model for interpretation, synthesis and conversational wording constrained to the evidence packet. Validate each factual claim against its cited source span and scope. Do not allow an unsupported claim to survive because a citation URL exists. The response contract is: answer; applicability/assumptions; action or next step; source(s); and a clear clarification/handoff when needed.

### E. University tools

Start with read-only public web search limited to official UAEU domains and official linked systems. Add portal navigation guides with page-level links and screenshots only after owners confirm them. For authenticated read operations, integrate approved SSO/API rather than automating user passwords. For submissions, withdrawals, payment, course registration, or record changes, require user review and explicit confirmation, then verify the portal receipt. Maintain a tool registry with owner, permission, input/output schema, audit event, timeout, failure path and revocation plan.

### F. Degree and graduation planner

Represent each official curriculum by program, catalog year and cohort. Model courses as nodes with credits, prerequisite/corequisite logic, offered terms, required/elective groups, substitutions, internship constraints, and graduation requirements. Validate the graph against official study plans. Produce scenarios with unmet requirements, earliest feasible sequence, load limits and dependencies. Label seat availability and future offering assumptions; do not claim a personal degree audit without authenticated student data and university approval.

### G. Governance and operational trust

Assign owners in Admissions, Registrar/Registration, Scholarships, each college, Student Services, IT, privacy/security and accessibility. Establish content approval, update SLAs, source expiry, correction reporting, incident response, model/provider changes, audit logs with data minimization, retention policy, access controls, Arabic/English review, uptime monitoring and rollback. UAEU acceptance/accreditation is a university governance decision; passing software tests alone cannot confer it.

## Rebuild phases

### Phase 0 — Baseline and inventory

- Branch from production; preserve current production unchanged.
- Map every active route and data source; label assets as keep/refactor/retire.
- Capture exact baseline questions, routing outputs and evidence IDs where privacy rules allow.
- Reconcile the answer corpus counts and define authoritative owners.

### Phase 1 — Trust-critical core

- Create typed domain/fact schemas and structured conversation state.
- Replace broad deadline any-match with exact event-domain filtering and explicit ambiguity handling.
- Add FAQ score-margin/ambiguity checks and enforce exclusions as hard rules.
- Add deterministic evidence packets and claim-to-source validation.
- Add a trace view in non-production preview: interpreted target, required slots, selected evidence IDs, source freshness, and disposition.

### Phase 2 — UAEU knowledge coverage

- Build a source registry and ingestion/review workflow.
- Inventory all undergraduate/postgraduate programs, degree plans, prerequisites, electives, academic policies, calendars, admissions routes, scholarships, financial aid, fees, student documents, portal procedures and service contacts.
- Track gaps by owning office; do not fabricate coverage from generic web text.
- Add Arabic and English parity and source review dates.

### Phase 3 — Conversation and planning capabilities

- Add corrections, topic shifts, follow-up resolution, comparison requests and targeted clarifying questions.
- Build course/degree planner over validated curriculum data.
- Add guided portal navigation and, only after approval, read-only authenticated integrations.
- Add user-confirmed transactional tools as a separate later release.

### Phase 4 — Evaluation and controlled pilot

- Run focused regression suites and expert-reviewed scenario groups before scaling.
- Pilot with consenting students and staff; collect answer-level ratings and verified failure reports.
- Gate release on domain accuracy, evidence support, clarification/abstention, context correction, Arabic parity, reliability, latency, accessibility and security—not a single aggregate score.
- Publish a clear capability boundary and human support route.

## 5,000–10,000 question evaluation (not runtime memory)

Prepare a generator and evaluation schema only after each domain has an owner-approved gold answer/evidence set. Generate varied phrasings and multi-turn scenarios from a coverage matrix, then deduplicate, manually review, and reserve held-out sets by underlying scenario (not merely wording). Include adversarial near-neighbors such as admissions versus scholarship dates, calendar registration versus application closure, applicant-category changes, cohort changes, corrections, Arabic equivalents, stale-source conflicts, missing facts, portal-only personal status and unsafe transaction requests.

Evaluation questions and reference answers remain in a separate test package. Production retrieval must never search the evaluation prompts or use their answers as a lookup table. Report per-scenario performance: correct target/domain, evidence precision/recall, claim support, correct date and applicability, citation accuracy, useful abstention/clarification, context retention/correction, completeness, Arabic parity and tool safety. Require human review for policy-critical claims. Do not claim that 5,000–10,000 prompts prove performance on every possible question.

The large run is intentionally a later gate: first make the preview available for the user’s manual review. Only after that review should the 5,000–10,000-question campaign be generated and run.

## Reusable assets from this project

Retain the accessible bilingual chat shell, theme implementation (dark-mode control remains hidden as previously requested), request validation/security controls, authentication/history foundation, provider adapters, handoff/privacy handling, official answer records and citations, curriculum files, source ingestion scripts, and useful regression/evaluation utilities. Refactor the route handler and routing/evidence contracts before expanding the answer corpus. Preserve old data in version control while migrating it into the typed schema.

## Preview acceptance checklist

- “Admission deadline” never returns a scholarship, registration, tuition or housing date.
- “Scholarship deadline” never returns admissions or academic-calendar dates.
- “What is the deadline?” asks which process; if a unique active process exists in context, it asks only for missing date scope.
- A correction such as “Sorry, I meant Computer Engineering” replaces the prior degree and returns only Computer Engineering evidence or a clear gap.
- Unsupported intake dates and personal portal facts are not guessed.
- Every factual date/threshold has a current official citation and applicable audience/term.
- Conversation is natural without topic tags; evaluation prompts are never runtime answers.
