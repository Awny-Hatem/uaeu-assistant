# Student profiles and assistant quality implementation

Baseline: f6af176. Branch: feat/student-profiles-and-power. Isolated worktree; original checkout remains unchanged. Local only; no push, deployment or PR.

## Requirements and design

The SGP1 report describes FR3 session memory and FR4 JWT authenticated personalization. Existing libSQL accounts, JWT sessions and server-owned memory are retained. New academic records belong to the authenticated account UUID, never a supplied student ID. The supplied screenshots are a schema reference only; no screenshot or real student identity, sponsor, advisor or grade is copied.

1. Audit existing storage, personalization, follow-up and retrieval paths; preserve baseline failures before modifications.
2. Fetch and version official program pages, course records and model plans. Keep raw-source hashes and extraction provenance. Validate individual semester totals, entire plan totals, cohort/entry season, and course identities. Unresolved extractions stay unapproved.
3. Store validated, self-reported academic profiles separately from public university evidence. Expose authenticated own-record APIs; compute credits and prerequisite checks deterministically. A proposed plan is not an official registration or graduation decision.
4. Build a locally gated tester with ten fictional accounts, profile/audit/planner views and guest role selection. Switching uses normal server sessions and clears previous-account context.
5. Add conversation-only handling for introductions, assistant identity and history recall; preserve stated program/cohort, handle explicit overrides and ask only necessary questions.
6. Add the supplied six scenarios and at least 150 new cases; run focused tests before complete examiner, regression and memory suites. Compare at least 50 matched questions against the same base model without retrieval. Retain actual responses, citations, latency, usage and failures.
7. Publish text logs to the existing shared continuation; final summary only after real runs. Never claim a global best RAG system or fabricate passing benchmark results.

## Status

- Audit: in progress.
- Source extraction, profiles, tester, source cleanup and new evaluations: pending.
- Final report and model comparison: not yet run.
