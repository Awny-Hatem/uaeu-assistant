# UAEU Chatbot Quality Audit

Verified on 2026-09-16.

## Executive finding

The main failure was the evidence and routing layer, not simply the language model. The application had five broad FAQ entries, one guide, and two Markdown files that contained prototype notes or an explicit admissions placeholder. One-token overlap was enough to retrieve those files, broad substring triggers selected unrelated answers, and follow-up questions were searched without their earlier subject. The model was therefore given irrelevant context or no context and produced plausible but unsupported advice.

## How the application now answers

1. The API validates and sanitizes the recent conversation and resolves Arabic or English.
2. Short or referential follow-ups carry forward the preceding user subject for routing only.
3. Immediate safety language and explicit human-handoff requests are handled before ordinary retrieval.
4. A narrowly matched verified answer or service guide is returned directly with its stored official citations.
5. If no deterministic answer matches, retrieval accepts only Markdown with approved front matter and an official UAEU source URL.
6. A compatible fingerprinted vector index is used when present; otherwise strict lexical retrieval is used.
7. The language model receives real role-separated history plus approved excerpts and must abstain when the excerpts do not directly support the requested fact.
8. Unsupported or sensitive requests escalate to an official channel instead of being guessed.

## Root causes and corrections

| Root cause | Observed effect | Correction |
| --- | --- | --- |
| Empty or placeholder knowledge | Internal prototype text appeared as evidence | Placeholder files removed; approved-source front matter is mandatory |
| One-token lexical threshold | “Data Structures” retrieved files containing the generic word “data” | Multi-token coverage, exact-identifier, or exact-phrase evidence is required |
| Raw substring FAQ and guide triggers | Database, visa-document, scholarship-deadline, and recommendation-letter questions misrouted | Boundary-aware scored matching, exclusions, multi-signal guide matching, and negative regression tests |
| Latest-turn-only retrieval | “What are the prerequisites for this course?” lost Data Structures | Contextual routing query carries the prior subject forward |
| Placeholder mentions passed the sensitive-evidence gate | A topic word was mistaken for proof of a policy | Only approved files are searchable and all requested sensitive terms must be supported |
| Hard-coded or internal citations | Unsupported text appeared verified | Each deterministic answer stores direct official citations; RAG citations come only from approved metadata |
| Stale ignored embedding file | Local and deployed behavior diverged | Index manifest now includes schema, model, generated time, source fingerprint, and vector validation |
| Provider selection was not a fallback | A configured secondary provider was never tried | The selected provider is explicit; cross-provider fallback occurs only when both providers are configured and `AI_PROVIDER_FALLBACK=enabled` |
| Flattened OpenAI transcript | Conversation roles were lost | The Responses API receives structured user/assistant messages and `store: false` |
| Shallow tests | Route labels passed while facts were wrong | A 100-case canonical suite, 80-case independent alignment suite, and 44 focused routing/security checks now run locally |

## Regression set

`data/evals/common-questions.json` contains exactly 100 cases:

- 12 admissions questions
- 14 registration and course questions
- 10 calendar, examination, and academic-policy questions
- 12 document and graduation questions
- 10 tuition, payment, and scholarship questions
- 8 IT questions
- 7 library questions
- 11 housing and campus-life questions
- 7 health, safety, and wellbeing questions
- 5 international-student and visa questions
- 4 careers, alumni, and contact-routing questions

The set includes 20 Arabic questions and four explicit multi-turn cases. Expected routing is 98 verified answers, one guided service, and one requested human handoff.

The deterministic library contains 105 bilingual, cited answers. A wrapper sweep also exercises 303 harmless conversational variants over the 101 standalone routes; four intentionally context-dependent prompts correctly require a preceding subject.

Focused regressions separately reproduce the screenshot's Computer Science second-semester, Data Structures registration, prerequisite follow-up, official-source verification, Database Systems, visa-document, scholarship-deadline, and recommendation-letter failure paths.

## Verification result

Run:

```bash
npm run eval:common
npm run eval:alignment
npm run eval:sources
npm test
npm run lint -- --max-warnings=0
npm run build
```

The common-question evaluator checks the exact answer ID, source, disposition, response language, required facts, and approved HTTPS citations. The independent alignment suite checks paraphrases, ambiguity, Arabic, typo tolerance, safety, and context isolation. The focused suite additionally checks exact CSBP319 facts, emergency guidance, context retention, false-route regressions, stale embedding rejection, request security, encrypted-cookie isolation and expiry, and origin protection. The source gate confirms every unique official citation is reachable.

## Production boundary

This remains an unofficial prototype. The content is now grounded in public official sources, but production use still requires UAEU content-owner approval, scheduled freshness review, institutional SSO, durable storage, shared rate limiting, and an authenticated contact/escalation integration.
