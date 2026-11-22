# Dr. Fady's 10 student questions — before / after

Deployed bot (uaeu-assistant.vercel.app) result from the tester: **2/10 correct**. Local merged build before fixes: **3/10** (automatic checks). After fixes: **10/10 cases and 25/25 phrasing variants pass** (35/35), checked automatically (`scripts/profiles/grade-fady.mjs`) and read by hand against the official sources below.

Run on 18 Nov 2026, local production build (feat/student-profiles-and-power), model from `.env.local`. Raw answers: `test-cases/fady-before.json`, `test-cases/fady-after.json`.

## Before / after summary

| # | Question | Deployed (tester) | After fix |
|---|---|---|---|
| 1 | How should I plan my bachelor? | ⚠️ Partially correct | ✅ Correct |
| 2 | How to raise ceiling? | ❌ Incorrect | ✅ Correct |
| 3 | How can I view the list of courses offered for the upcoming summer term? | ⚠️ Partially correct | ✅ Correct |
| 4 | How do I know which courses I should register for next semester? | ❌ Incorrect | ✅ Correct |
| 5 | How to add a course? | ✅ Correct | ✅ Correct |
| 6 | How to request a closed section override? | ⚠️ Partially correct | ✅ Correct |
| 7 | How do I calculate my GPA? | ✅ Correct | ✅ Correct |
| 8 | What are the university's working hours? | ❌ Incorrect | ✅ Correct |
| 9 | How to drop out of the uni? | ⚠️ Partially correct | ✅ Correct |
| 10 | How to apply for graduation? | ⚠️ Partially correct | ✅ Correct |

## Root causes fixed (not just these wordings)

- Internal reviewer messages ("withheld the draft", "source-support check", "narrower verified record", "Please identify the UAEU request", "More detail needed") are gone. A rejected draft now returns the official pages that cover the question plus one next step; status chips read "Quick question".
- Long records written for one examiner scenario can no longer be used as the answer to a short student question (this is why "plan my bachelor" and "summer courses" got scenario text).
- University-wide questions (course offerings, working hours, add a course) don't ask for the program. When the program matters (next semester's courses), it asks once, then year/semester + admission term, then answers; it never repeats the same question.
- Student slang (raise ceiling / رفع سقف / full section / seat request) maps to the CLOSED SECTION override procedure.
- "Verified from sources" is no longer shown on a generated answer that says the information isn't in the sources.
- Graduation/registration policies: the Registration Department's Policies page (updated 21 Apr 2026) still lists AE-03 and AE-06 (effective 2018) as current; answers say so instead of "may be outdated".

## Test case 1: How should I plan my bachelor? (vague planning)

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How should I plan my bachelor? |
| Expected answer | Asks program + admit term; gives short planning steps (study plan by semester, prerequisites, degree audit, advisor, graduation rules 120 credits / 2.00 GPA / no I grades). |
| Actual answer (after) | **Planning your bachelor's degree**<br>Which program are you in, and when were you admitted (e.g. Fall 2024)? Every program and intake has its own study plan, so I can then point you to yours.<br><br>The planning steps:<br>1. **Follow your program's official study plan** semester by semester. Each program page under [UAEU Undergraduate Programs](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml) links its plan.<br>2. **Check prerequisites** before each term; the registration system blocks a course whose prerequisite is missing.<br>3. **Track your progress in Degree Works** (your degree audit). Before each registration, your academic advisor sets next term's plan to *Active & Locked*.<br>4. **Meet your academic advisor** every term before registering.<br>5. **Keep the graduation rules in mind:** at least **120 credits** (some programs need more), a **cumulative GPA of 2.00** or higher, and **no Incomplete (I)** grades.<br><br>The graduation rules are from policy AE-06, which the Registration Department still lists as current; the College of Medicine and Health Sciences has its own rules. |
| Actual sources | [UAEU Undergraduate Programs](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml)<br>[UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Degree Completion and Graduation Policy (AE-06)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/6_degree_completion_and_graduation-en.pdf) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ⚠️ Partially correct. *Local before fix:* **What a course planner can calculate and what must be verified** - From an approved course and program record, the assistant can check published **prerequisites and corequisites**, calculate the credits in a specified m…

*What changed:* New reviewed planning answer: asks program + admission term and gives 5 planning steps with the programs page, Degree Works and the graduation rules; notes AE-06 is still the version the Registration Department lists (page updated Apr 2026). Long examiner-scenario records can no longer be chosen for short student questions.

**Variant FADY01-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how do i plan my degree |
| Actual answer (after) | **Planning your bachelor's degree**<br>Which program are you in, and when were you admitted (e.g. Fall 2024)? Every program and intake has its own study plan, so I can then point you to yours.<br><br>The planning steps:<br>1. **Follow your program's official study plan** semester by semester. Each program page under [UAEU Undergraduate Programs](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml) links its plan.<br>2. **Check prerequisites** before each term; the registration system blocks a course whose prerequisite is missing.<br>3. **Track your progress in Degree Works** (your degree audit). Before each registration, your academic advisor sets next term's plan to *Active & Locked*.<br>4. **Meet your academic advisor** every term before registering.<br>5. **Keep the graduation rules in mind:** at least **120 credits** (some programs need more), a **cumulative GPA of 2.00** or higher, and **no Incomplete (I)** grades.<br><br>The graduation rules are from policy AE-06, which the Registration Department still lists as current; the College of Medicine and Health Sciences has its own rules. |
| Actual sources | [UAEU Undergraduate Programs](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml)<br>[UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Degree Completion and Graduation Policy (AE-06)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/6_degree_completion_and_graduation-en.pdf) |
| Verdict | ✅ Correct |

