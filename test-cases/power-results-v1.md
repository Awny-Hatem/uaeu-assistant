# UAEU Assistant — actual test conversations

Run: test-cases/power-results-v1.json
Started: 2026-11-17T13:37:17.688Z
Completed: INCOMPLETE

No test is marked correct solely because a request succeeded. Verdicts remain unreviewed until compared with official evidence.

## Test Case POWER001: cedar — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Published model — Year 1, Semester 2 (2026 Fall entry):<br>• CENG202: Discrete Mathematics (3)<br>• MATH110: Calculus II (3)<br>• CSBP219: Object Oriented Programming (3)<br>• CENG205: Digital Design & Computer Organization (3)<br>• MATH140: Linear Algebra I (3)<br>Published semester total: 15 credits.<br>Prerequisites needing confirmation: CENG202 (not-met), MATH110 (not-met), CSBP219 (not-met), CENG205 (unknown), MATH140 (unknown). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Computer Science — 2026 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.142 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER002: cedar — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 0 completed credits and 12 in progress. Against the recorded 120-credit requirement, 120 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.016 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER003: cedar — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 2, Semester 1: Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 1: Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 2: Elective (2 credits)<br>• Year 4, Semester 1: Elective (3 credits)<br>• Year 4, Semester 2: Elective (3 credits)<br>• Year 4, Semester 2: Elective (3 credits)<br>• Year 4, Semester 2: Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective Course (2 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>Bachelor of Science in Computer Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.010 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER004: cedar — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.011 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER005: cedar — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 0/120 credits are earned, 12 are in progress, and 120 are not yet earned. Unfinished recorded blocks: General Education requirements; Requirement category unresolved in extraction; General Education — Cluster 1. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.016 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER006: cedar — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.011 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER007: cedar — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.009 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER008: cedar — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>I could not verify the requested apply for registration / computer science from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 7.882 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER009: cedar — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is CSBP119 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | CSBP119: Algorithms and Problem Solving; 3 credits; Ed Course (Cluster 1: Area 4: Critical Thinking); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>UAEU Catalog — CSBP119 Algorithms and Problem Solving — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP119 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.012 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER010: cedar — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Computer Science) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.066 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER011: maple — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Published model — Year 2, Semester 2 (2025 Fall entry):<br>• CSBP340: Database Systems (3)<br>• ITBP270: Professional Responsibility in Information Technology (2)<br>• STAT210: Probability and Statistics (3)<br>• SWEB300: Software Engineering Fundamentals (3)<br>• ITBP301: Security Principles & Practice (3)<br>Published semester total: 14 credits.<br>Prerequisites needing confirmation: CSBP340 (unknown), STAT210 (unknown), ITBP301 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Computer Science — 2025 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.029 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER012: maple — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 29 completed credits and 12 in progress. Against the recorded 120-credit requirement, 91 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.016 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER013: maple — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 2, Semester 1: Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 1: Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 4, Semester 1: Elective (3 credits)<br>• Year 4, Semester 2: Elective (3 credits)<br>• Year 4, Semester 2: Elective (3 credits)<br>• Year 4, Semester 2: Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective Course (2 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>Bachelor of Science in Computer Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.018 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER014: maple — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: met.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.032 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER015: maple — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 29/120 credits are earned, 12 are in progress, and 91 are not yet earned. Unfinished recorded blocks: General Education requirements; Requirement category unresolved in extraction. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.025 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER016: maple — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.024 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER017: maple — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.026 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER018: maple — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>I could not verify the requested apply for registration / computer science from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.837 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER019: maple — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is GEAE101 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | GEAE101: Academic English for Humanities and STEM; 3 credits; Ed. Theme 2: Academic Language Proficiency; Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>UAEU Catalog — GEAE101 Academic English for Humanities and STEM — https://www.uaeu.ac.ae/en/catalog/courses/course_4964.shtml?id=GEAE101 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER020: maple — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Computer Science) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.063 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER021: willow — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Published model — Year 4, Semester 2 (2022 Fall entry):<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>• ITBP481: Senior Graduation Project II (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 15 credits.<br>Prerequisites needing confirmation: ITBP481 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2022 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.027 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER022: willow — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 82 completed credits and 12 in progress. Against the recorded 130-credit requirement, 48 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.024 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER023: willow — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 2, Semester 2: Gen Ed Course (Cluster 2: Area 2: Social and Behavioral Sciences) (3 credits)<br>• Year 3, Semester 2: Gen Ed Course (Cluster 2: Area 1: Humanities and Fine Arts) (3 credits)<br>• Year 4, Semester 1: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective (6 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.025 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER024: willow — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: met.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.021 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER025: willow — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 82/130 credits are earned, 12 are in progress, and 48 are not yet earned. Unfinished recorded blocks: General Education — Cluster 1; Major / specialization requirements; College requirements; General Education — Cluster 2; Major electives; Free electives; Internship. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.026 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER026: willow — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.023 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER027: willow — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.009 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER028: willow — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>I could not verify the requested apply for registration / information technology from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | None |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.573 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER029: willow — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is ESPU1081 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | ESPU1081: Introduction to Academic English for Information Technology I; 3 credits; Gen Ed Course (Cluster 1: Area 2: English Communication); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>UAEU Catalog — ESPU1081 Introduction to Academic English for Information Technology I — https://www.uaeu.ac.ae/ar/dvcaa/aau/pdfs/course-catalog_2019-2020.pdf#page=658 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER030: willow — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Information Technology) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.059 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER031: birch — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | The published source has a validation conflict; I cannot treat its total as confirmed: Plan sum 120.0 != printed degree total 130<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2025 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.026 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER032: birch — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 29 completed credits and 15 in progress. Against the recorded 130-credit requirement, 101 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.023 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER033: birch — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 2, Semester 2: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 1: Major Elective (3 credits)<br>• Year 4, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective (6 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.025 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER034: birch — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: met.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.022 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER035: birch — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 29/130 credits are earned, 15 are in progress, and 101 are not yet earned. Unfinished recorded blocks: General Education requirements; College requirements; Major / specialization requirements; Major electives; Free electives; Internship. Credit totals alone do not establish graduation completion.<br>The matching model is unavailable or has a validation conflict; cohort requirements need review.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.018 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER036: birch — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.026 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER037: birch — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.025 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER038: birch — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>I could not verify the requested apply for registration / information technology from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | None |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 5.414 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER039: birch — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is GEAE101 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | GEAE101: Academic English for Humanities and STEM; 3 credits; Gen. Ed. Theme 2: Academic Language Proficiency; Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>UAEU Catalog — GEAE101 Academic English for Humanities and STEM — https://www.uaeu.ac.ae/en/catalog/courses/course_4964.shtml?id=GEAE101 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER040: birch — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Information Technology) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.062 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER041: elm — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Published model — Year 4, Semester 2 (2023 Fall entry):<br>• MECH590: Capstone Engineering Design Project (3)<br>• MECH450: Dynamic Systems and Control Lab (1)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 13 credits.<br>Prerequisites needing confirmation: MECH590 (not-met), MECH450 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Mechanical Engineering — 2023 Fall-entry model study plan — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.025 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER042: elm — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>From your self-reported record: 105 completed credits and 14 in progress. Against the recorded 132-credit requirement, 27 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.012 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER043: elm — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Gen Ed Course (Cluster 2: Area 1: Humanities and Fine Arts) (3 credits)<br>Eligible elective names are not confirmed for this catalog.<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf<br>Bachelor of Science in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mechanical-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.024 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER044: elm — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.024 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER045: elm — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>From your self-reported record: 105/132 credits are earned, 14 are in progress, and 27 are not yet earned. Unfinished recorded blocks: General Education — Cluster 1; General Education — Cluster 2; Major / specialization requirements; Major electives. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.024 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER046: elm — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.025 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER047: elm — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.010 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER048: elm — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>I could not verify the requested apply for registration / mechanical engineering from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.855 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER049: elm — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is MATH130 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | MATH130: Calculus I for Engineering; 3 credits; Gen Ed Course (Cluster 1: Area 5: Quantitative Reasoning); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf<br>UAEU Catalog — MATH130 Calculus I for Engineering — https://www.uaeu.ac.ae/en/catalog/courses/course_2943.shtml?id=MATH130 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER050: elm — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Mechanical Engineering) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.060 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER051: pine — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Published model — Year 3, Semester 2 (2022 Fall entry):<br>• MECH306: Manufacturing Processes (3)<br>• MECH310: Dynamics (3)<br>• MECH426: Thermofluid System Design & Analysis (3)<br>• MECH412: Machine Design II (3)<br>• MECH350: Introduction to Mechatronics (3)<br>• MECH430: Thermal Engineering Lab (1)<br>Published semester total: 16 credits.<br>Prerequisites needing confirmation: MECH306 (not-met), MECH310 (unknown), MECH426 (not-met), MECH412 (not-met), MECH350 (unknown), MECH430 (not-met). In-progress courses are not yet passed; recommendations remain conditional. Check the applicable probation credit-load limit with your advisor.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Mechanical Engineering — 2022 Fall-entry model study plan — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.023 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER052: pine — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>From your self-reported record: 55 completed credits and 15 in progress. Against the recorded 147-credit requirement, 92 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.025 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER053: pine — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 5, Semester 2: Gen Ed Course (Cluster 2: Area 1: Humanities and Fine Arts) (3 credits)<br>Eligible elective names are not confirmed for this catalog.<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf<br>Bachelor of Science in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mechanical-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.014 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER054: pine — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.020 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER055: pine — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>From your self-reported record: 55/147 credits are earned, 15 are in progress, and 92 are not yet earned. Unfinished recorded blocks: General Education — Cluster 1; College requirements; General Education — Cluster 3; Major / specialization requirements; General Education — Cluster 2; Internship; Major electives. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.021 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER056: pine — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.018 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER057: pine — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.020 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER058: pine — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>I could not verify the requested apply for registration / mechanical engineering from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.038 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER059: pine — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is MATH1110 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | MATH1110: Calculus I for Engineering; 3 credits; Gen Ed Course (Cluster 1: Area 5: Quantitative Reasoning); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf<br>UAEU Catalog — MATH1110 Calculus I for Engineering — https://www.uaeu.ac.ae/ar/dvcaa/aau/pdfs/course-catalog_2019-2020.pdf#page=619 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.006 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER060: pine — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Mechanical Engineering) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.030 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER061: ash — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Published model — Year 4, Semester 2 (2023 Fall entry):<br>• Approved elective selection: Student choice (3)<br>• CHME508: Process Control (3)<br>• CHME590: Capstone Engineering Design Project (3)<br>• CHME528: Unit Operation and Process Control Lab (1)<br>• CHME506: Process Modeling & Simulation (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 16 credits.<br>Prerequisites needing confirmation: CHME590 (not-met), CHME528 (unknown). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Chemical Engineering — 2023 Fall-entry model study plan — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER062: ash — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Chemical Engineering):<br><br>From your self-reported record: 94 completed credits and 13 in progress. Against the recorded 132-credit requirement, 38 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER063: ash — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Chemical Engineering):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 3, Semester 1: Major Elective (3 credits)<br>• Year 3, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 1: Major Elective (3 credits)<br>• Year 4, Semester 2: Gen Ed Course (Cluster 2: Area 1: Humanities and Fine Arts) (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>Eligible elective names are not confirmed for this catalog.<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf<br>Bachelor of Science in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemical-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER064: ash — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER065: ash — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Chemical Engineering):<br><br>From your self-reported record: 94/132 credits are earned, 13 are in progress, and 38 are not yet earned. Unfinished recorded blocks: General Education — Cluster 1; General Education — Cluster 2; Major / specialization requirements; Major electives. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER066: ash — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER067: ash — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Chemical Engineering):<br><br>GESU121: a passing attempt is recorded; its credits count once.<br>Direct dependents found in the readable current prerequisite records: none verified; this does not prove there are no downstream effects.<br>Repeat rules, your catalog and actual offerings determine any delay.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.009 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER068: ash — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Chemical Engineering):<br><br>I could not verify the requested apply for registration from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 3.956 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER069: ash — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is MATH130 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | MATH130: Calculus I for Engineering; 3 credits; Gen Ed Course (Cluster 1: Area 5: Quantitative Reasoning); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf<br>UAEU Catalog — MATH130 Calculus I for Engineering — https://www.uaeu.ac.ae/en/catalog/courses/course_2943.shtml?id=MATH130 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.006 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER070: ash — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Chemical Engineering) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.030 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER071: olive — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Published model — Year 3, Semester 2 (2022 Fall entry):<br>• ACCT225: Fundamental of Cost & Management Accounting (3)<br>• GEIE222: Fundamentals of Innovation and Entrepreneurship (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 15 credits.<br>Prerequisites needing confirmation: ACCT225 (unknown), GEIE222 (unknown). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Economics — 2022 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER072: olive — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>From your self-reported record: 48 completed credits and 12 in progress. Against the recorded 120-credit requirement, 72 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER073: olive — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Ed Course (Cluster 2: Area 1: Humanities and Fine Arts) (3 credits)<br>• Year 2, Semester 1: Elective (3 credits)<br>• Year 2, Semester 1: Ed Course (Cluster 3: Area 1: Natural Sciences) (3 credits)<br>• Year 2, Semester 2: Ed Course (Cluster 1: Area 4: Critical Thinking) (3 credits)<br>• Year 3, Semester 1: Elective (3 credits)<br>• Year 3, Semester 2: Elective (3 credits)<br>• Year 3, Semester 2: Elective (3 credits)<br>• Year 3, Semester 2: Elective (3 credits)<br>• Year 4, Semester 1: Elective (3 credits)<br>Eligible elective names are not confirmed for this catalog.<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf<br>Bachelor of Economics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-economics.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER074: olive — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER075: olive — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>From your self-reported record: 48/120 credits are earned, 12 are in progress, and 72 are not yet earned. Unfinished recorded blocks: General Education — Cluster 2; General Education — Cluster 1; Requirement category unresolved in extraction; General Education — Cluster 3. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER076: olive — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER077: olive — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER078: olive — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>I could not verify the requested apply for registration from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.135 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER079: olive — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is MATH115 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | MATH115: Calculus for Business & Economics; 3 credits; Ed Course (Cluster 1: Area 5: Quantitative Reasoning); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf<br>UAEU Catalog — MATH115 Calculus for Business & Economics — https://www.uaeu.ac.ae/en/catalog/courses/course_2943.shtml?id=MATH115 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.006 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER080: olive — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Economics) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.031 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER081: palm — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | The published source has a validation conflict; I cannot treat its total as confirmed: Plan sum 120.0 != printed degree total 130<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2025 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER082: palm — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 29 completed credits and 15 in progress. Against the recorded 130-credit requirement, 101 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER083: palm — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 2, Semester 2: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 1: Major Elective (3 credits)<br>• Year 4, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective (6 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER084: palm — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: met.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER085: palm — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 29/130 credits are earned, 15 are in progress, and 101 are not yet earned. Unfinished recorded blocks: General Education requirements; College requirements; Major / specialization requirements; Major electives; Free electives; Internship. Credit totals alone do not establish graduation completion.<br>The matching model is unavailable or has a validation conflict; cohort requirements need review.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER086: palm — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | **Minor in Artificial Intelligence**<br><br><br>Required Credit Hours : minimum 18 hours<br><br>Artificial Intelligence<br><br>Required Courses (9 hours) \| Credit Hours<br>CSBP219 \| Object Oriented Programming \| 3<br>CSBP319 \| Data Structures \| 3<br>CSBP301 \| Artificial Intelligence 1 \| 3<br>1 : This course is not required for students majoring in BSc in Information Technology program<br><br>Elective Courses<br><br>Elective Courses (12 Hours) for students majoring in Information Technology , and (9 Hours) for all other majors (12 hours) \| Credit Hours<br>CSBP411 \| Machine Learning \| 3<br>CSBP476 \| Robotics and Intelligent Systems \| 3<br>CSBP441 \| Applied Computer Vision \| 3<br>CSBP491 \| Computational Intelligence for Data Management \| 3<br>CSBP475 \| Advanced topics in Data Science \| 3<br>CSBP477 \| Natural Language Processing \| 3<br><br><br>These are the current page’s requirements; confirm they match your minor’s catalog year.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Minor in Artificial Intelligence — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in--artificial-intelligence.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.009 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER087: palm — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER088: palm — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>I could not verify the requested apply for registration / information technology from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | None |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 6.430 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER089: palm — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is GEAE101 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | GEAE101: Academic English for Humanities and STEM; 3 credits; Gen. Ed. Theme 2: Academic Language Proficiency; Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>UAEU Catalog — GEAE101 Academic English for Humanities and STEM — https://www.uaeu.ac.ae/en/catalog/courses/course_4964.shtml?id=GEAE101 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.005 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER090: palm — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Bachelor of Science in Information Technology) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.035 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER091: juniper — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Your saved profile identifies Master of Science in Information Technology Management, catalog 2026/2027. I do not have a validated semester model for Year 1, Semester 2 of this record. I need the department-approved term plan; a curriculum course list alone does not establish its sequence.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded curriculum source — https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.009 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER092: juniper — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Based on your saved profile (Master of Science in Information Technology Management):<br><br>From your self-reported record: 0 completed credits and 0 in progress. Against the recorded 30-credit requirement, 30 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER093: juniper — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Based on your saved profile (Master of Science in Information Technology Management):<br><br>I do not have a matching semester model to determine your remaining elective slots.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER094: juniper — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the listed conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER095: juniper — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Based on your saved profile (Master of Science in Information Technology Management):<br><br>From your self-reported record: 0/30 credits are earned, 0 are in progress, and 30 are not yet earned. Unfinished recorded blocks: Core courses; Specialization courses; Thesis or non-thesis option requirements. Credit totals alone do not establish graduation completion.<br>The matching model is unavailable or has a validation conflict; cohort requirements need review.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER096: juniper — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | You have no minor recorded in your profile.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.007 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER097: juniper — Failed/repeated work

