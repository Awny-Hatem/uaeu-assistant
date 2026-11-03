# UAEU Autonomous Student Agent Transformation Plan

**Audit date:** 3 November 2026
**Repository:** `C:\Users\USER\Documents\UAEU-ChatBot`
**Status:** Architecture and delivery plan. No application code was changed during this audit.

## Executive decision

The repository is a well-engineered, evidence-conscious chatbot prototype. It is not yet an autonomous UAEU student agent.

The correct target is not an unconstrained model that answers every question from its memory. The target is a bounded university agent that can:

1. Understand a student’s question, situation, profile, and conversational history.
2. Search authoritative UAEU knowledge and current official web sources.
3. Perform deterministic academic reasoning over programs, courses, prerequisites, terms, credits, and graduation rules.
4. Navigate approved public and authenticated UAEU portals through permissioned tools.
5. Explain the answer, assumptions, evidence, alternatives, and next action.
6. Take an external action only when the user is authenticated, authorized, and has explicitly confirmed the action where its consequence matters.
7. Refuse unsupported claims while still providing the most useful verified answer and a concrete resolution path.

“Almost any question” must therefore mean broad coverage with evidence-backed answers, useful clarifications, or an actionable handoff—not fabricated certainty. A system that claims to know every UAEU rule without a complete, governed source inventory will fail the university’s test even if its language sounds fluent.

## 1. Audit of the current project

### Current stack and runtime

- Next.js 16 App Router with React 19 and a Node.js chat route.
- `app/api/chat/route.ts` is the main orchestration point.
- `lib/faq.ts` loads verified bilingual answer packs and applies scoped matching.
- `lib/knowledge-files.ts` retrieves approved Markdown excerpts using strict lexical retrieval.
- Optional Gemini embeddings provide vector retrieval when a compatible index exists.
- `lib/curriculum-retrieval.ts` provides extractive answers for a small set of curriculum records.
- `lib/semantic-routing.ts`, `lib/query-understanding.ts`, and `lib/source-evidence.ts` protect course identity, scope, requested facts, and evidence assignment.
- OpenAI and Gemini are supported through `lib/ai-provider.ts`; the model is used for routing and bounded grounded generation, not as the university database.
- The UI is a single chat surface in `components/UniversityChat.tsx`, with citations, communications, and one structured service guide.
- Auth, history, health, and analytics routes exist, but the deployment contract explicitly describes them as prototype infrastructure.

### Current request path

The current chat flow is approximately:

```text
request validation and rate limit
        ↓
language and conversation resolution
        ↓
safety, privacy, human-handoff, and scope guards
        ↓
curriculum extraction or semantic selection
        ↓
verified FAQ / guided service match
        ↓
approved Markdown retrieval, optionally vector-assisted
        ↓
grounded model answer with claim/source checks
        ↓
citations, escalation, analytics, and optional history persistence
```

This is a sensible answer-quality pipeline. It is still fundamentally request/response retrieval. It has no durable agent state, tool registry, planner, authenticated student-record adapter, portal session, action executor, or degree-constraint solver.

### Current content footprint

The repository currently contains:

- 121 verified answer entries across academic and student-service packs, including bilingual text and official citations.
- 30 approved Markdown knowledge records, about 549 lines in total.
- Curriculum records for only a small set of programs and model plans: Computer Science, Information Technology, Information Security, and Mechanical Engineering, plus selected course records.
- One structured guided service: the To Whom It May Concern / student-document request workflow.
- Three contextual communication records.
- A 100-question common regression fixture, a 100-case independent fixture, and an 80-case alignment fixture.

This is valuable seed content, not a complete UAEU knowledge base. It does not represent all colleges, programs, catalogs, course sections, prerequisites, cohorts, policies, services, portal workflows, financial-aid rules, contacts, or authenticated student operations.

### What is already strong

- Official-source allowlisting and citation validation.
- Bilingual answer support and Arabic/English topic alignment.
- Context-aware follow-ups for many course, admission, calendar, and service cases.
- Course-identity conflict detection and scope guards.
- Separation of canonical reviewed answers from generated grounded answers.
- Claim-level evidence IDs and deterministic source-token checks.
- Safe handling for sensitive, private, unsupported, and urgent requests.
- Explicit provider timeout, retry, fallback, and deadline behavior.
- Request size, origin, account-ownership, session, and history-lifecycle checks.
- A regression culture that tests failure modes instead of only testing HTTP success.