**Variant FADY01-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أخطط لدراستي في البكالوريوس؟ |
| Actual answer (after) | **التخطيط لدراسة البكالوريوس**<br>ما برنامجك، ومتى التحقت بالجامعة (مثل خريف 2024)؟ لكل برنامج ودفعة خطة دراسية خاصة، وبعدها أدلك على خطتك.<br><br>خطوات التخطيط:<br>1. **اتبع الخطة الدراسية الرسمية لبرنامجك** فصلًا بفصل؛ صفحة كل برنامج في [برامج البكالوريوس](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml) تتضمن رابط خطته.<br>2. **تحقق من المتطلبات السابقة** قبل كل فصل؛ نظام التسجيل يمنع تسجيل مادة لم تستوفِ متطلبها السابق.<br>3. **تابع تقدمك في Degree Works** (التدقيق الأكاديمي)؛ قبل كل تسجيل يضبط مرشدك خطة الفصل القادم على *Active & Locked*.<br>4. **قابل مرشدك الأكاديمي** كل فصل قبل التسجيل.<br>5. **تذكر شروط التخرج:** **120 ساعة معتمدة** على الأقل (بعض البرامج تتطلب أكثر)، و**معدل تراكمي 2.00** أو أعلى، و**عدم وجود درجة غير مكتمل (I)**.<br><br>شروط التخرج من السياسة AE-06 التي ما زالت إدارة التسجيل تدرجها كسياسة حالية؛ ولكلية الطب والعلوم الصحية قواعدها الخاصة. |
| Actual sources | [UAEU Undergraduate Programs](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml)<br>[UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Degree Completion and Graduation Policy (AE-06)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/6_degree_completion_and_graduation-en.pdf) |
| Verdict | ✅ Correct |

