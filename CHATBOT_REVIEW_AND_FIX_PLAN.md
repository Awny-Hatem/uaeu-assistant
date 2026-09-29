# UAEU chatbot review and repair plan

Execution update: the user subsequently approved implementation. See `IMPLEMENTATION_AND_VALIDATION_NOTES.md` for the execution record and results. The review findings below describe the pre-repair baseline.

Review date: 29 September 2026  
Code baseline: `b490f55f4a66090dee59fca901dcbd24919da005`  
Status: Analysis and implementation plan only. No application fixes, configuration changes, commits, or pushes were made during this review.

## Main conclusion

The team's main observations are accurate. The deployed chatbot still fails ordinary course-code variants, loses basic conversational references, selects applicant-specific rules without the necessary applicant information, and displays citations that do not support its answer. These are reproducible defects, not simply a disagreement about response style.

Several suggested causes in the report need correction. Graduation GPA and graduate-certificate facts already exist in the verified answer library but are difficult to retrieve with normal wording. A compact CSBP219 question answered successfully during this review. Information Security, CSBP411, and ISEC421 are genuine gaps in the approved local corpus. Therefore, adding more documents alone would leave several of the reported failures unchanged.

The earlier 100/100 canonical result remains reproducible, but it is not evidence of broad conversational reliability. The existing tests exercise a narrow set of known routes and aliases. The current live failures demonstrate why the earlier completion statement was too broad.

The plan below combines the code review, the report and screenshot assessment, additional defects, and acceptance criteria in one place.

## Scope and evidence

The review covered all 66 tracked first-party text files: 12,777 physical lines of application code, API routes, libraries, scripts, tests, content, configuration, and project documentation. The coverage inventory is at the end. Third-party dependency source, generated Next.js output, binary assets, and the generated lockfile were not represented as manually reviewed application code; the installed production dependency graph was checked with `npm audit --omit=dev`.

This was a source/content review with targeted independent checks of official evidence, not a fresh certification of every university-policy claim in all 105 stored answers. The repair plan includes that claim-by-claim content audit.

Both supplied documents were inspected:

- `C:/Users/USER/Downloads/Project & Team Collaboration Workspace.md`
- `C:/Users/USER/Downloads/Project & Team Collaboration Workspace.docx`

The Markdown narrative and Word document body were read. All six screenshots embedded in Word were extracted and visually inspected at their original resolution, with their positions mapped to the corresponding report sections. Word inspection used document XML and the actual embedded images; this was a content review, not a Word pagination or layout certification.

The report's opening six sections contain template material about a graduation-project submission portal, advisor assignment, surveys, and proposed Drive/OneDrive integration. The supplied material does not establish those as chatbot failures. Those paragraphs were not treated as instructions to implement features or contact anyone. The actionable chatbot evidence begins with Ali Aal Mohamed's T01–T14 results and Khalifa Alkaabi's findings and screenshots.

Evidence labels in this plan:

- **Live:** reproduced against `https://uaeu-assistant.vercel.app/api/chat` on the review date.
- **Local:** reproduced with isolated route/library probes using an in-memory database.
- **Code:** a concrete execution path found in source; a browser regression test is still required where stated.
- **Reported:** present in the supplied evidence but not fully independently replayed.
- **Policy decision:** a product or deployment choice, not automatically a coding bug.

A total of 28 live chat turns were replayed, plus one repeated Arabic turn to verify UTF-8 decoding in the diagnostic client. They included the report prompts, the four-turn course conversation, the two-turn transcript conversation, formatting controls, and three newly discovered failures. All 28 returned HTTP 200; HTTP success therefore did not distinguish a useful answer from a failed answer.

Live health reported OpenAI `gpt-4.1-mini`, 105 verified answers, seven approved Markdown documents, one guide, no ready embedding index, and disabled server chat history. This is consistent with the reviewed configuration and lexical retrieval path. Health exposes no deployed commit identifier, so this review does not claim an independently proven source-to-deployment hash match.

## How the application works

`UniversityChat.tsx` holds the conversation, profile, displayed quota, language setting, and guide state. It saves a bounded browser history, but sends the entire in-memory conversation to the chat API. Authentication uses encrypted cookies and SQLite, with a device-local account fallback for temporary serverless storage.

The chat route validates the request, resolves language, attempts to reconstruct a subject for selected follow-up patterns, and handles safety, acknowledgements, and human requests. It then chooses a narrowly matched FAQ or guide. If neither matches, it searches approved Markdown, optionally through a compatible Gemini embedding index and otherwise through lexical overlap. The deployed index is currently unavailable, so lexical retrieval is the relevant live fallback.

FAQ entries and Markdown form two separate information stores. FAQ matching searches questions and aliases; its answer bodies do not become fallback retrieval evidence. The model receives recent conversation plus retrieved excerpts. Citations are assembled separately from retrieval scores. An abstaining model can therefore be accompanied by irrelevant citations. Many failed requests return before any language model is called, so changing the model alone would not repair them.

## Assessment of the friends' testing

### Ali Aal Mohamed's cases

