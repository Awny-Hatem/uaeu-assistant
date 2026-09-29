# Curated service-answer audit — 2026-09-29

## Scope and outcome

Read all 44 `student-services.json` records: both complete English/Arabic answers, matching/exclusion phrases, disposition, and every source-specific evidence summary. This is a content audit, not a claim that every URL was freshly re-fetched or that historical policies remain unsuperseded. Matching phrases and question fixtures were not changed. No captured answer was rewritten.

The independent round-4 service review remains bound to raw SHA256 `61e7274621cc22d89b4cd96755e9aeedd9106669bf4ecaf7db290f7924eeeb10`: 16 verified, one safe limitation, eight needs-fix (Q056, Q058, Q059, Q060, Q063, Q068, Q073, Q080). Subsequent content changes do not retroactively make that run pass.

## Source-backed corrections

| Records | Correction and evidence |
| --- | --- |
| `international-student-health-insurance` | Removed ISO phone/email from the health-card evidence summary and added its actual [visa-service contact source](https://coreservices.uaeu.ac.ae/ServiceCatalog/details?serviceId=109). The [health-card source](https://coreservices.uaeu.ac.ae/ServiceCatalog/details?culture=ar&serviceId=114) establishes sponsorship/enrollment, Daman conditions, five-day/free labels and May renewal, but does not supply that ISO contact. |
| `student-software-access` | The MATLAB/Minitab/Adobe example is explicitly **July 2018**, not a current entitlement, matching the [dated newsletter](https://www.uaeu.ac.ae/en/vc/doit/docs/publications/flipbooks/newsletter_issue16/files/assets/basic-html/page-12.html). Added a separate [official UITS contact block](https://jobnavigator.uaeu.ac.ae/login.jsp) for the helpdesk phone/email; the software publication must not carry unrelated contact attribution. |
| `multi-factor-authentication-reset`, `campus-wifi-connection` | Confined missing-procedure/SSID statements to the inspected [DoIT overview](https://www.uaeu.ac.ae/en/vc/doit/) and appropriate individual sources. Removed unverified setup/admin-action sequences. Wi-Fi now leads with the concrete UITS contact and useful diagnostic details; the underlying handbook coverage is dated 2023. |
| `campus-print-scan-copy`, `housing-move-in-date`, `campus-shuttle-schedule`, `lost-and-found`, `campus-dining-options`, `student-clubs`, `sports-facilities` | Visible answers now identify the [2023 handbook](https://uaeu.ac.ae/en/docs/uaeu-undergraduate-student-handbook2023-english.pdf) as historical. Removed unsupported current price/device/access inferences. Preserved available contacts and locations. Club founding requirements are distinguished from joining an existing club. Relevant handbook pages 12–14 were re-read; previously checked table/layout interpretations were retained. |
| `student-housing-cost` | Removed the unsupported suggestion that funding/award conditions determine a different charge. The [rooms-service FAQ](https://coreservices.uaeu.ac.ae/ServiceCatalog/details?serviceId=106) says no exemptions/installments. Kept international-undergraduate AED5,000/AED1,575 categories and the separate current [no-graduate-housing notice](https://www.uaeu.ac.ae/en/dvcsae/student_account_office/program-and-housing-rates-graduate-students.shtml). No personal invoice was inspected. |
| `housing-move-in-date` | The rooms service says confirmation is emailed, but does not establish that the email contains a move-in date. Answer now recommends checking the actual notice and asking Residential Life, rather than inventing that delivery content. |
| `counseling-appointment`, `mental-health-crisis` evidence | [Service116](https://coreservices.uaeu.ac.ae/ServiceCatalog/details?serviceId=116) lists8008238 for assistance. Wording now says the page does not confirm direct appointment booking, not that the number cannot book. The complete counseling answer retains written-consent/disclosure exceptions separately from the academic-record exclusion. |
| `campus-security-emergency` | Dates the campus-security contact to the [2021 Engineering safety manual](https://www.uaeu.ac.ae/en/eng/pdf/safetymanual2021.pdf). National [Police999/Ambulance998](https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety) remain the first emergency instructions. |
| `internships-student-jobs` | Narrows the absence of a dedicated student-job workflow to the inspected Internship System and [career page](https://coreservices.uaeu.ac.ae/ServiceCatalog/details?serviceId=104), not the entire public catalog. Retains the [Job Navigator](https://jobnavigator.uaeu.ac.ae/index.jsp) graduate audience and avoids claiming individual eligibility. |

## Remaining reviewed material

The other records were reviewed without content edits: account-password-reset; student-portal-sign-in; student-email-access; academic-systems-support; phishing-report; library-opening-hours; library-borrowing-limits; library-book-renewal; library-databases-remote-access; library-study-room-reservation; librarian-research-help; library-request-processing-time; student-housing-application; housing-unit-transfer; housing-application-status; vehicle-parking-permit; university-events-workshops; health-clinic-appointment; campus-medical-emergency; accessibility-accommodations; harassment-formal-complaint; student-visa-application; student-visa-renewal; visa-renewal-documents; visa-status; career-cv-interview-support; alumni-official-transcript; blackboard-course-access.

Relevant current primary pages were rechecked for rooms106, career104, library98/99, visa109, insurance114, vehicle117, counseling116, current documents92, alumni documents122, advising123, and the academic calendar. Library-hours, accommodations, medical insurance ambiguity, PDF borrowing limits and the Blackboard guide also rely on the same-day source-review ledger and earlier direct review. Retain explicit limitations: no private visa/housing/grade records, no live timetable/device availability, incomplete public visa-document field, health-page insurance inconsistency, and dated handbook/manual provenance. Do not promote a source's footer date into a publication/effective date.

## Rendering recommendation and boundaries

Using the complete approved answer can preserve conditions that free paraphrasing lost in round4. It is not automatically factual certification: the wrong-source ISO mapping above was present in curated content itself. A semantic selector should choose a record, not invent new university facts.

If selecting paragraphs, keep an atomic unit containing the fact **and** its applicability, date, exception, and source qualification. In particular:

- Counseling: academic-record exclusion is separate from confidentiality; include disclosure exceptions whenever confidentiality is described.
- Housing: lack of an availability guarantee modifies processing labels/request submission, not an already received assignment confirmation.
- Handbook/software/manual guidance: do not remove historical dates when displaying contacts, facilities or examples.
- Insurance/graduate housing/club rules: preserve sponsorship, degree, and founder-versus-member distinctions.

Retain hard course/category/year gates, emergency and privacy boundaries, and clarification for genuinely missing scope. Combined whole-answer citations should be presented as combined references; do not manufacture per-claim source attribution. Source-ID syntax, token matching, immutable rendering and a model verdict each leave different failure modes; none proves truth. Follow-up relevance, contradictions, accessibility/RTL and useful complete responses still require actual end-to-end testing.

Q056/Q060 document-delivery/content attribution and Q059/Q063 academic policy issues belong to academic content/pipeline owners. Q058/Q073 failures are captured availability/grounding failures; do not hide them by scoring a repaired static record. Q068/Q080 had essential qualifications in their canonical answers already, so writer/selection behavior must be verified after architectural changes.

## Regression evidence

`npx tsx tests/service-content-checks.ts`: 12/12 offline checks covering44-record bilingual/source shape, corrected contact attribution, historical scopes, bounded absence assertions, Wi-Fi utility, housing caveat attachment, counseling exceptions, emergency priority, and founder/membership distinction. These are regression checks of reviewed content, not a live source verifier or a truth proof.

## Post-round-5 correction

Root's Q092 review identified a remaining citation-bundle gap: the housing-price answer referred to an older AED5,600 handbook figure, but neither attached current source established that historical claim. Removed only that unsolicited comparison in both languages. Rechecked the current graduate no-housing notice and retained the correctly scoped international-undergraduate AED5,000/AED1,575 prices, payment conditions and personal-record limitation. No additional historical source or matching phrase was added. The captured round5 answer and its review remain unchanged.

Added one targeted regression for the removal and retained category/source coverage: **13/13** service-content checks now pass; focused ESLint and diff whitespace checks pass.
