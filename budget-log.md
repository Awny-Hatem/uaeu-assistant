# OpenAI API budget log — feat/student-profiles-and-power

Balance at task start (per Ali): $35.25, auto-reload off.
Rule update from Ali (17 Nov 2026): keep the account above **$5** (was $15). Stop all paid calls on any credit/quota/429 error, or before the balance would fall below $5.

Costs are the app's own `usage.estimatedUsd` per answer (provider-returned usage only; transport failures are not counted). Average from earlier runs: about $0.002–0.004 per answer, about $0.005 for a multi-turn case.

| Run | By | Cases / answers | Estimated | Actual | Total so far |
|---|---|---|---|---|---|
| baseline-six (unchanged build) | Codex | 6 cases | – | $0.095 | $0.095 |
| after-six-v1 (interrupted) | Codex | 3 cases | – | $0.023 | $0.118 |
| after-six-v2 | Codex | 6 cases | – | $0.023 | $0.141 |
| power-results-v1 (172 new cases) | Codex | 172 cases | – | $0.289 | $0.430 |
| after-six-v3 (Claude: case 6 fix) | Claude | 6 cases / 15 answers | $0.05 | $0.023 | $0.453 |
| power-results-v2 (172 cases, current build) | Claude | 172 cases | $0.30 | $0.270 | $0.723 |
| after-six-v4 | Claude | 6 cases | $0.03 | $0.029 | $0.752 |
| power-results-v3 (172 cases after fixes) | Claude | 172 cases | $0.30 | $0.274 | $1.026 |
| after-six-v5 | Claude | 6 cases | $0.03 | $0.013 | $1.039 |
| power-results-v4 (172 cases) | Claude | 172 cases | $0.30 | $0.225 | $1.264 |
| comparison-50 v1: general model + judge | Claude | 50 + 50 calls | $0.25 | $0.067 | $1.331 |
| comparison-50 judge rerun (fixed reference) | Claude | 50 calls | $0.04 | $0.033 | $1.364 |
| comparison-50 v2: general model + judge | Claude | 50 + 50 calls | $0.10 | $0.067 | $1.431 |
| power-results-v4 verdict grading | Claude | 172 calls | $0.12 | $0.077 | $1.508 |
| power-focus-v5 (7 cases: credits, calendar, faculty) | Claude | 7 cases | $0.02 | $0.01 | $1.52 |
| power-results-v5 (172 cases) + verdict grading | Claude | 172 + 172 calls | $0.33 | $0.325 | $1.85 |

## Reconciliation with the real balance
| Date | Real balance (Ali) | Real spend since start | Logged estimate at that point | Note |
|---|---|---|---|---|
| 2026-11-17 | $33.63 | $1.62 | $1.85 | The app's per-answer estimates are slightly above the real bill; the v6 chain (est. $0.44) was running and may not be included yet. Use the real balance as the source of truth. |
| v6 chain: six + 172 + verdict grading + comparison v3 (general + judge) | Claude | 6 + 172 + 172 + 50 + 50 | $0.44 | ~$0.33 (app est.) | ~$2.18 (app est.; real at last report $1.62) |
| final suites (stopped at 22:03 by network loss; Mac slept) | Claude | examiner 600, phrasing 399, regression 594+595+134, memory 94 | ~$6 | ~$5 (app est.; check real balance) | ~$7.2 (app est.) |
| V3 merge + offline suites (2026-11-18) | Claude | mock provider only | $0 | $0 | unchanged |
| final suites partial (stopped for Dr. Fady fixes) + Fady runs + phrasing 399 ×2 (fix2, fix3 running) | Claude | ~207 + 70 + ~800 answers | ~$2.5 (app est.) | check real balance | ~$9.7 (app est.) |