| Case | Review result | Evidence and required correction |
| --- | --- | --- |
| T01 official transcript | Pass confirmed live | Gives portal/app steps, the current-student document service, free service and about ten minutes, with the correct service citation. Preserve this behavior. It uses generated retrieval, not the canonical FAQ route for this wording. |
| T02 CSBP 319 prerequisites | Failure confirmed live | `CSBP 319` and `CSBP-319` produce a generic identification request. The compact control `CSBP319` returns the correct stored prerequisite answer. Fix F01. |
| T03 undergraduate requirements | Incorrect scope confirmed live | Returns the international-applicant answer although the prompt gives no applicant category. Fix F04; correctness for one category does not make it correct for an unspecified applicant. |
| T04 password reset | Pass confirmed live | Gives Password Self-Service and the stored UITS contact details. Preserve it. |
| T05 housing cost | Pass confirmed live | Returns the stored category-specific charges and funding/payment qualifications. Preserve category scoping. |
| T06 parking violations | Partial pass confirmed live | Does not invent a maximum, but includes unrelated CSBP319, transcript, housing, and CS study-plan citations. Fix F05 and F08. This does not establish whether such a parking policy exists. |
| T07 CSBP 999 | Safe abstention with UX defect confirmed live | Does not invent a prerequisite, but asks for a code already supplied. Fix F01 and F08. The stronger mixed-code/name case described below is unsafe. |
| T08 alleged GPA/library rule | Partial pass confirmed live | Refuses to explain an unsupported claim but cites housing and CSBP340. Fix F05. Lack of retrieved evidence is not proof that the university has no such rule. |
| T09 named professor | UX defect confirmed live | Avoids inventing teaching assignments but asks for a service/course name instead of acknowledging the named staff member. Fix F08. The person's existence was not established or disproved. |
| T10 October 31 graduation claim | Failure confirmed live, with a revised diagnosis | Declines to confirm the date and displays unrelated sources. Graduation application policy already exists in a separate answer entry. Fix F03/F05 and resolve the requested year, term, and degree scope rather than accepting a rumor. |
| T11 CSBP 319 | Failure confirmed live | Same formatting defect as T02; this is the first turn of the report's continuous sequence. |
| T12 What about CSBP 411 | Failure confirmed live | Loses the prerequisite intent and has no approved CSBP411 record. This combines context and coverage problems. Fix F02/F09. |
| T13 And what are its prerequisites | Failure confirmed live | Does not resolve the reference to CSBP411 and repeats the generic identification request. Fix F02/F08. |
| T14 first course reference | Failure confirmed live | Cannot recover the first course in the conversation. Fix F02; remembering only the latest subject is insufficient. |

The report's broader CSBP219 claim is **partly supported, not established as a universal failure**. The live prompt `What are the prerequisites for CSBP219?` returned CSBP119. That relationship already exists in the Fall 2025 CS study-plan excerpt. However, the response omitted the catalog's minimum grade and also cited the CSBP319 record, which does not substantiate CSBP219's own prerequisite. Add the direct course record and formatting/claim-support tests; do not label all CSBP219 information missing.

### Khalifa Alkaabi's screenshots

Screenshot numbers below follow their order in the report, not the Word archive's internal image filenames.

| Screenshot | What it shows | Review result and plan |
| --- | --- | --- |
| 1 Arabic graduation documents | A clear Arabic graduation-certificate question followed by another document-related question; both receive generic Arabic identification prompts | The first exact prompt was reproduced live. Existing graduate-certificate data is unreachable for the wording. The later wording may mean a transcript; a targeted certificate-versus-transcript clarification is appropriate if necessary. F03/F08. |
| 2 minimum graduation GPA | An OpenAI abstention accompanied by CSBP319, admissions, and CSBP340 citations | Reproduced live. The stored undergraduate graduation answer already includes 2.00 CGPA and its scope. F03/F05. |
| 3 transcript then cost | The first answer states that the service is free; the follow-up asks for cost and gets “Which fee do you mean?” | Both turns reproduced live in the same conversation. This is a context defect. A separate explicit transcript-cost probe also found a zero-cost evidence defect. F02/F07. |
| 4 Information Security courses | A major-specific course question receives a generic identification prompt | Reproduced live. The major is already supplied; the system should recognize it. Approved Information Security curriculum information is missing. F08/F09. |
| 5 Information Security last semester | The user specifies the major and final-semester context; the bot repeats the generic prompt | Reproduced live. A useful answer requires a cohort-specific plan, and personal eligibility may additionally require completed courses and outstanding requirements. The correct fix is not a universal final-semester schedule. F09/F10. |
| 6 ISEC 421 Risk Analysis | The bot asks for identifying information despite receiving a code and course title | Reproduced live with both `ISEC 421` and `ISEC421`. The official course exists; formatting and missing local content both matter. F01/F09. |

The guest limit is confirmed in code and visible in screenshot 1. Ten questions is a configurable policy choice. The current interface additionally hides the completed tenth answer behind a locked login overlay, which is a separate defect requiring F13.

The report's claims that Arabic is understood and some invented claims are resisted are supported by these examples. They do not establish complete Arabic coverage or general hallucination resistance. An explicit conflicting code and familiar course name can still produce a wrong-course answer, as shown in F06.

## Findings and required fixes

Priorities indicate implementation order, not a claim that every item has the same risk.

- **P1:** repair before describing the chatbot as ready for another broad team acceptance round.
- **P2:** complete in the next usability, coverage, and reliability increment; security lifecycle decisions must precede reliance on real student accounts.
- **P3:** maintenance and operational visibility.

### F01 Course identifiers have inconsistent representations

**P1. Live and local.**  
Locations: `lib/faq.ts:168`, `lib/knowledge-files.ts:200`, `app/api/chat/route.ts:125`, `lib/citations.ts:56`.

