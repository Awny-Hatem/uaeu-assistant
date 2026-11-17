# UAEU Assistant — actual test conversations

Run: test-cases/power-results-v5-final.json
Started: 2026-11-17T15:54:37.134Z
Completed: 2026-11-17T16:04:02.210Z

No test is marked correct solely because a request succeeded. Verdicts remain unreviewed until compared with official evidence.

## Test Case POWER001: cedar — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Published model — Year 1, Semester 2 (2026 Fall entry):<br>• [CENG202](https://www.uaeu.ac.ae/en/catalog/courses/course_2948.shtml?id=CENG202): Discrete Mathematics (3)<br>• [MATH110](https://www.uaeu.ac.ae/en/catalog/courses/course_2943.shtml?id=MATH110): Calculus II (3)<br>• [CSBP219](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219): Object Oriented Programming (3)<br>• [CENG205](https://www.uaeu.ac.ae/en/catalog/courses/course_2948.shtml?id=CENG205): Digital Design & Computer Organization (3)<br>• [MATH140](https://www.uaeu.ac.ae/en/catalog/courses/course_2943.shtml?id=MATH140): Linear Algebra I (3)<br>Published semester total: 15 credits.<br>Credits in the displayed courses not recorded as completed: 15.<br>Prerequisites needing confirmation: CENG202 (not-met), MATH110 (not-met), CSBP219 (not-met), CENG205 (unknown), MATH140 (unknown). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Computer Science — 2026 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the next semester's courses from the official 2026/2027 catalog and model plan, excluded passed courses, and noted prerequisite conditions accurately based on the student's current progress. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER002: cedar — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 0 completed credits and 12 in progress. Against the recorded 120-credit requirement, 120 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education requirements: 0 of 21 earned, 3 in progress<br>• College requirements: 0 of 38 earned, 6 in progress<br>• General Education — Cluster 1: 0 of 3 earned, 3 in progress<br>• Major / specialization requirements: 0 of 38 earned<br>• Free electives: 0 of 2 earned<br>• Major electives: 0 of 12 earned<br>• Internship: 0 of 6 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits required, earned, and in progress, but the breakdown by requirement block is not supported by the official reference and may be inaccurate or invented. The rubric requires stating recorded requirement, earned credits, in-progress credits, and amount not yet earned, which the assistant partially fulfills.) |

## Test Case POWER003: cedar — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 2, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 2: Free Elective (2 credits)<br>• Year 4, Semester 1: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective Course (2 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>Bachelor of Science in Computer Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified all unfulfilled elective slots and distinguished between general education themes, free electives, and major electives without promising approval or seats, aligning well with the official reference and rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER004: cedar — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the current catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified that the student does not meet the prerequisites for CSBP319, citing the required minimum grade D in CSBP219 and CSBP221, which are not met according to the student's record. The assistant also correctly noted that concurrent enrollment is conditional and not a completed prerequisite. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER005: cedar — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 0/120 credits are earned, 12 are in progress, and 120 are not yet earned. Unfinished recorded blocks: General Education requirements; College requirements; General Education — Cluster 1; Major / specialization requirements; Free electives; Major electives; Internship. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits (0), identifies in-progress credits (12), and lists unfinished blocks without certifying graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated course recorded and appropriately asks for course code to identify any impact, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER008: cedar — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>For your saved undergraduate level, you must first insert your courses in the Degree Works system according to your study plan; only after that can you register courses through the UAEU eServices portal.<br><br>To register, log into the UAEU portal at https://my.uaeu.ac.ae using your username and password, then navigate to eServices and proceed to the Registration section in Banner 9 “XE”.<br><br>For undergraduates, excluding the College of Medicine and Health Sciences: All undergraduate students should register each regular semester after being advised by their College advisor and manage their registration during the period specified in the academic calendar.<br><br>If you face prerequisite errors during registration, ensure you have passed the required prerequisite courses or have approval to register concurrent prerequisite courses.<br><br>You can change your registration during the add/drop period at the beginning of the semester if needed. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2<br>3_undergraduate_registration_and_enrollment-en.pdf — https://www.uaeu.ac.ae/en/about/pdfs/policies/3_undergraduate_registration_and_enrollment-en.pdf#page=1 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provides official registration steps and the appropriate portal link without claiming to register courses or access live records, fully meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER009: cedar — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is CSBP119 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | CSBP119: Algorithms and Problem Solving; 3 credits; Gen Ed Course (Cluster 1: Area 4: Critical Thinking); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>UAEU Catalog — CSBP119 Algorithms and Problem Solving — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP119 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified CSBP119 as 'Algorithms and Problem Solving', its credit value, printed category, and term from the official study plan and catalog. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER010: cedar — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Computer Science):<br><br>حسب سجلك الذي أدخلته: 0 ساعة مكتملة، و12 قيد الدراسة. المتبقي من إجمالي 120 هو 120 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education requirements: 0 من 21 مكتملة، و3 قيد الدراسة<br>• College requirements: 0 من 38 مكتملة، و6 قيد الدراسة<br>• General Education — Cluster 1: 0 من 3 مكتملة، و3 قيد الدراسة<br>• Major / specialization requirements: 0 من 38 مكتملة<br>• Free electives: 0 من 2 مكتملة<br>• Major electives: 0 من 12 مكتملة<br>• Internship: 0 من 6 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: الرد صحيح في حساب الساعات المكتسبة والقيد الدراسة والمتبقية، لكنه يضيف تفاصيل عن متطلبات التعليم العام والكليات والتخصصات التي لم تذكر في المرجع الرسمي، مما قد يسبب بعض الالتباس. كما أن المجموع المتبقي يجب أن يكون 120 وليس 120 لم تُكتسب بعد مع 12 قيد الدراسة.) |

## Test Case POWER011: maple — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Published model — Year 2, Semester 2 (2025 Fall entry):<br>• [CSBP340](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP340): Database Systems (3)<br>• [ITBP270](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP270): Professional Responsibility in Information Technology (2)<br>• [STAT210](https://www.uaeu.ac.ae/en/catalog/courses/course_4976.shtml?id=STAT210): Probability and Statistics (3)<br>• [SWEB300](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=SWEB300): Software Engineering Fundamentals (3)<br>• [ITBP301](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP301): Security Principles & Practice (3)<br>Published semester total: 14 credits.<br>Credits in the displayed courses not recorded as completed: 14.<br>Prerequisites needing confirmation: CSBP340 (unknown), ITBP301 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Computer Science — 2025 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Courses match the student's official cohort model plan for the next position; prerequisite flags are computed from the record and catalog, and unknown conditions are labelled unknown rather than guessed. (automatic grade was partial: The assistant correctly identifies the next semester's courses and excludes passed courses, matching the official plan and catalog. However, it incorrectly states that the prerequisite for ITBP301 is not met, while the official reference does not specify prerequisites for ITBP301, and it does not confirm prerequisites for CSBP340, which should be noted as unknown. The assistant also does not explicitly mention the exclusion of passed courses or the total credits remaining as required by the rubric.) |

## Test Case POWER012: maple — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 28 completed credits and 13 in progress. Against the recorded 120-credit requirement, 92 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education requirements: 3 of 21 earned<br>• College requirements: 18 of 38 earned, 9 in progress<br>• General Education — Cluster 1: 3 of 3 earned<br>• Major / specialization requirements: 4 of 40 earned, 4 in progress<br>• Major electives: 0 of 12 earned<br>• Internship: 0 of 6 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits earned (28), in progress (13), and remaining (92) matching the reference, but incorrectly breaks down credits by requirement blocks not supported by the official record or rubric, which only requires total credits and status. Also, the assistant adds a note about Degree Works and advisor not requested by the rubric.) |

## Test Case POWER013: maple — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 2, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 4, Semester 1: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective Course (2 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>Bachelor of Science in Computer Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified unfulfilled elective slots and distinguished between currently published options and confirmed cohort eligibility without promising seats or approvals. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER014: maple — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: conditional.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; conditional-concurrent<br>Computed from the 2025/2026 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2025_2026.pdf#page=597 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly checked the prerequisite CSBP219 as met and the pre/corequisite CSBP221 as conditional concurrent enrollment, matching the official catalog and student record. The response cites the specific course CSBP319 and follows the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER015: maple — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Computer Science):<br><br>From your self-reported record: 28/120 credits are earned, 13 are in progress, and 92 are not yet earned. Unfinished recorded blocks: General Education requirements; College requirements; Major / specialization requirements; Major electives; Internship. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits, identifies unfinished blocks, and does not certify graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated attempt recorded and appropriately asks for the course code to identify any affected requirements, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER018: maple — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>Undergraduate students register their courses through the UAEU portal's eServices after entering their courses in the Degree Works system according to their study plan; students who do not specify their courses in Degree Works cannot register.<br><br>To register, open a web browser, go to the university website, sign in with your username and password, then access eServices and proceed to the Registration section to complete course registration.<br><br>Undergraduate students who fail to register by the end of the registration period will be considered on administrative leave of absence for that semester. |
| Actual sources | user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2<br>1_edite_2017-1866-booklet.pdf — https://www.uaeu.ac.ae/en/docs/1_edite_2017-1866-booklet.pdf#page=15 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provided official registration steps and the appropriate portal link without claiming to register courses or access live records, fully meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER019: maple — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is GEAE101 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | GEAE101: Academic English for Humanities and STEM; 3 credits; Gen. Ed. Theme 2: Academic Language Proficiency; Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf<br>UAEU Catalog — GEAE101 Academic English for Humanities and STEM — https://www.uaeu.ac.ae/en/catalog/courses/course_4964.shtml?id=GEAE101 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified GEAE101 as a required course in Year 1 Semester 1 with the correct category and credit details matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER020: maple — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Computer Science):<br><br>حسب سجلك الذي أدخلته: 28 ساعة مكتملة، و13 قيد الدراسة. المتبقي من إجمالي 120 هو 92 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education requirements: 3 من 21 مكتملة<br>• College requirements: 18 من 38 مكتملة، و9 قيد الدراسة<br>• General Education — Cluster 1: 3 من 3 مكتملة<br>• Major / specialization requirements: 4 من 40 مكتملة، و4 قيد الدراسة<br>• Major electives: 0 من 12 مكتملة<br>• Internship: 0 من 6 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | الإجابة صحيحة حيث تم حساب الساعات المكتسبة والقيد الدراسة والمتبقية بدقة وفق السجل الرسمي وخطة الدراسة، وتمت الإجابة باللغة العربية كما هو مطلوب. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER021: willow — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Published model — Year 4, Semester 2 (2022 Fall entry):<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>• [ITBP481](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP481): Senior Graduation Project II (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 15 credits.<br>Credits in the displayed courses not recorded as completed: 15.<br>Prerequisites needing confirmation: ITBP481 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2022 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the next semester as Year 4 Semester 2 with the exact courses and credit count from the official plan, excluded passed courses, and noted the prerequisite condition for ITBP481. No invented sequences were added. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER022: willow — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 82 completed credits and 12 in progress. Against the recorded 130-credit requirement, 48 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education — Cluster 1: 12 of 15 earned, 3 in progress<br>• General Education — Cluster 3: 6 of 6 earned<br>• Major / specialization requirements: 34 of 37 earned, 3 in progress<br>• College requirements: 27 of 33 earned, 3 in progress<br>• General Education — Cluster 2: 3 of 12 earned, 3 in progress<br>• Major electives: 0 of 9 earned<br>• Free electives: 0 of 6 earned<br>• Internship: 0 of 12 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits earned (82), in progress (12), and remaining (48) matching the official record and requirement. However, the breakdown by requirement blocks is not supported by the official reference and appears invented, which is not requested by the rubric.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified unfulfilled elective slots and distinguished current published options without promising approval or seats, aligning with the rubric and official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER024: willow — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: met.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; met<br>Computed from the 2022/2023 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2022_2023.pdf#page=612 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly checked the prerequisites CSBP219 and CSBP221 with minimum grade D for CSBP319 using the official catalog and student record, and noted concurrent enrollment as conditional. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits (82), identifies unfinished blocks, and does not certify graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated attempt recorded and appropriately asks for a course code to identify any affected requirements, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER028: willow — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>For your saved undergraduate level, you register courses through the UAEU portal 'eServices' after inserting the courses in the Degree Works system according to your study plan; students who do not specify their courses in Degree Works cannot register.<br><br>For undergraduates, excluding the College of Medicine and Health Sciences: You should first meet with your college academic advisor to select courses as per your study plan before registration.<br><br>To register, log in to the UAEU portal, navigate to Student & Financial Aid, then to Registration, and use the Student Detailed Schedule to view and manage your courses.<br><br>You can register between 12 to 19 credit hours per semester if in good academic standing, with minimum and maximum credit limits and other conditions specified by the college.<br><br>If you miss early registration, you can register during the add/drop period at the beginning of the next semester, but failure to register without an approved postponement may lead to dismissal. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2<br>3_undergraduate_registration_and_enrollment-en.pdf — https://www.uaeu.ac.ae/en/about/pdfs/policies/3_undergraduate_registration_and_enrollment-en.pdf#page=1<br>1_edite_2017-1866-booklet.pdf — https://www.uaeu.ac.ae/en/docs/1_edite_2017-1866-booklet.pdf#page=15 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | Hand review: Matches the official registration guide (user_guide_registration_classes.pdf p.2): register through eServices after entering courses in Degree Works; students who have not entered courses in Degree Works cannot register. In this run no step-by-step guide card was attached (guide keywords were too narrow; fixed after this run). (automatic grade was partial: The assistant correctly describes the general registration process and portal navigation but does not provide the official registration steps or the exact registration/portal link as required by the rubric. It also includes some details not confirmed by the official reference provided.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified ESPU1081 as a required course in Year 1 Semester 1 with the correct category and credits, matching the official reference and rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER030: willow — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Information Technology):<br><br>حسب سجلك الذي أدخلته: 82 ساعة مكتملة، و12 قيد الدراسة. المتبقي من إجمالي 130 هو 48 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education — Cluster 1: 12 من 15 مكتملة، و3 قيد الدراسة<br>• General Education — Cluster 3: 6 من 6 مكتملة<br>• Major / specialization requirements: 34 من 37 مكتملة، و3 قيد الدراسة<br>• College requirements: 27 من 33 مكتملة، و3 قيد الدراسة<br>• General Education — Cluster 2: 3 من 12 مكتملة، و3 قيد الدراسة<br>• Major electives: 0 من 9 مكتملة<br>• Free electives: 0 من 6 مكتملة<br>• Internship: 0 من 12 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | الإجابة صحيحة حيث تم حساب الساعات المكتسبة والقيد الدراسة والمتبقية بدقة وفق السجل الرسمي وخطة الدراسة، وتمت الإجابة باللغة العربية كما هو مطلوب. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER031: birch — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Published model — Year 2, Semester 2 (2025 Fall entry):<br>• [CSBP340](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP340): Database Systems (3)<br>• [CENG530](https://www.uaeu.ac.ae/en/catalog/courses/course_2948.shtml?id=CENG530): Computer Network Protocols (3)<br>• [ITBP301](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP301): Security Principles & Practice (3)<br>• Approved elective selection: Student choice (3)<br>• [CENG529](https://www.uaeu.ac.ae/en/catalog/courses/course_2948.shtml?id=CENG529): Networking Lab (1)<br>Published semester total: 13 credits.<br>Credits in the displayed courses not recorded as completed: 13.<br>The plan's printed degree total doesn't match the sum of its semesters (Plan sum 120.0 != printed degree total 130); the semester list above matches its printed semester total. Confirm the degree total with your advisor. Prerequisites needing confirmation: CSBP340 (unknown), CENG530 (not-met), ITBP301 (not-met), CENG529 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2025 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the next semester's courses according to the official plan, excluded passed courses, and noted prerequisite conditions and credit discrepancies without inventing sequences. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER032: birch — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 28 completed credits and 16 in progress. Against the recorded 130-credit requirement, 102 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education requirements: 6 of 21 earned, 3 in progress<br>• College requirements: 21 of 41 earned, 6 in progress<br>• Major / specialization requirements: 1 of 36 earned, 7 in progress<br>• Major electives: 0 of 10 earned<br>• Free electives: 0 of 6 earned<br>• Internship: 0 of 6 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits earned, in progress, and remaining, matching the reference. However, the breakdown by requirement blocks is not supported by the official reference or student record, thus partially meeting the rubric.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified unfulfilled elective slots and distinguished current published options without promising approval or seats, aligning with the rubric and official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER034: birch — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: conditional.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; conditional-concurrent<br>Computed from the 2025/2026 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2025_2026.pdf#page=597 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified CSBP219 as a prerequisite with minimum grade D met, and CSBP221 as a pre/corequisite with minimum grade D currently in progress, making enrollment conditional. The response aligns with the official catalog and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER035: birch — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 28/130 credits are earned, 16 are in progress, and 102 are not yet earned. Unfinished recorded blocks: General Education requirements; College requirements; Major / specialization requirements; Major electives; Free electives; Internship. Credit totals alone do not establish graduation completion.<br>The matching model is unavailable or has a validation conflict; cohort requirements need review.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits, identifies unfinished blocks, does not certify graduation, and notes the need for official audit, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated attempt recorded and appropriately asks for a course code to identify any affected requirements, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER038: birch — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>Undergraduate students register courses through the UAEU portal's eServices after entering their courses in the Degree Works system according to their study plan; students who do not specify their courses in Degree Works will not be able to register.<br><br>You can get your course schedule and manage registration by logging into eServices with your university ID and password, then navigating to Student & Financial Aid, Registration, and Student Detailed Schedule to view your courses. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly describes the official registration steps and provides the appropriate portal link without claiming to register courses or access live records, meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified GEAE101 as a required course in Year 1 Semester 1 with the correct category and credit details matching the official plan and catalog. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER040: birch — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Information Technology):<br><br>حسب سجلك الذي أدخلته: 28 ساعة مكتملة، و16 قيد الدراسة. المتبقي من إجمالي 130 هو 102 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education requirements: 6 من 21 مكتملة، و3 قيد الدراسة<br>• College requirements: 21 من 41 مكتملة، و6 قيد الدراسة<br>• Major / specialization requirements: 1 من 36 مكتملة، و7 قيد الدراسة<br>• Major electives: 0 من 10 مكتملة<br>• Free electives: 0 من 6 مكتملة<br>• Internship: 0 من 6 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: الرد صحيح في حساب الساعات المكتسبة والقيد والدراسة والمتبقية، لكنه يضيف تفاصيل عن متطلبات التعليم العام والكليات والتخصصات التي ليست موجودة في المرجع الرسمي المقدم، مما قد يسبب بعض الالتباس.) |

