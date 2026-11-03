# UAEU sophisticated-agent benchmark

- Run: 2026-11-03-after-composite-fixes
- Fixture: 100 independently authored cases
- Started: 2026-11-03T17:20:23.837Z
- Finished: 2026-11-03T17:32:50.226Z
- Production: https://uaeu-assistant.vercel.app (build 11b06a7cb13f5aeb50c14205a02bc0781f6e1e1e)
- Branch: https://uaeu-assistant-k4ge9kdmj-awnyhatem40-gmailcoms-projects.vercel.app (build 09eeeaf9195c3c6f0f78032bf745c51636744599)
- Fixture SHA-256: 621b3c67135a1ac83f62dbd2ffd503640dfdacc9bc05656e971549692e46da23

## Important interpretation note

This is an automated triage score, not a formal proof of factual correctness. It checks HTTP success, answer presence, expected cue coverage, prohibited cue absence, citation presence where required, Arabic output where required, and declared disposition. Every case remains marked for human claim-by-claim review before using the benchmark as an acceptance gate.

## Overall comparison

| Metric | Production | Branch |
|---|---:|---:|
| Average score | 91.1 | 92.8 |
| Pass (80+) | 89 | 91 |
| Partial (55–79) | 8 | 9 |
| Fail (<55) | 3 | 0 |
| Cases won | 0 | 4 |
| Both failed | 0 | 0 |

## Case-by-case results