### What is not yet present

| Requested capability | Current state | Required transformation |
| --- | --- | --- |
| Answer almost any UAEU question | Curated answers plus a small approved corpus; unsupported topics escalate | Governed university knowledge graph, source registry, web/PDF ingestion, retrieval, conflict resolution, and coverage reporting |
| Navigate UAEU website | Returns official links and service steps | Allowlisted web-navigation tools with page discovery, stable selectors, source snapshots, and portal-specific workflows |
| Navigate authenticated portals | Not possible | UAEU SSO, scoped portal sessions, read-only adapters first, then confirmed write actions |
| Plan a degree | A few extractive study-plan answers | Normalized program/course graph and a deterministic constraint-solving planner |
| Plan courses | No live registration state, section availability, or student completion record | Student-record integration, term/section data, prerequisite/corequisite rules, conflicts, holds, and workload constraints |
| Plan for graduation | Explains published rules but cannot verify a student’s status | Degree-audit engine with explainable remaining requirements and official status checks |
| File documents or financial aid | One guided checklist; no submission | Workflow adapters, document requirements, upload/validation, draft/preview, explicit consent, submission receipts, and audit trail |
| No random or “it depends” answers | Strong prototype guardrails, but evidence coverage is incomplete | A useful-uncertainty response contract: known facts, missing discriminator, concrete next step, and accountable source |
| Student identity and privacy | Prototype encrypted cookies / SQLite or local continuity; self-entered email is not identity | Institutional SSO, RBAC/ABAC, managed storage, consent, retention, audit, and secure portal token handling |

## 2. Product definition: what “autonomous” means here

The agent should operate in five modes. The mode must be visible in telemetry and, where relevant, in the UI.

### 2.1 Explain mode

Answers a public or authenticated question from current approved evidence. Each material claim has a source, effective date, audience, and scope. If the answer depends on a term, program, college, student type, or policy version, those qualifiers are shown.

### 2.2 Decide mode

Combines published rules with the student’s stated facts to evaluate a scenario. It must distinguish verified university facts, facts supplied by the student but not verified, deterministic conclusions from those facts, and items that require a university system or human decision.

The agent may say, for example, “Based on the published prerequisite rule and the courses you told me you completed, CSBP411 is eligible to be considered next term.” It must not say, “You are officially eligible to register,” unless the registration system confirms that status.

### 2.3 Plan mode

Creates and revises a multi-term academic plan. It shows the requirements satisfied, requirements remaining, prerequisite chains, term assumptions, alternatives, expected credits, and risks. The student can change target graduation term, course load, failed courses, transfer credits, preferred campus, or work constraints and see the plan recomputed.

### 2.4 Navigate mode

Finds the correct UAEU page or portal location, explains why it is the right location, and can guide the user through it. For authenticated data, it uses a controlled tool session and never asks the model to handle raw passwords, one-time codes, or session tokens.

### 2.5 Act mode

Prepares or performs a permitted action such as creating a document-request draft, uploading an approved file, submitting an application, or adding a course to a registration cart. The agent must show a final review screen with target service, fields, files, fees, deadlines, and consequences. Explicit confirmation is required immediately before irreversible or consequential submission.

### 2.6 Inclusive interface and accessibility

Accessibility is part of the agent contract, not a cosmetic UI phase. The interface should support keyboard-only users, screen readers, users with low vision, users who are sensitive to motion, Arabic/RTL users, and users who need high-contrast or enlarged text. The first implementation increment includes a persistent light/dark toggle, system-preference detection, visible focus styling, a skip link, semantic conversation landmarks, live status updates, reduced-motion handling, descriptive form relationships, and accessible control names. The production gate should add WCAG 2.2 AA review, automated axe checks, manual NVDA/VoiceOver testing, keyboard traversal, forced-colors testing, zoom/reflow testing, captions/transcripts for any future audio or video, and accessibility review with UAEU users with disabilities.

## 3. Non-negotiable answer contract

Every response must be produced from a typed response contract, not only free-form text. The contract should include:

