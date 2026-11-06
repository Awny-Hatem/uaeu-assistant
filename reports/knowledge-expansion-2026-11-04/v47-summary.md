# v47 full run (build knowledge-v47, 6 Nov 2026)

runtimeUnchanged = true for every API run.

| Suite | Correct | Partial | Incorrect | Not run (OpenAI quota exhausted) |
|---|---|---|---|---|
| Examiner 600 (main 100/0/0) | 592 | 7 | 1 | 0 |
| Phrasing pass 399 | 384 | 11 | 4 | 0 |
| Regression 1,782 | 1686 | 21 | 8 | 67 |
| Browser (100 scenarios) | 3 answered | – | – | 97 returned 503 OPENAI_QUOTA_EXHAUSTED |

- Examiner reuse: 23 exact factual reuse pairs (v46 had 24, v45 had 50) and 56 near-identical pairs.
- Examiner latency: mean 3.43s, p95 6.84s, max 13.9s. No answer took over 20s.
- Examiner cost: about $1.70 measured.
- The quota ran out at about 20:30 local time. The IDs that hit it are listed in v47-quota-blocked-ids.json, and those cases still have to be rerun.
- The browser pass rendered every page (renderedMatchesApi 100/100). Its answers are unusable because the provider returned 503.

## Real failures, after excluding quota errors

- Grounding withheld the answer: KE148 (all four variants), KE154-V4, EX081-V5 and EX015-V3.
- Arabic wording with ه written for ة was not routed: EX077-V3 and EX089-V3.
- KE257-V3 (Arabic graduate study modes) still omits full-time and part-time.
- The AE-04 grading follow-ups lost context: KE270-V4 and KE269-V4.
- EX079-V2: the transcript question was answered with a "To Whom It May Concern" letter.
