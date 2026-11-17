# UAEU Assistant — actual test conversations

Run: test-cases/baseline-six.json
Started: 2026-11-17T12:50:44.388Z
Completed: 2026-11-17T12:52:55.578Z

No test is marked correct solely because a request succeeded. Verdicts remain unreviewed until compared with official evidence.

## Test Case SUP01: UAEU STEM programs

Turn 1

| Field | Details |
|---|---|
| Question | Can you tell me all STEM programs UAEU offers? |
| Expected answer | Group the published undergraduate STEM programs by their official colleges, or provide specific college program directory links. Define the requested degree level and avoid calling minors standalone degrees. |
| Expected sources | https://www.uaeu.ac.ae/en/eng/programs/undergraduate/<br>https://www.uaeu.ac.ae/en/cit/<br>https://www.uaeu.ac.ae/en/cos/programs/undergraduate/ |
| Actual answer | UAEU offers a course titled STEM Education in Early Childhood Education (CURR620) which focuses on an interdisciplinary approach to learning in science, technology, engineering, and mathematics. |
| Actual sources | UAEU Catalog — CURR620 STEM Education in ECE — https://www.uaeu.ac.ae/en/catalog/courses/course_2910.shtml?id=CURR620 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 14.286 seconds. Actual transcript retained; factual review pending. |

## Test Case SUP02: Ambiguous CE followed by Computer Engineering

Turn 1

| Field | Details |
|---|---|
| Question | Does UAEU have a CE program? |
| Expected answer | Clarify Civil versus Computer Engineering first; then identify the current Computer and Artificial Intelligence Engineering degree, explain its two concentrations or general pathway, and give readable current sources. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml |
| Actual answer | Do you mean Civil Engineering / Computer Engineering? That abbreviation does not identify one program. |
| Actual sources | UAEU official undergraduate programs — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/index.shtml |
| Model | Not identified in response |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.542 seconds. Actual transcript retained; factual review pending. |

Turn 2

| Field | Details |
|---|---|
| Question | Computer Engineering |
| Expected answer | Clarify Civil versus Computer Engineering first; then identify the current Computer and Artificial Intelligence Engineering degree, explain its two concentrations or general pathway, and give readable current sources. |
| Expected sources | https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-and-artificial-intelligence-engineering.shtml |
| Actual answer | Yes, UAEU offers a Bachelor of Science in Computer Engineering program that covers both hardware and software aspects of computing systems and bridges topics in electrical engineering and computer science. |
| Actual sources | Bachelor of Science in Computer Engineering — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-computer-engineering.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.977 seconds. Actual transcript retained; factual review pending. |

## Test Case SUP03: Calendar then Mechanical Engineering project then chat history and identity

Turn 1

| Field | Details |
|---|---|
| Question | Where can I check UAEU academic calendar deadlines? |
| Expected answer | Calendar source; Mechanical Engineering project sequence from the applicable model (ask entry cohort if needed), never VMED580; preserve the correction; recall the first calendar question from chat; identify the student SGP team from CCAI without retrieving a university policy. |
| Expected sources | https://www.uaeu.ac.ae/en/calendar/index.shtml<br>https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | You can check the UAEU academic calendar deadlines on the official UAEU Academic Calendar webpage, such as the Spring 2027 calendar available at https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en. |
| Actual sources | UAEU Academic Calendar — Spring2027 — https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 7.493 seconds. Actual transcript retained; factual review pending. |

Turn 2

| Field | Details |
|---|---|
| Question | I am a mech E student in my third year first semester, when should I take the senior project? |
| Expected answer | Calendar source; Mechanical Engineering project sequence from the applicable model (ask entry cohort if needed), never VMED580; preserve the correction; recall the first calendar question from chat; identify the student SGP team from CCAI without retrieving a university policy. |
| Expected sources | https://www.uaeu.ac.ae/en/calendar/index.shtml<br>https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | For the Senior Research Project course VMED580, students must complete the prerequisite courses VMED425, VMED433, VMED435, VMED444, VMED448, and VMED451 with at least a minimum grade D before enrolling.<br><br>The senior project VMED580 is a prerequisite for the Year 5 clinical core rotations and internship courses, which are taken in Year 5 semesters 1 and 2 after completing all courses from years 1 to 4.<br><br>The senior project (VMED580) is listed in the program structure for the Bachelor of Veterinary Medicine as part of Cluster 5, typically taken before the fifth year internship. |
| Actual sources | UAEU Catalog — VMED580 Senior Research Project — https://www.uaeu.ac.ae/en/catalog/courses/course_4973.shtml?id=VMED580<br>undergraduate_programs_2025_2026.pdf — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/undergraduate_programs_2025_2026.pdf#page=143<br>Bachelor of Veterinary Medicine — https://www.uaeu.ac.ae/en/cavm/departments/undergraduate_programs/veterinary/ |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 7.628 seconds. Actual transcript retained; factual review pending. |