- `mode`: explain, decide, plan, navigate, act, or handoff;
- `answerStatus`: verified, computed, partially verified, needs-input, unavailable, or blocked;
- `claims[]`: text, claim type, evidence IDs, effective dates, scope, and confidence;
- `assumptions[]`: facts supplied by the student or defaults used by the planner;
- `missingInputs[]`: the smallest set of facts that would materially change the result;
- `actions[]`: next steps with official destinations and expected outcomes;
- `portalState`: not connected, read-only, draft, awaiting confirmation, submitted, or failed;
- `riskFlags[]`: privacy, deadline, eligibility, financial, academic, or irreversible-action risks;
- `handoff`: accountable UAEU office, reason, context-safe summary, and official channel.

When information is missing, the response should follow this format:

1. State what is known and cite it.
2. State the decision that can already be made.
3. Ask one targeted question or request one missing record.
4. Give the exact official next step while waiting.

“It depends” is acceptable only when the dependency is named, material, and paired with the action that resolves it.

## 4. Target architecture

### 4.1 Agent control plane

Add an explicit orchestrator above the current route-level matching logic:

```text
Student message / UI event
        ↓
Identity + consent + conversation state
        ↓
Intent/entity/scope extraction
        ↓
Policy and capability check
        ↓
Task plan: retrieve → compute → navigate → ask/confirm → act
        ↓
Permissioned tool execution with bounded budgets
        ↓
Evidence and state validation
        ↓
Typed answer / plan / action preview / handoff
```

The orchestrator should be a state machine with resumable task IDs, not a single model call that is allowed to choose arbitrary functions. Every tool call needs a schema, authentication requirement, data classification, timeout, retry policy, side-effect level, and audit event.

### 4.2 Tool registry

Create a versioned registry with at least these tool families:

- `searchOfficialKnowledge(query, scope)` — approved indexed content only.
- `openOfficialSource(sourceId)` — retrieves a current source snapshot and section evidence.
- `searchOfficialWebsite(query)` — allowlisted UAEU domains with redirect and identity checks.
- `getAcademicCalendar(year, term)` — authoritative calendar facts.
- `getProgramRequirements(programId, catalogYear)` — normalized requirements.
- `getCourse(courseCode, catalogYear)` — description, credits, prerequisites, corequisites, restrictions, and source.
- `buildDegreePlan(profile, constraints)` — deterministic planner; no model-generated course facts.
- `auditDegreeProgress(studentId, consent)` — authenticated, read-only degree audit.
- `getStudentSchedule(studentId, term, consent)` — authenticated, read-only schedule.
- `getRegistrationOptions(studentId, term, consent)` — authenticated options and system holds.
- `openPortalWorkflow(workflowId, context)` — starts an approved public or authenticated workflow.
- `prepareSubmission(workflowId, payload)` — validates and creates a reviewable draft only.
- `submitConfirmedAction(draftId, confirmation)` — performs a side effect after confirmation.
- `routeToOffice(service, context)` — returns a verified department and escalation package.

Tool output must carry provenance and freshness. A tool that returns a bare string is not sufficient for a high-stakes answer.

### 4.3 Two-loop design

Use separate loops for knowledge and action:

- **Knowledge loop:** discover, retrieve, compare, compute, cite, and answer.
- **Action loop:** authenticate, inspect, draft, preview, confirm, execute, verify receipt, and record outcome.

The knowledge loop must never imply that an action happened. The action loop must never infer success from a model response; it must verify a portal response or official receipt.

## 5. University knowledge foundation

### 5.1 Canonical data model

Move from answer records and Markdown excerpts to a normalized, versioned data model. Keep human-readable source passages, but index structured facts separately.

Core entities:

- `College`, `Department`, `Program`, `Degree`, `Concentration`, `CatalogYear`, `Cohort`.
- `Course`, `CourseOffering`, `Section`, `Term`, `Campus`, `DeliveryMode`.
- `PrerequisiteRule`, `CorequisiteRule`, `RestrictionRule`, `MinimumGradeRule`, `RepeatRule`.
- `RequirementGroup`, `Requirement`, `ElectivePool`, `CreditRule`, `ResidencyRule`, `GraduationRule`.
- `AdmissionCategory`, `CurriculumType`, `Application`, `Deadline`, `Fee`, `Scholarship`, `FinancialAidRule`.
- `Service`, `Workflow`, `Portal`, `RequiredDocument`, `Contact`, `Office`, `Appointment`.
- `Policy`, `Procedure`, `Form`, `Announcement`, `CalendarEvent`, `SourceSnapshot`.