The matching, context, retrieval, and citation layers do not share a course-code normalizer. Separating the letters from the digits destroys the identity signal.

**Fix:** Introduce one tested identifier parser/normalizer used by every layer. Canonicalize recognized course forms while retaining the original text for display. Do not rewrite arbitrary numbers or treat an unknown course as a known one.

**Acceptance:** Compact, spaced, lowercase, hyphenated, and nonbreaking-space versions of the same code yield the same course identity and evidence. Mixed Arabic/Latin prompts work. Unknown and conflicting identifiers remain explicitly unresolved.

### F02 Conversation state is inferred from a short phrase list

**P1. Live and local.**  
Locations: `app/api/chat/route.ts:105`, `:119`, `:145`, `:216`, `:645`.

The resolver misses “its,” ordinary cost follow-ups, intent inheritance during a course switch, and first/previous references. A local control conversation using two known courses, CSBP319 and CSBP340, also loses the later references. This proves the failure is not explained solely by missing CSBP411 data.

**Fix:** Resolve a structured subject and requested fact before matching or retrieval. Preserve a small ordered set of discussed entities, distinguish a new subject from a follow-up, inherit the requested fact where appropriate, and ask only when a reference is genuinely ambiguous. Clear or revise this state when the user cancels or changes topic. Bind it to the current conversation.

**Acceptance:** Replay T11–T14, the known-course control, transcript-to-fee, Arabic follow-ups, a new unrelated topic, cancellation, two possible antecedents, and history trimming. A new course changes the subject while retaining the prerequisite intent; “the first course” returns to the first course.

### F03 Useful facts are stranded in the FAQ answer bodies

**P1. Live and code.**  
Locations: `lib/faq.ts:479`, `lib/knowledge-files.ts:237`, `app/api/chat/route.ts:770`; `data/verified-answers/academic.json:455`, `:466`, `:499`.

Natural questions about graduation GPA, application dates, and certificates can miss the aliases. Fallback retrieval then searches only the seven Markdown files, so the model never receives the matching verified answer.

**Fix:** Make verified answer facts and approved documents searchable through one evidence interface. Retain direct responses for reliable matches, but allow scoped retrieval of their substantive content and original citations. Include both English and Arabic. Separate certificate issue, replacement, attestation, and transcript services so similar wording does not merge distinct processes.

**Acceptance:** Independently written GPA/certificate/deadline paraphrases retrieve their existing facts without adding each sentence as an alias. Verify undergraduate-versus-postgraduate and medicine exceptions. The certificate screenshot must receive the relevant service details or a narrowly justified document-type question.

### F04 Applicant category is optional in a category-specific match

**P1. Live and local.**  
Locations: `lib/faq.ts:440`; `data/verified-answers/academic.json:27`.

The international entry can win without the word “international” or any other evidence of applicant category.

**Fix:** Add required scope fields to category-specific answers. When the category is absent, provide clearly scoped general guidance and ask the distinguishing question. Do not infer citizenship or admission category from a self-entered email or broad profile label.

**Acceptance:** Test unspecified, UAE-national, Emirati-mother, international, employee-child, and curriculum-specific applicants; also test a prompt that conflicts with a saved profile. Never silently apply another category's rules.

### F05 Candidate retrieval is mistaken for answer support

**P1. Live and local.**  
Locations: `lib/knowledge-files.ts:249`, `lib/citations.ts:55`, `lib/citations.ts:77`, `app/api/chat/route.ts:809`.

Generic overlap can qualify unrelated excerpts. Relative top-score filtering retains unrelated documents when they score similarly. The escalation branch then attaches those citations even when the model says the excerpts do not answer the question. Stopword removal also occurs before stemming, allowing generic plurals such as “students” to survive as “student.”

**Fix:** Require subject and requested-fact relevance before treating retrieved material as evidence. Associate the answer's factual claims with the actual supporting records. Keep contextual candidates separate from citations. On abstention, exclude unrelated citations; a contact link is a help action, not evidence for the unanswered claim. Support compound answers with the specific sources for each part.

**Acceptance:** Parking violations, the GPA/library rumor, the graduation rumor, and GPA failure display no unrelated sources. A CSBP219 prerequisite answer cites the CSBP219 record or appropriately scoped study plan, not CSBP319. Near-score ties, two-course comparisons, and multi-source answers are covered.

### F06 A familiar title can override an explicit wrong code

**P1. Live and local.**  
Locations: `lib/faq.ts:428`, `:473`, `:494`.

Live prompt: `What are the prerequisites for CSBP999 Data Structures?`  
Actual result: the CSBP319 Data Structures prerequisite answer, without acknowledging the code conflict.

**Fix:** Gate soft matches on explicit entity consistency. If the code and title disagree, identify the disagreement and ask which the user means. A broad title alias must never silently replace an explicit code.

**Acceptance:** Fake-code/real-title, real-code/wrong-title, two known codes, and exact known-code cases. The report's safe CSBP999 case must remain safe when familiar title words are added.

### F07 Free services fail the fee-evidence gate

**P2. Live and local.**  
Locations: `app/api/chat/route.ts:402`, `:463`, `:771`.

Live prompt: `How much does it cost to get an official transcript?`  
Actual result: “Which fee do you mean?” even though the retrieved document says the service is free. The fee regex recognizes words such as cost, fee and AED, but not zero-cost wording.

