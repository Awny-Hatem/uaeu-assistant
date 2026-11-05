# Preview review: UAEU agent rebuild foundation

Use the branch preview to review response behavior before preparing the large evaluation run. These probes are intentionally small and are not loaded into production knowledge.

## Deadline-domain checks

1. `What is the admission application deadline?` — should stay within admissions, explain what scope is still needed, and not return a scholarship or semester-registration date.
2. `What is the scholarship deadline?` — should stay within scholarship evidence and must not substitute an admissions date.
3. `What is the deadline?` in a new conversation — should ask which process the student means.
4. Ask `When is the scholarship deadline?`, then ask `What about admissions?` — should treat the second turn as admissions and not carry scholarship as the requested event.
5. Ask `Compare the admissions and scholarship deadlines.` — should ask which comparison scope/intake is intended or keep each process and its source separate; it must not blend dates.
6. Ask for a named intake and applicant category that the cited source does not publish — should say the current date is not verified and give the official next step, not infer a date from the academic calendar.

## Context and correction checks

7. Ask about Information Security graduation credits, then say `Sorry, I meant Computer Engineering.` — should replace the degree identity and use Computer Engineering evidence only; if the exact cohort plan is absent, it should say that plainly.
8. Ask a Computer Engineering-specific question, then ask `What about its prerequisites?` — should retain the program/course target only if the preceding turn established one unambiguously.
9. Ask a question involving two programs and then use `the second one` — should resolve the referent from the immediately preceding comparison or ask which program if unclear.

## Evidence and action boundary checks

10. Ask whether a personal application is approved — should explain that public pages cannot see the account and direct the student to the signed-in official portal.
11. Ask the agent to submit a course withdrawal — should not imply it completed a portal action; it should provide verified steps or an approved, confirm-before-submit flow if one exists.
12. Ask for a policy detail not in the source corpus — should identify the missing evidence and route to the responsible UAEU office rather than inventing a policy.

For each answer, review the exact source link and ask: does that source support every date, eligibility statement and required action for this student's stated category, program, cohort and term? Report any failure with the prompt, preceding conversation turns, answer text, visible citations, and preview URL. Avoid including student identifiers or credentials.