Every fact should have a stable ID and human label, source URL/title/page/section, owner and approval status, publication/effective/review dates, audience and scope, conflict/supersession links, and an exact supporting passage.

### 5.2 Source hierarchy

Define the authority order before importing content:

1. Current UAEU policy/procedure or official system response.
2. Current official college/program catalog or approved handbook.
3. Official service catalog and form instructions.
4. Official calendar, fee schedule, announcement, or department page.
5. UAE government or ministry source for a UAE-wide rule.
6. Approved explanatory content with an identified owner.
7. Student-provided information, which is context and never institutional evidence.

When two sources disagree, the agent must not silently choose the newest-looking page. It should apply the authority and effective-date rules, expose the conflict to the content owner, and answer only the uncontested portion until resolved.

### 5.3 Ingestion and governance pipeline

Build an ingestion service that crawls only approved domains, captures HTML/PDF/table/form snapshots, extracts structured facts with coordinates, checks redirects and duplicates, detects changes, fingerprints all indexed fields, runs schema/contradiction/staleness checks, sends changes to a reviewer queue, and publishes only approved records. Facts should automatically expire according to category risk when their review deadline passes.

Content owners should approve facts by domain: admissions, registration, colleges, graduation, finance, financial aid, housing, visa, library, IT, wellbeing, careers, accessibility, and campus operations.

### 5.4 Coverage matrix

Create a visible coverage matrix with all colleges and departments; undergraduate, graduate, diploma, certificate, and professional programs; every program and catalog year; every course and code variant; prerequisite/corequisite/restriction/repeat rules; every service and portal workflow; public versus authenticated facts; English and Arabic coverage; current and historical terms; owner; review date; and unresolved gaps.

The health endpoint should report coverage and freshness by domain. A green server health check must not imply complete knowledge coverage.

## 6. Degree and graduation planning engine

This is the highest-value difference between a chatbot and a student agent. It must be implemented as a deterministic domain engine, with the model used only to interpret requests and explain results.

### 6.1 Inputs

- UAEU identity and current program from SSO or explicit selection.
- Catalog year and cohort.
- Completed, in-progress, transferred, failed, repeated, and withdrawn courses.
- Earned credits and verified grades.
- Declared concentration/electives.
- Desired graduation term.
- Maximum credits per term, summer availability, preferred days/campus, and accessibility or work constraints.
- Registration holds and system-confirmed eligibility, when available.

Unverified student-provided inputs must be labelled as assumptions until the student record or an approved document confirms them.

### 6.2 Rules engine

Represent each program as a directed requirement graph with typed constraints: mandatory courses and credits; alternatives and elective pools; prerequisite AND/OR expressions; corequisites and minimum grades; repeats and grade replacement; residency/upper-level/college/concentration rules; term availability and sequencing; load and probation restrictions; transfer-credit and equivalency rules; and graduation application, clearance, and final-audit requirements.

Do not encode prerequisites as prose only. Store a machine-readable expression and a source passage. The planner must explain why a course is or is not available.

### 6.3 Planner outputs

For every plan, show term-by-term courses and credits, requirements satisfied and remaining, prerequisite chains, alternatives, earliest and target graduation term, constraints that make the target impossible or risky, assumptions and unverified facts, source/catalog year for every rule, registration actions available next, and a re-plan option when a course is failed, unavailable, or delayed.

The planner must never promise graduation. It can produce a plan and a conditional projection; only the university’s degree-audit process can confirm completion.

### 6.4 Required planner scenarios

Test fresh applicants, current students, major changes, transfer credits, failed/repeated prerequisites, corequisites, minimum grades, summer availability, double-counting prevention, probation/holds, Arabic requests, conflicting catalog years, and “can I graduate next semester?” questions with incomplete or unverified records.

## 7. UAEU website and portal navigation

### 7.1 Integration order