Turn 1

| Field | Details |
|---|---|
| Question | How does my failed or repeated course affect my progress? |
| Expected answer | Count a repeated passed course once. A failed attempt earns no credits. Identify recorded repeat status; do not invent downstream eligibility or an official GPA replacement decision. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Based on your saved profile (Master of Science in Information Technology Management):<br><br>There is no failed or repeated attempt recorded. Give the course code to identify potentially affected requirements.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.008 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER098: juniper — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Based on your saved profile (Master of Science in Information Technology Management):<br><br>I could not verify the requested apply for registration / information technology from the available official evidence. The subject is clear; the missing information is an official record that establishes this specific fact. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.881 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER099: juniper — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is ITCO601 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | I did not find this course in the available matching model. That does not establish that it is unnecessary or disallowed as an elective.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml<br>UAEU Catalog — ITCO601 Current Emerging Trends in Information Technology — https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITCO601 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.005 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER100: juniper — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | لا أستطيع رؤية مساقاتك المكتملة أو سجلك الأكاديمي، لذلك لا أستطيع تحديد ما تبقى لك. المرجع لذلك هو التدقيق الأكاديمي (Degree Audit) في البوابة أو مرشدك الأكاديمي. يمكنني أن أعرض لك الخطة الدراسية النموذجية المنشورة لتخصصك المحفوظ (Master of Science in Information Technology Management) لفصل معيّن، فقط اذكر السنة والفصل. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.027 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER101: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | What are the prerequisites for CSBP 219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | To enroll in CSBP219 Object Oriented Programming, you must have completed CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 3.092 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER102: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | What are the prerequisites for CSBP219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for CSBP219 Object Oriented Programming is completing CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 2.658 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER103: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | what are the prerequisits for csbp-219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for the undergraduate course CSBP219 Object Oriented Programming is completing CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 2.454 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER104: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | what is the pre requisite for csbp 219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for CSBP219 Object Oriented Programming is completing CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 3.073 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER105: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | What are the prerequisites for CSPB 219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for CSBP219 Object Oriented Programming is the successful completion of CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 2.607 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER106: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | هل لمساق CSBP 219 متطلبات سابقة؟ |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | مساق CSBP219 البرمجة كائنية التوجه يتطلب إكمال مساق CSBP119 الخوارزميات وحل المشكلات بدرجة لا تقل عن D كمتطلب سابق. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 3.174 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER107: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | شو لازم أخلص قبل CSBP219؟ |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | قبل التسجيل في مساق CSBP219 البرمجة كائنية التوجه، يجب إكمال مساق CSBP119 الخوارزميات وحل المشكلات بدرجة لا تقل عن D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 3.280 seconds. Actual transcript retained; factual review pending. |

## Test Case POWER108: Course code variant

