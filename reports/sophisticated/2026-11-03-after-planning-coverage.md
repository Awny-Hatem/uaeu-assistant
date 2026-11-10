# UAEU sophisticated-agent benchmark

- Run: 2026-11-03-after-planning-coverage
- Fixture: 100 independently authored cases
- Started: 2026-11-03T18:34:22.003Z
- Finished: 2026-11-03T18:47:20.600Z
- Production: https://uaeu-assistant.vercel.app (build 11b06a7cb13f5aeb50c14205a02bc0781f6e1e1e)
- Branch: https://uaeu-assistant-3715x7avf-awnyhatem40-gmailcoms-projects.vercel.app (build 750f091b8908c3726a55529b69e6efa00e5d571a)
- Fixture SHA-256: 621b3c67135a1ac83f62dbd2ffd503640dfdacc9bc05656e971549692e46da23

## Important interpretation note

This is an automated triage score, not a formal proof of factual correctness. It checks HTTP success, answer presence, expected cue coverage, prohibited cue absence, citation presence where required, Arabic output where required, and declared disposition. Every case remains marked for human claim-by-claim review before using the benchmark as an acceptance gate.

## Overall comparison

| Metric | Production | Branch |
|---|---:|---:|
| Average score | 91.4 | 95.6 |
| Pass (80+) | 91 | 99 |
| Partial (55–79) | 6 | 1 |
| Fail (<55) | 3 | 0 |
| Cases won | 2 | 21 |
| Both failed | 0 | 0 |

## Case-by-case results

| ID | Category | Production | Branch | Better | Both failed |
|---|---|---:|---:|---|---|
| S001 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S002 | course-identity | 92 (pass) | 92 (pass) | tie |  |
| S003 | course-identity | 100 (pass) | 100 (pass) | tie |  |
| S004 | course-planning | 100 (pass) | 92 (pass) | production |  |
| S005 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S006 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S007 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S008 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S009 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S010 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S011 | course-planning | 100 (pass) | 100 (pass) | tie |  |
| S012 | course-planning | 92 (pass) | 92 (pass) | tie |  |
| S013 | course-planning | 83 (pass) | 92 (pass) | branch |  |
| S014 | course-planning | 92 (pass) | 92 (pass) | tie |  |
| S015 | course-planning | 88 (pass) | 94 (pass) | branch |  |
| S016 | admissions | 88 (pass) | 94 (pass) | branch |  |
| S017 | admissions | 100 (pass) | 100 (pass) | tie |  |
| S018 | admissions | 100 (pass) | 100 (pass) | tie |  |
| S019 | admissions | 35 (fail) | 100 (pass) | branch |  |
| S020 | admissions | 83 (pass) | 83 (pass) | tie |  |
| S021 | admissions | 88 (pass) | 88 (pass) | tie |  |
| S022 | admissions | 100 (pass) | 100 (pass) | tie |  |
| S023 | admissions | 92 (pass) | 92 (pass) | tie |  |
| S024 | admissions | 81 (pass) | 100 (pass) | branch |  |
| S025 | admissions | 83 (pass) | 83 (pass) | tie |  |
| S026 | graduation | 100 (pass) | 100 (pass) | tie |  |
| S027 | graduation | 100 (pass) | 100 (pass) | tie |  |
| S028 | graduation | 92 (pass) | 92 (pass) | tie |  |
| S029 | graduation | 35 (fail) | 100 (pass) | branch |  |
| S030 | graduation | 100 (pass) | 100 (pass) | tie |  |
| S031 | graduation | 94 (pass) | 94 (pass) | tie |  |
| S032 | graduation | 92 (pass) | 100 (pass) | branch |  |
| S033 | graduation | 92 (pass) | 100 (pass) | branch |  |
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
| S067 | multi-turn | 75 (partial) | 92 (pass) | branch |  |
| S068 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S069 | multi-turn | 92 (pass) | 92 (pass) | tie |  |
| S070 | multi-turn | 100 (pass) | 100 (pass) | tie |  |
| S071 | privacy | 92 (pass) | 92 (pass) | tie |  |
| S072 | privacy | 75 (partial) | 92 (pass) | branch |  |
| S073 | portal-boundary | 78 (partial) | 100 (pass) | branch |  |
| S074 | portal-boundary | 73 (partial) | 92 (pass) | branch |  |
| S075 | portal-boundary | 83 (pass) | 75 (partial) | production |  |
| S076 | unsupported | 92 (pass) | 92 (pass) | tie |  |
| S077 | unsupported | 81 (pass) | 81 (pass) | tie |  |
| S078 | unsupported | 88 (pass) | 88 (pass) | tie |  |
| S079 | security | 83 (pass) | 83 (pass) | tie |  |
| S080 | agent-boundary | 83 (pass) | 83 (pass) | tie |  |
| S081 | arabic-academics | 100 (pass) | 100 (pass) | tie |  |
| S082 | arabic-admissions | 92 (pass) | 92 (pass) | tie |  |
| S083 | arabic-graduation | 92 (pass) | 100 (pass) | branch |  |
| S084 | arabic-services | 65 (partial) | 100 (pass) | branch |  |
| S085 | arabic-library | 100 (pass) | 100 (pass) | tie |  |
| S086 | arabic-calendar | 88 (pass) | 88 (pass) | tie |  |
| S087 | arabic-privacy | 92 (pass) | 92 (pass) | tie |  |
| S088 | mixed-language | 100 (pass) | 100 (pass) | tie |  |
| S089 | mixed-language | 100 (pass) | 100 (pass) | tie |  |
| S090 | arabic-safety | 100 (pass) | 100 (pass) | tie |  |
| S091 | degree-planning | 95 (pass) | 100 (pass) | branch |  |
| S092 | degree-planning | 90 (pass) | 95 (pass) | branch |  |
| S093 | degree-planning | 94 (pass) | 94 (pass) | tie |  |
| S094 | degree-planning | 92 (pass) | 92 (pass) | tie |  |
| S095 | degree-planning | 83 (pass) | 83 (pass) | tie |  |
| S096 | degree-planning | 100 (pass) | 100 (pass) | tie |  |
| S097 | degree-planning | 88 (pass) | 100 (pass) | branch |  |
| S098 | degree-planning | 100 (pass) | 100 (pass) | tie |  |
| S099 | degree-planning | 88 (pass) | 100 (pass) | branch |  |
| S100 | agent-architecture | 75 (partial) | 100 (pass) | branch |  |