Use this order for each workflow: official API or supported integration; stable deep link with structured help markers; read-only portal adapter; controlled browser automation against an approved portal; human handoff when the workflow is not stable or authorized.

Browser automation is a fallback, not the source of truth. An adapter must identify the page, account, workflow version, and visible result.

### 7.2 Portal safety rules

- Never send passwords, MFA codes, recovery codes, or raw session tokens to the model provider.
- Keep browser credentials and tokens in a secure tool runtime.
- Do not bypass CAPTCHA, MFA, access controls, or university security controls.
- Start with read-only operations: schedule, holds, degree audit, outstanding documents, balances, deadlines, and application status.
- For every write action, display a structured preview and require immediate confirmation.
- Treat payment, course registration, withdrawal, document submission, financial-aid submission, and profile changes as consequential actions.
- Verify the official success state or receipt after an action; never infer completion from a click.
- Make every action idempotent where possible and show the action ID/receipt.
- Log who/what/when/which account/which tool/result, with sensitive values redacted.

### 7.3 Portal workflow catalog

Prioritize student documents, admissions, course search/registration/add-drop/withdrawal, degree audit/graduation, financial aid/scholarships, tuition/payment, housing, visa, library, IT, wellbeing, appointments, and official contact routing. Each workflow needs a named UAEU owner, test account, sandbox or controlled pilot, versioned selector/API contract, and rollback/handoff path.

## 8. Identity, privacy, and operations

Before using real student data, replace the prototype contract with UAEU SSO and role claims; server-side authorization; managed relational storage; shared rate limiting; secrets management; encryption; approved minimization and retention; consent records; access logs; incident response and backups; Arabic and English privacy notices; and a clear distinction between advice, computed planning, university-confirmed status, and completed transaction.

The current local-account/email behavior must remain prototype-only. An email ending in `@uaeu.ac.ae` is not sufficient proof of identity or permission.

## 9. Delivery sequence

### Phase 0 — Acceptance contract and pilot scope

Choose a pilot population, 10–15 must-win tasks, typed response/evidence/tool/consent/audit schemas, and allowed read/draft/submit actions. Identify content, security, and product owners. Exit only when every pilot task has an owner and accountable handoff.

### Phase 1 — Authoritative content plane

Evolve the current answer/Markdown/guides into versioned records or a managed content database. Add source registry, owner, effective dates, review cadence, structured facts, ingestion, content review, and coverage/freshness reporting. Exit only when pilot domains have complete coverage matrices and stale/conflicting records cannot publish silently.

### Phase 2 — Unified retrieval and evidence

Create a shared evidence interface, one entity normalizer for courses/programs/terms/services, temporal and scope constraints, source conflict handling, and claim-specific citations. Exit only when held-out paraphrases work without alias patching and wrong course/program/year/category cases fail closed.

### Phase 3 — Agent orchestrator and read-only tools

Add the task state model, versioned tool registry, bounded budgets, resumable tasks, public source search, and SSO-gated read-only adapters. Split `app/api/chat/route.ts` into policy, orchestration, tools, evidence, and rendering. Exit only when tool calls are schema-validated, permission-checked, time-bounded, and audited.

### Phase 4 — Academic planner

Add normalized program/course/requirement data, prerequisite expressions, degree audit, multi-term planning, plan workspace UI, assumptions, alternatives, and export/share. Exit only when independent academic reviewers approve representative plans for every pilot program and no model-generated course facts enter computation.

### Phase 5 — Portal navigation and drafts

Build workflow adapters with test accounts or sandbox support. Implement read-only schedule/holds/audit/status checks, then reversible document/application drafts, previews, confirmations, receipts, idempotency, and handoff. Exit only when no draft submits without confirmation and every submission result is verified from the official system.

### Phase 6 — Controlled pilot

Use synthetic and consenting accounts, review unsupported questions and action outcomes daily, compare against the current prototype and a general ChatGPT session on held-out tasks, and publish coverage/limitations. Exit only with no critical privacy, authorization, wrong-record, wrong-course, or fabricated-transaction defects.

### Phase 7 — Production expansion

Expand college by college and workflow by workflow. Require source ownership, coverage, integration, test accounts, monitoring, and rollback for each domain.

## 10. Testing and tomorrow’s demonstration

### Current repository verification

