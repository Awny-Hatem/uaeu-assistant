# Implementation Report: Functional Requirements 5 And 6

This report describes the current implementation of unknown handling, privacy-safe analytics, and human escalation in the UAEU Assistant Prototype.

## Functional Requirement 5: Unknown Handling And Analytics

**What it is:**
The system should avoid guessing when it lacks verified UAEU evidence, while still giving the project team useful improvement signals.

**Current behavior:**

- The chat API checks guided services, FAQ entries, and local knowledge files before using the AI provider.
- If no verified local context is found, the assistant returns an escalation-style response instead of inventing a university-specific answer.
- Sensitive topics such as fees, visas, graduation, eligibility, scholarships, disciplinary matters, and medical/counseling issues require direct source evidence.
- Raw query log files are no longer used as the default analytics mechanism.
- The dashboard at `/admin/analytics` stores aggregate fields only: answer source, topic, locale, guide ID, escalation reason, and timestamp.

**Why this is safer:**
The platform can still show where students struggle without storing complete private questions in analytics or pretending uncertain answers are official.

## Functional Requirement 6: Human Escalation

**What it is:**
The assistant should route students toward official human support when a case needs staff confirmation or when the student asks for a person.

**Current behavior:**

- The backend detects explicit human-support intent before calling the AI provider.
- The model can still emit `[ESCALATE]` for low-confidence cases; the backend strips that tag before sending content to the UI.
- Escalations include a reason such as `low_confidence`, `sensitive_policy`, or `student_requested_person`.
- The UI shows a clear official UAEU contact-page action.
- The prototype does not claim to create tickets, email staff, or access UAEU internal systems.

**Key files:**

- `app/api/chat/route.ts`
- `lib/analytics.ts`
- `components/UniversityChat.tsx`
- `components/ServiceGuide.tsx`

## Current Limitation

Production deployment should connect escalation to approved UAEU support channels, SSO, ticketing, and a formal retention policy. The prototype currently provides guidance and official contact links only.