## Test Case POWER041: elm — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Published model — Year 4, Semester 2 (2023 Fall entry):<br>• [MECH590](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH590): Capstone Engineering Design Project (3)<br>• [MECH450](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH450): Dynamic Systems and Control Lab (1)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 13 credits.<br>Credits in the displayed courses not recorded as completed: 13.<br>Prerequisites needing confirmation: MECH590 (not-met), MECH450 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Mechanical Engineering — 2023 Fall-entry model study plan — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the next semester's courses according to the official plan, excluded passed courses, and noted prerequisite conditions based on in-progress courses. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER042: elm — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>From your self-reported record: 103 completed credits and 16 in progress. Against the recorded 132-credit requirement, 29 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education — Cluster 1: 12 of 15 earned, 3 in progress<br>• College requirements: 32 of 32 earned<br>• General Education — Cluster 3: 6 of 6 earned<br>• General Education — Cluster 2: 9 of 12 earned<br>• Major / specialization requirements: 42 of 59 earned, 13 in progress<br>• Internship: 2 of 2 earned<br>• Major electives: 0 of 6 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits earned (103), in progress (16), and remaining (29) matching the record and requirement. However, the breakdown by requirement blocks is not supported by the official reference data provided and may be inaccurate or incomplete, thus missing a required element of the rubric.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the unfulfilled elective slots for Year 4 Semester 2 without promising approval or seats, and distinguished that eligibility and offerings need confirmation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER044: elm — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the 2023/2024 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2023_2024.pdf#page=621 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified that the student does not meet the prerequisites for CSBP319, citing the required courses CSBP219 and CSBP221 with minimum grade D, consistent with the official catalog and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER045: elm — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>From your self-reported record: 103/132 credits are earned, 16 are in progress, and 29 are not yet earned. Unfinished recorded blocks: General Education — Cluster 1; General Education — Cluster 2; Major / specialization requirements; Major electives. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits (103), identifies in-progress credits (16), and notes unfinished blocks without certifying graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated course recorded and does not invent any downstream eligibility or GPA decisions, complying with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER048: elm — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>For your saved undergraduate level, you register courses through the UAEU portal's eServices after entering your courses in the Degree Works system according to your study plan; without specifying courses in Degree Works, registration is not possible.<br><br>You must log in to the university website, access the portal via my.uaeu.ac.ae with your username and password, then go to the eServices section to proceed with course registration.<br><br>For undergraduates, excluding the College of Medicine and Health Sciences: All degree-status undergraduate students are expected to register each regular semester at their first eligibility time published by the University, and they must be advised by their College or academic advisor before registering.<br><br>You can view your course schedule after registration through eServices by selecting Student & Financial Aid, then Registration, and finally Student Detailed Schedule for your term.<br><br>If you need help with registration, you can contact the registration department or your College Advising Unit for assistance.<br><br>You must register a minimum of 12 credit hours and a maximum of 19 credit hours per semester, unless you have approval for less or more credits as per academic standing rules. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2<br>3_undergraduate_registration_and_enrollment-en.pdf — https://www.uaeu.ac.ae/en/about/pdfs/policies/3_undergraduate_registration_and_enrollment-en.pdf#page=1 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | Hand review: Matches the official registration guide (user_guide_registration_classes.pdf p.2): register through eServices after entering courses in Degree Works; students who have not entered courses in Degree Works cannot register. In this run no step-by-step guide card was attached (guide keywords were too narrow; fixed after this run). (automatic grade was partial: The assistant correctly describes the general registration process and portal link but does not provide the official registration steps explicitly as required by the rubric. The assistant also does not mention the exact registration link or step-by-step instructions from the official references.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified MATH130 as a required course in Year 1 Semester 1 with the correct printed category and credits, matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER050: elm — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Mechanical Engineering):<br><br>حسب سجلك الذي أدخلته: 103 ساعة مكتملة، و16 قيد الدراسة. المتبقي من إجمالي 132 هو 29 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education — Cluster 1: 12 من 15 مكتملة، و3 قيد الدراسة<br>• College requirements: 32 من 32 مكتملة<br>• General Education — Cluster 3: 6 من 6 مكتملة<br>• General Education — Cluster 2: 9 من 12 مكتملة<br>• Major / specialization requirements: 42 من 59 مكتملة، و13 قيد الدراسة<br>• Internship: 2 من 2 مكتملة<br>• Major electives: 0 من 6 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: الرد صحيح في حساب الساعات المكتسبة والقيد والدراسة والمتبقية، لكنه لم يقدم ملاحظة تدقيق رسمية كما طلبت، ولم يذكر الملاحظة الرسمية المطلوبة في التقييم.) |

## Test Case POWER051: pine — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Published model — Year 3, Semester 2 (2022 Fall entry):<br>• [MECH306](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH306): Manufacturing Processes (3)<br>• [MECH310](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH310): Dynamics (3)<br>• [MECH426](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH426): Thermofluid System Design & Analysis (3)<br>• [MECH412](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH412): Machine Design II (3)<br>• [MECH350](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH350): Introduction to Mechatronics (3)<br>• [MECH430](https://www.uaeu.ac.ae/en/catalog/courses/course_2945.shtml?id=MECH430): Thermal Engineering Lab (1)<br>Published semester total: 16 credits.<br>Credits in the displayed courses not recorded as completed: 16.<br>Prerequisites needing confirmation: MECH306 (unknown), MECH310 (unknown), MECH426 (not-met), MECH412 (not-met), MECH350 (unknown), MECH430 (not-met). In-progress courses are not yet passed; recommendations remain conditional. Check the applicable probation credit-load limit with your advisor.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Mechanical Engineering — 2022 Fall-entry model study plan — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Courses match the student's official cohort model plan for the next position; prerequisite flags are computed from the record and catalog, and unknown conditions are labelled unknown rather than guessed. (automatic grade was partial: The assistant correctly identified the next semester's courses from the official plan and excluded passed courses. However, it incorrectly marked some prerequisites as 'not-met' without confirming from the student's completed courses, and did not explicitly state prerequisite conditions as required by the rubric. Also, it did not mention the exact catalog and entry season explicitly as per the rubric.) |

## Test Case POWER052: pine — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Mechanical Engineering):<br><br>From your self-reported record: 55 completed credits and 15 in progress. Against the recorded 147-credit requirement, 92 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education — Cluster 1: 6 of 15 earned<br>• College requirements: 26 of 32 earned, 6 in progress<br>• General Education — Cluster 3: 3 of 6 earned<br>• Major / specialization requirements: 20 of 58 earned, 9 in progress<br>• General Education — Cluster 2: 0 of 12 earned<br>• Internship: 0 of 15 earned<br>• Major electives: 0 of 9 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits earned (55), in progress (15), and remaining (92) matching the reference. However, the breakdown by requirement blocks is not supported by the official reference data and is not requested by the rubric, so it is extra and potentially inaccurate. The assistant meets the rubric on credit counts but adds unverified detail.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the unfulfilled elective slot and appropriately distinguished current published options from confirmed eligibility without promising approval or a seat. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER054: pine — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the 2022/2023 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2022_2023.pdf#page=612 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly checked the prerequisites CSBP219 and CSBP221 for CSBP319 against the student's record and catalog requirements, noting they are not met. The response aligns with the rubric and official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits (55), identifies in-progress credits (15), and lists unfinished blocks without certifying graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record. The assistant also appropriately refers to Degree Works and the advisor for official audit, meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated course recorded and appropriately asks for a course code to provide specific impact, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER058: pine — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>For your saved undergraduate status, you register courses through the UAEU portal 'eServices' after entering your courses into the Degree Works system according to your study plan; you must specify your courses in Degree Works to be able to register.<br><br>You should log into the UAEU portal at https://www.uaeu.ac.ae, sign in with your username and password, access 'eServices', then navigate to the Registration section to register your courses.<br><br>For undergraduates, excluding the College of Medicine and Health Sciences: You need to consult with your College academic advisor or advising unit before registering to ensure correct course selection according to your degree plan.<br><br>The normal course load per semester is between 12 and 19 credit hours for students in good standing; registering fewer than 12 credit hours requires College Dean approval.<br><br>If you do not register by the end of the registration period without an approved excuse, you will be considered on administrative leave for that semester and may face dismissal if failing to register in subsequent semesters. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2<br>3_undergraduate_registration_and_enrollment-en.pdf — https://www.uaeu.ac.ae/en/about/pdfs/policies/3_undergraduate_registration_and_enrollment-en.pdf#page=1<br>1_edite_2017-1866-booklet.pdf — https://www.uaeu.ac.ae/en/docs/1_edite_2017-1866-booklet.pdf#page=15 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provided official registration steps and the appropriate portal link without claiming to register courses or access live records, fully meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER059: pine — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is MATH1110 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | MATH1110: Calculus I for Engineering; 3 credits; Gen Ed Course (Cluster 1: Area 5: Quantitative Reasoning); Year 1, Semester 1 — one option in a choice group.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf<br>UAEU Catalog — MATH1110 Calculus I for Engineering — https://www.uaeu.ac.ae/ar/dvcaa/aau/pdfs/course-catalog_2019-2020.pdf#page=619 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified MATH1110 as a Year 1 Semester 1 course, its credit hours, and printed category exactly matching the official study plan and catalog. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER060: pine — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Mechanical Engineering):<br><br>حسب سجلك الذي أدخلته: 55 ساعة مكتملة، و15 قيد الدراسة. المتبقي من إجمالي 147 هو 92 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education — Cluster 1: 6 من 15 مكتملة<br>• College requirements: 26 من 32 مكتملة، و6 قيد الدراسة<br>• General Education — Cluster 3: 3 من 6 مكتملة<br>• Major / specialization requirements: 20 من 58 مكتملة، و9 قيد الدراسة<br>• General Education — Cluster 2: 0 من 12 مكتملة<br>• Internship: 0 من 15 مكتملة<br>• Major electives: 0 من 9 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | الإجابة صحيحة حيث تم حساب الساعات المكتسبة والقيد الدراسة والمتبقية بدقة وفق السجل الرسمي وخطة الدراسة، وتم تقديم ملاحظة تدقيق رسمية كما هو مطلوب. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER061: ash — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Published model — Year 4, Semester 2 (2023 Fall entry):<br>• Approved elective selection: Student choice (3)<br>• [CHME508](https://www.uaeu.ac.ae/en/catalog/courses/course_2904.shtml?id=CHME508): Process Control (3)<br>• [CHME590](https://www.uaeu.ac.ae/en/catalog/courses/course_2904.shtml?id=CHME590): Capstone Engineering Design Project (3)<br>• [CHME528](https://www.uaeu.ac.ae/en/catalog/courses/course_2904.shtml?id=CHME528): Unit Operation and Process Control Lab (1)<br>• [CHME506](https://www.uaeu.ac.ae/en/catalog/courses/course_2904.shtml?id=CHME506): Process Modeling & Simulation (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 16 credits.<br>Credits in the displayed courses not recorded as completed: 16.<br>Prerequisites needing confirmation: CHME590 (not-met), CHME528 (unknown). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Chemical Engineering — 2023 Fall-entry model study plan — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the next semester as Year 4 Semester 2, listed all required courses and electives, excluded passed courses, and noted prerequisite conditions accurately without inventing sequences. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER062: ash — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Chemical Engineering):<br><br>From your self-reported record: 94 completed credits and 13 in progress. Against the recorded 132-credit requirement, 38 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education — Cluster 1: 9 of 15 earned, 6 in progress<br>• College requirements: 26 of 26 earned<br>• General Education — Cluster 3: 6 of 6 earned<br>• General Education — Cluster 2: 9 of 12 earned<br>• Major / specialization requirements: 39 of 56 earned, 7 in progress<br>• Internship: 2 of 2 earned<br>• Major electives: 0 of 12 earned<br>• Requirement category unresolved in extraction: 3 of 3 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly counted unique passing completed courses and in-progress credits, matched the total required credits, and provided a detailed breakdown by requirement category as per the rubric and official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the unfulfilled elective slots and clearly distinguished that eligibility and approval are not confirmed, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER064: ash — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the 2023/2024 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2023_2024.pdf#page=621 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly checked the prerequisites CSBP219 and CSBP221 for CSBP319 against the student's record and catalog requirements, noting they are not met and explaining concurrent enrollment conditions. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly used earned credits, identified unfinished blocks, and did not certify graduation, aligning with the rubric and official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that repeated passed courses count once and failed attempts earn no credits, aligns with the rubric and reference, and does not invent downstream eligibility or GPA decisions. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER068: ash — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>For your saved undergraduate level, you register courses through the UAEU portal 'eServices' after specifying your courses in the Degree Works system according to your study plan; without specifying them in Degree Works, you cannot register.<br><br>To register, log into the UAEU portal at https://my.uaeu.ac.ae using your username and password, then select ESERVICES and navigate to the Registration section.<br><br>For undergraduates, excluding the College of Medicine and Health Sciences: All degree-status undergraduate students are expected to register in each regular semester and must be advised by their College or appropriate academic advisor before registering for classes.<br><br>If you miss early registration, you can register during the add/drop period at the beginning of the next semester. Failure to register and not applying for postponement may lead to administrative dismissal. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2<br>3_undergraduate_registration_and_enrollment-en.pdf — https://www.uaeu.ac.ae/en/about/pdfs/policies/3_undergraduate_registration_and_enrollment-en.pdf#page=1 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provided official registration steps and the appropriate portal link without claiming to register courses or access live records, fully meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified MATH130 as Calculus I for Engineering, its credit value, category, and the term it is taken (Year 1, Semester 1) exactly matching the official study plan and catalog. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER070: ash — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Chemical Engineering):<br><br>حسب سجلك الذي أدخلته: 94 ساعة مكتملة، و13 قيد الدراسة. المتبقي من إجمالي 132 هو 38 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education — Cluster 1: 9 من 15 مكتملة، و6 قيد الدراسة<br>• College requirements: 26 من 26 مكتملة<br>• General Education — Cluster 3: 6 من 6 مكتملة<br>• General Education — Cluster 2: 9 من 12 مكتملة<br>• Major / specialization requirements: 39 من 56 مكتملة، و7 قيد الدراسة<br>• Internship: 2 من 2 مكتملة<br>• Major electives: 0 من 12 مكتملة<br>• Requirement category unresolved in extraction: 3 من 3 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_chemical_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | الإجابة صحيحة حيث تم حساب الساعات المكتسبة والقيد الدراسة والمتبقية بدقة وفق السجل الرسمي وخطة الدراسة، وتمت الإجابة باللغة العربية كما هو مطلوب. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER071: olive — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Published model — Year 3, Semester 2 (2022 Fall entry):<br>• [ACCT225](https://www.uaeu.ac.ae/ar/dvcaa/aau/pdfs/course-catalog_2019-2020.pdf#page=3): Fundamental of Cost & Management Accounting (3)<br>• [GEIE222](https://www.uaeu.ac.ae/en/catalog/courses/course_5018.shtml?id=GEIE222): Fundamentals of Innovation and Entrepreneurship (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>• Approved elective selection: Student choice (3)<br>Published semester total: 15 credits.<br>Credits in the displayed courses not recorded as completed: 15.<br>Prerequisites needing confirmation: ACCT225 (unknown), GEIE222 (unknown). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Economics — 2022 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Partially correct |
| Comments | Hand review: Next-semester courses match the 2022 Economics model plan, but the ACCT225 link points to an old Arabic 2019-20 catalog PDF instead of the current course page. |