| ID | Category | Production | Branch | Better | Both failed |
|---|---|---:|---:|---|---|
| S001 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S002 | course-identity | 92 (pass) | 92 (pass) | tie |  |
| S003 | course-identity | 100 (pass) | 100 (pass) | tie |  |
| S004 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S005 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S006 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S007 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S008 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S009 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S010 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S011 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S012 | course-planning | 92 (pass) | 92 (pass) | tie |  |
| S013 | course-planning | 35 (fail) | 75 (partial) | branch |  |
| S014 | course-planning | 92 (pass) | 92 (pass) | tie |  |
| S015 | course-planning | 94 (pass) | 94 (pass) | tie |  |
| S016 | admissions | 88 (pass) | 88 (pass) | tie |  |
| S017 | admissions | 100 (pass) | 100 (pass) | tie |  |
| S018 | admissions | 100 (pass) | 100 (pass) | tie |  |
| S019 | admissions | 65 (partial) | 65 (partial) | tie |  |
| S020 | admissions | 83 (pass) | 83 (pass) | tie |  |
| S021 | admissions | 88 (pass) | 88 (pass) | tie |  |
| S022 | admissions | 100 (pass) | 100 (pass) | tie |  |
| S023 | admissions | 92 (pass) | 92 (pass) | tie |  |
| S024 | admissions | 81 (pass) | 81 (pass) | tie |  |
| S025 | admissions | 83 (pass) | 83 (pass) | tie |  |
| S026 | graduation | 100 (pass) | 100 (pass) | tie |  |
| S027 | graduation | 100 (pass) | 100 (pass) | tie |  |
| S028 | graduation | 92 (pass) | 92 (pass) | tie |  |
| S029 | graduation | 35 (fail) | 100 (pass) | branch |  |
| S030 | graduation | 100 (pass) | 100 (pass) | tie |  |
| S031 | graduation | 94 (pass) | 94 (pass) | tie |  |
| S032 | graduation | 73 (partial) | 73 (partial) | tie |  |
| S033 | graduation | 92 (pass) | 92 (pass) | tie |  |
| S034 | graduation | 100 (pass) | 100 (pass) | tie |  |
| S035 | graduation | 92 (pass) | 92 (pass) | tie |  |
| S036 | calendar | 88 (pass) | 88 (pass) | tie |  |
| S037 | calendar | 82 (pass) | 82 (pass) | tie |  |
| S038 | calendar | 92 (pass) | 92 (pass) | tie |  |
| S039 | calendar | 92 (pass) | 92 (pass) | tie |  |
| S040 | calendar | 100 (pass) | 100 (pass) | tie |  |
| S041 | finance | 100 (pass) | 100 (pass) | tie |  |
| S042 | finance | 94 (pass) | 94 (pass) | tie |  |
| S043 | finance | 88 (pass) | 100 (pass) | branch |  |
| S044 | financial-aid | 100 (pass) | 100 (pass) | tie |  |
| S045 | financial-aid | 100 (pass) | 100 (pass) | tie |  |
| S046 | student-services | 100 (pass) | 100 (pass) | tie |  |
| S047 | library | 100 (pass) | 100 (pass) | tie |  |
| S048 | library | 100 (pass) | 100 (pass) | tie |  |
| S049 | library | 100 (pass) | 100 (pass) | tie |  |
| S050 | library | 94 (pass) | 94 (pass) | tie |  |
| S051 | library | 94 (pass) | 94 (pass) | tie |  |
| S052 | it-support | 100 (pass) | 100 (pass) | tie |  |
| S053 | it-support | 43 (fail) | 100 (pass) | branch |  |
| S054 | housing | 100 (pass) | 100 (pass) | tie |  |
| S055 | housing | 82 (pass) | 82 (pass) | tie |  |
| S056 | visa | 100 (pass) | 100 (pass) | tie |  |
| S057 | wellbeing | 100 (pass) | 100 (pass) | tie |  |
| S058 | safety | 100 (pass) | 100 (pass) | tie |  |
| S059 | campus-services | 100 (pass) | 100 (pass) | tie |  |
| S060 | student-services | 83 (pass) | 83 (pass) | tie |  |
| S061 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S062 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S063 | multi-turn | 94 (pass) | 94 (pass) | tie |  |
| S064 | multi-turn | 92 (pass) | 92 (pass) | tie |  |
| S065 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S066 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S067 | multi-turn | 75 (partial) | 75 (partial) | tie |  |
| S068 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S069 | multi-turn | 92 (pass) | 92 (pass) | tie |  |
| S070 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S071 | privacy | 92 (pass) | 92 (pass) | tie |  |
| S072 | privacy | 75 (partial) | 75 (partial) | tie |  |
| S073 | portal-boundary | 78 (partial) | 78 (partial) | tie |  |
| S074 | portal-boundary | 73 (partial) | 73 (partial) | tie |  |
| S075 | portal-boundary | 83 (pass) | 83 (pass) | tie |  |
| S076 | unsupported | 92 (pass) | 92 (pass) | tie |  |
| S077 | unsupported | 81 (pass) | 81 (pass) | tie |  |
| S078 | unsupported | 88 (pass) | 88 (pass) | tie |  |
| S079 | security | 83 (pass) | 83 (pass) | tie |  |
| S080 | agent-boundary | 83 (pass) | 83 (pass) | tie |  |
| S081 | arabic-academics | 100 (pass) | 100 (pass) | tie |  |
| S082 | arabic-admissions | 92 (pass) | 92 (pass) | tie |  |
| S083 | arabic-graduation | 92 (pass) | 92 (pass) | tie |  |
| S084 | arabic-services | 65 (partial) | 65 (partial) | tie |  |
| S085 | arabic-library | 100 (pass) | 100 (pass) | tie |  |
| S086 | arabic-calendar | 88 (pass) | 88 (pass) | tie |  |
| S087 | arabic-privacy | 92 (pass) | 92 (pass) | tie |  |
| S088 | mixed-language | 100 (pass) | 100 (pass) | tie |  |
| S089 | mixed-language | 100 (pass) | 100 (pass) | tie |  |
| S090 | arabic-safety | 100 (pass) | 100 (pass) | tie |  |
| S091 | degree-planning | 95 (pass) | 95 (pass) | tie |  |
| S092 | degree-planning | 90 (pass) | 90 (pass) | tie |  |
| S093 | degree-planning | 94 (pass) | 94 (pass) | tie |  |
| S094 | degree-planning | 92 (pass) | 92 (pass) | tie |  |
| S095 | degree-planning | 83 (pass) | 83 (pass) | tie |  |
| S096 | degree-planning | 100 (pass) | 100 (pass) | tie |  |
| S097 | degree-planning | 88 (pass) | 88 (pass) | tie |  |
| S098 | degree-planning | 100 (pass) | 100 (pass) | tie |  |
| S099 | degree-planning | 88 (pass) | 88 (pass) | tie |  |
| S100 | agent-architecture | 75 (partial) | 75 (partial) | tie |  |

## Category summary