The current offline gate was run on 3 November 2026 and passed. It includes prototype, pipeline, semantic, canonical, content, grounding, security, source-response, deadline/retry, integrity, 100 common mock route cases, and 80 alignment mock route cases. This proves the prototype regression contract, not complete university coverage, current portal behavior, or autonomous capability.

### Required agent benchmark

Create a held-out benchmark with at least 100 factual policy questions, 100 course/program questions, 75 degree-planning scenarios, 50 graduation/degree-audit scenarios, 50 portal-navigation tasks, 50 document/financial-aid/housing/visa/IT/library/wellbeing tasks, 50 Arabic/mixed-language cases, 50 multi-turn cases, 50 adversarial cases, and 25 action cases covering draft/confirm/cancel/retry/duplicate/timeout/receipt behavior.

Each case needs independently reviewed expected facts, required evidence, permitted tools, authorization state, action boundary, and severity. HTTP 200, a working URL, or fluent wording is never a pass criterion.

### Pilot release thresholds

- 100% of critical safety, privacy, authorization, and confirmation tests pass.
- 100% of action cases respect permission and confirmation boundaries.
- 100% of high-stakes claims have applicable evidence or are explicitly unavailable.
- At least 98% claim-level factual accuracy on reviewed in-scope cases.
- At least 95% correct intent/entity/scope resolution on held-out paraphrases.
- Zero wrong-course, wrong-student, wrong-program, wrong-year, or fabricated-transaction outcomes.
- 100% of submissions have a verified official receipt or are reported as not submitted.
- Every remaining gap has an owner, resolution path, and user-facing handoff.

### Demonstration sequence

1. Ask a verified service question and open its source.
2. Ask a difficult multi-condition course question with a spaced or hyphenated code.
3. Switch courses and ask a referential follow-up; verify the subject changes correctly.
4. Request a degree plan with completed courses and a target graduation term.
5. Change one constraint and show deterministic recomputation.
6. Ask for a personal eligibility decision; show published guidance versus authenticated verification.
7. Navigate to a portal workflow in read-only mode.
8. Prepare a document/application draft and show the review/confirmation boundary.
9. Attempt an unauthorized/private-record action and show the safe refusal plus useful alternative.
10. Ask an unsupported policy rumor and verify that unrelated citations are not displayed.

Do not present simulated portal actions as completed integrations. Label mock tools, seeded data, and prototype identity clearly on screen.

## 11. Decisions required from UAEU

- Official source owners for academic and student-service domains.
- Permission to crawl, copy, index, and refresh official pages and PDFs.
- Complete program, course, prerequisite, catalog-year, and cohort feeds.
- UAEU SSO protocol, claims, roles, and approved student-record APIs.
- Portal integration method and written authorization for each workflow.
- Which actions are read-only, draft-only, confirmation-required, or prohibited.
- Hosting, data residency, retention, logging, backup, and incident-response requirements.
- Security decision on model-provider data handling and institution-hosted models.
- Human support routing by service, college, campus, language, and urgency.
- Pilot colleges, test accounts, support staff, and acceptance reviewers.

## 12. Definition of done

The system may be described as an autonomous UAEU student agent only when its in-scope domains have coverage/freshness reports; sources are owned, versioned, reviewed, and traceable; current official search and conflict resolution work; planning is deterministic; student facts are separated from university-confirmed facts; approved portal data is readable under verified identity; writes have previews, confirmation, verified results, and audit records; production privacy/security/operations are approved; held-out tests meet the thresholds; and unsupported questions receive a specific resolution path.

Until then, the accurate product description is: **UAEU evidence-backed student-services prototype with guided workflows and safe escalation.**

## Immediate next steps

1. Preserve the current prototype regression suite and record the source/content revision.
2. Select a narrow pilot: two colleges, a defined catalog year, and 10–15 high-value workflows.
3. Obtain UAEU source owners, SSO/API documentation, portal permissions, and test accounts.
4. Build the source and coverage registry before adding prompt aliases or increasing model size.
5. Implement the shared evidence and tool contracts.
6. Implement the deterministic degree planner for the first pilot programs.
7. Add read-only portal tools, then draft-only workflows, then confirmed actions.
8. Run the independent benchmark on the exact deployed build and publish failures, not only aggregate scores.