## Test Case POWER072: olive — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>From your self-reported record: 48 completed credits and 12 in progress. Against the recorded 120-credit requirement, 72 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education — Cluster 2: 6 of 12 earned<br>• General Education — Cluster 1: 6 of 15 earned, 3 in progress<br>• Requirement category unresolved in extraction: 24 of 51 earned, 6 in progress<br>• Major / specialization requirements: 12 of 18 earned, 3 in progress<br>• Major electives: 0 of 12 earned<br>• General Education — Cluster 3: 0 of 6 earned<br>• Free electives: 0 of 6 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits earned, in progress, and remaining per the student record and requirement of 120 credits. However, the breakdown by requirement blocks is not supported by the official reference or student record and may be inaccurate or incomplete, thus missing the rubric's requirement for accurate credit accounting by category.) |

## Test Case POWER073: olive — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Gen Ed Course (Cluster 2: Area 1: Humanities and Fine Arts) (3 credits)<br>• Year 2, Semester 1: Major Elective (3 credits)<br>• Year 2, Semester 1: Gen Ed Course (Cluster 3: Area 1: Natural Sciences) (3 credits)<br>• Year 2, Semester 2: Gen Ed Course (Cluster 1: Area 4: Critical Thinking) (3 credits)<br>• Year 3, Semester 1: Major Elective (3 credits)<br>• Year 3, Semester 2: Major Elective (3 credits)<br>• Year 3, Semester 2: Major Elective (3 credits)<br>• Year 3, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 1: Free Elective (3 credits)<br>Eligible elective names are not confirmed for this catalog.<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf<br>Bachelor of Economics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-economics.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified all unfulfilled elective slots according to the official study plan and student record, and appropriately cautioned that eligibility and approval are not confirmed. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER074: olive — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the 2022/2023 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2022_2023.pdf#page=612 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly checked the prerequisites CSBP219 and CSBP221 for CSBP319 against the student's record and noted they are not met, following the rubric and official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER075: olive — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Economics):<br><br>From your self-reported record: 48/120 credits are earned, 12 are in progress, and 72 are not yet earned. Unfinished recorded blocks: General Education — Cluster 2; General Education — Cluster 1; Requirement category unresolved in extraction; Major / specialization requirements; Major electives; General Education — Cluster 3; Free electives. Credit totals alone do not establish graduation completion.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits, identifies unfinished blocks, and does not certify graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated attempt recorded and appropriately asks for course code to identify any affected requirements, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER078: olive — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>To register your courses at UAEU as an undergraduate student, you must first insert the courses into the Degree Works system according to your study plan; students who do not specify their courses in Degree Works will not be able to register.<br><br>You register your courses through the UAEU portal by logging in with your username and password, accessing eServices, and then navigating to the Registration section.<br><br>If you need help with registration, you can contact the Registration Department or your College Advising Unit for assistance. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | Hand review: Matches the official registration guide (user_guide_registration_classes.pdf p.2): register through eServices after entering courses in Degree Works; students who have not entered courses in Degree Works cannot register. In this run no step-by-step guide card was attached (guide keywords were too narrow; fixed after this run). (automatic grade was partial: The assistant correctly describes the general registration process and portal navigation but incorrectly states that students must insert courses into Degree Works to register, which is not supported by the official reference or rubric. The assistant also does not provide the official registration link as required by the rubric.) |

## Test Case POWER079: olive — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is MATH115 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | MATH115: Calculus for Business & Economics; 3 credits; Gen Ed Course (Cluster 1: Area 5: Quantitative Reasoning); Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf<br>UAEU Catalog — MATH115 Calculus for Business & Economics — https://www.uaeu.ac.ae/en/catalog/courses/course_2943.shtml?id=MATH115 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified MATH115 as a required course in the Bachelor of Economics program, its category as a Gen Ed Course (Cluster 1: Area 5: Quantitative Reasoning), and its term as Year 1, Semester 1, matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER080: olive — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Economics):<br><br>حسب سجلك الذي أدخلته: 48 ساعة مكتملة، و12 قيد الدراسة. المتبقي من إجمالي 120 هو 72 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education — Cluster 2: 6 من 12 مكتملة<br>• General Education — Cluster 1: 6 من 15 مكتملة، و3 قيد الدراسة<br>• Requirement category unresolved in extraction: 24 من 51 مكتملة، و6 قيد الدراسة<br>• Major / specialization requirements: 12 من 18 مكتملة، و3 قيد الدراسة<br>• Major electives: 0 من 12 مكتملة<br>• General Education — Cluster 3: 0 من 6 مكتملة<br>• Free electives: 0 من 6 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cbe/pdf/cbe_bsc_economics_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: الإجابة صحيحة في حساب الساعات المكتسبة والقيد والدراسة والمتبقية، لكنها لم تذكر الملاحظة الرسمية للتدقيق كما طلبت التعليمات، ولم تذكر الملاحظة الرسمية (official-audit note).) |

## Test Case POWER081: palm — Next semester

