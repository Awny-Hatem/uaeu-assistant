# UAEU RAG Knowledge-Base Expansion

**6 October retest:** The Markdown records below were retrievable, but the chatbot still chose unrelated canonical FAQ answers for the seven demonstration prompts. See [the current knowledge-gap audit](knowledge-gap-audit-2026-10-06.md) for the verified-answer repair, exact before-and-after responses, official sources, and test results. The earlier A/B expectations below describe the initial Markdown-only attempt.

## What changed

The first attempt added counseling and ordinary library-renewal information, but those facts already existed in the chatbot's verified FAQ answers. This revision replaces that duplicate content with six knowledge gaps that are absent from the old corpus:

| File | New knowledge |
| --- | --- |
| `20-library-companion-people-of-determination.md` | Library Companion notice period, hours, and scope. |
| `21-library-scan-service-copyright-limits.md` | Scan-service one-article/one-chapter and 10% copyright limits. |
| `22-student-id-card-loss-and-replacement.md` | Lost/stolen student-ID reporting office and replacement-fee rule. |
| `23-library-resource-purchase-request.md` | Library/LIWA/Tipasa/Resource-Sharing decision path and textbook exclusion. |
| `24-liwa-tipasa-interlibrary-loan.md` | LIWA Tipasa eligibility, item limit, loan period, renewals, and exclusions. |
| `25-alumni-library-electronic-resources.md` | Alumni electronic-resource access through a university account. |

Each record includes approved status, an official UAEU HTTPS source, a verification date, topic metadata, bounded facts, and Arabic retrieval wording where useful.

## Why this produces a real RAG comparison

The application first tries a verified FAQ answer and a service guide. Only when neither applies does it retrieve approved Markdown evidence and generate a grounded answer. The old chatbot already contained counseling and library-renewal FAQ records, so those prior additions could not affect its answer.

The new records contain details absent from the old Markdown, FAQ, guide, communications, database, and vector sources. In particular, the old repository has no vector index file (`data/embeddings.json`), so its retrieval fallback is lexical matching of approved local evidence.

## Tests completed

```bash
npm run test:pipeline
npm run test:content
```

Both pass. The pipeline test now verifies lexical retrieval for all six new records, a bilingual Library Companion query, and a mock end-to-end chat request that takes the RAG route rather than an FAQ route.

## A/B demonstration prompts

Use fresh chats for both the old deployment and the new version.

1. `At UAEU, how far in advance must I request a Library Companion, and what are its Friday hours?`
2. `What is the UAEU Library’s copyright limit for an online scan request? Include the item rule and percentage limit.`
3. `I lost my UAEU student ID card. Which office must I report it to, and is the replacement free or paid?`
4. `A book is unavailable in UAEU Library but exists as a printed LIWA item. What should I do before submitting a purchase request?`
5. `Through LIWA Tipasa, how many items may a UAEU student borrow, for how long, and how many renewals are allowed?`
6. `Can UAEU alumni use electronic academic library resources with their university account?`
7. `هل يمكنني طلب مرافق في مكتبة جامعة الإمارات لأصحاب الهمم؟ وما مهلة تقديم الطلب وساعات يوم الجمعة؟`

Expected new-only details include **48 hours**, **Friday 9–10 AM**, **one chapter per book per day**, **10%**, **Admission and Registration Deanship**, **Tipasa**, and **two renewals**. The old chatbot should lack verified support for these facts, return incomplete information, or escalate.

## 45-second professor script

“I first audited the chatbot's whole retrieval pipeline instead of only looking at the Markdown folder. I found that the system checks verified FAQ answers before RAG retrieval, which explained why my first counseling and library-renewal additions produced no difference: those answers already existed.

I then found six genuine knowledge gaps using official UAEU sources. I added focused, source-linked records for Library Companion support, scan copyright limits, lost student IDs, resource-purchase requests, LIWA Tipasa borrowing, and alumni electronic resources. The system splits each record into sections, retrieves relevant evidence, checks it against the request, and uses that evidence to ground the answer. I added regression tests for English and Arabic queries and verified that the new questions take the RAG path.”