## Category summary

| Category | Cases | Production avg | Branch avg | Production wins | Branch wins | Both failed |
|---|---:|---:|---:|---:|---:|---:|
| course-planning | 13 | 96.5 | 97.1 | 1 | 2 | 0 |
| course-identity | 2 | 96 | 96 | 0 | 0 | 0 |
| admissions | 10 | 85 | 94 | 0 | 3 | 0 |
| graduation | 10 | 89.7 | 97.8 | 0 | 3 | 0 |
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
| multi-turn | 10 | 95.3 | 97 | 0 | 1 | 0 |
| privacy | 2 | 83.5 | 92 | 0 | 1 | 0 |
| portal-boundary | 3 | 78 | 89 | 1 | 2 | 0 |
| unsupported | 3 | 87 | 87 | 0 | 0 | 0 |
| security | 1 | 83 | 83 | 0 | 0 | 0 |
| agent-boundary | 1 | 83 | 83 | 0 | 0 | 0 |
| arabic-academics | 1 | 100 | 100 | 0 | 0 | 0 |
| arabic-admissions | 1 | 92 | 92 | 0 | 0 | 0 |
| arabic-graduation | 1 | 92 | 100 | 0 | 1 | 0 |
| arabic-services | 1 | 65 | 100 | 0 | 1 | 0 |
| arabic-library | 1 | 100 | 100 | 0 | 0 | 0 |
| arabic-calendar | 1 | 88 | 88 | 0 | 0 | 0 |
| arabic-privacy | 1 | 92 | 92 | 0 | 0 | 0 |
| mixed-language | 2 | 100 | 100 | 0 | 0 | 0 |
| arabic-safety | 1 | 100 | 100 | 0 | 0 | 0 |
| degree-planning | 9 | 92.2 | 96 | 0 | 4 | 0 |
| agent-architecture | 1 | 75 | 100 | 0 | 1 | 0 |

## Failed or partial-quality cases

### S019 — admissions — branch

- Production: **35/100**, fail
- Branch: **100/100**, pass
- Production excerpt: The generated answer did not pass the source-support check, so I withheld its unsupported claims. You can retry; verified stored answers remain available.
- Branch excerpt: **UAE national with a non-UAE curriculum** - The shared starting point is an accredited Grade 12 certificate or equivalent, plus the general program and health conditions published for the applicant route. - Because your curriculum is outside the UAE Ministry curriculum, the applicable **UAE Ministry equivalency** rule must be checked. That is not optional evidence and should not be replaced with an international-applicant threshold. - UAE-national and international routes are not interchangeabl

### S029 — graduation — branch

- Production: **35/100**, fail
- Branch: **100/100**, pass
- Production excerpt: The generated answer did not pass the source-support check, so I withheld its unsupported claims. You can retry; verified stored answers remain available.
- Branch excerpt: **Transcript route and cost depend on your UAEU status** - **Currently enrolled student:** sign in to the UAEU portal or app, open **Current Students Documents**, choose **Academic Transcript Arabic** or **Academic Transcript English**, and submit. The service is listed as **free**, with a normal delivery target of **10 minutes** and delivery to university email. - **Alumnus/graduate:** use the separate graduate-documents service. A digital official transcript is listed as **free** with a normal

### S053 — it-support — branch

- Production: **43/100**, fail
- Branch: **100/100**, pass
- Production excerpt: The generated answer did not pass the source-support check, so I withheld its unsupported claims. You can retry; verified stored answers remain available.
- Branch excerpt: **Password reset and lost-phone MFA are separate steps** - **Password Self-Service:** if you forgot the password, open UAEU Password Self-Service and choose **I Forget My Password**. Use **Change My Password** only when you still know the current password. Complete only the official identity-verification prompts. - **Replaced or unavailable phone:** Password Self-Service does not establish a complete lost-phone MFA-reset procedure. If you cannot complete multi-factor sign-in, contact the **UITS 

## Both deployments failed

No cases fell below the automated failure threshold on both deployments.