Turn 1

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Use this account’s exact catalog and entry season, infer the next model position, exclude passed courses and expose prerequisite conditions. If the official plan conflicts or is missing, say so without inventing a sequence. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Published model — Year 2, Semester 2 (2025 Fall entry):<br>• [CSBP340](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP340): Database Systems (3)<br>• [CENG530](https://www.uaeu.ac.ae/en/catalog/courses/course_2948.shtml?id=CENG530): Computer Network Protocols (3)<br>• [ITBP301](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP301): Security Principles & Practice (3)<br>• Approved elective selection: Student choice (3)<br>• [CENG529](https://www.uaeu.ac.ae/en/catalog/courses/course_2948.shtml?id=CENG529): Networking Lab (1)<br>Published semester total: 13 credits.<br>Credits in the displayed courses not recorded as completed: 13.<br>The plan's printed degree total doesn't match the sum of its semesters (Plan sum 120.0 != printed degree total 130); the semester list above matches its printed semester total. Confirm the degree total with your advisor. Prerequisites needing confirmation: CSBP340 (unknown), CENG530 (not-met), ITBP301 (not-met), CENG529 (not-met). In-progress courses are not yet passed; recommendations remain conditional.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2025 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the next semester (Year 2 Semester 2) courses from the official 2025/2026 catalog, excluded passed courses, and noted prerequisite conditions and credit discrepancies as per the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER082: palm — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 28 completed credits and 16 in progress. Against the recorded 130-credit requirement, 102 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• General Education requirements: 6 of 21 earned, 3 in progress<br>• College requirements: 21 of 41 earned, 6 in progress<br>• Major / specialization requirements: 1 of 36 earned, 7 in progress<br>• Major electives: 0 of 10 earned<br>• Free electives: 0 of 6 earned<br>• Internship: 0 of 6 earned<br>• AI minor — allocation and cohort applicability pending: 0 of 18 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Profile requirement source — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states total credits earned, in progress, and remaining per the record and requirement, but the breakdown by requirement blocks is not supported by the official reference or student record and may be inaccurate or invented. The assistant also correctly notes that credit total alone does not satisfy all requirements.) |

## Test Case POWER083: palm — Electives left

Turn 1

| Field | Details |
|---|---|
| Question | Which electives can I still take? |
| Expected answer | Identify unfulfilled matching-model elective slots; distinguish current published options from confirmed cohort eligibility. Never promise a seat or approval. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>Elective slots in your model that are not recorded as completed:<br>• Year 1, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 2, Semester 2: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 3, Semester 2: Major Elective (3 credits)<br>• Year 4, Semester 1: Major Elective (3 credits)<br>• Year 4, Semester 1: Gen. Ed. Theme 6 or 7 or 8 or 9 or 10 or 11 (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 2: Free Elective (3 credits)<br>• Year 4, Semester 2: Major Elective (3 credits)<br><br>Currently published choices (verify applicability to your catalog):<br>Free Elective (6 hours) \| Credit Hours<br>Prerequisites, requirement category, actual offering and advisor approval still need checking.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml<br>Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified all unfulfilled elective slots and distinguished current published options without promising approval or seats, fully aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER084: palm — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: conditional.<br>• CSBP219: prerequisite; minimum grade D; met<br>• CSBP221: pre-or-corequisite; minimum grade D; conditional-concurrent<br>Computed from the 2025/2026 catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/course_catalog_2025_2026.pdf#page=597 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified CSBP219 as a prerequisite with minimum grade D met, and CSBP221 as a pre/corequisite with minimum grade D currently in progress, making enrollment conditional. The response aligns with the official catalog and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER085: palm — Graduation status

Turn 1

| Field | Details |
|---|---|
| Question | Am I on track to graduate? |
| Expected answer | Use earned rather than applied-plus-in-progress credits and identify unfinished recorded blocks. Do not certify graduation or hide unresolved categories/source conflicts. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (Bachelor of Science in Information Technology):<br><br>From your self-reported record: 28/130 credits are earned, 16 are in progress, and 102 are not yet earned. Unfinished recorded blocks: General Education requirements; College requirements; Major / specialization requirements; Major electives; Free electives; Internship; AI minor — allocation and cohort applicability pending. Credit totals alone do not establish graduation completion.<br>The matching model is unavailable or has a validation conflict; cohort requirements need review.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits, identifies unfinished blocks, and does not certify graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER086: palm — Minor

Turn 1

| Field | Details |
|---|---|
| Question | What is in my minor? |
| Expected answer | If no minor is recorded say so. For the AI minor, cite its official current requirements and distinguish current rules from unverified historical applicability. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | **Minor in Artificial Intelligence**<br><br><br>Required Credit Hours : minimum 18 hours<br><br>Artificial Intelligence<br><br>Required Courses (9 hours) \| Credit Hours<br>CSBP219 \| Object Oriented Programming \| 3<br>CSBP319 \| Data Structures \| 3<br>CSBP301 \| Artificial Intelligence 1 \| 3<br>1 : This course is not required for students majoring in BSc in Information Technology program<br><br>Elective Courses<br><br>Elective Courses (12 Hours) for students majoring in Information Technology , and (9 Hours) for all other majors (12 hours) \| Credit Hours<br>CSBP411 \| Machine Learning \| 3<br>CSBP476 \| Robotics and Intelligent Systems \| 3<br>CSBP441 \| Applied Computer Vision \| 3<br>CSBP491 \| Computational Intelligence for Data Management \| 3<br>CSBP475 \| Advanced topics in Data Science \| 3<br>CSBP477 \| Natural Language Processing \| 3<br><br><br>These are the current page’s requirements; confirm they match your minor’s catalog year.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml<br>Minor in Artificial Intelligence — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in--artificial-intelligence.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified the minor as 'Minor in Artificial Intelligence' and accurately cited the current official requirements, distinguishing the note about CSBP301 not being required for Information Technology majors. The response aligns with the official reference and rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states there is no failed or repeated attempt recorded and appropriately asks for the course code without inventing any eligibility or GPA decisions, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER088: palm — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Based on your saved profile (undergraduate student):<br><br>For your saved undergraduate level, you register courses through the UAEU portal "eServices" after specifying your courses in the Degree Works system according to your study plan; students who do not specify their courses in Degree Works will not be able to register.<br><br>To register, log into the university website, access my.uaeu.ac.ae, enter your username and password, then go to eServices and the Registration section to complete your course registration.<br><br>You can view your course schedule through eServices by selecting Student & Financial Aid, then Registration, and accessing the Student Detailed Schedule for your chosen term.<br><br>Failure to register by the end of the registration period results in being considered on administrative leave for that semester, and failure to register in subsequent semesters without approved leave can lead to administrative dismissal. |
| Actual sources | Frequently Asked Questions (FAQs) — https://www.uaeu.ac.ae/en/dvcsae/registration/frequently_asked_questuons.shtml<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2<br>1_edite_2017-1866-booklet.pdf — https://www.uaeu.ac.ae/en/docs/1_edite_2017-1866-booklet.pdf#page=15 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provided official registration steps and the appropriate portal link without claiming to register courses or access live records, fully meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER089: palm — course belongs to plan

Turn 1

| Field | Details |
|---|---|
| Question | Is GEAE101 required in my major, and which semester is it normally taken? |
| Expected answer | Identify the course only from this exact matching plan; indicate its printed category and term. A course not found is not automatically unnecessary. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | GEAE101: Academic English for Humanities and STEM; 3 credits; Gen. Ed. Theme 2: Academic Language Proficiency; Year 1, Semester 1.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Recorded program/cohort requirement source — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml<br>UAEU Catalog — GEAE101 Academic English for Humanities and STEM — https://www.uaeu.ac.ae/en/catalog/courses/course_4964.shtml?id=GEAE101 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified GEAE101 as Academic English for Humanities and STEM, a 3-credit General Education course under Theme 2, taken in Year 1 Semester 1, matching the official study plan and catalog. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER090: palm — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | بناءً على ملفك المحفوظ (Bachelor of Science in Information Technology):<br><br>حسب سجلك الذي أدخلته: 28 ساعة مكتملة، و16 قيد الدراسة. المتبقي من إجمالي 130 هو 102 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• General Education requirements: 6 من 21 مكتملة، و3 قيد الدراسة<br>• College requirements: 21 من 41 مكتملة، و6 قيد الدراسة<br>• Major / specialization requirements: 1 من 36 مكتملة، و7 قيد الدراسة<br>• Major electives: 0 من 10 مكتملة<br>• Free electives: 0 من 6 مكتملة<br>• Internship: 0 من 6 مكتملة<br>• AI minor — allocation and cohort applicability pending: 0 من 18 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf<br>Profile requirement source — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/minor-in-artificial-intelligence.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: الرد صحيح في حساب الساعات المكتسبة والقيد والدراسة والمتبقية، لكنه لم يذكر الملاحظة الرسمية للتدقيق كما طلبت المعايير، كما أن توزيع الساعات حسب الفئات غير موضح في المرجع الرسمي بدقة.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies the program, catalog, and current model position, and appropriately states the lack of a validated semester model for the next term without inventing a sequence, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER092: juniper — Credits remaining

Turn 1

| Field | Details |
|---|---|
| Question | How many credits do I have left? |
| Expected answer | Count completed applied unique passing courses once; exclude in-progress, failed, pending transfer and fall-through. State the recorded requirement, earned credits, in-progress credits and amount not yet earned. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Based on your saved profile (Master of Science in Information Technology Management):<br><br>From your self-reported record: 0 completed credits and 0 in progress. Against the recorded 30-credit requirement, 30 credits are not yet earned. Reaching the credit total alone does not satisfy every requirement.<br>By requirement block:<br>• Core courses: 0 of 6 earned<br>• Specialization courses: 0 of 12 earned<br>• Thesis or non-thesis option requirements: 0 of 12 earned<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Totals match the account's record (unique passing applied courses; in-progress counted separately) and the per-block lines are the record's own requirement blocks, which sum to the earned total. The Degree Works/advisor note is present. The grader's reference had no block data. (automatic grade was partial: The assistant correctly states the total required credits, earned credits, in-progress credits, and credits not yet earned, matching the official reference. However, the breakdown by requirement block is not supported by the official reference and may be inaccurate or hallucinated.) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies the lack of a matching semester model and appropriately refers the student to official audit sources without promising any seats or approvals. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER094: juniper — Prerequisite check

Turn 1

| Field | Details |
|---|---|
| Question | Can I take CSBP 319 — do I meet its prerequisites? |
| Expected answer | Use the actual saved passing attempts, minimum grade conditions, and pre/corequisite relations. In-progress work is conditional, never already passed. Cite the specific course. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Prerequisite check for CSBP319 against your self-reported record: not-met.<br>• CSBP219: prerequisite; minimum grade D; not-met<br>• CSBP221: pre-or-corequisite; minimum grade D; not-met<br>Computed from the current catalog conditions and your self-reported attempts; concurrent enrollment is conditional, not a completed prerequisite.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | CSBP319 official course catalog — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identified that the student does not meet the prerequisite CSBP219 with minimum grade D and the pre/corequisite CSBP221 with minimum grade D for CSBP319, citing the official course record and student's current record. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly uses earned credits, identifies unfinished blocks, and does not certify graduation, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that no minor is recorded for the student, consistent with the official record showing an empty minors list. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states no failed or repeated attempts are recorded and appropriately asks for course code without inventing eligibility or GPA decisions. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER098: juniper — Registration

Turn 1

| Field | Details |
|---|---|
| Question | How do I register my courses at UAEU? |
| Expected answer | Give official registration steps and the appropriate registration/portal link. Do not claim to register courses or access the student’s live record. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | Based on your saved profile (graduate student):<br><br>Graduate students at UAEU must self-register for their courses through the online e-Services portal during the official registration period specified in the academic calendar.<br><br>Graduate students are expected to register every semester during the official registration period following the schedule and guidelines published by the Department of Registration, choosing courses according to their individual Study Plans.<br><br>To register, log into the UAEU portal at https://my.uaeu.ac.ae using your username and password, then access the e-Services section to complete your course registration. |
| Actual sources | Microsoft Word - 3_graduate_studies_procedures_en-23012014 — https://www.uaeu.ac.ae/en/about/procedures/graduate_programs/pro-gs_02_en.pdf#page=3<br>NOTE FROM THE DEAN OF THE COLLEGE OF GRADUATE STUDIES OVERVIEW OF THE UNITED ARAB EMIRATES UNIVERSITY OVERVIEW OF GRADUATE STUDIES AT UAEU — https://www.uaeu.ac.ae/en/cgs/file/graduate_student_handbook_2021-2022.pdf#page=12<br>user_guide_registration_classes.pdf — https://www.uaeu.ac.ae/en/docs/user_guide_registration_classes.pdf#page=2 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provides the official registration steps and the appropriate portal link without claiming to register courses or access live records, fully meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

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
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that ITCO601 is not found in the matching plan for the student's major and semester, and appropriately notes that this does not imply the course is unnecessary or disallowed as an elective, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER100: juniper — Arabic remaining credits

Turn 1

| Field | Details |
|---|---|
| Question | كم ساعة باقي لي في خطتي؟ |
| Expected answer | Answer in Arabic. Count the same self-reported earned, in-progress and remaining credits as the English case, with an official-audit note. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Actual answer | بناءً على ملفك المحفوظ (Master of Science in Information Technology Management):<br><br>حسب سجلك الذي أدخلته: 0 ساعة مكتملة، و0 قيد الدراسة. المتبقي من إجمالي 30 هو 30 ساعة لم تُكتسب بعد؛ ولا يعني اكتمال العدد وحده استيفاء كل المتطلبات.<br>حسب المتطلبات:<br>• Core courses: 0 من 6 مكتملة<br>• Specialization courses: 0 من 12 مكتملة<br>• Thesis or non-thesis option requirements: 0 من 12 مكتملة<br>المرجع الرسمي للتدقيق هو Degree Works ومرشدك الأكاديمي. |
| Actual sources | Profile requirement source — https://www.uaeu.ac.ae/en/cit/programs/graduate/master-of-science-in-information-technology-management.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | الإجابة صحيحة حيث تم ذكر عدد الساعات المكتسبة والقيد الدراسة والمتبقية بشكل دقيق وفق السجل الرسمي، وتمت الإشارة إلى المراجعة الرسمية. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER101: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | What are the prerequisites for CSBP 219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for the undergraduate course CSBP219 Object Oriented Programming is to have completed CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite course and minimum grade as per the official catalog record. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER102: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | What are the prerequisites for CSBP219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for the undergraduate course CSBP219 Object Oriented Programming is completing CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite course and minimum grade as per the official record. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER103: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | what are the prerequisits for csbp-219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for CSBP219 Object Oriented Programming is completing CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite course and minimum grade as per the official catalog record. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER104: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | what is the pre requisite for csbp 219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for CSBP219 Object Oriented Programming is the course CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite course and minimum grade as per the official catalog record. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER105: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | What are the prerequisites for CSPB 219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | The prerequisite for CSBP219 Object Oriented Programming is successful completion of CSBP119 Algorithms and Problem Solving with a minimum grade of D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | Hand review: Maps the typo CSPB 219 to CSBP219 and gives the catalog prerequisite: CSBP119 with a minimum grade of D (official course page). (automatic grade was partial: The assistant correctly identified the prerequisite course CSBP119 with a minimum grade D, but the course code was initially misstated as CSPB219 instead of CSBP219, which should have been clarified rather than assumed. The assistant also slightly misnamed CSBP119 as 'Algorithms and Problem Solving' which is not confirmed by the reference.) |

## Test Case POWER106: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | هل لمساق CSBP 219 متطلبات سابقة؟ |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | مساق CSBP219 البرمجة كائنية التوجه من 3 ساعات معتمدة ويتطلب إكمال مساق CSBP119 الخوارزميات وحل المشكلات بدرجة لا تقل عن D كمتطلب سابق. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite course CSBP119 with a minimum grade D for CSBP219, matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER107: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | شو لازم أخلص قبل CSBP219؟ |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | قبل ما تسجل في مساق CSBP219 البرمجة كائنية التوجه، لازم تكون خلصت مساق CSBP119 الخوارزميات وحل المشكلات بدرجة لا تقل عن D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite course CSBP119 with a minimum grade D for CSBP219 as per the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER108: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | CSBP 219 corequisite? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | CSBP219 Object Oriented Programming does not have any corequisite courses listed; it only requires completing CSBP119 Algorithms and Problem Solving with a minimum grade of D as a prerequisite before enrollment. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states that CSBP219 has no corequisites and accurately identifies CSBP119 with minimum grade D as the prerequisite, matching the official record. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER109: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | Does CSBP219 have a corequisite? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | CSBP219 Object Oriented Programming has a prerequisite of CSBP119 Algorithms and Problem Solving with a minimum grade of D, but it does not have any corequisite courses. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite and absence of corequisites for CSBP219 as per the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER110: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | Can I study CSBP-219 without CSBP119? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | You cannot study CSBP219 (Object Oriented Programming) without first completing CSBP119 (Algorithms and Problem Solving) with at least a grade of D, as CSBP119 is a prerequisite for CSBP219. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the prerequisite CSBP119 with a minimum grade D for CSBP219, matching the official catalog record. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER111: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | قارن متطلبات CSBP219 وCSBP319 |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | مساق CSBP219 البرمجة كائنية التوجه هو مساق جامعي من 3 ساعات معتمدة، ويتطلب إكمال مساق CSBP119 الخوارزميات وحل المشكلات بدرجة لا تقل عن D كمتطلب سابق.<br><br>مساق CSBP319 هياكل البيانات هو مساق جامعي من 3 ساعات معتمدة، ويتطلب اجتياز مساق CSBP219 البرمجة كائنية التوجه بدرجة لا تقل عن D، بالإضافة إلى أن مساق CSBP221 يمكن أن يكون متطلبًا سابقًا أو متطلبًا مقرونًا بدرجة لا تقل عن D. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219<br>UAEU Course Catalog — CSBP319 Data Structures — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP319 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states the credit hours and prerequisite requirements for CSBP219 and CSBP319 as per the official catalog, including the minimum grade D and the prerequisite/corequisite relation for CSBP221 in CSBP319. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER112: Course code variant

Turn 1

| Field | Details |
|---|---|
| Question | What is the difference between a prerequisite and a corequisite for CSBP219? |
| Expected answer | Use the specific official course record. Preserve the actual prerequisite/corequisite relation and minimum grades. A transposed unknown code should be clarified rather than invented. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Actual answer | A prerequisite for CSBP219 Object Oriented Programming is a course that must be completed before enrolling in CSBP219, specifically CSBP119 Algorithms and Problem Solving with a minimum grade of D.<br><br>I cannot view your personal student record; this explains the published rules, not an individual eligibility decision. |
| Actual sources | UAEU Course Catalog — CSBP219 Object Oriented Programming — https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly explained the prerequisite for CSBP219 and did not invent any information about corequisites, aligning with the official reference and rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER113: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Who created you? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | I'm the UAEU AI Assistant, built by UAEU students from the College of Computing and Artificial Intelligence (CCAI) as their Senior Graduation Project. As your UAEU student-services assistant, I help with admissions, courses, plans and services using official UAEU sources. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies its creators as UAEU students from the College of Computing and Artificial Intelligence (CCAI), matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER114: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Who are you? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | I'm the UAEU AI Assistant, built by UAEU students from the College of Computing and Artificial Intelligence (CCAI) as their Senior Graduation Project. As your UAEU student-services assistant, I help with admissions, courses, plans and services using official UAEU sources. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies itself as built by UAEU students from the College of Computing and Artificial Intelligence (CCAI), matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER115: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | What are you? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | I'm the UAEU AI Assistant, built by UAEU students from the College of Computing and Artificial Intelligence (CCAI) as their Senior Graduation Project. As your UAEU student-services assistant, I help with admissions, courses, plans and services using official UAEU sources. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies itself as built by UAEU students from the College of Computing and Artificial Intelligence (CCAI), matching the official reference. It responds appropriately to the user's intent without adding incorrect information. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER116: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | What can you do? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | I can help with UAEU programs, study plans, courses, admissions and services using official university pages and documents, with source links. When relevant I can use your saved profile; I cannot access your live university record. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly states its capabilities related to UAEU programs and services but does not mention the College of Computing and Artificial Intelligence or the specific Bachelor program as per the official reference, missing key details.) |

## Test Case POWER117: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Where does your information come from? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | I can help with UAEU programs, study plans, courses, admissions and services using official university pages and documents, with source links. When relevant I can use your saved profile; I cannot access your live university record. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly states it uses official university pages and documents and mentions source links, which aligns with the reference to official sources. However, it does not address the 2025 source conflict or ask for the missing entry cohort as required by the rubric.) |

## Test Case POWER118: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | مين صنعك؟ |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | أنا مساعد جامعة الإمارات للذكاء الاصطناعي، طوّرني فريق من طلبة كلية الحوسبة والذكاء الاصطناعي (CCAI) ضمن مشروع تخرجهم. أساعدك بالاعتماد على مصادر الجامعة الرسمية. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies itself as developed by students from the College of Computing and Artificial Intelligence (CCAI), matching the official reference and responding appropriately in Arabic. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER119: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | من أنت؟ |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | أنا مساعد جامعة الإمارات للذكاء الاصطناعي، طوّرني فريق من طلبة كلية الحوسبة والذكاء الاصطناعي (CCAI) ضمن مشروع تخرجهم. أساعدك بالاعتماد على مصادر الجامعة الرسمية. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies itself as a UAE University AI assistant developed by CCAI students, matching the official reference and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER120: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | ما مصادرك؟ |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | أساعدك في البرامج والخطط والمساقات والقبول والخدمات بالاعتماد على صفحات جامعة الإمارات ووثائقها الرسمية، وأرفق الروابط المناسبة. أستخدم ملفك المحفوظ عند الحاجة؛ ولا أستطيع الدخول إلى سجلك الجامعي المباشر. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly states reliance on official UAE University pages and documents without fabricating specific sources, aligning with the rubric and reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER121: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Hi, my name is Noor. I am a second year IT student. |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Hi Noor! I'm the UAEU AI Assistant. I can help with your study plan, course requirements or university services. What would you like to start with? |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly greets the student and offers relevant help, but it does not address the student's specific program or cohort details as per the rubric.) |

## Test Case POWER122: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Hello, I am a prospective master’s applicant. |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Hi! I'm the UAEU AI Assistant. I can help you compare programs, check admission requirements, fees and scholarships, and find out how to apply. What would you like to start with? |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly offers help relevant to a prospective master's applicant but does not address the specific program names or cohorts from the official reference, nor does it ask for the missing entry cohort as required by the rubric.) |

## Test Case POWER123: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | مرحبا، اسمي نور، أنا طالب في السنة الثانية. |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | مرحباً نور! أنا مساعد جامعة الإمارات للذكاء الاصطناعي. أستطيع مساعدتك في خطتك الدراسية، متطلبات المساقات أو خدمات الجامعة. بماذا تحب أن نبدأ؟ |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly greets the student and offers help related to study plans and university services, aligning with the rubric's intent to respond in the user's language and context. However, it does not ask for the missing entry cohort or expose the 2025 source conflict as required by the rubric.) |

## Test Case POWER124: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Thanks |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | You're welcome. Ask another UAEU question whenever you are ready. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant's response is polite and invites further questions, aligning with the conversational intent and rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER125: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Bye |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Goodbye! Come back any time you need help with anything at UAEU. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant's farewell is appropriate and aligns with the conversational intent without introducing errors or irrelevant information. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER126: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Hi |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Hello! I'm the UAEU student-services assistant. Ask a specific question about admissions, courses, documents, fees, scholarships, housing, or another university service, and I'll answer with the verified details and source. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly greets and invites questions about university services but does not address the user's greeting or provide any information about UAE University or its programs as per the rubric and reference.) |

## Test Case POWER127: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Where can I check UAEU academic calendar deadlines? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | You can check the official UAEU academic calendar and its deadlines at https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en, where dates for registration, add/drop, withdrawal, and final exams are listed for each semester. |
| Actual sources | UAEU Academic Calendar — https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly responded to the student's question about the academic calendar and accurately recalled the first question when asked. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

Turn 2

| Field | Details |
|---|---|
| Question | What was my first question? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Your first message was: “Where can I check UAEU academic calendar deadlines?” |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly responded to the student's question about the academic calendar and accurately recalled the first question when asked. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER128: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | I study Mechanical Engineering. |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Got it, I'll keep that in mind. What would you like help with? For example: next semester's courses, credits left, or a course's prerequisites. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly acknowledged the student's major and offered relevant help options, but did not mention or clarify the missing entry cohort or the 2025 source conflict as required by the rubric.) |

Turn 2

| Field | Details |
|---|---|
| Question | Summarize our chat |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | You asked about these topics in the available messages:<br>• I study Mechanical Engineering. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly acknowledged the student's major and offered relevant help options, but did not mention or clarify the missing entry cohort or the 2025 source conflict as required by the rubric.) |

## Test Case POWER129: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Who created you? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | I'm the UAEU AI Assistant, built by UAEU students from the College of Computing and Artificial Intelligence (CCAI) as their Senior Graduation Project. As your UAEU student-services assistant, I help with admissions, courses, plans and services using official UAEU sources. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies its creators as UAEU students from the College of Computing and Artificial Intelligence (CCAI), matching the official reference and responding appropriately in Arabic as per the user's language. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

Turn 2

| Field | Details |
|---|---|
| Question | لخص محادثتنا |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | الموضوعات التي سألت عنها في الرسائل المتاحة:<br>• Who created you? |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies its creators as UAEU students from the College of Computing and Artificial Intelligence (CCAI), matching the official reference and responding appropriately in Arabic as per the user's language. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER130: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Hi, my name is Noor. I am an IT major in my second year, second semester. |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Hi Noor! I'm the UAEU AI Assistant. I can help with your study plan, course requirements or university services. What would you like to start with? |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly asks for the missing entry cohort and provides a detailed study plan for Fall 2022 entry, which aligns with the student's information. However, it uses the old college name 'College of Information Technology' instead of the current 'College of Computing and Artificial Intelligence (CCAI)' and does not mention the updated degree name 'Bachelor of Science in Computer and Artificial Intelligence Engineering' as per the official reference.) |

Turn 2

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Your next model-plan position is Year 3, Semester 1. What year were you admitted, and was your entry in Fall or Spring? |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly asks for the missing entry cohort and provides a detailed study plan for Fall 2022 entry, which aligns with the student's information. However, it uses the old college name 'College of Information Technology' instead of the current 'College of Computing and Artificial Intelligence (CCAI)' and does not mention the updated degree name 'Bachelor of Science in Computer and Artificial Intelligence Engineering' as per the official reference.) |

Turn 3

| Field | Details |
|---|---|
| Question | Fall 2022 |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Published model — Year 3, Semester 1 (2022 Fall entry):<br>• [ITBP322](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP322): Web and Mobile Systems (3)<br>• [BIOC100](https://www.uaeu.ac.ae/en/catalog/courses/course_2902.shtml?id=BIOC100) / [CHEM111](https://www.uaeu.ac.ae/en/catalog/courses/course_2905.shtml?id=CHEM111): Basic Biology I or General Chemistry I (choose one) (3)<br>• [CSBP315](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP315): Operating Systems Fundamentals (3)<br>• [CSBP320](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP320): Data Mining (3)<br>• [ITBP321](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP321): Web Application Development Lab (1)<br>Published semester total: 13 credits.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2022 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly asks for the missing entry cohort and provides a detailed study plan for Fall 2022 entry, which aligns with the student's information. However, it uses the old college name 'College of Information Technology' instead of the current 'College of Computing and Artificial Intelligence (CCAI)' and does not mention the updated degree name 'Bachelor of Science in Computer and Artificial Intelligence Engineering' as per the official reference.) |

## Test Case POWER131: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | I study IT, Year 2 Semester 2. |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Got it, I'll keep that in mind. What would you like help with? For example: next semester's courses, credits left, or a course's prerequisites. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly identified the next semester courses for Fall 2025 entry but used the outdated program name 'IT' instead of the current 'College of Computing and Artificial Intelligence' and did not address the 2025 source conflict as required by the rubric.) |

Turn 2

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Your next model-plan position is Year 3, Semester 1. What year were you admitted, and was your entry in Fall or Spring? |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly identified the next semester courses for Fall 2025 entry but used the outdated program name 'IT' instead of the current 'College of Computing and Artificial Intelligence' and did not address the 2025 source conflict as required by the rubric.) |

Turn 3

| Field | Details |
|---|---|
| Question | Fall 2025 |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Published model — Year 3, Semester 1 (2025 Fall entry):<br>• [ITBP322](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP322): Web and Mobile Systems (3)<br>• [BIOC100](https://www.uaeu.ac.ae/en/catalog/courses/course_2902.shtml?id=BIOC100) / [CHEM111](https://www.uaeu.ac.ae/en/catalog/courses/course_2905.shtml?id=CHEM111): Basic Biology I or General Chemistry I (choose one) (3)<br>• [CSBP315](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP315): Operating Systems Fundamentals (3)<br>• [CSBP320](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP320): Data Mining (3)<br>• [ITBP321](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ITBP321): Web Application Development Lab (1)<br>Published semester total: 13 credits.<br>Note: this plan's printed degree total doesn't match the sum of its semesters; confirm with your advisor.<br>Degree Works and your advisor provide the official audit. |
| Actual sources | Bachelor of Science in Information Technology — 2025 Fall-entry model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf#page=1 |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Behaves as the brief requires for meta questions, greetings and self-introductions (greets by name/role, says what it can help with, keeps stated program/position for the next question). The rubric's extra demands (e.g. mention the 2025 IT plan conflict in a greeting) are not in the brief. (automatic grade was partial: The assistant correctly identified the next semester courses for Fall 2025 entry but used the outdated program name 'IT' instead of the current 'College of Computing and Artificial Intelligence' and did not address the 2025 source conflict as required by the rubric.) |

## Test Case POWER132: Conversation and continuity

Turn 1

| Field | Details |
|---|---|
| Question | Does UAEU have a CE program? |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Do you mean Civil Engineering / Computer Engineering? That abbreviation does not identify one program. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | Not identified in response |
| Verdict | ✅ Correct |
| Comments | Hand review: Current name Bachelor of Science in Computer and Artificial Intelligence Engineering, 130 credits and its two concentrations plus general pathway, per the current catalog page and 2026 plan. (automatic grade was partial: The assistant correctly identifies the current name of the Computer Engineering program and its concentrations, but it introduces details about credits and pathways not present in the official reference. The assistant also correctly offers to match older catalogs by admit year, which aligns with the rubric's instruction to ask for missing entry cohort.) |

Turn 2

| Field | Details |
|---|---|
| Question | Computer Engineering |
| Expected answer | Respond to the actual conversational intent, in its language. Use server history for meta recall; do not retrieve policy for identity or introductions. For planning ask only the missing entry cohort, retain IT, and expose the 2025 source conflict. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Yes. The current catalog name is **Bachelor of Science in Computer and Artificial Intelligence Engineering**.<br>Published minimum: 130 credits.<br>Published concentrations and pathways:<br>• Concentration 1: AI Systems Engineering (Req. CH: 15)<br>• Concentration 2: Robotics and Autonomous Systems (Req. CH:15)<br>• General Computer and AI Engineering Pathway (Req. CH:15)<br>The Bachelor of Science in Computer and AI Engineering program prepares students to design, develop, and integrate intelligent computing systems that combine hardware, software, and artificial intelligence.<br>If you follow an older catalog, tell me your admit year and entry semester to match its plan. |
| Actual sources | Bachelor of Science in Computer and Artificial Intelligence Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml<br>Computer and AI Engineering model study plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_and_artificial_intelligence_engineering_study_plan.pdf |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Current name Bachelor of Science in Computer and Artificial Intelligence Engineering, 130 credits and its two concentrations plus general pathway, per the current catalog page and 2026 plan. (automatic grade was partial: The assistant correctly identifies the current name of the Computer Engineering program and its concentrations, but it introduces details about credits and pathways not present in the official reference. The assistant also correctly offers to match older catalogs by admit year, which aligns with the rubric's instruction to ask for missing entry cohort.) |

## Test Case POWER133: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Engineering. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Engineering · Architectural Engineering**<br>• [Bachelor of Science in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-architectural-engineering.shtml)<br><br>**College of Engineering · Chemical & Petroleum Engineering**<br>• [Bachelor of Science in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemical-engineering.shtml)<br>• [Bachelor of Science in Petroleum Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-petroleum-engineering.shtml)<br><br>**College of Engineering · Civil & Environmental Engineering**<br>• [Bachelor of Science in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-civil-engineering.shtml)<br><br>**College of Engineering · Electrical and Communication Engineering**<br>• [Bachelor of Science in Communication Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-communication-engineering.shtml)<br>• [Bachelor of Science in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-electrical-engineering.shtml)<br><br>**College of Engineering · Mechanical and Aero Space Engineering**<br>• [Bachelor of Science in Aerospace Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-aerospace-engineering.shtml)<br>• [Bachelor of Science in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mechanical-engineering.shtml) |
| Actual sources | Bachelor of Science in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemical-engineering.shtml<br>Bachelor of Science in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-civil-engineering.shtml<br>Bachelor of Science in Petroleum Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-petroleum-engineering.shtml<br>Bachelor of Science in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mechanical-engineering.shtml<br>Bachelor of Science in Aerospace Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-aerospace-engineering.shtml<br>Bachelor of Science in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-electrical-engineering.shtml<br>Bachelor of Science in Communication Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-communication-engineering.shtml<br>Bachelor of Science in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-architectural-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Complete list from the official program directory with each program's catalog link; the department grouping is the department published on each official program page. (automatic grade was partial: The assistant correctly lists all the verified undergraduate programs in the College of Engineering and provides links, but it incorrectly groups some programs into combined departments (e.g., Chemical & Petroleum Engineering, Civil & Environmental Engineering, Electrical and Communication Engineering, Mechanical and Aero Space Engineering) which is not specified in the official reference. The official reference only lists programs without departmental grouping, so the grouping is an invention and not verified.) |

## Test Case POWER134: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Engineering. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Engineering · Architectural Engineering**<br>• [Doctor of Philosophy in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-architectural-engineering.shtml)<br>• [Master of Science in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-architectural-engineering.shtml)<br><br>**College of Engineering · Chemical & Petroleum Engineering**<br>• [Doctor of Philosophy in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemical-engineering.shtml)<br>• [Master of Science in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemical-engineering.shtml)<br>• [Master of Science in Petroleum Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-petroleum-engineering.shtml)<br><br>**College of Engineering · Civil & Environmental Engineering**<br>• [Doctor of Philosophy in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-civil-engineering.shtml)<br>• [Doctor of Philosophy in Environmental Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-environmental-engineering.shtml)<br>• [Doctor of Philosophy in Water Resources](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-water-resources.shtml)<br>• [Master of Science in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-civil-engineering.shtml)<br>• [Master of Science in Water Resources](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-water-resources.shtml)<br><br>**College of Engineering · Electrical and Communication Engineering**<br>• [Doctor of Philosophy in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-electrical-engineering.shtml)<br>• [Master of Science in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-electrical-engineering.shtml)<br><br>**College of Engineering · Mechanical and Aero Space Engineering**<br>• [Doctor of Philosophy in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mechanical-engineering.shtml)<br>• [Master of Engineering Management](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-engineering-management.shtml)<br>• [Master of Science in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mechanical-engineering.shtml) |
| Actual sources | Master of Engineering Management — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-engineering-management.shtml<br>Master of Science in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-architectural-engineering.shtml<br>Master of Science in Water Resources — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-water-resources.shtml<br>Master of Science in Petroleum Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-petroleum-engineering.shtml<br>Master of Science in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemical-engineering.shtml<br>Doctor of Philosophy in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-civil-engineering.shtml<br>Doctor of Philosophy in Environmental Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-environmental-engineering.shtml<br>Doctor of Philosophy in Water Resources — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-water-resources.shtml<br>Doctor of Philosophy in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mechanical-engineering.shtml<br>Master of Science in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mechanical-engineering.shtml<br>Doctor of Philosophy in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-electrical-engineering.shtml<br>Doctor of Philosophy in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemical-engineering.shtml<br>Master of Science in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-electrical-engineering.shtml<br>Doctor of Philosophy in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-architectural-engineering.shtml<br>Master of Science in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-civil-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly listed all graduate programs in the College of Engineering, grouped by department, with links to each program page, matching the official reference exactly and following the rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER135: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Science. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Science · Biology**<br>• [Bachelor of Science in Biology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biology.shtml)<br><br>**College of Science · Chemistry**<br>• [Bachelor of Science in Biochemistry](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biochemistry.shtml)<br>• [Bachelor of Science in Chemistry](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemistry.shtml)<br><br>**College of Science · Geosciences**<br>• [Bachelor of Science in Geosciences](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-geosciences.shtml)<br><br>**College of Science · Mathematical Sciences**<br>• [Bachelor of Science in Mathematics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mathematics.shtml)<br>• [Bachelor of Science in the Mathematics of Data Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-the-mathematics-of-data-science.shtml)<br><br>**College of Science · Physics**<br>• [Bachelor of Science in Physics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-physics.shtml)<br>• [Bachelor of Science in Space Sciences](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-space-sciences.shtml) |
| Actual sources | Bachelor of Science in Geosciences — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-geosciences.shtml<br>Bachelor of Science in Biology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biology.shtml<br>Bachelor of Science in Chemistry — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemistry.shtml<br>Bachelor of Science in Biochemistry — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biochemistry.shtml<br>Bachelor of Science in the Mathematics of Data Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-the-mathematics-of-data-science.shtml<br>Bachelor of Science in Space Sciences — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-space-sciences.shtml<br>Bachelor of Science in Mathematics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mathematics.shtml<br>Bachelor of Science in Physics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-physics.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All undergraduate programs in the College of Science are listed accurately, grouped by department, with correct links and no minors included. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER136: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Science. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Science · Biology**<br>• [Doctor of Philosophy in Cellular and Molecular Biology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-cellular-and-molecular-biology.shtml)<br>• [Doctor of Philosophy in Ecology and Environmental Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-ecology-and-environmental-sciences.shtml)<br>• [Master of Science in Environmental Sciences and Sustainability](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-environmental-sciences-and-sustainability.shtml)<br>• [Master of Science in Molecular Biology and Biotechnology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-molecular-biology-and-biotechnology.shtml)<br><br>**College of Science · Chemistry**<br>• [Doctor of Philosophy in Chemistry](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemistry.shtml)<br>• [Master of Science in Chemistry](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemistry.shtml)<br>• [Master of Science in Forensic Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-forensic-science.shtml)<br><br>**College of Science · Geosciences**<br>• [Doctor of Philosophy in Geosciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geosciences.shtml)<br>• [Master of Science in Geosciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-geosciences.shtml)<br><br>**College of Science · Mathematical Sciences**<br>• [Doctor of Philosophy in Mathematics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics.shtml)<br>• [Master of Science in Mathematics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mathematics.shtml)<br><br>**College of Science · Physics**<br>• [Doctor of Philosophy in Physics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-physics.shtml)<br>• [Master of Science in Physics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-physics.shtml)<br>• [Master of Science in Space Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-space-science.shtml) |
| Actual sources | Master of Science in Environmental Sciences and Sustainability — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-environmental-sciences-and-sustainability.shtml<br>Doctor of Philosophy in Ecology and Environmental Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-ecology-and-environmental-sciences.shtml<br>Master of Science in Geosciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-geosciences.shtml<br>Master of Science in Space Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-space-science.shtml<br>Master of Science in Molecular Biology and Biotechnology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-molecular-biology-and-biotechnology.shtml<br>Master of Science in Chemistry — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemistry.shtml<br>Doctor of Philosophy in Cellular and Molecular Biology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-cellular-and-molecular-biology.shtml<br>Doctor of Philosophy in Chemistry — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemistry.shtml<br>Doctor of Philosophy in Geosciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geosciences.shtml<br>Doctor of Philosophy in Mathematics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics.shtml<br>Doctor of Philosophy in Physics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-physics.shtml<br>Master of Science in Forensic Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-forensic-science.shtml<br>Master of Science in Physics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-physics.shtml<br>Master of Science in Mathematics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mathematics.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All graduate programs listed match the official reference, grouped correctly by department with appropriate links; no minors or incorrect classifications included. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER137: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Computing and Artificial Intelligence. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Computing and Artificial Intelligence · Computer and Network Engineering**<br>• [Bachelor of Science in Computer and Artificial Intelligence Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml)<br><br>**College of Computing and Artificial Intelligence · Computer Science and Software Engineering**<br>• [Bachelor of Science in Computer Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml)<br>• [Bachelor of Science in Data Science and Artificial Intelligence](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-data-science-and-artificial-intelligence.shtml)<br><br>**College of Computing and Artificial Intelligence · Information Systems and Security**<br>• [Bachelor of Science in Cybersecurity](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml)<br>• [Bachelor of Science in Information Technology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml) |
| Actual sources | Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml<br>Bachelor of Science in Cybersecurity — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml<br>Bachelor of Science in Computer and Artificial Intelligence Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml<br>Bachelor of Science in Computer Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml<br>Bachelor of Science in Data Science and Artificial Intelligence — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-data-science-and-artificial-intelligence.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Complete list from the official program directory with each program's catalog link; the department grouping is the department published on each official program page. (automatic grade was partial: The assistant correctly lists all five undergraduate programs and provides links, but incorrectly groups them into departments not verified by the official reference, which only specifies the college name and programs without departmental divisions.) |

## Test Case POWER138: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Computing and Artificial Intelligence. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Computing and Artificial Intelligence · Computer and Network Engineering**<br>• [Master of Science in Internet of Things](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-internet-of-things.shtml)<br><br>**College of Computing and Artificial Intelligence · Computer Science and Software Engineering**<br>• [Doctor of Philosophy in Informatics and Computing](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-informatics-and-computing.shtml)<br>• [Master of Science in Software Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-software-engineering.shtml)<br><br>**College of Computing and Artificial Intelligence · Information Systems and Security**<br>• [Master of Science in Information Security](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-security.shtml)<br>• [Master of Science in Information Technology Management](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-technology-management.shtml) |
| Actual sources | Master of Science in Information Security — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-security.shtml<br>Master of Science in Internet of Things — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-internet-of-things.shtml<br>Master of Science in Software Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-software-engineering.shtml<br>Doctor of Philosophy in Informatics and Computing — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-informatics-and-computing.shtml<br>Master of Science in Information Technology Management — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-technology-management.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Complete list from the official program directory with each program's catalog link; the department grouping is the department published on each official program page. (automatic grade was partial: The assistant correctly lists all graduate programs and provides links, but incorrectly groups them by departments not verified in the official reference, which does not specify departments.) |

## Test Case POWER139: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Business and Economics. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Business and Economics · Department of Accounting**<br>• [Bachelor of Accounting](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-accounting.shtml)<br><br>**College of Business and Economics · Department of Economics and Finance**<br>• [Bachelor of Economics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-economics.shtml)<br>• [Bachelor of Finance and Banking](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-finance-and-banking.shtml)<br><br>**College of Business and Economics · Department of Management**<br>• [Bachelor of Business Administration in Human Resources Management and Development](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-human-resources-management-and-development.shtml)<br>• [Bachelor of Business Administration in Supply Chain Management and Logistics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-supply-chain-management-and-logistics.shtml)<br><br>**College of Business and Economics · Department of Marketing and Entrepreneurship**<br>• [Bachelor of Business Administration in Entrepreneurship](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-entrepreneurship.shtml)<br>• [Bachelor of Business Administration in Marketing](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-marketing.shtml)<br><br>**College of Business and Economics · Department of Statistics and Business Analytics**<br>• [Bachelor of Science in Statistics and Data Analytics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-statistics-and-data-analytics.shtml) |
| Actual sources | Bachelor of Economics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-economics.shtml<br>Bachelor of Accounting — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-accounting.shtml<br>Bachelor of Business Administration in Marketing — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-marketing.shtml<br>Bachelor of Business Administration in Human Resources Management and Development — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-human-resources-management-and-development.shtml<br>Bachelor of Business Administration in Entrepreneurship — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-entrepreneurship.shtml<br>Bachelor of Business Administration in Supply Chain Management and Logistics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-business-administration-in-supply-chain-management-and-logistics.shtml<br>Bachelor of Finance and Banking — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-finance-and-banking.shtml<br>Bachelor of Science in Statistics and Data Analytics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-statistics-and-data-analytics.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly listed all undergraduate programs in the College of Business and Economics, grouped by department, with links to each program page as per the official reference and rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER140: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Business and Economics. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Business and Economics · Department of Accounting**<br>• [Master of Professional Accounting](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-professional-accounting.shtml)<br><br>**College of Business and Economics · Department of Management**<br>• [Doctorate of Business Administration](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctorate-of-business-administration.shtml)<br>• [Master of Business Administration](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-business-administration.shtml)<br><br>**College of Business and Economics · Department of Statistics and Business Analytics**<br>• [Master in Business Analytics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-business-analytics.shtml) |
| Actual sources | Master in Business Analytics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-business-analytics.shtml<br>Master of Professional Accounting — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-professional-accounting.shtml<br>Master of Business Administration — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-business-administration.shtml<br>Doctorate of Business Administration — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctorate-of-business-administration.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All graduate programs in the College of Business and Economics are correctly listed and grouped by department with appropriate links, matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER141: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Law. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Law · Public Law**<br>• [Bachelor of Law](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-law.shtml) |
| Actual sources | Bachelor of Law — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-law.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly listed the Bachelor of Law program under the College of Law as per the official reference and provided a valid link. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER142: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Law. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Law · Private Law**<br>• [Doctor of Philosophy in Law](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-law.shtml)<br>• [Master of Private Law](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-private-law.shtml)<br><br>**College of Law · Public Law**<br>• [Master of Public Law](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-law.shtml) |
| Actual sources | Doctor of Philosophy in Law — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-law.shtml<br>Master of Private Law — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-private-law.shtml<br>Master of Public Law — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-law.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All graduate programs in the College of Law are listed accurately and grouped by department with correct links; no minors or raw XML included. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER143: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Education. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Education · Learning and Educational Leadership**<br>• [Bachelor of Education in Early Childhood](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-education-in-early-childhood.shtml)<br><br>**College of Education · Physical Education**<br>• [Bachelor of Education in Health and Physical Education](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-education-in-health-and-physical-education.shtml)<br><br>**College of Education · Special and Gifted Education**<br>• [Bachelor of Education in Special Education](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-education-in-special-education.shtml) |
| Actual sources | Bachelor of Education in Early Childhood — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-education-in-early-childhood.shtml<br>Bachelor of Education in Health and Physical Education — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-education-in-health-and-physical-education.shtml<br>Bachelor of Education in Special Education — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-education-in-special-education.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All undergraduate programs in the College of Education are listed correctly, grouped by department, with appropriate links. No minors are misclassified as degrees. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER144: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Education. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Education · Learning and Educational Leadership**<br>• [Doctor of Philosophy in Language and Literacy Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-language-and-literacy-education.shtml)<br>• [Doctor of Philosophy in Leadership and Policy Studies in Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-leadership-and-policy-studies-in-education.shtml)<br>• [Doctor of Philosophy in Mathematics Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics-education.shtml)<br>• [Doctor of Philosophy in Science Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-science-education.shtml)<br>• [Dual Master of Education Program with the Education University of Hong Kong](https://www.uaeu.ac.ae/en/catalog/graduate/programs/dual-master-of-education-program-with-the-education-university-of-hong-kong.shtml)<br>• [Master of Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-education.shtml)<br>• [Master of Educational Innovation](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-educational-innovation.shtml)<br><br>**College of Education · Special and Gifted Education**<br>• [Doctor of Philosophy in Special Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-special-education.shtml)<br>• [Master in Gifted and Talented Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-gifted-and-talented-education.shtml) |
| Actual sources | Doctor of Philosophy in Language and Literacy Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-language-and-literacy-education.shtml<br>Master of Educational Innovation — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-educational-innovation.shtml<br>Dual Master of Education Program with the Education University of Hong Kong — https://www.uaeu.ac.ae/en/catalog/graduate/programs/dual-master-of-education-program-with-the-education-university-of-hong-kong.shtml<br>Doctor of Philosophy in Leadership and Policy Studies in Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-leadership-and-policy-studies-in-education.shtml<br>Doctor of Philosophy in Mathematics Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics-education.shtml<br>Doctor of Philosophy in Science Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-science-education.shtml<br>Doctor of Philosophy in Special Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-special-education.shtml<br>Master of Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-education.shtml<br>Master in Gifted and Talented Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-gifted-and-talented-education.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All graduate programs in the College of Education are listed and grouped by department with links, matching the official reference exactly. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER145: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Humanities and Social Sciences. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Humanities and Social Sciences · Arabic Language & Literature**<br>• [Bachelor of Arts in Arabic Language and Literature](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-arabic-language-and-literature.shtml)<br><br>**College of Humanities and Social Sciences · Cognitive Sciences**<br>• [Bachelor of Arts in Linguistics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-linguistics.shtml)<br>• [Bachelor of Arts in Psychology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-psychology.shtml)<br><br>**College of Humanities and Social Sciences · Geography and Urban Sustainability**<br>• [Bachelor of Arts in Geography](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-geography.shtml)<br><br>**College of Humanities and Social Sciences · Government and Society**<br>• [Bachelor of Arts in Political Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-political-science.shtml)<br>• [Bachelor of Science in Applied Sociology and Social Data Analytics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-applied-sociology-and-social-data-analytics.shtml)<br><br>**College of Humanities and Social Sciences · Languages and Literature**<br>• [Bachelor of Arts in English Literature](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-english-literature.shtml)<br>• [Bachelor of Arts in Translation Studies](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-translation-studies.shtml)<br><br>**College of Humanities and Social Sciences · Media and Creative Industries**<br>• [Bachelor of Arts in Mass Communication](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-mass-communication.shtml)<br>• [Bachelor of Arts in Visual Studies and Creative Industries](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-visual-studies-and-creative-industries.shtml)<br><br>**College of Humanities and Social Sciences · Social Wellbeing**<br>• [Bachelor of Social Work](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-social-work.shtml)<br><br>**College of Humanities and Social Sciences · Tourism and Heritage**<br>• [Bachelor of Arts in History and Archaeology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-history-and-archaeology.shtml)<br>• [Bachelor of Arts in Tourism Studies](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-tourism-studies.shtml) |
| Actual sources | Bachelor of Arts in Psychology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-psychology.shtml<br>Bachelor of Social Work — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-social-work.shtml<br>Bachelor of Arts in Tourism Studies — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-tourism-studies.shtml<br>Bachelor of Arts in Geography — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-geography.shtml<br>Bachelor of Arts in Arabic Language and Literature — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-arabic-language-and-literature.shtml<br>Bachelor of Arts in Mass Communication — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-mass-communication.shtml<br>Bachelor of Arts in Political Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-political-science.shtml<br>Bachelor of Arts in Visual Studies and Creative Industries — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-visual-studies-and-creative-industries.shtml<br>Bachelor of Science in Applied Sociology and Social Data Analytics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-applied-sociology-and-social-data-analytics.shtml<br>Bachelor of Arts in History and Archaeology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-history-and-archaeology.shtml<br>Bachelor of Arts in Linguistics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-linguistics.shtml<br>Bachelor of Arts in Translation Studies — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-translation-studies.shtml<br>Bachelor of Arts in English Literature — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-arts-in-english-literature.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All undergraduate programs listed match the official reference, grouped by department with correct program names and links; no minors are included. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER146: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Humanities and Social Sciences. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Humanities and Social Sciences · Arabic Language & Literature**<br>• [Master of Arts in Arabic Language and Literature](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-arabic-language-and-literature.shtml)<br><br>**College of Humanities and Social Sciences · Geography and Urban Sustainability**<br>• [Doctor of Philosophy in Geographic Information Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geographic-information-science.shtml)<br>• [Master of Science in Remote Sensing and Geographic Information Systems](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-remote-sensing-and-geographic-information-systems.shtml)<br><br>**College of Humanities and Social Sciences · Government and Society**<br>• [Master of Governance and Public Policy](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-governance-and-public-policy.shtml)<br>• [Master of Strategic and Defense Studies](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-strategic-and-defense-studies.shtml)<br><br>**College of Humanities and Social Sciences · Languages and Literature**<br>• [Master of Arts in English](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-english.shtml)<br><br>**College of Humanities and Social Sciences · Media and Creative Industries**<br>• [Master of Arts in Communication](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-communication.shtml)<br><br>**College of Humanities and Social Sciences · Social Wellbeing**<br>• [Master of Social Work](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-social-work.shtml) |
| Actual sources | Master of Science in Remote Sensing and Geographic Information Systems — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-remote-sensing-and-geographic-information-systems.shtml<br>Master of Arts in English — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-english.shtml<br>Master of Arts in Communication — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-communication.shtml<br>Doctor of Philosophy in Geographic Information Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geographic-information-science.shtml<br>Master of Social Work — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-social-work.shtml<br>Master of Arts in Arabic Language and Literature — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-arabic-language-and-literature.shtml<br>Master of Strategic and Defense Studies — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-strategic-and-defense-studies.shtml<br>Master of Governance and Public Policy — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-governance-and-public-policy.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly listed all graduate programs in the College of Humanities and Social Sciences, grouped by department, with appropriate links, fully matching the official reference and rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER147: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Medicine and Health Sciences. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Medicine and Health Sciences · Medical Education**<br>• [Doctor of Medicine](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/doctor-of-medicine.shtml)<br><br>**College of Medicine and Health Sciences · Nutrition and Health**<br>• [Bachelor of Science in Dietetics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-dietetics.shtml)<br>• [Bachelor of Science in Nutritional Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-nutritional-science.shtml)<br><br>**College of Medicine and Health Sciences · Speech Language Pathology**<br>• [Bachelor of Science in Speech-Language Pathology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-speechlanguage-pathology.shtml) |
| Actual sources | Doctor of Medicine — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/doctor-of-medicine.shtml<br>Bachelor of Science in Speech-Language Pathology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-speechlanguage-pathology.shtml<br>Bachelor of Science in Nutritional Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-nutritional-science.shtml<br>Bachelor of Science in Dietetics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-dietetics.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All undergraduate programs in the College of Medicine and Health Sciences are correctly listed and grouped by department with appropriate links, matching the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER148: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Medicine and Health Sciences. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Medicine and Health Sciences · Biochemistry and Molecular Biology**<br>• [Doctor of Philosophy in Biomedical Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-biomedical-sciences.shtml)<br>• [Master of Medical Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-medical-sciences.shtml)<br><br>**College of Medicine and Health Sciences · Clinical Psychology**<br>• [Master of Science in Clinical Psychology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-psychology.shtml)<br><br>**College of Medicine and Health Sciences · Genetics and Genomics**<br>• [Master of Genetic Counseling](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-genetic-counseling.shtml)<br>• [Master of Science in Genomic Medicine](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-genomic-medicine.shtml)<br><br>**College of Medicine and Health Sciences · Institute of Public Health**<br>• [Doctor of Philosophy in Public Health](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-public-health.shtml)<br>• [Master of Public Health](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-health.shtml)<br><br>**College of Medicine and Health Sciences · Internal Medicine**<br>• [Master of Science in Clinical Research](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-research.shtml)<br><br>**College of Medicine and Health Sciences · Nutrition and Health**<br>• [Doctor of Philosophy in Nutritional Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-nutritional-sciences.shtml)<br>• [Master of Science in Human Nutrition](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-human-nutrition.shtml)<br><br>**College of Medicine and Health Sciences · Pharmacology and Therapeutics**<br>• [Doctor of Pharmacy](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-pharmacy.shtml) |
| Actual sources | Master of Science in Human Nutrition — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-human-nutrition.shtml<br>Doctor of Philosophy in Public Health — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-public-health.shtml<br>Doctor of Philosophy in Nutritional Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-nutritional-sciences.shtml<br>Master of Medical Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-medical-sciences.shtml<br>Master of Science in Clinical Psychology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-psychology.shtml<br>Doctor of Pharmacy — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-pharmacy.shtml<br>Master of Public Health — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-health.shtml<br>Doctor of Philosophy in Biomedical Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-biomedical-sciences.shtml<br>Master of Genetic Counseling — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-genetic-counseling.shtml<br>Master of Science in Genomic Medicine — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-genomic-medicine.shtml<br>Master of Science in Clinical Research — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-research.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All graduate programs listed match the official reference, grouped by department with correct program names and links; no minors or raw XML included. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER149: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all undergraduate programs in the College of Agriculture and Veterinary Medicine. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Agriculture and Veterinary Medicine · Department of Food Science**<br>• [Bachelor of Science in Food Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-food-science.shtml)<br><br>**College of Agriculture and Veterinary Medicine · Department of Integrative Agriculture**<br>• [Bachelor of Science in Agricultural Resource Management](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-agricultural-resource-management.shtml)<br>• [Bachelor of Science in Horticulture](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-horticulture.shtml)<br>• [Bachelor of Science in Marine Fisheries and Animal Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-marine-fisheries-and-animal-science.shtml)<br><br>**College of Agriculture and Veterinary Medicine · Department of Veterinary Medicine**<br>• [Bachelor of Veterinary Medicine](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-veterinary-medicine.shtml) |
| Actual sources | Bachelor of Science in Agricultural Resource Management — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-agricultural-resource-management.shtml<br>Bachelor of Science in Food Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-food-science.shtml<br>Bachelor of Science in Horticulture — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-horticulture.shtml<br>Bachelor of Science in Marine Fisheries and Animal Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-marine-fisheries-and-animal-science.shtml<br>Bachelor of Veterinary Medicine — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-veterinary-medicine.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All undergraduate programs in the College of Agriculture and Veterinary Medicine are listed correctly, grouped by department, with links to readable program pages as per the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER150: College program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in the College of Agriculture and Veterinary Medicine. |
| Expected answer | List all verified directory records at the requested level for this college; group by department and link each readable program page. No raw XML; do not classify minors as degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/ |
| Actual answer | Programs in the verified official directory:<br><br>**College of Agriculture and Veterinary Medicine · Department of Food Science**<br>• [Doctor of Philosophy in Food Science and Technology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-food-science-and-technology.shtml)<br>• [Master of Science in Food Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-food-science.shtml)<br><br>**College of Agriculture and Veterinary Medicine · Department of Integrative Agriculture**<br>• [Doctor of Philosophy in Horticulture Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-horticulture-sciences.shtml)<br>• [Master of Science in Horticulture](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-horticulture.shtml) |
| Actual sources | Master of Science in Horticulture — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-horticulture.shtml<br>Doctor of Philosophy in Food Science and Technology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-food-science-and-technology.shtml<br>Doctor of Philosophy in Horticulture Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-horticulture-sciences.shtml<br>Master of Science in Food Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-food-science.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | All graduate programs in the College of Agriculture and Veterinary Medicine are listed correctly, grouped by department, with appropriate links. No minors or unverified programs are included. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER151: University program directory

Turn 1

| Field | Details |
|---|---|
| Question | Can you tell me all STEM programs UAEU offers? |
| Expected answer | Give a complete directory-derived list for the defined scope, with readable official program links and honest STEM scope. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Undergraduate degrees in Engineering, Science, and Computing and AI. This is the scope used here for STEM; the directory does not supply a university-wide STEM classification.<br><br>**College of Computing and Artificial Intelligence · Computer and Network Engineering**<br>• [Bachelor of Science in Computer and Artificial Intelligence Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml)<br><br>**College of Computing and Artificial Intelligence · Computer Science and Software Engineering**<br>• [Bachelor of Science in Computer Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml)<br>• [Bachelor of Science in Data Science and Artificial Intelligence](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-data-science-and-artificial-intelligence.shtml)<br><br>**College of Computing and Artificial Intelligence · Information Systems and Security**<br>• [Bachelor of Science in Cybersecurity](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml)<br>• [Bachelor of Science in Information Technology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml)<br><br>**College of Engineering · Architectural Engineering**<br>• [Bachelor of Science in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-architectural-engineering.shtml)<br><br>**College of Engineering · Chemical & Petroleum Engineering**<br>• [Bachelor of Science in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemical-engineering.shtml)<br>• [Bachelor of Science in Petroleum Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-petroleum-engineering.shtml)<br><br>**College of Engineering · Civil & Environmental Engineering**<br>• [Bachelor of Science in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-civil-engineering.shtml)<br><br>**College of Engineering · Electrical and Communication Engineering**<br>• [Bachelor of Science in Communication Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-communication-engineering.shtml)<br>• [Bachelor of Science in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-electrical-engineering.shtml)<br><br>**College of Engineering · Mechanical and Aero Space Engineering**<br>• [Bachelor of Science in Aerospace Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-aerospace-engineering.shtml)<br>• [Bachelor of Science in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mechanical-engineering.shtml)<br><br>**College of Science · Biology**<br>• [Bachelor of Science in Biology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biology.shtml)<br><br>**College of Science · Chemistry**<br>• [Bachelor of Science in Biochemistry](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biochemistry.shtml)<br>• [Bachelor of Science in Chemistry](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemistry.shtml)<br><br>**College of Science · Geosciences**<br>• [Bachelor of Science in Geosciences](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-geosciences.shtml)<br><br>**College of Science · Mathematical Sciences**<br>• [Bachelor of Science in Mathematics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mathematics.shtml)<br>• [Bachelor of Science in the Mathematics of Data Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-the-mathematics-of-data-science.shtml)<br><br>**College of Science · Physics**<br>• [Bachelor of Science in Physics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-physics.shtml)<br>• [Bachelor of Science in Space Sciences](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-space-sciences.shtml) |
| Actual sources | Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml<br>Bachelor of Science in Geosciences — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-geosciences.shtml<br>Bachelor of Science in Biology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biology.shtml<br>Bachelor of Science in Chemistry — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemistry.shtml<br>Bachelor of Science in Biochemistry — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biochemistry.shtml<br>Bachelor of Science in Cybersecurity — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml<br>Bachelor of Science in the Mathematics of Data Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-the-mathematics-of-data-science.shtml<br>Bachelor of Science in Space Sciences — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-space-sciences.shtml<br>Bachelor of Science in Computer and Artificial Intelligence Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml<br>Bachelor of Science in Computer Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml<br>Bachelor of Science in Mathematics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mathematics.shtml<br>Bachelor of Science in Physics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-physics.shtml<br>Bachelor of Science in Data Science and Artificial Intelligence — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-data-science-and-artificial-intelligence.shtml<br>Bachelor of Science in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemical-engineering.shtml<br>Bachelor of Science in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-civil-engineering.shtml<br>Bachelor of Science in Petroleum Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-petroleum-engineering.shtml<br>Bachelor of Science in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mechanical-engineering.shtml<br>Bachelor of Science in Aerospace Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-aerospace-engineering.shtml<br>Bachelor of Science in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-electrical-engineering.shtml<br>Bachelor of Science in Communication Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-communication-engineering.shtml<br>Bachelor of Science in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-architectural-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant provided a complete, directory-derived list of UAEU STEM bachelor programs with official program links and correctly scoped STEM fields as per the official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER152: University program directory

Turn 1

| Field | Details |
|---|---|
| Question | List all postgraduate programs UAEU offers. |
| Expected answer | Give a complete directory-derived list for the defined scope, with readable official program links and honest STEM scope. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Programs in the verified official directory:<br><br>**College of Agriculture and Veterinary Medicine · Department of Food Science**<br>• [Doctor of Philosophy in Food Science and Technology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-food-science-and-technology.shtml)<br>• [Master of Science in Food Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-food-science.shtml)<br><br>**College of Agriculture and Veterinary Medicine · Department of Integrative Agriculture**<br>• [Doctor of Philosophy in Horticulture Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-horticulture-sciences.shtml)<br>• [Master of Science in Horticulture](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-horticulture.shtml)<br><br>**College of Business and Economics · Department of Accounting**<br>• [Master of Professional Accounting](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-professional-accounting.shtml)<br><br>**College of Business and Economics · Department of Management**<br>• [Doctorate of Business Administration](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctorate-of-business-administration.shtml)<br>• [Master of Business Administration](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-business-administration.shtml)<br><br>**College of Business and Economics · Department of Statistics and Business Analytics**<br>• [Master in Business Analytics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-business-analytics.shtml)<br><br>**College of Computing and Artificial Intelligence · Computer and Network Engineering**<br>• [Master of Science in Internet of Things](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-internet-of-things.shtml)<br><br>**College of Computing and Artificial Intelligence · Computer Science and Software Engineering**<br>• [Doctor of Philosophy in Informatics and Computing](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-informatics-and-computing.shtml)<br>• [Master of Science in Software Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-software-engineering.shtml)<br><br>**College of Computing and Artificial Intelligence · Information Systems and Security**<br>• [Master of Science in Information Security](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-security.shtml)<br>• [Master of Science in Information Technology Management](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-technology-management.shtml)<br><br>**College of Education · Learning and Educational Leadership**<br>• [Doctor of Philosophy in Language and Literacy Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-language-and-literacy-education.shtml)<br>• [Doctor of Philosophy in Leadership and Policy Studies in Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-leadership-and-policy-studies-in-education.shtml)<br>• [Doctor of Philosophy in Mathematics Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics-education.shtml)<br>• [Doctor of Philosophy in Science Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-science-education.shtml)<br>• [Dual Master of Education Program with the Education University of Hong Kong](https://www.uaeu.ac.ae/en/catalog/graduate/programs/dual-master-of-education-program-with-the-education-university-of-hong-kong.shtml)<br>• [Master of Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-education.shtml)<br>• [Master of Educational Innovation](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-educational-innovation.shtml)<br><br>**College of Education · Special and Gifted Education**<br>• [Doctor of Philosophy in Special Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-special-education.shtml)<br>• [Master in Gifted and Talented Education](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-gifted-and-talented-education.shtml)<br><br>**College of Engineering · Architectural Engineering**<br>• [Doctor of Philosophy in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-architectural-engineering.shtml)<br>• [Master of Science in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-architectural-engineering.shtml)<br><br>**College of Engineering · Chemical & Petroleum Engineering**<br>• [Doctor of Philosophy in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemical-engineering.shtml)<br>• [Master of Science in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemical-engineering.shtml)<br>• [Master of Science in Petroleum Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-petroleum-engineering.shtml)<br><br>**College of Engineering · Civil & Environmental Engineering**<br>• [Doctor of Philosophy in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-civil-engineering.shtml)<br>• [Doctor of Philosophy in Environmental Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-environmental-engineering.shtml)<br>• [Doctor of Philosophy in Water Resources](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-water-resources.shtml)<br>• [Master of Science in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-civil-engineering.shtml)<br>• [Master of Science in Water Resources](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-water-resources.shtml)<br><br>**College of Engineering · Electrical and Communication Engineering**<br>• [Doctor of Philosophy in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-electrical-engineering.shtml)<br>• [Master of Science in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-electrical-engineering.shtml)<br><br>**College of Engineering · Mechanical and Aero Space Engineering**<br>• [Doctor of Philosophy in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mechanical-engineering.shtml)<br>• [Master of Engineering Management](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-engineering-management.shtml)<br>• [Master of Science in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mechanical-engineering.shtml)<br><br>**College of Humanities and Social Sciences · Arabic Language & Literature**<br>• [Master of Arts in Arabic Language and Literature](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-arabic-language-and-literature.shtml)<br><br>**College of Humanities and Social Sciences · Geography and Urban Sustainability**<br>• [Doctor of Philosophy in Geographic Information Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geographic-information-science.shtml)<br>• [Master of Science in Remote Sensing and Geographic Information Systems](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-remote-sensing-and-geographic-information-systems.shtml)<br><br>**College of Humanities and Social Sciences · Government and Society**<br>• [Master of Governance and Public Policy](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-governance-and-public-policy.shtml)<br>• [Master of Strategic and Defense Studies](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-strategic-and-defense-studies.shtml)<br><br>**College of Humanities and Social Sciences · Languages and Literature**<br>• [Master of Arts in English](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-english.shtml)<br><br>**College of Humanities and Social Sciences · Media and Creative Industries**<br>• [Master of Arts in Communication](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-communication.shtml)<br><br>**College of Humanities and Social Sciences · Social Wellbeing**<br>• [Master of Social Work](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-social-work.shtml)<br><br>**College of Law · Private Law**<br>• [Doctor of Philosophy in Law](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-law.shtml)<br>• [Master of Private Law](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-private-law.shtml)<br><br>**College of Law · Public Law**<br>• [Master of Public Law](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-law.shtml)<br><br>**College of Medicine and Health Sciences · Biochemistry and Molecular Biology**<br>• [Doctor of Philosophy in Biomedical Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-biomedical-sciences.shtml)<br>• [Master of Medical Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-medical-sciences.shtml)<br><br>**College of Medicine and Health Sciences · Clinical Psychology**<br>• [Master of Science in Clinical Psychology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-psychology.shtml)<br><br>**College of Medicine and Health Sciences · Genetics and Genomics**<br>• [Master of Genetic Counseling](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-genetic-counseling.shtml)<br>• [Master of Science in Genomic Medicine](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-genomic-medicine.shtml)<br><br>**College of Medicine and Health Sciences · Institute of Public Health**<br>• [Doctor of Philosophy in Public Health](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-public-health.shtml)<br>• [Master of Public Health](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-health.shtml)<br><br>**College of Medicine and Health Sciences · Internal Medicine**<br>• [Master of Science in Clinical Research](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-research.shtml)<br><br>**College of Medicine and Health Sciences · Nutrition and Health**<br>• [Doctor of Philosophy in Nutritional Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-nutritional-sciences.shtml)<br>• [Master of Science in Human Nutrition](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-human-nutrition.shtml)<br><br>**College of Medicine and Health Sciences · Pharmacology and Therapeutics**<br>• [Doctor of Pharmacy](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-pharmacy.shtml)<br><br>**College of Science · Biology**<br>• [Doctor of Philosophy in Cellular and Molecular Biology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-cellular-and-molecular-biology.shtml)<br>• [Doctor of Philosophy in Ecology and Environmental Sciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-ecology-and-environmental-sciences.shtml)<br>• [Master of Science in Environmental Sciences and Sustainability](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-environmental-sciences-and-sustainability.shtml)<br>• [Master of Science in Molecular Biology and Biotechnology](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-molecular-biology-and-biotechnology.shtml)<br><br>**College of Science · Chemistry**<br>• [Doctor of Philosophy in Chemistry](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemistry.shtml)<br>• [Master of Science in Chemistry](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemistry.shtml)<br>• [Master of Science in Forensic Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-forensic-science.shtml)<br><br>**College of Science · Geosciences**<br>• [Doctor of Philosophy in Geosciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geosciences.shtml)<br>• [Master of Science in Geosciences](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-geosciences.shtml)<br><br>**College of Science · Mathematical Sciences**<br>• [Doctor of Philosophy in Mathematics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics.shtml)<br>• [Master of Science in Mathematics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mathematics.shtml)<br><br>**College of Science · Physics**<br>• [Doctor of Philosophy in Physics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-physics.shtml)<br>• [Master of Science in Physics](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-physics.shtml)<br>• [Master of Science in Space Science](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-space-science.shtml) |
| Actual sources | Master of Science in Horticulture — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-horticulture.shtml<br>Master of Science in Remote Sensing and Geographic Information Systems — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-remote-sensing-and-geographic-information-systems.shtml<br>Master of Science in Information Security — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-security.shtml<br>Master of Science in Environmental Sciences and Sustainability — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-environmental-sciences-and-sustainability.shtml<br>Master of Arts in English — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-english.shtml<br>Master of Arts in Communication — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-communication.shtml<br>Doctor of Philosophy in Food Science and Technology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-food-science-and-technology.shtml<br>Doctor of Philosophy in Language and Literacy Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-language-and-literacy-education.shtml<br>Master of Science in Human Nutrition — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-human-nutrition.shtml<br>Doctor of Philosophy in Ecology and Environmental Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-ecology-and-environmental-sciences.shtml<br>Master of Educational Innovation — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-educational-innovation.shtml<br>Master of Science in Geosciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-geosciences.shtml<br>Master of Science in Space Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-space-science.shtml<br>Master of Science in Internet of Things — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-internet-of-things.shtml<br>Master in Business Analytics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-business-analytics.shtml<br>Master of Professional Accounting — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-professional-accounting.shtml<br>Master of Science in Molecular Biology and Biotechnology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-molecular-biology-and-biotechnology.shtml<br>Master of Science in Chemistry — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemistry.shtml<br>Dual Master of Education Program with the Education University of Hong Kong — https://www.uaeu.ac.ae/en/catalog/graduate/programs/dual-master-of-education-program-with-the-education-university-of-hong-kong.shtml<br>Doctor of Philosophy in Cellular and Molecular Biology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-cellular-and-molecular-biology.shtml<br>Doctor of Philosophy in Chemistry — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemistry.shtml<br>Doctor of Philosophy in Geosciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geosciences.shtml<br>Doctor of Philosophy in Mathematics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics.shtml<br>Doctor of Philosophy in Physics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-physics.shtml<br>Doctor of Philosophy in Leadership and Policy Studies in Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-leadership-and-policy-studies-in-education.shtml<br>Doctor of Philosophy in Mathematics Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mathematics-education.shtml<br>Doctor of Philosophy in Science Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-science-education.shtml<br>Doctor of Philosophy in Special Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-special-education.shtml<br>Doctor of Philosophy in Public Health — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-public-health.shtml<br>Doctor of Philosophy in Horticulture Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-horticulture-sciences.shtml<br>Doctor of Philosophy in Nutritional Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-nutritional-sciences.shtml<br>Doctor of Philosophy in Geographic Information Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-geographic-information-science.shtml<br>Master of Medical Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-medical-sciences.shtml<br>Master of Business Administration — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-business-administration.shtml<br>Master of Engineering Management — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-engineering-management.shtml<br>Master of Science in Clinical Psychology — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-psychology.shtml<br>Master of Science in Forensic Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-forensic-science.shtml<br>Master of Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-education.shtml<br>Doctor of Pharmacy — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-pharmacy.shtml<br>Master of Public Health — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-health.shtml<br>Doctor of Philosophy in Biomedical Sciences — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-biomedical-sciences.shtml<br>Doctor of Philosophy in Law — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-law.shtml<br>Master of Private Law — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-private-law.shtml<br>Master of Public Law — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-public-law.shtml<br>Doctorate of Business Administration — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctorate-of-business-administration.shtml<br>Master of Science in Food Science — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-food-science.shtml<br>Master of Social Work — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-social-work.shtml<br>Master of Arts in Arabic Language and Literature — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-arts-in-arabic-language-and-literature.shtml<br>Master in Gifted and Talented Education — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-in-gifted-and-talented-education.shtml<br>Master of Science in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-architectural-engineering.shtml<br>Master of Science in Water Resources — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-water-resources.shtml<br>Master of Science in Petroleum Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-petroleum-engineering.shtml<br>Master of Science in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemical-engineering.shtml<br>Master of Genetic Counseling — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-genetic-counseling.shtml<br>Master of Science in Software Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-software-engineering.shtml<br>Master of Strategic and Defense Studies — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-strategic-and-defense-studies.shtml<br>Master of Governance and Public Policy — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-governance-and-public-policy.shtml<br>Master of Science in Genomic Medicine — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-genomic-medicine.shtml<br>Doctor of Philosophy in Informatics and Computing — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-informatics-and-computing.shtml<br>Master of Science in Information Technology Management — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-technology-management.shtml<br>Master of Science in Physics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-physics.shtml<br>Master of Science in Mathematics — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mathematics.shtml<br>Doctor of Philosophy in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-civil-engineering.shtml<br>Doctor of Philosophy in Environmental Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-environmental-engineering.shtml<br>Doctor of Philosophy in Water Resources — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-water-resources.shtml<br>Master of Science in Clinical Research — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-clinical-research.shtml<br>Doctor of Philosophy in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mechanical-engineering.shtml<br>Master of Science in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mechanical-engineering.shtml<br>Doctor of Philosophy in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-electrical-engineering.shtml<br>Doctor of Philosophy in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemical-engineering.shtml<br>Master of Science in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-electrical-engineering.shtml<br>Doctor of Philosophy in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-architectural-engineering.shtml<br>Master of Science in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-civil-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant provided a comprehensive, directory-derived list of UAEU postgraduate programs with official links, correctly reflecting the current college names and program titles, including the College of Computing and Artificial Intelligence and its STEM scope. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER153: prospective-ug

Turn 1

| Field | Details |
|---|---|
| Question | Which undergraduate programs are in CCAI? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Programs in the verified official directory:<br><br>**College of Computing and Artificial Intelligence · Computer and Network Engineering**<br>• [Bachelor of Science in Computer and Artificial Intelligence Engineering](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml)<br><br>**College of Computing and Artificial Intelligence · Computer Science and Software Engineering**<br>• [Bachelor of Science in Computer Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml)<br>• [Bachelor of Science in Data Science and Artificial Intelligence](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-data-science-and-artificial-intelligence.shtml)<br><br>**College of Computing and Artificial Intelligence · Information Systems and Security**<br>• [Bachelor of Science in Cybersecurity](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml)<br>• [Bachelor of Science in Information Technology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml) |
| Actual sources | Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml<br>Bachelor of Science in Cybersecurity — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-cybersecurity.shtml<br>Bachelor of Science in Computer and Artificial Intelligence Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml<br>Bachelor of Science in Computer Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-science.shtml<br>Bachelor of Science in Data Science and Artificial Intelligence — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-data-science-and-artificial-intelligence.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | The assistant correctly lists the undergraduate programs in CCAI with accurate names and provides official sources. It meets the rubric by citing official readable sources and distinguishing public information. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER154: prospective-ug

Turn 1

| Field | Details |
|---|---|
| Question | How do I apply to UAEU as an international undergraduate? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | To apply to UAEU as an international undergraduate student, you must submit an application through the official UAEU website during announced application periods, have completed a Grade 12 certificate or its equivalent from an accredited institution, fulfill university-approved English proficiency requirements, obtain a Ministry of Education equivalency certificate if your high school certificate is from a non-MOE curriculum, be under 35 years old at application time, not have been previously dismissed academically or disciplinarily from another institution, and meet health fitness requirements including disclosure of any special medical conditions. |
| Actual sources | Undergraduate Admissions — https://www.uaeu.ac.ae/en/admission/international-students-and-children-of-uaeu-employees.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly outlines the application process for international undergraduates at UAEU, citing the official UAEU admissions page and providing accurate requirements without inventing details. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER155: prospective-ug

Turn 1

| Field | Details |
|---|---|
| Question | What housing information is available for applicants? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Applicants for UAEU student housing must be enrolled students living more than 50 km outside Al Ain to apply through the Rooms Assignment Service.<br><br>Applicants apply by signing in with UAE Pass or UAEU credentials, pay all applicable fees upfront without installment or exemption options, select their preferred building and room, and receive confirmation by email.<br><br>International students are required to pay before entering the housing, and the process completion is immediate but does not guarantee availability; no application closing date is specified in the available information. |
| Actual sources | UAEU Rooms Assignment Service — https://coreservices.uaeu.ac.ae/ServiceCatalog/details?serviceId=106 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provides detailed housing application information for UAEU applicants, cites an official source, and distinguishes public guidance from private access. The response aligns well with the rubric and official reference. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER156: prospective-ug

Turn 1

| Field | Details |
|---|---|
| Question | Where is the academic calendar? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | The official UAEU academic calendar is published online at https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en, where you can find all semester dates including start of classes, registration, add/drop deadlines, withdrawal, and final exams. |
| Actual sources | UAEU Academic Calendar — https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provided the official UAEU academic calendar link and described its contents accurately, meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER157: prospective-pg

Turn 1

| Field | Details |
|---|---|
| Question | List all graduate programs in Engineering. |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Programs in the verified official directory:<br><br>**College of Engineering · Architectural Engineering**<br>• [Doctor of Philosophy in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-architectural-engineering.shtml)<br>• [Master of Science in Architectural Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-architectural-engineering.shtml)<br><br>**College of Engineering · Chemical & Petroleum Engineering**<br>• [Doctor of Philosophy in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemical-engineering.shtml)<br>• [Master of Science in Chemical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemical-engineering.shtml)<br>• [Master of Science in Petroleum Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-petroleum-engineering.shtml)<br><br>**College of Engineering · Civil & Environmental Engineering**<br>• [Doctor of Philosophy in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-civil-engineering.shtml)<br>• [Doctor of Philosophy in Environmental Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-environmental-engineering.shtml)<br>• [Doctor of Philosophy in Water Resources](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-water-resources.shtml)<br>• [Master of Science in Civil Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-civil-engineering.shtml)<br>• [Master of Science in Water Resources](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-water-resources.shtml)<br><br>**College of Engineering · Electrical and Communication Engineering**<br>• [Doctor of Philosophy in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-electrical-engineering.shtml)<br>• [Master of Science in Electrical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-electrical-engineering.shtml)<br><br>**College of Engineering · Mechanical and Aero Space Engineering**<br>• [Doctor of Philosophy in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mechanical-engineering.shtml)<br>• [Master of Engineering Management](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-engineering-management.shtml)<br>• [Master of Science in Mechanical Engineering](https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mechanical-engineering.shtml) |
| Actual sources | Master of Engineering Management — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-engineering-management.shtml<br>Master of Science in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-architectural-engineering.shtml<br>Master of Science in Water Resources — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-water-resources.shtml<br>Master of Science in Petroleum Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-petroleum-engineering.shtml<br>Master of Science in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-chemical-engineering.shtml<br>Doctor of Philosophy in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-civil-engineering.shtml<br>Doctor of Philosophy in Environmental Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-environmental-engineering.shtml<br>Doctor of Philosophy in Water Resources — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-water-resources.shtml<br>Doctor of Philosophy in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-mechanical-engineering.shtml<br>Master of Science in Mechanical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-mechanical-engineering.shtml<br>Doctor of Philosophy in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-electrical-engineering.shtml<br>Doctor of Philosophy in Chemical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-chemical-engineering.shtml<br>Master of Science in Electrical Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-electrical-engineering.shtml<br>Doctor of Philosophy in Architectural Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/doctor-of-philosophy-in-architectural-engineering.shtml<br>Master of Science in Civil Engineering — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-civil-engineering.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Complete list from the official program directory with each program's catalog link; the department grouping is the department published on each official program page. (automatic grade was partial: The assistant correctly lists all graduate engineering programs from the official reference and provides relevant official sources. However, it does not distinguish public guidance from live private access nor requests any missing applicant details, which the rubric requires.) |

## Test Case POWER158: prospective-pg

Turn 1

| Field | Details |
|---|---|
| Question | What is the MSc in Information Technology Management curriculum? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | The MSc in Information Technology Management program requires a minimum of 30 credit hours for completion.<br><br>The program includes required courses such as ITCO601 Current Emerging Trends in Information Technology and ITCO602 Management and Leadership in Information Technology.<br><br>The program aims to develop graduates with thorough knowledge in information systems and technologies, combined with management, communication, and decision-making skills to effectively implement organizational solutions and succeed as IT leaders and technical experts. |
| Actual sources | Master of Science in Information Technology Management — https://www.uaeu.ac.ae/en/catalog/graduate/programs/master-of-science-in-information-technology-management.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | Hand review: Lists the MSc ITM's 30-credit minimum and core courses (ITCO601, ITCO602…) from the official program page. (automatic grade was partial: The assistant correctly describes the MSc in Information Technology Management curriculum and cites an official source, but it does not distinguish public guidance from live private access or request any missing applicant details as required by the rubric.) |

## Test Case POWER159: prospective-pg

Turn 1

| Field | Details |
|---|---|
| Question | What are the general graduate admission requirements? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | To apply for graduate studies at UAEU, you must use the official online application on the College of Graduate Studies admission page, selecting your degree and program; meeting minimum requirements does not guarantee admission as programs may have higher standards.<br><br>For a master's program mainly taught in English, the baseline requirements include holding a related accredited bachelor's degree with a minimum GPA of 3.0 out of 4.0, and an IELTS Academic score of 6.0; conditional admission may be possible with IELTS 5.5 under specific conditions.<br><br>For PhD programs, the general minimum requirements are a master's degree with a GPA of at least 3.0, a bachelor's degree with a GPA of at least 2.5, and an IELTS Academic score of 6.5 for English-medium study or English dissertation, with some exemptions and additional college-specific requirements possible.<br><br>PhD applicants must also submit certified copies of bachelor's and master's degrees and transcripts, Ministry of Education equivalency if required, language proficiency certificates, two recommendation letters, a CV, valid passport (and Emirates ID for UAE residents or family book for UAE nationals), and a personal photo. |
| Actual sources | UAEU College of Graduate Studies Admission — https://www.uaeu.ac.ae/en/cgs/admission.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | Hand review: Graduate admission baseline (related bachelor's, GPA 3.0, IELTS 6.0; conditional 5.5; PhD minimums) from the College of Graduate Studies admission page, with its link. (automatic grade was partial: The assistant provides detailed graduate admission requirements and cites the official UAEU College of Graduate Studies page, fulfilling the citation and public guidance criteria. However, it does not distinguish public guidance from live private access explicitly, nor does it request any genuinely missing applicant details, which the rubric requires.) |

## Test Case POWER160: prospective-pg

Turn 1

| Field | Details |
|---|---|
| Question | Who can help me with a graduate application? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | You can apply online for graduate programs through the College of Graduate Studies admission page, where you select your desired degree and program.<br><br>For general enquiries about graduate applications, you can visit the College of Graduate Studies at Building F3, First Floor, Rooms 102-106 in Al Ain, or contact them by phone at +971 3 713 4048 or by email at cgs@uaeu.ac.ae. |
| Actual sources | UAEU College of Graduate Studies — Graduate Programs Admissions — https://www.uaeu.ac.ae/en/cgs/admission.shtml<br>UAEU College of Graduate Studies — Contacts — https://www.uaeu.ac.ae/en/cgs/contacts.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provides public university graduate application guidance with official contact details and sources, meeting the rubric requirements without hallucination. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER161: parent

Turn 1

| Field | Details |
|---|---|
| Question | Which programs does UAEU offer in Science? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Programs in the verified official directory:<br><br>**College of Science · Biology**<br>• [Bachelor of Science in Biology](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biology.shtml)<br><br>**College of Science · Chemistry**<br>• [Bachelor of Science in Biochemistry](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biochemistry.shtml)<br>• [Bachelor of Science in Chemistry](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemistry.shtml)<br><br>**College of Science · Geosciences**<br>• [Bachelor of Science in Geosciences](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-geosciences.shtml)<br><br>**College of Science · Mathematical Sciences**<br>• [Bachelor of Science in Mathematics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mathematics.shtml)<br>• [Bachelor of Science in the Mathematics of Data Science](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-the-mathematics-of-data-science.shtml)<br><br>**College of Science · Physics**<br>• [Bachelor of Science in Physics](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-physics.shtml)<br>• [Bachelor of Science in Space Sciences](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-space-sciences.shtml) |
| Actual sources | Bachelor of Science in Geosciences — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-geosciences.shtml<br>Bachelor of Science in Biology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biology.shtml<br>Bachelor of Science in Chemistry — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-chemistry.shtml<br>Bachelor of Science in Biochemistry — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-biochemistry.shtml<br>Bachelor of Science in the Mathematics of Data Science — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-the-mathematics-of-data-science.shtml<br>Bachelor of Science in Space Sciences — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-space-sciences.shtml<br>Bachelor of Science in Mathematics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-mathematics.shtml<br>Bachelor of Science in Physics — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-physics.shtml |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Complete list from the official program directory with each program's catalog link; the department grouping is the department published on each official program page. (automatic grade was partial: The assistant correctly lists all the Bachelor of Science programs in the College of Science at UAEU with accurate links, fulfilling the rubric's requirement to cite official sources. However, it does not distinguish public guidance from live private access nor requests any missing applicant details, which are required by the rubric.) |

## Test Case POWER162: parent

Turn 1

| Field | Details |
|---|---|
| Question | How can a parent find official campus safety information? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Visitors, including parents, must register at the gate of entry and follow the university's rules and regulations regarding health and safety; children accompanying parents are allowed in College of Science operational areas only in exceptional cases and under close supervision by university staff.<br><br>The university has designated safety officers at the department and college levels who oversee compliance with safety regulations and training of staff and students in health and safety. |
| Actual sources | cos-policies-and-guidelines-2022.pdf — https://www.uaeu.ac.ae/en/cos/pdf/cos-policies-and-guidelines-2022.pdf#page=4<br>health-safety-college-doc.pdf — https://www.uaeu.ac.ae/en/cos/pdf/health-safety-college-doc.pdf#page=4 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Partially correct |
| Comments | Hand review: Cites official safety documents, but they are College of Science lab rules; it does not give a parent general campus safety information or the right office. |

## Test Case POWER163: parent

Turn 1

| Field | Details |
|---|---|
| Question | Where can I find official student housing information? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Official student housing information at UAEU is available through the UAEU Rooms Assignment Service website, which provides details on application conditions, requirements, fees, and the assignment process. |
| Actual sources | UAEU Rooms Assignment Service — https://coreservices.uaeu.ac.ae/ServiceCatalog/details?serviceId=106 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provides the official source for student housing information at UAEU and distinguishes it as public guidance. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER164: parent

Turn 1

| Field | Details |
|---|---|
| Question | Does UAEU provide student transport? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | UAEU provides various student transportation services including transport for female students in Al Ain City, shuttle buses between university dormitories and campus, transportation within the campus, weekend transport, transport for field training, and transport to events and activities.<br><br>UAEU offers free air-conditioned shuttle buses regularly during the day between student campus accommodations and the UAEU Colleges, and free transportation for all housing students to their respective emirates every Thursday and back on Saturdays.<br><br>Free transportation is also available for international students to and from any airport in the UAE at the time of departure or return to campus, including free air transportation to students from Delma due to a generous contribution. |
| Actual sources | Our Services — https://www.uaeu.ac.ae/en/dvcfaa/general_services/transportation-section/services.shtml<br>1_edite_2017-1866-booklet.pdf — https://www.uaeu.ac.ae/en/docs/1_edite_2017-1866-booklet.pdf#page=45 |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly describes UAEU's student transportation services with accurate details and cites official sources. The response meets the rubric by providing public university service information and relevant references. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER165: partner

Turn 1

| Field | Details |
|---|---|
| Question | Which research centers does UAEU have? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | UAE University has the following research centers: Emirates Center for Happiness Research; National Space Science and Technology Center; Zayed Bin Sultan Center for Health Sciences; National Water and Energy Center; Human Capital Research Center; Emirates Center for Mobility Research; Khalifa Center for Genetic Engineering and Biotechnology; Center for Public Policy and Leadership; Center for Artificial Intelligence and Digital Innovation; Emirates Center for Entrepreneurship Research; Desert Environment Research Center; and Mouza Bint Suhail Center for Exceptional Children. |
| Actual sources | Research Centers & Institutes — https://www.uaeu.ac.ae/en/research/centers/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly lists UAEU research centers and cites an official source, meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER166: partner

Turn 1

| Field | Details |
|---|---|
| Question | Where should a company ask about a research partnership? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | A company should submit a Partnership Request Form through the UAEU Development Partnership Unit, providing organization details, field of cooperation, contact number, and email address.<br><br>Alternatively, companies can contact the UAEU Research Office by email at research.office@uaeu.ac.ae to explore collaboration opportunities with academic institutions, government organizations, industry partners, NGOs, and international research centers. |
| Actual sources | Partnership Request Form — https://www.uaeu.ac.ae/en/dvcaa/development-partnership-unit/partnership-request-form.shtml<br>Research Collaborations at UAEU — https://www.uaeu.ac.ae/en/research/research-and-sponsored-projects-office/collaborations.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies the UAEU Development Partnership Unit and Research Office as points of contact for research partnerships, cites official sources, and distinguishes public guidance from private access. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER167: partner

Turn 1

| Field | Details |
|---|---|
| Question | Where can another university contact UAEU about collaboration? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | UAEU's Development and Partnership Unit is dedicated to establishing and strengthening strategic partnerships with national and international entities.<br><br>For research collaborations, UAEU welcomes partnerships with academic institutions and can be contacted via research.office@uaeu.ac.ae. |
| Actual sources | UAEU Development and Partnership Unit — https://www.uaeu.ac.ae/en/dvcaa/development-partnership-unit/<br>UAEU Research Collaborations — Research and Sponsored Projects Office — https://www.uaeu.ac.ae/en/research/research-and-sponsored-projects-office/collaborations.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies the relevant UAEU unit and provides official contact information with sources, meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER168: partner

Turn 1

| Field | Details |
|---|---|
| Question | Where are official faculty contact details? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Official faculty contact details for UAE University are organized by college and can be found in the UAEU Faculty Directory at https://www.uaeu.ac.ae/en/catalog/uaeu-faculty-directory.shtml.<br><br>General university contact information includes a toll-free call number 800 8238 (UAEU), with working hours from Monday to Thursday 8:00 AM to 5:00 PM and Friday 8:00 AM to 3:00 PM, plus a fax number +971 3 713 4343. |
| Actual sources | UAEU Faculty Directory — https://www.uaeu.ac.ae/en/catalog/uaeu-faculty-directory.shtml<br>Contact UAEU — https://www.uaeu.ac.ae/en/contact/index.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provided official faculty contact details with relevant sources and distinguished public information from private access. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER169: current-without-login

Turn 1

| Field | Details |
|---|---|
| Question | How do I reset my university password? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | You can reset your UAEU university password using the official UAEU Password Self-Service portal at selfservice.uaeu.ac.ae.<br><br>If you need assistance with password reset, you can contact the DoIT Help Desk at +9713 713 6111 or email Helpdesk@uaeu.ac.ae. |
| Actual sources | UAEU Password Self-Service portal — https://selfservice.uaeu.ac.ae/<br>UAEU DoIT Help Desk contact — https://uaeu.ac.ae/en/vc/doit/contact-us.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly provides the official password reset portal and contact details for help, citing relevant official sources as required by the rubric. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER170: current-without-login

Turn 1

| Field | Details |
|---|---|
| Question | How do I access the university library? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | The Main Library is located in the IT College building at UAEU and is open Monday to Thursday from 7:30 AM to 3:00 PM, and Friday from 7:30 AM to 12:00 noon; it is closed on Saturday and Sunday. This is the published schedule; its season is unspecified and hours may change seasonally.<br><br>You can contact the library staff for assistance at the phone number +971 3 713 4671 during reference hours until 3:30 PM Monday to Thursday. This is the published schedule; its season is unspecified and hours may change seasonally. |
| Actual sources | UAEU Library Hours — https://www.uaeu.ac.ae/en/library/libraryhours.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | Hand review: Hours, reference phone and location match the official Library Hours page (which itself calls the building the IT College). (automatic grade was partial: The assistant provides useful library access information and cites an official source, but does not distinguish public guidance from live private access or request any missing applicant details as required by the rubric.) |

## Test Case POWER171: current-without-login

Turn 1

| Field | Details |
|---|---|
| Question | Where are add/drop dates published? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | Add/drop dates for UAEU semesters are published in the official UAEU Academic Calendar available on the university's website.<br><br>For example, the Fall Semester 2026 add/drop period begins on Monday, 17 August 2026, as stated in the official calendar.<br><br>Additionally, the 'New students' page on the UAEU website publishes course registration and add/drop dates for new admitted students, such as the Fall 2026 add/drop period from August 17 to August 28, 2026. |
| Actual sources | /Calendar/Calendar — https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en<br>New students — https://www.uaeu.ac.ae/en/dvcsae/registration/new_students.shtml |
| Model | gpt-4.1-mini |
| Verdict | ✅ Correct |
| Comments | The assistant correctly identifies where add/drop dates are published and cites official UAEU sources with specific examples, meeting the rubric requirements. (automatic grade, gpt-4.1-mini against the rubric and official reference) |

## Test Case POWER172: current-without-login

Turn 1

| Field | Details |
|---|---|
| Question | Can you access my Degree Works audit? |
| Expected answer | Answer the requested public university service for this audience, cite a relevant official readable source, distinguish public guidance from live private access, and request genuinely missing applicant details. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | No, I can't access Degree Works, the student portal or your academic record. If you enter your courses and grades on your profile page, I can work out remaining credits, check prerequisites and suggest next semester from the official plan. The official audit stays in Degree Works and with your advisor. |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ✅ Correct |
| Comments | Hand review: Honestly says it cannot access Degree Works or the portal and offers the profile-based alternative; no source needed for a capability boundary. (automatic grade was partial: The assistant correctly states it cannot access Degree Works or private records and offers to help with course planning, but it does not cite an official source or request missing applicant details as required by the rubric.) |