Turn 3

| Field | Details |
|---|---|
| Question | No, I am a mechanical engineering student, not whatever that is! |
| Expected answer | Calendar source; Mechanical Engineering project sequence from the applicable model (ask entry cohort if needed), never VMED580; preserve the correction; recall the first calendar question from chat; identify the student SGP team from CCAI without retrieving a university policy. |
| Expected sources | https://www.uaeu.ac.ae/en/calendar/index.shtml<br>https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | The available UAEU Mechanical Engineering first semester model plan for the Fall 2026–27 cohort does not specify when the senior project should be taken in the curriculum.<br><br>I cannot view your personal student record; this explains the published rules, not an individual eligibility decision. |
| Actual sources | UAEU Mechanical Engineering model plan first semester — https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 8.085 seconds. Actual transcript retained; factual review pending. |

Turn 4

| Field | Details |
|---|---|
| Question | What was my first question? |
| Expected answer | Calendar source; Mechanical Engineering project sequence from the applicable model (ask entry cohort if needed), never VMED580; preserve the correction; recall the first calendar question from chat; identify the student SGP team from CCAI without retrieving a university policy. |
| Expected sources | https://www.uaeu.ac.ae/en/calendar/index.shtml<br>https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | Your first question was about where to check UAEU academic calendar deadlines. |
| Actual sources | Academic Affairs Calendar — https://www.uaeu.ac.ae/en/dvcaa/academic_personnel/new-inner-page.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 10.928 seconds. Actual transcript retained; factual review pending. |

Turn 5

| Field | Details |
|---|---|
| Question | Who created you? |
| Expected answer | Calendar source; Mechanical Engineering project sequence from the applicable model (ask entry cohort if needed), never VMED580; preserve the correction; recall the first calendar question from chat; identify the student SGP team from CCAI without retrieving a university policy. |
| Expected sources | https://www.uaeu.ac.ae/en/calendar/index.shtml<br>https://www.uaeu.ac.ae/en/eng/pdf/coe_bsc_mechanical_engineering_study_plan.pdf |
| Actual answer | United Arab Emirates University was founded in 1976 by the late Sheikh Zayed Bin Sultan Al Nahyan. |
| Actual sources | Overview — https://www.uaeu.ac.ae/en/about/overview.shtml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 9.648 seconds. Actual transcript retained; factual review pending. |

## Test Case SUP04: First-year introduction without a question

Turn 1

| Field | Details |
|---|---|
| Question | Hi, my name is Noor. I am an IT major in my first year, first semester at UAEU. |
| Expected answer | Greet Noor, introduce the assistant and suggest relevant help. No unsolicited plan or cannot-verify fallback. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | For the first semester of the Bachelor of Science in Information Technology program at UAEU for the 2025–26 cohort, the study plan includes 16 credit hours consisting of these courses: GEAE101 Academic English for Humanities and STEM (3 credits, general education), MATH105 Calculus I (3 credits, college requirement), CSBP119 Algorithms and Problem Solving (3 credits, college requirement), PHYS105 General Physics I (3 credits, college requirement), an approved general-education elective from Theme 6, 7, 8, 9, 10, or 11 (3 credits), and CSBP121 Programming Lab I (1 credit, specialization). |
| Actual sources | UAEU Information Technology 2025–26 first-semester model plan — https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.130 seconds. Actual transcript retained; factual review pending. |

## Test Case SUP05: Second-year introduction repeated

Turn 1