**Variant FADY01-V3**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how shud i plan my bachelors |
| Actual answer (after) | **Planning your bachelor's degree**<br>Which program are you in, and when were you admitted (e.g. Fall 2024)? Every program and intake has its own study plan, so I can then point you to yours.<br><br>The planning steps:<br>1. **Follow your program's official study plan** semester by semester. Each program page under [UAEU Undergraduate Programs](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml) links its plan.<br>2. **Check prerequisites** before each term; the registration system blocks a course whose prerequisite is missing.<br>3. **Track your progress in Degree Works** (your degree audit). Before each registration, your academic advisor sets next term's plan to *Active & Locked*.<br>4. **Meet your academic advisor** every term before registering.<br>5. **Keep the graduation rules in mind:** at least **120 credits** (some programs need more), a **cumulative GPA of 2.00** or higher, and **no Incomplete (I)** grades.<br><br>The graduation rules are from policy AE-06, which the Registration Department still lists as current; the College of Medicine and Health Sciences has its own rules. |
| Actual sources | [UAEU Undergraduate Programs](https://www.uaeu.ac.ae/en/catalog/undergraduate-programs.shtml)<br>[UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Degree Completion and Graduation Policy (AE-06)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/6_degree_completion_and_graduation-en.pdf) |
| Verdict | ✅ Correct |

## Test case 2: How to raise ceiling? (student slang)

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How to raise ceiling? |
| Expected answer | Recognises raise ceiling / رفع سقف = request a seat in a full section (CLOSED SECTION override); gives the procedure with source. |
| Actual answer (after) | **Getting a seat in a full section ("raising the ceiling" / رفع سقف)**<br>"Raising the ceiling" means asking for a seat in a section that is already full (e.g. 40/40). In UAEU's registration system this is a **CLOSED SECTION override**.<br>1. **Confirm it's full:** in *Student Registration → Register for Classes*, a **Closed Section** error means no seats are left.<br>2. **Ask your College Advising Unit** for the override. UAEU's registration guidance sends closed-section and section-capacity questions there, and the college that offers the course sets its section ceiling. Give the course code, the section/CRN you need, and why (for example, your study plan or graduation).<br>3. **Do it during registration or add/drop.** Spring 2027: add/drop starts **4 January 2027**; the last day to add is **15 January 2027** ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **If approved,** add the section yourself (*Add → Submit*) and check it shows **Registered**. If not, choose another section or course with seats.<br><br>An override is a request, not a guaranteed seat. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ❌ Incorrect. *Local before fix:* **Undergraduate credit load — excluding Medicine and Health Sciences** - Regular-semester normal load: **12–19 credits**. Academic probation maximum: **13**. - After completing Foundation and with good academic standing,…

*What changed:* Student slang mapped: "raise ceiling", "رفع سقف", "full section", "40/40", "seat request" → CLOSED SECTION override answer with steps, College Advising Unit, add/drop dates and what to do if approved.

**Variant FADY02-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أرفع سقف الشعبة؟ |
| Actual answer (after) | **الحصول على مقعد في شعبة ممتلئة ("رفع السقف")**<br>"رفع السقف" يعني طلب مقعد في شعبة امتلأت (مثل 40/40). في نظام التسجيل بالجامعة يسمى هذا **CLOSED SECTION override**.<br>1. **تأكد أنها ممتلئة:** في *Student Registration ← Register for Classes* تعني رسالة **Closed Section** أنه لا توجد مقاعد.<br>2. **اطلب الاستثناء من وحدة الإرشاد الأكاديمي في كليتك**؛ إرشادات التسجيل في الجامعة توجه أسئلة الشعب المغلقة وسعة الشعب إليها، والكلية التي تطرح المادة هي التي تحدد سقف الشعبة. اذكر رمز المادة ورقم الشعبة (CRN) وسبب حاجتك (مثل خطتك الدراسية أو تخرجك).<br>3. **قدّم الطلب أثناء التسجيل أو فترة الحذف والإضافة.** ربيع 2027: تبدأ الإضافة والحذف **4 يناير 2027** وآخر يوم للإضافة **15 يناير 2027** ([التقويم الأكاديمي](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **إذا وافقوا** أضف الشعبة بنفسك (*Add ← Submit*) وتأكد أنها تظهر **Registered**. وإن لم يوافقوا اختر شعبة أو مادة أخرى فيها مقاعد.<br><br>الاستثناء طلب وليس مقعدًا مضمونًا. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

**Variant FADY02-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how do i get a seat in a full section |
| Actual answer (after) | **Getting a seat in a full section ("raising the ceiling" / رفع سقف)**<br>"Raising the ceiling" means asking for a seat in a section that is already full (e.g. 40/40). In UAEU's registration system this is a **CLOSED SECTION override**.<br>1. **Confirm it's full:** in *Student Registration → Register for Classes*, a **Closed Section** error means no seats are left.<br>2. **Ask your College Advising Unit** for the override. UAEU's registration guidance sends closed-section and section-capacity questions there, and the college that offers the course sets its section ceiling. Give the course code, the section/CRN you need, and why (for example, your study plan or graduation).<br>3. **Do it during registration or add/drop.** Spring 2027: add/drop starts **4 January 2027**; the last day to add is **15 January 2027** ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **If approved,** add the section yourself (*Add → Submit*) and check it shows **Registered**. If not, choose another section or course with seats.<br><br>An override is a request, not a guaranteed seat. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

**Variant FADY02-V3**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | section is full 40/40 how to get in |
| Actual answer (after) | **Getting a seat in a full section ("raising the ceiling" / رفع سقف)**<br>"Raising the ceiling" means asking for a seat in a section that is already full (e.g. 40/40). In UAEU's registration system this is a **CLOSED SECTION override**.<br>1. **Confirm it's full:** in *Student Registration → Register for Classes*, a **Closed Section** error means no seats are left.<br>2. **Ask your College Advising Unit** for the override. UAEU's registration guidance sends closed-section and section-capacity questions there, and the college that offers the course sets its section ceiling. Give the course code, the section/CRN you need, and why (for example, your study plan or graduation).<br>3. **Do it during registration or add/drop.** Spring 2027: add/drop starts **4 January 2027**; the last day to add is **15 January 2027** ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **If approved,** add the section yourself (*Add → Submit*) and check it shows **Registered**. If not, choose another section or course with seats.<br><br>An override is a request, not a guaranteed seat. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

**Variant FADY02-V4**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how to rais celing for a course |
| Actual answer (after) | **Getting a seat in a full section ("raising the ceiling" / رفع سقف)**<br>"Raising the ceiling" means asking for a seat in a section that is already full (e.g. 40/40). In UAEU's registration system this is a **CLOSED SECTION override**.<br>1. **Confirm it's full:** in *Student Registration → Register for Classes*, a **Closed Section** error means no seats are left.<br>2. **Ask your College Advising Unit** for the override. UAEU's registration guidance sends closed-section and section-capacity questions there, and the college that offers the course sets its section ceiling. Give the course code, the section/CRN you need, and why (for example, your study plan or graduation).<br>3. **Do it during registration or add/drop.** Spring 2027: add/drop starts **4 January 2027**; the last day to add is **15 January 2027** ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **If approved,** add the section yourself (*Add → Submit*) and check it shows **Registered**. If not, choose another section or course with seats.<br><br>An override is a request, not a guaranteed seat. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

## Test case 3: View summer course offerings

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How can I view the list of courses offered for the upcoming summer term? |
| Expected answer | No program question; steps to the class schedule search / Look Up Classes in the registration portal, filtered by the summer term; official link. |
| Actual answer (after) | **Seeing which courses are offered in a term (e.g. summer)**<br>Offerings are the same for every student, so you don't need to name your program.<br>1. Sign in: UAEU website → **Sign In → MyUAEU → eServices → Student → Student Registration**.<br>2. Choose **Register for Classes**, select the term (e.g. Summer), and press **Continue**.<br>3. Under **Plans**, pick a course and choose **View Sections** to see its sections in that term. Full sections are marked closed (FULL).<br>4. For registration dates for each term, see the Registration Department's [Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) page.<br><br>The official guide lists sections through the courses in your Degree Works plan. For a course outside your plan, or one you can't find, ask your College Advising Unit whether it is offered that term. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) |
| Verdict | ✅ Correct |

| Field | Details |
|---|---|
| Turn | 2 |
| Question | Bachelor of Science in Computer Science |
| Actual answer (after) | **Seeing which courses are offered in a term (e.g. summer)**<br>Offerings are the same for every student, so you don't need to name your program.<br>1. Sign in: UAEU website → **Sign In → MyUAEU → eServices → Student → Student Registration**.<br>2. Choose **Register for Classes**, select the term (e.g. Summer), and press **Continue**.<br>3. Under **Plans**, pick a course and choose **View Sections** to see its sections in that term. Full sections are marked closed (FULL).<br>4. For registration dates for each term, see the Registration Department's [Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) page.<br><br>The official guide lists sections through the courses in your Degree Works plan. For a course outside your plan, or one you can't find, ask your College Advising Unit whether it is offered that term. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) |
| Verdict | ✅ Correct |

| Field | Details |
|---|---|
| Turn | 3 |
| Question | How can I view the list of courses offered for the upcoming summer term? |
| Actual answer (after) | **Seeing which courses are offered in a term (e.g. summer)**<br>Offerings are the same for every student, so you don't need to name your program.<br>1. Sign in: UAEU website → **Sign In → MyUAEU → eServices → Student → Student Registration**.<br>2. Choose **Register for Classes**, select the term (e.g. Summer), and press **Continue**.<br>3. Under **Plans**, pick a course and choose **View Sections** to see its sections in that term. Full sections are marked closed (FULL).<br>4. For registration dates for each term, see the Registration Department's [Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) page.<br><br>The official guide lists sections through the courses in your Degree Works plan. For a course outside your plan, or one you can't find, ask your College Advising Unit whether it is offered that term. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ⚠️ Partially correct. *Local before fix:* **Conditional Computer Science plan** - A useful plan must identify the Computer Science catalog/cohort, compare your unofficial completed-course list against the published requirements, evaluate each prerequisite/corequ…

*What changed:* New answer for term course offerings (no program question): portal path, Register for Classes → term → Plans → View Sections, schedule page link. A bare program name sent afterwards is treated as context for the previous question.

**Variant FADY03-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | where can i see which courses are offered in summer |
| Actual answer (after) | **Seeing which courses are offered in a term (e.g. summer)**<br>Offerings are the same for every student, so you don't need to name your program.<br>1. Sign in: UAEU website → **Sign In → MyUAEU → eServices → Student → Student Registration**.<br>2. Choose **Register for Classes**, select the term (e.g. Summer), and press **Continue**.<br>3. Under **Plans**, pick a course and choose **View Sections** to see its sections in that term. Full sections are marked closed (FULL).<br>4. For registration dates for each term, see the Registration Department's [Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) page.<br><br>The official guide lists sections through the courses in your Degree Works plan. For a course outside your plan, or one you can't find, ask your College Advising Unit whether it is offered that term. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) |
| Verdict | ✅ Correct |

**Variant FADY03-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أشوف المواد المطروحة في الفصل الصيفي؟ |
| Actual answer (after) | **معرفة المواد المطروحة في فصل معيّن (مثل الصيفي)**<br>المواد المطروحة واحدة لجميع الطلبة، فلا حاجة لذكر برنامجك.<br>1. سجّل الدخول: موقع الجامعة ← **Sign In ← MyUAEU ← eServices ← Student ← Student Registration**.<br>2. اختر **Register for Classes**، وحدد الفصل (مثل الصيفي)، ثم **Continue**.<br>3. من **Plans** اختر المادة ثم **View Sections** لترى شعبها في ذلك الفصل؛ الشعب الممتلئة تظهر مغلقة (FULL).<br>4. لمواعيد التسجيل لكل فصل راجع صفحة [جدول التسجيل والامتحانات](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) لدى إدارة التسجيل.<br><br>يعرض الدليل الرسمي الشعب من خلال مواد خطتك في Degree Works؛ وإذا كانت المادة خارج خطتك أو لم تجدها فاسأل وحدة الإرشاد الأكاديمي في كليتك إن كانت مطروحة في ذلك الفصل. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) |
| Verdict | ✅ Correct |

**Variant FADY03-V3**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | summer course list uaeu |
| Actual answer (after) | **Seeing which courses are offered in a term (e.g. summer)**<br>Offerings are the same for every student, so you don't need to name your program.<br>1. Sign in: UAEU website → **Sign In → MyUAEU → eServices → Student → Student Registration**.<br>2. Choose **Register for Classes**, select the term (e.g. Summer), and press **Continue**.<br>3. Under **Plans**, pick a course and choose **View Sections** to see its sections in that term. Full sections are marked closed (FULL).<br>4. For registration dates for each term, see the Registration Department's [Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) page.<br><br>The official guide lists sections through the courses in your Degree Works plan. For a course outside your plan, or one you can't find, ask your College Advising Unit whether it is offered that term. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration, Class & Exam Schedule](https://www.uaeu.ac.ae/en/dvcsae/registration/registration_and_exam_schedule.shtml) |
| Verdict | ✅ Correct |

## Test case 4: Which courses to register next semester

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How do I know which courses I should register for next semester? |
| Expected answer | Asks program once, then admit term + current semester (or answers generally): follow cohort study plan, degree audit, prerequisites, advisor; never loops or shows internal messages. |
| Actual answer (after) | Which UAEU program are you in? Each program has its own study plan. |
| Actual sources | None |
| Verdict | ✅ Correct |

| Field | Details |
|---|---|
| Turn | 2 |
| Question | Bachelor of Science in Computer Science |
| Actual answer (after) | Which year and semester of your study plan are you in now (e.g. Year 2, Semester 1), and when were you admitted (e.g. Fall 2024)? Then I can list the exact courses.<br><br>How to decide next semester's courses:<br>1. Open your program's study plan for your admission year (newest published: [Bachelor of Science in Computer Science — 2026 Fall plan](https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf)); the courses listed for your next semester are the default.<br>2. Check Degree Works (your degree audit) for what you have completed and what is left.<br>3. Make sure you have passed each course's prerequisites.<br>4. Your academic advisor sets next term's Degree Works plan to Active & Locked before registration, so confirm with them. |
| Actual sources | [Bachelor of Science in Computer Science — 2026 Fall-entry model study plan](https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf#page=1) |
| Verdict | ✅ Correct |

| Field | Details |
|---|---|
| Turn | 3 |
| Question | Bachelor of Science in Computer Science |
| Actual answer (after) | How to decide next semester's courses:<br>1. Open your program's study plan for your admission year (newest published: [Bachelor of Science in Computer Science — 2026 Fall plan](https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf)); the courses listed for your next semester are the default.<br>2. Check Degree Works (your degree audit) for what you have completed and what is left.<br>3. Make sure you have passed each course's prerequisites.<br>4. Your academic advisor sets next term's Degree Works plan to Active & Locked before registration, so confirm with them. |
| Actual sources | [Bachelor of Science in Computer Science — 2026 Fall-entry model study plan](https://www.uaeu.ac.ae/en/cit/pdf/cit_bsc_computer_science_study_plan.pdf#page=1) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ❌ Incorrect. *Local before fix:* Which year and semester of your study plan are you in now?…

*What changed:* Planner asks for the program once, then year/semester + admission term together with general guidance and the newest study-plan link; if the student does not give them, it answers with the steps instead of asking again (no loop). Casual/Arabic phrasings ("next sem", "الفصل الجاي … أسجلها") reach the planner.

**Variant FADY04-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | what courses should i take next sem |
| Actual answer (after) | Which UAEU program are you in? Each program has its own study plan. |
| Actual sources | None |
| Verdict | ✅ Correct |

**Variant FADY04-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أعرف المواد اللي لازم أسجلها الفصل الجاي؟ |
| Actual answer (after) | ما برنامجك (تخصصك) في جامعة الإمارات؟ لكل برنامج خطة دراسية خاصة به. |
| Actual sources | None |
| Verdict | ✅ Correct |

## Test case 5: How to add a course

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How to add a course? |
| Expected answer | Step-by-step registration guide (MyUAEU path, Add, Submit, Registered), closed-section note, add/drop deadline link. |
| Actual answer (after) | **Add or drop a course**<br>- To add: in **Student Registration → Register for Classes**, choose the term, then **Plans → View Sections → Add → Submit**. Verify **Registered**; Add alone leaves the choice pending. The Degree Works plan must be Active & Locked and registration restrictions must be cleared.<br>- To drop an existing section, use its **Action → Drop-Web → Submit**, then verify the change in your schedule. Do not stop attending while still registered.<br>- **Fall 2026:** add/drop started 17 August; last add **28 August**; last withdraw/drop without failure **18 September**. **Spring 2027:** corresponding dates **4 January**, **15 January**, **5 February**. Dates apply only to the named term; adding and dropping have different deadlines.<br>- A withdrawal request and any refund are separately subject to the applicable withdrawal rules and submission date. |
| Actual sources | [UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)<br>[UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ✅ Correct. *Local before fix:* **Add or drop a course** - To add: in **Student Registration → Register for Classes**, choose the term, then **Plans → View Sections → Add → Submit**. Verify **Registered**; Add alone leaves the choice pending. The Degre…

*What changed:* Arabic phrasing ("كيف أضيف مادة؟") now reaches the add/drop answer (was matching the full-section answer).

**Variant FADY05-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how do i add a class |
| Actual answer (after) | **Add or drop a course**<br>- To add: in **Student Registration → Register for Classes**, choose the term, then **Plans → View Sections → Add → Submit**. Verify **Registered**; Add alone leaves the choice pending. The Degree Works plan must be Active & Locked and registration restrictions must be cleared.<br>- To drop an existing section, use its **Action → Drop-Web → Submit**, then verify the change in your schedule. Do not stop attending while still registered.<br>- **Fall 2026:** add/drop started 17 August; last add **28 August**; last withdraw/drop without failure **18 September**. **Spring 2027:** corresponding dates **4 January**, **15 January**, **5 February**. Dates apply only to the named term; adding and dropping have different deadlines.<br>- A withdrawal request and any refund are separately subject to the applicable withdrawal rules and submission date. |
| Actual sources | [UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)<br>[UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml) |
| Verdict | ✅ Correct |

**Variant FADY05-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أضيف مادة؟ |
| Actual answer (after) | **إضافة أو حذف مساق**<br>- للإضافة: افتح **Student Registration ثم Register for Classes** وحدد الفصل، ثم **Plans وView Sections وAdd وSubmit**. تحقق من **Registered**؛ زر Add وحده يترك الاختيار معلقاً. يجب أن تكون خطة Degree Works نشطة ومقفلة وأن تزال قيود التسجيل.<br>- لحذف شعبة مسجلة اختر **Action ثم Drop-Web ثم Submit** وتحقق من تحديث الجدول. لا تتوقف عن الحضور وأنت ما زلت مسجلاً.<br>- **خريف 2026:** بدأت الإضافة والحذف 17 أغسطس؛ آخر إضافة **28 أغسطس** وآخر انسحاب وحذف دون رسوب **18 سبتمبر**. **ربيع 2027:** التواريخ المقابلة **4 يناير و15 يناير و5 فبراير**. لكل فصل تواريخه، وموعد الإضافة يختلف عن الحذف.<br>- يخضع طلب الانسحاب وأي استرداد مالي لقواعده وتاريخ تقديمه بصورة منفصلة. |
| Actual sources | [UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)<br>[UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml) |
| Verdict | ✅ Correct |

## Test case 6: Closed section override request

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How to request a closed section override? |
| Expected answer | Concrete steps: where/how to request, what to include, who decides, deadline (add/drop period), how to check result; official source. |
| Actual answer (after) | **Getting a seat in a full section ("raising the ceiling" / رفع سقف)**<br>"Raising the ceiling" means asking for a seat in a section that is already full (e.g. 40/40). In UAEU's registration system this is a **CLOSED SECTION override**.<br>1. **Confirm it's full:** in *Student Registration → Register for Classes*, a **Closed Section** error means no seats are left.<br>2. **Ask your College Advising Unit** for the override. UAEU's registration guidance sends closed-section and section-capacity questions there, and the college that offers the course sets its section ceiling. Give the course code, the section/CRN you need, and why (for example, your study plan or graduation).<br>3. **Do it during registration or add/drop.** Spring 2027: add/drop starts **4 January 2027**; the last day to add is **15 January 2027** ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **If approved,** add the section yourself (*Add → Submit*) and check it shows **Registered**. If not, choose another section or course with seats.<br><br>An override is a request, not a guaranteed seat. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ⚠️ Partially correct. *Local before fix:* **Full course section** - The official registration guide names **CLOSED SECTION override** as a request you may make when a section has no seats. This is a request, not a guaranteed place; otherwise select an available …

*What changed:* Same reviewed answer as FADY02, with concrete steps: confirm the Closed Section error, ask the College Advising Unit with course code/CRN/reason, during add/drop (dates), then Add → Submit → Registered.

**Variant FADY06-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | closed section override how |
| Actual answer (after) | **Getting a seat in a full section ("raising the ceiling" / رفع سقف)**<br>"Raising the ceiling" means asking for a seat in a section that is already full (e.g. 40/40). In UAEU's registration system this is a **CLOSED SECTION override**.<br>1. **Confirm it's full:** in *Student Registration → Register for Classes*, a **Closed Section** error means no seats are left.<br>2. **Ask your College Advising Unit** for the override. UAEU's registration guidance sends closed-section and section-capacity questions there, and the college that offers the course sets its section ceiling. Give the course code, the section/CRN you need, and why (for example, your study plan or graduation).<br>3. **Do it during registration or add/drop.** Spring 2027: add/drop starts **4 January 2027**; the last day to add is **15 January 2027** ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **If approved,** add the section yourself (*Add → Submit*) and check it shows **Registered**. If not, choose another section or course with seats.<br><br>An override is a request, not a guaranteed seat. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

**Variant FADY06-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | الشعبة مغلقة كيف أطلب استثناء؟ |
| Actual answer (after) | **الحصول على مقعد في شعبة ممتلئة ("رفع السقف")**<br>"رفع السقف" يعني طلب مقعد في شعبة امتلأت (مثل 40/40). في نظام التسجيل بالجامعة يسمى هذا **CLOSED SECTION override**.<br>1. **تأكد أنها ممتلئة:** في *Student Registration ← Register for Classes* تعني رسالة **Closed Section** أنه لا توجد مقاعد.<br>2. **اطلب الاستثناء من وحدة الإرشاد الأكاديمي في كليتك**؛ إرشادات التسجيل في الجامعة توجه أسئلة الشعب المغلقة وسعة الشعب إليها، والكلية التي تطرح المادة هي التي تحدد سقف الشعبة. اذكر رمز المادة ورقم الشعبة (CRN) وسبب حاجتك (مثل خطتك الدراسية أو تخرجك).<br>3. **قدّم الطلب أثناء التسجيل أو فترة الحذف والإضافة.** ربيع 2027: تبدأ الإضافة والحذف **4 يناير 2027** وآخر يوم للإضافة **15 يناير 2027** ([التقويم الأكاديمي](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)).<br>4. **إذا وافقوا** أضف الشعبة بنفسك (*Add ← Submit*) وتأكد أنها تظهر **Registered**. وإن لم يوافقوا اختر شعبة أو مادة أخرى فيها مقاعد.<br><br>الاستثناء طلب وليس مقعدًا مضمونًا. |
| Actual sources | [UAEU Course Registration Service Guide](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/course-registration-service.pdf)<br>[UAEU Registration Programme notes (Admission and Registration)](https://www.uaeu.ac.ae/en/dvcsae/registration/pdf/registration_program_spring_2015_en.pdf)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en) |
| Verdict | ✅ Correct |

## Test case 7: How to calculate GPA

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How do I calculate my GPA? |
| Expected answer | Grade table, formula, worked example, term vs cumulative, portal for official GPA. |
| Actual answer (after) | **GPA and grading scale: how to calculate your GPA**<br>\| Grade \| Marks \| Points \|<br>\|---\|---\|---\|<br>\| A \| 90–100 \| 4.0 \|<br>\| A- \| 87–89 \| 3.7 \|<br>\| B+ \| 84–86 \| 3.3 \|<br>\| B \| 80–83 \| 3.0 \|<br>\| B- \| 77–79 \| 2.7 \|<br>\| C+ \| 74–76 \| 2.3 \|<br>\| C \| 70–73 \| 2.0 \|<br>\| C- \| 67–69 \| 1.7 \|<br>\| D+ \| 64–66 \| 1.3 \|<br>\| D \| 60–63 \| 1.0 \|<br>\| F \| 0–59 \| 0.0 \|<br><br>**Formula:** GPA = Σ (credit hours × grade points, also called quality points) ÷ total credit hours counted in the GPA, reported to two decimal places. UAEU calculates both a term GPA and a cumulative GPA.<br><br>**Example:** a 3-credit A (3 × 4.0 = 12.0), a 4-credit B+ (4 × 3.3 = 13.2) and a 3-credit C (3 × 2.0 = 6.0) give 31.2 ÷ 10 = **3.12**.<br><br>Transfer and non-degree credits are not counted; special grades and repeated courses follow separate rules. Your official GPA is in the student portal. This scale excludes the College of Medicine and Health Sciences. |
| Actual sources | [UAEU Grades and Grading Policy](https://www.uaeu.ac.ae/en/about/policies/pdf/admission/4_grades_and_grading-en.pdf) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ✅ Correct. *Local before fix:* **GPA and grading scale** - UAEU's undergraduate scale is: **A 90–100 = 4.0; A- 87–89 = 3.7; B+ 84–86 = 3.3; B 80–83 = 3.0; B- 77–79 = 2.7; C+ 74–76 = 2.3; C 70–73 = 2.0; C- 67–69 = 1.7; D+ 64–66 = 1.3; D 60–63 = 1.0; F …

*What changed:* Grading scale as a table, the formula, and a worked example (3.12); term vs cumulative GPA; official GPA in the portal.

**Variant FADY07-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how is gpa calculated |
| Actual answer (after) | **GPA and grading scale: how to calculate your GPA**<br>\| Grade \| Marks \| Points \|<br>\|---\|---\|---\|<br>\| A \| 90–100 \| 4.0 \|<br>\| A- \| 87–89 \| 3.7 \|<br>\| B+ \| 84–86 \| 3.3 \|<br>\| B \| 80–83 \| 3.0 \|<br>\| B- \| 77–79 \| 2.7 \|<br>\| C+ \| 74–76 \| 2.3 \|<br>\| C \| 70–73 \| 2.0 \|<br>\| C- \| 67–69 \| 1.7 \|<br>\| D+ \| 64–66 \| 1.3 \|<br>\| D \| 60–63 \| 1.0 \|<br>\| F \| 0–59 \| 0.0 \|<br><br>**Formula:** GPA = Σ (credit hours × grade points, also called quality points) ÷ total credit hours counted in the GPA, reported to two decimal places. UAEU calculates both a term GPA and a cumulative GPA.<br><br>**Example:** a 3-credit A (3 × 4.0 = 12.0), a 4-credit B+ (4 × 3.3 = 13.2) and a 3-credit C (3 × 2.0 = 6.0) give 31.2 ÷ 10 = **3.12**.<br><br>Transfer and non-degree credits are not counted; special grades and repeated courses follow separate rules. Your official GPA is in the student portal. This scale excludes the College of Medicine and Health Sciences. |
| Actual sources | [UAEU Grades and Grading Policy](https://www.uaeu.ac.ae/en/about/policies/pdf/admission/4_grades_and_grading-en.pdf) |
| Verdict | ✅ Correct |

**Variant FADY07-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أحسب معدلي التراكمي؟ |
| Actual answer (after) | **كيف تحسب معدلك**<br>\| التقدير \| الدرجة \| النقاط \|<br>\|---\|---\|---\|<br>\| A \| 90–100 \| 4.0 \|<br>\| A- \| 87–89 \| 3.7 \|<br>\| B+ \| 84–86 \| 3.3 \|<br>\| B \| 80–83 \| 3.0 \|<br>\| B- \| 77–79 \| 2.7 \|<br>\| C+ \| 74–76 \| 2.3 \|<br>\| C \| 70–73 \| 2.0 \|<br>\| C- \| 67–69 \| 1.7 \|<br>\| D+ \| 64–66 \| 1.3 \|<br>\| D \| 60–63 \| 1.0 \|<br>\| F \| 0–59 \| 0.0 \|<br><br>**المعادلة:** المعدل = مجموع (الساعات المعتمدة × نقاط التقدير) ÷ مجموع الساعات المحتسبة في المعدل، ويُقرَّب إلى منزلتين عشريتين. تحسب الجامعة معدلًا فصليًا ومعدلًا تراكميًا.<br><br>**مثال:** مادة 3 ساعات بتقدير A (3 × 4.0 = 12.0)، ومادة 4 ساعات بتقدير B+ (4 × 3.3 = 13.2)، ومادة 3 ساعات بتقدير C (3 × 2.0 = 6.0): المجموع 31.2 ÷ 10 = **3.12**.<br><br>لا تُحتسب الساعات المعادلة وغير الدرجية؛ وللتقديرات الخاصة والمواد المعادة قواعد مستقلة. معدلك الرسمي في بوابة الطالب. هذا السلم لا يشمل كلية الطب والعلوم الصحية. |
| Actual sources | [UAEU Grades and Grading Policy](https://www.uaeu.ac.ae/en/about/policies/pdf/admission/4_grades_and_grading-en.pdf) |
| Verdict | ✅ Correct |

## Test case 8: University working hours

| Field | Details |
|---|---|
| Turn | 1 |
| Question | What are the university's working hours? |
| Expected answer | Official working hours (days/times) or the official page; note offices may differ; optionally ask which office. |
| Actual answer (after) | UAEU's general Contact page (the university's general contact point) publishes these working hours: Monday–Thursday 8:00 AM–5:00 PM and Friday 8:00 AM–3:00 PM. Individual colleges, clinics or libraries may publish their own separate hours. |
| Actual sources | [Contact Us](https://www.uaeu.ac.ae/en/contact/index.shtml) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ❌ Incorrect. *Local before fix:* UAEU's general Contact page (the university's general contact point) publishes these working hours: Monday–Thursday 8:00 AM–5:00 PM and Friday 8:00 AM–3:00 PM. Individual colleges, clinics or libraries may publish their …

*What changed:* Working hours from the official Contact page (Mon–Thu 8:00–5:00, Fri 8:00–3:00) also for "what time does the university open" and Arabic "متى دوام الجامعة؟".

**Variant FADY08-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | uaeu working hours |
| Actual answer (after) | UAEU's general Contact page (the university's general contact point) publishes these working hours: Monday–Thursday 8:00 AM–5:00 PM and Friday 8:00 AM–3:00 PM. Individual colleges, clinics or libraries may publish their own separate hours. |
| Actual sources | [Contact Us](https://www.uaeu.ac.ae/en/contact/index.shtml) |
| Verdict | ✅ Correct |

**Variant FADY08-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | متى دوام الجامعة؟ |
| Actual answer (after) | ساعات عمل جهة التواصل العامة في جامعة الإمارات، كما تنشرها صفحة التواصل العامة: من الاثنين إلى الخميس من 8:00 صباحاً إلى 5:00 مساءً، ويوم الجمعة من 8:00 صباحاً إلى 3:00 مساءً. وقد تنشر الكليات أو العيادات أو المكتبات ساعات خاصة بها. |
| Actual sources | [Contact Us](https://www.uaeu.ac.ae/en/contact/index.shtml) |
| Verdict | ✅ Correct |

**Variant FADY08-V3**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | what time does the university open |
| Actual answer (after) | UAEU's general Contact page (the university's general contact point) publishes these working hours: Monday–Thursday 8:00 AM–5:00 PM and Friday 8:00 AM–3:00 PM. Individual colleges, clinics or libraries may publish their own separate hours. |
| Actual sources | [Contact Us](https://www.uaeu.ac.ae/en/contact/index.shtml) |
| Verdict | ✅ Correct |

## Test case 9: Withdraw from the university

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How to drop out of the uni? |
| Expected answer | Withdrawal from the university: steps, form/office, deadlines, refund/fees note, consequences, official source. |
| Actual answer (after) | **Withdrawing from the university**<br>Talk to your academic advisor first; a leave of absence may also be possible.<br>1. **Submit the request through eServices** (withdrawal from the University, or registration suspension) within the allowed period. Stopping attendance is not a withdrawal.<br>2. **Timing (policy AE-03):**<br>   - by the **end of week 4**: that semester's courses are not recorded on your transcript;<br>   - **weeks 5–6**: you receive **W** in all classes, and it counts toward your withdrawal/leave chances;<br>   - **after week 6**: not allowed, except for a medical emergency or other compelling circumstances, by applying to your **college Dean** (if approved, **AW** in all courses).<br>3. **Fees and refunds:** the refund depends on the date you submit. For Fall 2026 full-semester courses, requests from 24 August to **18 September 2026** got a 100% refund; after that the full tuition is due. Check the current term's dates on [Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml).<br>4. **Complete clearance:** any refund is processed only after the required clearance procedures.<br><br>AE-03 applies to undergraduates outside the College of Medicine and Health Sciences. |
| Actual sources | [UAEU Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ⚠️ Partially correct. *Local before fix:* **Course withdrawal, dropping and fees** - A course can be dropped in the registration screen using **Action → Drop-Web → Submit** within its allowed period. A formal request to withdraw from a course or university, or s…

*What changed:* New reviewed answer on withdrawing from the university: eServices request, AE-03 timing (weeks 1–4 / 5–6 W / after week 6 Dean + AW), refund depends on submission date (Fall 2026 dates), clearance.

**Variant FADY09-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how do i withdraw from uaeu completely |
| Actual answer (after) | **Withdrawing from the university**<br>Talk to your academic advisor first; a leave of absence may also be possible.<br>1. **Submit the request through eServices** (withdrawal from the University, or registration suspension) within the allowed period. Stopping attendance is not a withdrawal.<br>2. **Timing (policy AE-03):**<br>   - by the **end of week 4**: that semester's courses are not recorded on your transcript;<br>   - **weeks 5–6**: you receive **W** in all classes, and it counts toward your withdrawal/leave chances;<br>   - **after week 6**: not allowed, except for a medical emergency or other compelling circumstances, by applying to your **college Dean** (if approved, **AW** in all courses).<br>3. **Fees and refunds:** the refund depends on the date you submit. For Fall 2026 full-semester courses, requests from 24 August to **18 September 2026** got a 100% refund; after that the full tuition is due. Check the current term's dates on [Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml).<br>4. **Complete clearance:** any refund is processed only after the required clearance procedures.<br><br>AE-03 applies to undergraduates outside the College of Medicine and Health Sciences. |
| Actual sources | [UAEU Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf) |
| Verdict | ✅ Correct |

**Variant FADY09-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أنسحب من الجامعة؟ |
| Actual answer (after) | **الانسحاب من الجامعة**<br>تحدث مع مرشدك الأكاديمي أولًا، فقد يكون تأجيل الدراسة (إجازة دراسية) خيارًا آخر.<br>1. **قدّم الطلب عبر الخدمات الإلكترونية (eServices)** للانسحاب من الجامعة أو تعليق التسجيل ضمن الفترة المحددة؛ التوقف عن الحضور ليس انسحابًا.<br>2. **التوقيت (السياسة AE-03):**<br>   - حتى **نهاية الأسبوع الرابع**: لا تُسجَّل مواد الفصل في كشف درجاتك؛<br>   - **الأسبوعان الخامس والسادس**: تحصل على **W** في جميع المواد، وتُحتسب من فرص الانسحاب والتأجيل؛<br>   - **بعد الأسبوع السادس**: غير مسموح إلا لطارئ صحي أو ظرف قاهر بطلب إلى **عميد الكلية** (وعند الموافقة تحصل على **AW** في جميع المواد).<br>3. **الرسوم والاسترداد:** يتحدد الاسترداد بتاريخ تقديم الطلب؛ في خريف 2026 لمواد الفصل الكامل كان الاسترداد 100% للطلبات من 24 أغسطس حتى **18 سبتمبر 2026**، وبعدها تُستحق الرسوم كاملة. راجع مواعيد الفصل الحالي في [مواعيد الانسحاب والالتزامات المالية](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml).<br>4. **أكمل إخلاء الطرف:** لا يُصرف أي استرداد إلا بعد إكمال إجراءات إخلاء الطرف المطلوبة.<br><br>تنطبق AE-03 على طلبة البكالوريوس خارج كلية الطب والعلوم الصحية. |
| Actual sources | [UAEU Withdrawal Deadlines and Financial Obligations](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/refunds.shtml)<br>[UAEU Undergraduate Registration and Enrollment Policy (AE-03)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/3_undergraduate_registration_and_enrollment-en.pdf) |
| Verdict | ✅ Correct |

## Test case 10: How to apply for graduation

| Field | Details |
|---|---|
| Turn | 1 |
| Question | How to apply for graduation? |
| Expected answer | Steps (where/portal or College Advising Unit), deadline for current term with calendar link, eligibility, what happens next; current policy. |
| Actual answer (after) | **How to apply for graduation (undergraduate)**<br>1. **When:** in the semester you expect to finish, no later than that term's last day to drop without failure: **18 September 2026** for Fall 2026 and **5 February 2027** for Spring 2027 ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)). Combining this procedure with those calendar dates gives the deadline; the calendar does not separately label them as graduation-application dates.<br>2. **Where:** submit the graduation (degree) application to your **College Advising Unit** and the **Admission and Registration Deanship**. The published procedure doesn't name a portal screen, so ask your College Advising Unit for the application and how to submit it.<br>3. **Check you're eligible:** all degree requirements, at least **120 credits** (some programs need more), **cumulative GPA 2.00** or higher, and **no Incomplete (I)** grades.<br>4. **What happens next:** your college confirms you've completed the requirements, then Admission and Registration certifies the degree. Degrees are awarded at the end of each semester; the official date is the semester's last day.<br><br>Keep a copy of your application. To check a submitted application's status, ask the College Advising Unit or Admission and Registration with your request reference; the published procedure does not establish a specific private tracking screen. This is policy AE-06, which the Registration Department still lists as current; it doesn't cover the College of Medicine and Health Sciences or graduate degrees. |
| Actual sources | [UAEU Degree Completion and Graduation Procedures](https://www.uaeu.ac.ae/en/about/pdfs/policies/6_degree_completion_and_graduation-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)<br>[UAEU Degree Completion and Graduation Policy (AE-06)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/6_degree_completion_and_graduation-en.pdf) |
| Verdict | ✅ Correct |

*Deployed verdict (tester):* ⚠️ Partially correct. *Local before fix:* **Apply for undergraduate graduation** The cited procedure is for undergraduates outside the College of Medicine and Health Sciences; it does not establish medical or postgraduate graduation rules. - AE-06 requires submi…

*What changed:* Graduation answer rewritten as steps: when (18 Sep 2026 / 5 Feb 2027), where (College Advising Unit + Admission and Registration), eligibility (120 credits, CGPA 2.00, no I), what happens next, status check; Medicine exclusion stated once.

**Variant FADY10-V1**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | how do i apply to graduate |
| Actual answer (after) | **How to apply for graduation (undergraduate)**<br>1. **When:** in the semester you expect to finish, no later than that term's last day to drop without failure: **18 September 2026** for Fall 2026 and **5 February 2027** for Spring 2027 ([academic calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)). Combining this procedure with those calendar dates gives the deadline; the calendar does not separately label them as graduation-application dates.<br>2. **Where:** submit the graduation (degree) application to your **College Advising Unit** and the **Admission and Registration Deanship**. The published procedure doesn't name a portal screen, so ask your College Advising Unit for the application and how to submit it.<br>3. **Check you're eligible:** all degree requirements, at least **120 credits** (some programs need more), **cumulative GPA 2.00** or higher, and **no Incomplete (I)** grades.<br>4. **What happens next:** your college confirms you've completed the requirements, then Admission and Registration certifies the degree. Degrees are awarded at the end of each semester; the official date is the semester's last day.<br><br>Keep a copy of your application. To check a submitted application's status, ask the College Advising Unit or Admission and Registration with your request reference; the published procedure does not establish a specific private tracking screen. This is policy AE-06, which the Registration Department still lists as current; it doesn't cover the College of Medicine and Health Sciences or graduate degrees. |
| Actual sources | [UAEU Degree Completion and Graduation Procedures](https://www.uaeu.ac.ae/en/about/pdfs/policies/6_degree_completion_and_graduation-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)<br>[UAEU Degree Completion and Graduation Policy (AE-06)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/6_degree_completion_and_graduation-en.pdf) |
| Verdict | ✅ Correct |

**Variant FADY10-V2**

| Field | Details |
|---|---|
| Turn | 1 |
| Question | كيف أقدم على التخرج؟ |
| Actual answer (after) | **كيف تقدّم على التخرج (البكالوريوس)**<br>1. **متى:** في الفصل الذي تتوقع أن تنهي فيه، وقبل آخر يوم للحذف دون رسوب في ذلك الفصل: **18 سبتمبر 2026** لخريف 2026 و**5 فبراير 2027** لربيع 2027 ([التقويم الأكاديمي](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)). هذا الموعد ناتج عن الجمع بين الإجراء وتواريخ التقويم؛ فالتقويم لا يسميه موعدًا لطلب التخرج.<br>2. **أين:** قدّم طلب التخرج إلى **وحدة الإرشاد الأكاديمي في كليتك** و**عمادة القبول والتسجيل**. الإجراء المنشور لا يحدد شاشة في البوابة، فاسأل وحدة الإرشاد عن نموذج الطلب وطريقة تقديمه.<br>3. **تأكد من الأهلية:** إكمال متطلبات الدرجة، و**120 ساعة معتمدة** على الأقل (بعض البرامج تتطلب أكثر)، و**معدل تراكمي 2.00** أو أعلى، و**عدم وجود درجة غير مكتمل (I)**.<br>4. **ما يحدث بعد ذلك:** تؤكد كليتك إكمال المتطلبات، ثم تصادق عمادة القبول والتسجيل على الدرجة. تُمنح الدرجات في نهاية كل فصل، وتاريخها الرسمي هو آخر يوم في الفصل.<br><br>احتفظ بنسخة من طلبك. لمعرفة حالة طلب مقدَّم اسأل وحدة الإرشاد الأكاديمي أو القبول والتسجيل مع رقم الطلب؛ الإجراء المنشور لا يحدد شاشة تتبع خاصة. هذه هي السياسة AE-06 التي ما زالت إدارة التسجيل تدرجها كسياسة حالية، ولا تشمل كلية الطب والعلوم الصحية أو الدراسات العليا. |
| Actual sources | [UAEU Degree Completion and Graduation Procedures](https://www.uaeu.ac.ae/en/about/pdfs/policies/6_degree_completion_and_graduation-en.pdf)<br>[UAEU Academic Calendar](https://coreservices.uaeu.ac.ae/Calendar/Calendar?culture=en)<br>[UAEU Degree Completion and Graduation Policy (AE-06)](https://www.uaeu.ac.ae/en/dvcsae/registration/policies/undergraduate/6_degree_completion_and_graduation-en.pdf) |
| Verdict | ✅ Correct |