**Fix:** Represent price and eligibility facts with their service scope, including a zero price. At minimum handle free/no-charge/Arabic equivalents; retain the requirement that the price applies to the requested service and student category.

**Acceptance:** Explicit and contextual transcript-fee questions return the applicable free current-student service. Paid alumni copies remain distinct. Unrelated zero-cost statements cannot answer another service's fee question.

### F08 Clarification does not reflect what is already known

**P2. Live, local, and code.**  
Locations: `app/api/chat/route.ts:495`, `:540`, `:670`; `components/UniversityChat.tsx:628`, `:962`.

Unknown courses and named professors receive service/course-identification prompts. A fresh `What is the application deadline?` asks for a course and its prerequisites. The missing-subject helper has no deadline branch. The interface stores but does not use answer disposition to distinguish a clarification from a staff handoff.

**Fix:** Return structured reasons such as missing scope, unknown entity, absent evidence, personal-record access, or actual human request. Mention the entity already supplied and ask only for the missing information. Render inline clarification separately from staff escalation, with a relevant contact action only when useful. Normalize case consistently.

**Acceptance:** A fresh deadline asks for the application and intake; CSBP999 is acknowledged by name; a staff question remains about the named staff member; repeated clarifications do not repeat the same generic text. Never imply that a live lookup occurred when it did not.

### F09 Real course and curriculum coverage is too narrow

**P2, required for the team's reported course scenarios. Live, local, and official-source checks.**

The corpus has no approved Information Security plan or dedicated CSBP411/ISEC421 evidence. CSBP219 appears in the CS plan but lacks its own complete course record.

**Fix:** Start with the tested gaps and a declared coverage inventory. Add official course records, prerequisite/corequisite relations, minimum grades, credit hours, program/cohort constraints, and study plans. Preserve AND/OR relationships and catalog versions. Expand by program and priority rather than claiming all UAEU courses are covered after adding a handful of entries.

Official evidence checked during this review:

