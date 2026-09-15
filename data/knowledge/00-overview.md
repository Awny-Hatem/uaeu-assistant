# UAEU Assistant Prototype Knowledge Overview

Source title: Internal prototype knowledge overview
Last reviewed: 2026-09-15

## Purpose

This project is a student-services assistant prototype for UAE University questions. It is designed to combine fast FAQ answers, local document retrieval, guided service checklists, structured citations, and human handoff when the answer cannot be verified.

## Prototype Scope

The assistant can explain high-level source areas, route students toward official UAEU pages, and help students think through the next step. It cannot access student records, submit forms, confirm eligibility, approve requests, or replace official UAEU advising.

## Source Strategy

UAEU-specific answers should come from one of these trusted layers:

- Curated FAQ entries in `data/faq.json`.
- Markdown knowledge files in `data/knowledge`.
- Guided service definitions in `data/service-guides`.
- Official UAEU pages reviewed by the project team.

If none of those layers contains enough evidence, the assistant should say that the answer needs verification and suggest the relevant official page or human advisor.

## Verified Public Source Areas

The official UAEU website contains navigation for services such as academics, student documents, library support, campus life, medical care, counseling and wellbeing, vehicle access, career services, and other student-facing service categories.

The official contact page is the preferred source for current phone, email, office hours, service desk, and live chat information.

The official academic calendar page is the preferred source for current term dates, exam periods, registration windows, holidays, and deadline checks.

## Privacy Model

Guest conversations and signed-in conversation history should stay in the browser by default. The server may store accounts and sessions, but raw student questions should not be written to log files or analytics tables unless a future privacy policy and opt-in workflow explicitly allow it.

Aggregate analytics can track non-identifying counts such as answer source, broad topic, language, and escalation reason.
