# OpenAI API budget log — feat/student-profiles-and-power

Balance at task start (per Ali): about $35.25, auto-reload off. Cap for this task: $20 total spend; keep at least $15 in the account. Stop all paid calls at $18 or on any credit/quota/429 error.

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