- [CSBP219 catalog](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP219): the prerequisite is CSBP119 with minimum D.
- [CSBP411 catalog](https://www.uaeu.ac.ae/en/catalog/courses/course_2968.shtml?id=CSBP411): the Machine Learning entry gives CSBP301 with minimum D.
- [ISEC421 catalog](https://www.uaeu.ac.ae/en/catalog/courses/course_2931.shtml?id=ISEC421): Risk Analysis and Management is listed with two credits and STAT210 and ITBP301, each with minimum D.

The catalog pages can contain many course sections in the HTML. Extraction must select the exact course block, not assume the URL query makes every page statement relevant.

The official [Information Security program page](https://www.uaeu.ac.ae/en/catalog/undergraduate/programs/bachelor-of-science-in-information-security.shtml) also publishes degree requirements and links a model study plan. That establishes an official content-acquisition starting point, not proof that the linked plan applies to every student's cohort. The linked PDF was not successfully retrieved in this review; validate its version and contents before ingestion.

**Acceptance:** Each new record is independently checked against its specific official section. Formatting variants reach it. A missing record is distinguished from an official record listing no prerequisites. Information Security general and final-semester questions have a supported response path.

### F10 Personal recommendations lack the necessary academic state

**P2. Code and reported expectation.**  
Locations: `components/AuthModal.tsx:30`, `components/UniversityChat.tsx:585`, `app/api/chat/route.ts:24`.

The profile has student type and major but no curriculum/cohort, degree stage, completed courses, grades, or outstanding requirements. It cannot establish a student's final-semester eligibility.

**Fix:** Distinguish published model plans from personalized recommendations. Give available model-plan information with its cohort first, then ask for the smallest set of non-sensitive academic details needed. Design a program/cohort/completion model before offering a personalized plan. Let explicit conversation corrections override an old profile.

**Acceptance:** A model semester is never presented as the user's confirmed schedule. Completed prerequisites, elective choices, unmet requirements, program changes and unavailable term offerings are handled explicitly.

### F11 Late responses are not bound to the original conversation

**P1. Code-confirmed race; delayed browser replay required.**  
Locations: `components/UniversityChat.tsx:492`, `:502`, `:511`, `:622`, `:640`.

The response appends to whatever message state exists when fetch completes. Clear, logout, and account changes do not cancel or invalidate that request. Account-history loading has similar asynchronous ownership concerns. A late reply can repopulate a cleared thread or appear after a user switch.

**Fix:** Associate requests, history loads, and quota updates with an account/conversation generation ID. Abort where possible and discard stale responses regardless of abort success. Check logout's HTTP result before showing successful sign-out.

**Acceptance:** Delay a reply, then clear, logout, login as a different account, or change threads. The old result and usage increment must not appear in the new state. Test failed logout and delayed history fetches as well.

### F12 Growing conversations exceed the transport limit

**P1. Local and code.**  
Locations: `components/UniversityChat.tsx:582`; `app/api/chat/route.ts:589`.

The browser sends the complete in-memory thread; the API rejects bodies above 96 KiB before retaining its last 30 messages. A local probe with 17 individually valid 6,000-character messages produced a 102,563-byte body and a 413 response. Each failed attempt then adds more messages.

**Fix:** Define a shared byte/token budget, trim old complete exchanges before transport, retain the newest question and necessary structured context, and keep server limits. Do not rely on a storage-only 80-message cap.

**Acceptance:** Long English/Arabic conversations and an 80-message restored history remain usable. A normal question succeeds after a size-related failure without clearing the whole chat. Generated answer sizes cannot poison the next request's per-message limit.

### F13 The guest quota hides an answer already delivered

**P2. Code; consistent with reported limit interruption.**  
Locations: `components/UniversityChat.tsx:466`, `:640`, `:1097`.

After the tenth successful reply, the quota effect immediately opens a locked full-screen sign-in modal. The user cannot dismiss it to read that reply or previous messages.

**Fix:** Leave completed messages readable. Block only additional submissions and offer a dismissible sign-in invitation. Give a near-limit notice. Decide separately whether ten is the desired allowance.

**Acceptance:** Questions 8–10 remain readable; exhausted users can review history after refresh; a new request is controlled appropriately. Do not count a greeting or a failed clarification as useful service without an explicit product decision.

### F14 Daily quota reset and enforcement are inconsistent

**P2. Code and deployment policy.**  
Locations: `components/UniversityChat.tsx:123`, `:281`, `:305`, `:458`, `:529`; `lib/access.ts:12`.

Daily usage uses a UTC date key but does not refresh in an open tab at rollover. Browser-editable counts also do not enforce API quotas. Self-entered UAEU email addresses receive the larger displayed plan without identity verification.

**Fix:** Define the reset timezone; re-evaluate at send, focus, and rollover. Decide whether quotas are only a prototype display or a real enforced limit. For enforcement, use trusted server identity and shared counters, and verify the identity required for any university-specific privilege.

**Acceptance:** Open tabs cross midnight correctly; multiple tabs agree; accepted requests are controlled consistently. A self-declared suffix is never described as verified institutional identity.

### F15 Arabic and mobile support stop short of the whole interaction

**P2. Code.**  
Locations: `components/UniversityChat.tsx:690`, `:743`, `:929`; `components/AuthModal.tsx:149`; `components/ServiceGuide.tsx:128`; `app/globals.css:64`.

The language selector is inside the desktop-only sidebar. Authentication and guide controls remain English. RTL list styles target `dir="rtl"`, while message containers use `dir="auto"`, so those rules do not apply as intended.

**Fix:** Add mobile language selection, localize the actual controls and errors, resolve direction per message, and use logical spacing. Include Arabic phrasing from the report in meaning-based tests rather than checking only for an Arabic character.

**Acceptance:** Phone-width Arabic certificate/guide conversations, sign-in, mixed Latin course codes, and numbered lists are readable and controllable.

### F16 Accessible interaction semantics are incomplete

**P2. Code; keyboard and screen-reader verification required.**  
Locations: `components/AuthModal.tsx:103`, `:185`, `:217`, `:242`, `:313`; `components/UniversityChat.tsx:1046`.

The auth overlay lacks complete dialog/focus behavior; several labels are not associated with fields; the chat input lacks a stable accessible label; new answers and errors lack suitable announcements.

**Fix:** Add dialog semantics, focus entry/trapping/restoration, appropriate Escape handling, label associations, and restrained live announcements.

**Acceptance:** Complete asking, authentication, error recovery and guide navigation using a keyboard; verify field names, focus order and new-answer announcements with a screen reader.

### F17 Password length validation exceeds bcrypt's byte limit

**P2 security. Local and code.**  
Locations: `app/api/auth/signup/route.ts:36`, `:101`; `app/api/auth/login/route.ts:73`, `:97`.

Signup accepts 128 characters, while bcrypt ignores input beyond 72 bytes. Two different long passwords sharing the first 72 bytes matched the same hash in an isolated probe. Multibyte passwords reach that limit earlier.

**Fix:** Enforce a clear byte limit consistently or migrate hashing with an explicit compatibility strategy. Do not silently truncate accepted passwords.

**Acceptance:** 72/73-byte and multibyte boundaries are checked; two distinct accepted passwords cannot authenticate interchangeably; existing valid accounts remain usable under the chosen migration.

### F18 Logout does not revoke an issued stateless session

**P2 security architecture. Local and code.**  
Locations: `app/api/auth/logout/route.ts:20`; `app/api/auth/session/route.ts:30`; `lib/session-cookie.ts:229`.

Logout deletes a database session row, but newly issued encrypted cookies are accepted without such a row. Clearing the browser cookie does not invalidate a copied token; it remains valid until expiration. The cryptography itself is not the failure.

**Fix:** Before relying on real student accounts, choose revocable server sessions or a durable session-version/revocation mechanism. Define how device-local account fallback, password changes and account removal interact with revocation.

**Acceptance:** Replay of the exact token after logout or explicit session revocation is rejected under the selected contract. Cold starts and multiple instances retain the same decision.

### F19 Optional server history drops evidence and mishandles deletion failure

**P2. Code; server history is disabled in the observed live deployment.**  
Locations: `app/api/chat/route.ts:277`; `app/api/history/route.ts:42`; `components/UniversityChat.tsx:404`, `:518`.

Server persistence keeps content/source but not citations, guide state, disposition or answer ID. DELETE's HTTP result is ignored by the UI, and failed server deletion can allow old history to return later. The server reads unbounded history without retention or pagination.

**Fix:** Persist a versioned response structure when history is enabled. Bound retrieval, define retention, check deletion results, and clearly distinguish browser clearing from confirmed server clearing.

**Acceptance:** A fresh browser restores answer evidence. Simulated deletion failure is visible and does not falsely imply server deletion. An explicit clear prevents later asynchronous restoration from repopulating the active thread.

### F20 Session startup and auth shape validation have avoidable failures

**P3. Local and code.**  
Locations: `components/UniversityChat.tsx:423`, `:446`; `app/api/auth/signup/route.ts:64`; `app/api/auth/login/route.ts:41`.

A failed session fetch/JSON parse exits loading without hydrating guest history. Auth handlers destructure a JSON `null` body and return 500; isolated probes reproduced both auth errors. Username normalization also silently truncates overly long API input.

**Fix:** Recover from session lookup failure with preserved local state and a retry path. Validate non-null object bodies and field lengths before destructuring or truncating.

**Acceptance:** Offline/invalid-JSON startup preserves guest history. Null, arrays, primitives and overlength fields return clear 400 responses with no user insertion.

### F21 Evaluation scores do not measure the failures users encounter

**P1 for the release process. Code and rerun results.**  
Locations: `scripts/evaluate-common-questions.ts`, `scripts/evaluate-answer-alignment.ts`, `tests/prototype-checks.ts`, `tests/http-smoke.mjs`.

The canonical suite forces mock mode and disables embeddings. It expects 98 FAQs, one guide and one explicit handoff. The alignment suite also forces mock mode and has no RAG expected-source category. The wrapper sweep decorates stored first questions, and the Arabic sweep reuses stored Arabic aliases. Official URL/count/date checks do not prove that a source supports the answer.

Minimum answer length and broad keyword checks do not establish factual correctness: for example, graduation checks can pass without asserting the actual GPA threshold. The fixture expectations also permit generic clarifications. Freshness assertions use a fixed September 2026 clock, so passing them does not establish freshness on a later release date.

**Fix:** Retain these regression tests, but add an independent acceptance set drawn from real user tasks. Exercise live generation and retrieval modes, record full outputs and source IDs, evaluate factual support and relevance, and reserve held-out paraphrases that are not copied into match aliases. Add browser tests for transitions, quotas, Arabic/mobile and long history. Keep expected factual answers independently grounded.

**Acceptance:** The current report failures fail the new suite before fixes and pass after them. A wrong-course or unsupported-source answer is a release failure even when source URLs are official. Report deterministic route results separately from generated answer quality and UI results.

### F22 Source support, freshness and index validity are incomplete

**P2. Code.**  
Locations: `lib/faq.ts:382`; `lib/knowledge-files.ts:30`, `:87`; `scripts/ingest.ts:102`; `scripts/check-source-urls.ts:22`; `data/verified-answers/academic.json:104`–`:112`.

FAQ age changes health status but does not itself govern answering. Markdown validates date syntax, not freshness/future dates. The fingerprint hashes filenames/content but omits titles even though embedding input includes titles. Link checks follow redirects and test HTTP success without checking the final host, course section, policy version, or factual support.

There is also a concrete stored citation gap: the transfer-credit answer says transfer grades do not enter UAEU GPA and credits are converted to semester hours. Its sole cited [degree-completion procedure](https://uaeu.ac.ae/en/about/procedures/admissions_and_enrollment/pro-ae_06_en.pdf), effective in 2014, supports the residency, approval and minimum-grade conditions but does not state those two additional claims. They require another applicable primary source; this review does not establish that they are false.

**Fix:** Audit stored answers claim by claim, adding applicable supporting sources or removing unsupported assertions. Define validity and review cadence by fact type; preserve publication/effective dates separately from retrieval dates; apply one schema across answers, documents and guides. Include every embedding-relevant field in the fingerprint. Validate final URLs and expected content identity. Recheck time-dependent claims such as current deadlines with explicit term/year scope.

**Acceptance:** Expired/future-dated content is handled according to policy; a title-only embedding-input change invalidates the index; redirects to an unrelated page fail the source-identity check. A past deadline is not described as an upcoming application opportunity.

### F23 Diagnostics, provider limits and topic reporting need alignment

**P3. Code.**  
Locations: `app/api/health/route.ts:19`; `lib/analytics.ts:19`, `:52`; `lib/ai-provider.ts:157`, `:226`, `:293`; `app/api/chat/route.ts:831`.

Health's overall `ok` does not require a configured generation provider and does not state a commit or active retrieval mode. Analytics relies on English substrings, so Arabic topic equivalents fall into “general.” Provider errors can expose English configuration instructions to Arabic users. Gemini has no matching explicit output-token cap.

**Fix:** Separate liveness, readiness and answer-quality indicators. Expose a non-sensitive build/content version and active retrieval path. Prefer resolved route/topic IDs for aggregate metrics; localize user errors; bound provider output consistently.

**Acceptance:** Missing-provider readiness is truthful, FAQ-only degraded service is clearly represented, Arabic/English equivalent tasks share the intended category, and oversized model outputs cannot break subsequent requests.

### F24 Deployment and data-model limitations need explicit closure criteria

**P2 before production reliance; documented prototype limitations.**  
Locations: `lib/db.ts:8`; `lib/request-security.ts:143`, `:157`; `README.md:165`; `lib/service-guides.ts:18`; `lib/citations.ts:40`.

SQLite is temporary in the observed serverless design. Limits are per process and client identity depends on trusted proxy handling. Device-local account/history continuity is not cross-device durable identity. Guide schema validation and official-URL validation are weaker than the FAQ path.

**Fix:** For the team prototype, document these limits accurately and keep the deployment reproducible. For production, select durable identity/storage, trusted proxy handling and shared limits; verify institutional identity where needed. Apply strict nested content and URL schemas to guides. Do not introduce a new service or institutional integration merely because the report's template mentions one.

**Acceptance:** Cross-instance/cold-start tests match the chosen persistence contract; trusted client identity cannot be replaced by an arbitrary untrusted forwarded header; malformed guide data cannot be shown as verified content. Keep credentials and student data out of the repository.

### F25 Stored service answers can defer facts their own sources provide

**P2. Stored content and independently checked official page.**  
Locations: `data/verified-answers/student-services.json:216`–`:240`.

The library-hours answer provides no hours and redirects the user to the live page. It also places the Main Library in the Crescent Building. The cited [Library Hours page](https://www.uaeu.ac.ae/en/library/libraryhours.shtml), inspected on the review date, instead locates it in the IT College building and publishes matching male/female opening schedules: Monday–Thursday 07:30–15:00, Friday 07:30–12:00, and closed on Saturday/Sunday. It warns that schedules depend on the season, without identifying the displayed table's season. Separately listed reference-staff hours are not the opening-hours table.

**Fix:** Answer the requested fact from the applicable published schedule, retaining its branch, verification date and seasonal limitations. Reconcile the location conflict between the older handbook and current library page before publishing one as authoritative. Audit other stored service answers for avoidable website-only deflections; do not replace them with invented live information.

**Acceptance:** A Main Library hours question receives the supported published schedule and its limitations. A medical-library or holiday-specific question does not silently reuse it. The answer distinguishes opening hours from reference-staff availability and cites the source that supports its location.

### F26 Requested year and event type do not sufficiently constrain evidence

**P2. Local retrieval/output-payload evidence; no live wrong-date answer established.**  
Locations: `data/verified-answers/academic.json:49`, `:137`, `:299`, `:532`; `lib/knowledge-files.ts:249`; `app/api/chat/route.ts:770`.

In isolated mock-mode probes, `When does Spring 2028 semester start?` and `What is the Fall 2026 undergraduate application deadline?` both reached RAG and attached the Academic Calendar 2026–2027 as their sole citation. The mock body contains no dates, so this proves inadequate evidence scoping, not that a real model gave an incorrect date. A calendar for another year cannot establish Spring 2028 dates, and a term calendar is not automatically an admissions application schedule.

**Fix:** Resolve the requested academic year, term, applicant/degree scope and event type before evidence selection. Store those fields with time-sensitive facts. Treat a missing applicable schedule as a specific evidence gap; do not silently substitute the nearest available year or another kind of deadline.

**Acceptance:** Test past/current/future years, semester start versus admissions versus registration versus payment deadlines, and missing/ambiguous terms. Verify final generated answers as well as their citations. A supported historical answer is labelled historical; an unpublished future date is not invented.

## What the corrected answers should achieve

These examples define answer quality, not mandatory wording.

- For spaced CSBP319: return the stored CSBP219 minimum-D prerequisite and CSBP221 minimum-D pre/corequisite, tied to the applicable catalog record; do not ask for a code already present.
- For transcript then cost: acknowledge the same current-student transcript service and answer that it is free, with its service citation. Distinguish alumni document charges if the context changes.
- For minimum graduation GPA: provide the undergraduate baseline with clear degree/college scope, and ask for the degree level if necessary. The public [degree-completion policy](https://www.uaeu.ac.ae/en/about/policies/pdf/admission/6_degree_completion_and_graduation-en.pdf) states 2.00 CGPA for a bachelor's degree, a 120-credit minimum subject to program requirements, and relevant exclusions. Its document dates are old; the content review workflow must preserve version information and check for superseding policy.
- For Arabic graduation certificates: identify the graduate-document service, explain digital versus printed options and the applicable published timing/cost, and clarify transcript versus diploma only if the user's wording requires it.
- For ISEC421: recognize the official course and use its prerequisite record; do not borrow prerequisites from another Information Security course.
- For a policy rumor with no supporting evidence: acknowledge the exact claim, state what cannot be verified, and omit unrelated citations. A targeted official contact is useful only if it helps resolve that specific missing fact.
- For final-semester Information Security advice: explain the matching cohort's model plan if available, then ask for cohort/completed requirements to personalize it. Do not promise eligibility or a live seat.

## Implementation sequence

| Stage | Work and dependencies | Completion gate |
| --- | --- | --- |
| 1 Preserve evidence and define acceptance | F21: turn the actual report prompts, screenshots' exact text, positive controls and new counterexamples into independent regression cases; record build/content/provider metadata | The new tests expose the current failures. Existing 100/80 suites remain intact. |
| 2 Repair meaning and evidence selection | F01, F02, F03, F04, F05, F06, F07, F08, F26; use a shared identity/scope model across routing, retrieval, and citation selection | Known facts are reachable; common formatting and follow-ups work; no wrong-course substitutions, wrong-year evidence or irrelevant citations in the acceptance set. |
| 3 Expand and audit approved content | F09/F10/F25, supported by F22's schema/version work; start with reported course/program gaps and avoidable service deflections | Course records and plans are independently sourced; personalized recommendations distinguish public plans from student-specific eligibility; useful published service facts are answered directly. |
| 4 Repair interaction and request lifecycle | F11–F16, F19/F20, including bounded history, cancellation/ownership, readable quota exhaustion and Arabic/mobile controls | Browser tests cover delayed replies, account changes, long threads, guest question 10, day rollover and Arabic task completion. |
| 5 Close account and operational limitations | F17/F18/F22–F24; choose the needed prototype-versus-production persistence and session contract | Password boundaries, revocation contract, data retention, readiness and source-update behavior are verified against that contract. |
| 6 Repeat independent team acceptance | Replay fixed failures and unseen variants on the exact deployed build; preserve actual outputs and human judgments | No P1 failures remain. Any remaining P2/P3 item is explicitly recorded with impact, owner role and scope. Report scores per layer; do not claim complete coverage from a single percentage. |

Stages 2 and 4 can proceed in parallel once the acceptance fixtures and shared response contract are agreed. Content collection can also proceed alongside routing work. Account/storage architecture decisions should not delay fixing the proven answer-routing defects.

Suggested ownership by role: backend/retrieval for stages 2 and 5, content reviewer for stage 3, frontend for stage 4, and an independent tester for stages 1 and 6. No individual team assignments are inferred from the document's placeholder names.

## Validation and release criteria

The current review reran:

| Check | Current result | What that result proves |
| --- | --- | --- |
| `npm test` | 44/44 checks pass | Existing targeted behavior remains as coded; it does not cover the newly found failures. |
| `npm run eval:common` | 100/100 pass | The canonical known-route suite passes. |
| `npm run eval:alignment` | 80/80 pass | Its selected paraphrase/context cases pass in mock mode. |
| `npm run lint -- --max-warnings=0` | Pass | No current lint findings. |
| `npm audit --omit=dev` | Zero advisories reported | No known advisories returned for the production dependency graph at review time; not proof of application security. |
| Live health | HTTP 200, `ok: true` | Content-count/configuration conditions pass; it does not certify answer quality. |
| Live report and control replays | 28 turns completed, material failures reproduced | The team's major observations occur on the currently accessible service. |

A production build was not regenerated for this analysis-only pass, and no test suite, configuration or application implementation was altered to improve these scores.

Before a future fix release:

1. Preserve factual assertions and citations separately from route-ID assertions. A meaningful correct answer may use a different implementation path.
2. Test report prompts verbatim and unseen paraphrases, including code spacing, dialect Arabic, role/category ambiguity and contradictory code/title input.
3. Exercise generated answers with the selected real provider. If vector retrieval is supported, test both an intentionally built valid index and lexical fallback; do not let mock success stand in for either.
4. Review every factual claim's supporting passage. Official domain and HTTP 200 are necessary source checks, not sufficient answer validation.
5. Test browser lifecycle transitions, long-history transport, quota boundaries, account continuity, Arabic/mobile interaction and accessibility.
6. Run unit/integration tests, independent answer evaluations, lint, TypeScript/build, relevant dependency checks and production HTTP smoke on the final source revision.
7. Record the deployment revision, content fingerprint, provider/model, language, conversation context and test timestamp. Use that evidence to reproduce team failures.
8. Publish a coverage statement listing supported programs/cohorts/topics and unresolved areas. Health and a passing fixed test set must not be described as “every possible answer verified.”

## Review coverage inventory

All files listed below were read as first-party source/content. This inventory is deliberately broader than just the chat route.

### Chat and retrieval implementation

`app/api/chat/route.ts`; `lib/faq.ts`; `lib/knowledge-files.ts`; `lib/vector-rag.ts`; `lib/citations.ts`; `lib/ai-provider.ts`; `lib/gemini.ts`; `lib/provider-response.ts`; `lib/prompts.ts`; `lib/language.ts`; `lib/service-guides.ts`; `lib/communications.ts`; `scripts/ingest.ts`.

### Interface and app surfaces

`components/UniversityChat.tsx`; `components/AuthModal.tsx`; `components/ServiceGuide.tsx`; `app/page.tsx`; `app/layout.tsx`; `app/globals.css`; `app/admin/analytics/page.tsx`.

### Accounts, storage and request handling

`app/api/auth/signup/route.ts`; `app/api/auth/login/route.ts`; `app/api/auth/logout/route.ts`; `app/api/auth/session/route.ts`; `app/api/history/route.ts`; `app/api/health/route.ts`; `lib/access.ts`; `lib/session-cookie.ts`; `lib/db.ts`; `lib/analytics.ts`; `lib/request-security.ts`; `lib/prototype-types.ts`.

### Content and evaluations

`data/communications.json`; `data/verified-answers/academic.json`; `data/verified-answers/student-services.json`; `data/service-guides/to-whom-it-may-concern.json`; `data/evals/common-questions.json`; `data/evals/alignment-questions.json`; all seven files under `data/knowledge` numbered 02 through 08.

`tests/prototype-checks.ts`; `tests/http-smoke.mjs`; `test-runner.mjs`; `scripts/evaluate-common-questions.ts`; `scripts/evaluate-answer-alignment.ts`; `scripts/check-source-urls.ts`.

### Configuration and project documentation

`.env.example`; `.gitignore`; `package.json`; `next.config.ts`; `tsconfig.json`; `eslint.config.mjs`; `postcss.config.mjs`; `AGENTS.md`; `CLAUDE.md`; `README.md`; `CHATBOT_QUALITY_AUDIT.md`; `UAEU_ChatBot_Improvement_Plan.md`; `UAEU_Project_Learning_Plan.md`; `UAEU_System_Report.md`; `FR_5_and_6_Report.md`.

The pre-existing untracked `docs/` diagrams and prompts were preserved. The application and supplied reports remain unchanged. This plan is the only intended new repository artifact from this review.