| Field | Details |
|---|---|
| Question | Hi, my name is Noor. I am an IT major in my second year, second semester at UAEU. |
| Expected answer | Natural greeting/acknowledgement on each turn; no unsolicited plan, old college name, raw XML citation or cannot-verify fallback. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | You are enrolled in the Bachelor of Science in Information Technology program, which is offered by the College of Information Technology at UAEU and is accredited by ABET.<br><br>This program covers foundational IT knowledge along with current trends like Cloud Computing, Internet of Things, Mobile/Web Development, and Big Data/Data Analytics.<br><br>The program's study plans and degree requirements are designed to prepare students for professional competence in IT. |
| Actual sources | UAEU Official Program Finder — bilingual catalog data — https://www.uaeu.ac.ae/en/catalog/summary/search.xml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 7.090 seconds. Actual transcript retained; factual review pending. |

Turn 2

| Field | Details |
|---|---|
| Question | Hi, my name is Noor. I am an IT major in my second year, second semester at UAEU. |
| Expected answer | Natural greeting/acknowledgement on each turn; no unsolicited plan, old college name, raw XML citation or cannot-verify fallback. |
| Expected sources | Conversation/profile context, or official-source review pending |
| Actual answer | You are enrolled in the Bachelor of Science in Information Technology program at UAEU's College of Information Technology.<br><br>This undergraduate program offers a strong IT foundation and covers current IT trends such as Cloud Computing, Internet of Things, Mobile/Web Development, and Big Data/Data Analytics. |
| Actual sources | UAEU Official Program Finder — bilingual catalog data — https://www.uaeu.ac.ae/en/catalog/summary/search.xml |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 4.919 seconds. Actual transcript retained; factual review pending. |

## Test Case SUP06: Next semester using earlier IT year and semester

Turn 1

| Field | Details |
|---|---|
| Question | Hi, my name is Noor. I am an IT major in my second year, second semester at UAEU. |
| Expected answer | Keep IT as the only stated program and infer Year 3 Semester 1. Ask for admit term/catalog if unknown, then use that matching official plan. Do not invent Information Security as an earlier-mentioned program. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Are you asking about an undergraduate, master's, or PhD program? |
| Actual sources | None |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 2.406 seconds. Actual transcript retained; factual review pending. |

Turn 2

| Field | Details |
|---|---|
| Question | What should I take next semester? |
| Expected answer | Keep IT as the only stated program and infer Year 3 Semester 1. Ask for admit term/catalog if unknown, then use that matching official plan. Do not invent Information Security as an earlier-mentioned program. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | Do you mean Bachelor of Science in Information Security or Bachelor of Science in Information Technology? More than one subject was mentioned; which one does this follow-up concern? |
| Actual sources | None |
| Model | No model call; local routing/calculation |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 0.105 seconds. Actual transcript retained; factual review pending. |

Turn 3

| Field | Details |
|---|---|
| Question | Bachelor of Science in Information Technology |
| Expected answer | Keep IT as the only stated program and infer Year 3 Semester 1. Ask for admit term/catalog if unknown, then use that matching official plan. Do not invent Information Security as an earlier-mentioned program. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | The Bachelor of Science in Information Technology at UAEU requires a minimum of 120 credit hours to graduate.<br><br>The program is offered by the College of Information Technology and includes a strong IT foundation with current IT trends such as Cloud Computing, Internet of Things, Mobile/Web Development, and Big Data/Data Analytics.<br><br>In the last semester, students must take a 6-credit-hour internship (ITBP 496), during which no other courses can be registered.<br><br>Which academic term and year do you mean? |
| Actual sources | Bachelor of Science in Information Technology — https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-technology.shtml<br>UAEU Official Program Finder — bilingual catalog data — https://www.uaeu.ac.ae/en/catalog/summary/search.xml<br>undergraduate_programs_2025_2026.pdf — https://www.uaeu.ac.ae/en/dvcaa/aau/pdf/undergraduate_programs_2025_2026.pdf#page=250 |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 5.130 seconds. Actual transcript retained; factual review pending. |

Turn 4

| Field | Details |
|---|---|
| Question | Year three term one |
| Expected answer | Keep IT as the only stated program and infer Year 3 Semester 1. Ask for admit term/catalog if unknown, then use that matching official plan. Do not invent Information Security as an earlier-mentioned program. |
| Expected sources | https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_information_technology_study_plan.pdf |
| Actual answer | **Please identify the UAEU request**<br>I could not reliably map that wording to one approved service or course. Send the service name or course code and say whether you need steps, a deadline, fees, eligibility, or status. |
| Actual sources | None |
| Model | gpt-4.1-mini |
| Verdict | ⚠️ Unreviewed |
| Comments | HTTP 200; 5.278 seconds. Actual transcript retained; factual review pending. |