| Category | Cases | Production avg | Branch avg | Production wins | Branch wins | Both failed |
|---|---:|---:|---:|---:|---:|---:|
| course-planning | 13 | 93.3 | 96.4 | 0 | 1 | 0 |
| course-identity | 2 | 96 | 96 | 0 | 0 | 0 |
| admissions | 10 | 88 | 88 | 0 | 0 | 0 |
| graduation | 10 | 87.8 | 94.3 | 0 | 1 | 0 |
| calendar | 5 | 90.8 | 90.8 | 0 | 0 | 0 |
| finance | 3 | 94 | 98 | 0 | 1 | 0 |
| financial-aid | 2 | 100 | 100 | 0 | 0 | 0 |
| student-services | 2 | 91.5 | 91.5 | 0 | 0 | 0 |
| library | 5 | 97.6 | 97.6 | 0 | 0 | 0 |
| it-support | 2 | 71.5 | 100 | 0 | 1 | 0 |
| housing | 2 | 91 | 91 | 0 | 0 | 0 |
| visa | 1 | 100 | 100 | 0 | 0 | 0 |
| wellbeing | 1 | 100 | 100 | 0 | 0 | 0 |
| safety | 1 | 100 | 100 | 0 | 0 | 0 |
| campus-services | 1 | 100 | 100 | 0 | 0 | 0 |
| multi-turn | 10 | 95.3 | 95.3 | 0 | 0 | 0 |
| privacy | 2 | 83.5 | 83.5 | 0 | 0 | 0 |
| portal-boundary | 3 | 78 | 78 | 0 | 0 | 0 |
| unsupported | 3 | 87 | 87 | 0 | 0 | 0 |
| security | 1 | 83 | 83 | 0 | 0 | 0 |
| agent-boundary | 1 | 83 | 83 | 0 | 0 | 0 |
| arabic-academics | 1 | 100 | 100 | 0 | 0 | 0 |
| arabic-admissions | 1 | 92 | 92 | 0 | 0 | 0 |
| arabic-graduation | 1 | 92 | 92 | 0 | 0 | 0 |
| arabic-services | 1 | 65 | 65 | 0 | 0 | 0 |
| arabic-library | 1 | 100 | 100 | 0 | 0 | 0 |
| arabic-calendar | 1 | 88 | 88 | 0 | 0 | 0 |
| arabic-privacy | 1 | 92 | 92 | 0 | 0 | 0 |
| mixed-language | 2 | 100 | 100 | 0 | 0 | 0 |
| arabic-safety | 1 | 100 | 100 | 0 | 0 | 0 |
| degree-planning | 9 | 92.2 | 92.2 | 0 | 0 | 0 |
| agent-architecture | 1 | 75 | 75 | 0 | 0 | 0 |

## Failed or partial-quality cases

### S013 — course-planning — branch

- Production: **35/100**, fail
- Branch: **75/100**, partial
- Production excerpt: The generated answer did not pass the source-support check, so I withheld its unsupported claims. You can retry; verified stored answers remain available.
- Branch excerpt: The generated answer did not pass the source-support check, so I withheld its unsupported claims. Retry with the same question, or identify the specific service, course, term, or applicant category so I can use a narrower verified record.

### S029 — graduation — branch

- Production: **35/100**, fail
- Branch: **100/100**, pass
- Production excerpt: The generated answer did not pass the source-support check, so I withheld its unsupported claims. You can retry; verified stored answers remain available.
- Branch excerpt: **Transcript route and cost depend on your UAEU status** - **Currently enrolled student:** sign in to the UAEU portal or app, open **Current Students Documents**, choose **Academic Transcript Arabic** or **Academic Transcript English**, and submit. The service is listed as **free**, with a normal delivery target of **10 minutes** and delivery to university email. - **Alumnus/graduate:** use the separate graduate-documents service. A digital official transcript is listed as **free** with a normal

### S053 — it-support — branch

- Production: **43/100**, fail
- Branch: **100/100**, pass
- Production excerpt: The generated answer did not pass the source-support check, so I withheld its unsupported claims. You can retry; verified stored answers remain available.
- Branch excerpt: **Password reset and lost-phone MFA are separate steps** - **Password Self-Service:** if you forgot the password, open UAEU Password Self-Service and choose **I Forget My Password**. Use **Change My Password** only when you still know the current password. Complete only the official identity-verification prompts. - **Replaced or unavailable phone:** Password Self-Service does not establish a complete lost-phone MFA-reset procedure. If you cannot complete multi-factor sign-in, contact the **UITS**

## Both deployments failed

No cases fell below the automated failure threshold on both deployments.
