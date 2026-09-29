# Service-source evidence review — 29 September 2026

This is a content and implementation review record, not a score for the independent 100-question runs. Raw captured runs are unchanged.

## Changes

- All 44 student-service records now have citation-level `evidenceText`; 73 retained/added references have a reviewed source-specific factual summary. These are paraphrases, not verbatim quotations.
- Removed unrelated citation attachments where their facts were not needed. Removed two apparent PDF URLs that returned an HTML error page: the International Students FAQ booklet and IT newsletter issue12. The visa-renewal checklist now retains only the current service109 photograph requirement and the explicit incomplete-checklist limitation.
- Added the UAE Government Safety reference to clinic, counseling and harassment records that mention national emergency numbers. Service115 and service116 do not establish those numbers.
- Distinguished assistance number8008238 from verified appointment channels. The clinic procedure is a visit; counseling lists booking system, walk-in and email. Counseling attendance is not added to academic records; disclosure exceptions are a separate policy statement.
- Preserved source-specific limits: published library hours with an unspecified season; historical2023 handbook locations/contacts; no timetable in the inspected handbook, rather than no public timetable anywhere; no deadline in the inspected housing page, rather than no deadline exists.
- The library-access procedures do not state a GPA threshold. This supports explaining a source gap, not a universal claim that no other restriction can apply.

## Verification method and boundaries

Current service catalogs, library hours/renewal, graduate housing, IT overview, Banner guidance, password self-service, internship and Job Navigator pages were inspected as primary public sources. The password homepage redirects through `showLogin.cc` and its public script to `index.html`; that page publishes the reset options and Help Desk details. HTTP200 alone was not considered proof of content.

Relevant handbook pages were visually inspected from the published2023 PDF: clubs p12; computer facilities/sports p13; residential life/dining/shuttles p14; health locations p15. Their publication year remains part of the evidence scope. Verification today does not make a historical document newly issued or certify that all its operational details remain current. Current accessibility and registration passages were cross-checked by the content/security reviewers.

## Application contract

Generation now receives each source's own summary, not the combined FAQ answer under every attached URL. An unmapped reference in a multi-source record is excluded; an approved single-source record can retain its reviewed body as a documented fallback. Course-identity-only records remain identity-only.

Deterministic guards check full course codes, numeric/date tokens and exact email/phone identities against the selected source, with one bounded rewrite attempt before withholding a failed draft. Explicitly source-qualified uncertainty can repeat a user-supplied number without turning it into a rule. These checks are necessary but **not a formal entailment proof**: matching tokens do not establish a causal or policy relationship. Independent human review of actual generated answers remains required.

Focused real-provider paraphrases confirmed useful answers for confidential counseling, IT Help Desk contact, an alumnus requesting a second transcript, Arabic registration, a library GPA rumor and national-versus-international admission comparison. These diagnostics are not a substitute for rerunning and reviewing the entire independent100-case set.
