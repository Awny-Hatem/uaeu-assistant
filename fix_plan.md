# QA fix plan — local only

Branch: `fix/qa-audit-2026-11-03`. No push, deployment or PR.

Inputs reviewed: full102-case report, shared doc (including8earlier screenshot entries), official source map and code/data paths. The47previously correct cases remain regression requirements.

## Architecture

Chat route: request/auth/rate guards → conversation resolution → exact/lexical FAQ → English curriculum sections → remote closed-catalog semantic selection → immutable canonical answer → lexical/vector context fallback → evidence-bound AI writer and claim verification. Markdown evidence is30approved files;121prepared answers and1service guide are additional sources. Embedding search is opt-in and inactive in the audit. SQLite stores prototype accounts/history/analytics; it is not a university-record API.

## Baseline and validation

Build and run evals before application changes; keep fixed expected-fact/citation checks and full live responses. Report automated baseline separately from published human47/17/38. Rerun after each group, retain all original cases and unseen variants. Browser-retest all55previous partial/fail entries plus new probes. Save results without secrets.

## Degree and program identity

Root cause: lib/curriculum-retrieval.ts ignores degreeLevel; query-understanding.ts only recognizes narrow abbreviations; semantic selector may choose related whole answers.

Fix: Add scoped official program documents; require program AND degree-level identity; treat credit totals separately from semester loads.

| Test | Focus | Observed problem |
|---|---|---|
| CQ001 | [Missing Knowledge] | The general undergraduate minimum happens to match the program total, but the bot does not establish the named program requirement. It repeats the same generic answer for different degrees. |
| CQ002 | [Missing Knowledge] | The general undergraduate minimum happens to match the program total, but the bot does not establish the named program requirement. It repeats the same generic answer for different degrees. |
| CQ003 | [Missing Knowledge] | The general undergraduate minimum happens to match the program total, but the bot does not establish the named program requirement. It repeats the same generic answer for different degrees. |
| CQ004 | [Missing Knowledge] | Does not give the named program total (Civil132; Law130). It returns the generic at-least120-credit policy instead. |
| CQ005 | [Missing Knowledge] | The general undergraduate minimum happens to match the program total, but the bot does not establish the named program requirement. It repeats the same generic answer for different degrees. |
| CQ006 | [Missing Knowledge] | Does not give the named program total (Civil132; Law130). It returns the generic at-least120-credit policy instead. |
| CQ008 | [Missing Knowledge] | The general undergraduate minimum happens to match the program total, but the bot does not establish the named program requirement. It repeats the same generic answer for different degrees. |
| CQ009 | [Missing Knowledge] | The general undergraduate minimum happens to match the program total, but the bot does not establish the named program requirement. It repeats the same generic answer for different degrees. |
| CQ010 | [Missing Knowledge] | Gives graduate admission requirements instead of the requested program credit total. |
| CQ011 | [Missing Knowledge] | Gives the132-credit undergraduate Mechanical Engineering curriculum for an explicitly masters/MSc question. This is a degree-level error, reproduced with an explicit exclusion of the bachelor degree. |
| CQ012 | [Missing Knowledge] | Says the masters requirement cannot be verified, although the official MSc Information Security catalog states minimum30credits. Black-box testing cannot establish whether the source is absent or merely missed. |
| CQ013 | [Missing Knowledge] | Gives graduate admission requirements instead of the requested program credit total. |
| CQ014 | [Missing Knowledge] | Gives graduate admission requirements instead of the requested program credit total. |
| CQ015 | [Missing Knowledge] | Returns undergraduate graduation rules for a doctoral program. The correct doctoral totals are54,54,and60 respectively. |
| CQ016 | [Missing Knowledge] | Returns undergraduate graduation rules for a doctoral program. The correct doctoral totals are54,54,and60 respectively. |
| CQ017 | [Missing Knowledge] | Returns undergraduate graduation rules for a doctoral program. The correct doctoral totals are54,54,and60 respectively. |
| CQ033 | [Phrasing Sensitivity] | CS abbreviation question is answered with Information Security curriculum and elective rules. |
| CQ035 | [Phrasing Sensitivity] | Answers normal semester credit load instead of total Mechanical Engineering degree credits. |
| CQ036 | [Phrasing Sensitivity] | Returns a generic undergraduate graduation paragraph rather than the specified major total or credit-category breakdown. Program data is demonstrably retrievable in other cases. |
| CQ038 | [Phrasing Sensitivity] | Returns a generic undergraduate graduation paragraph rather than the specified major total or credit-category breakdown. Program data is demonstrably retrievable in other cases. |
| CQ052 | [FAQ-like] | Returns a generic undergraduate graduation paragraph rather than the specified major total or credit-category breakdown. Program data is demonstrably retrievable in other cases. |
| CQ078 | [Phrasing Sensitivity] | Arabic MD credit-total question receives the55degree list and no233-credit answer. English counterpart works. |
| CQ085 | [Phrasing Sensitivity] | IT question receives Information Security curriculum/electives; full Information Technology wording succeeds. |
| CQ086 | [Phrasing Sensitivity] | IT question receives Information Security curriculum/electives; full Information Technology wording succeeds. |
| CQ092 | [Phrasing Sensitivity] | Gives the132-credit undergraduate Mechanical Engineering curriculum for an explicitly masters/MSc question. This is a degree-level error, reproduced with an explicit exclusion of the bachelor degree. |
| CQ093 | [Phrasing Sensitivity] | Returns a generic undergraduate graduation paragraph rather than the specified major total or credit-category breakdown. Program data is demonstrably retrievable in other cases. |

## Multilingual intent and code normalization

Root cause: app/api/chat/route.ts disables curriculum retrieval outside English. requestedKind uses English-only regular expressions; normalizeCourseCodes does not recognize spaced MECH or validated CSPB transpositions.

Fix: Shared multilingual intent/entity planner, catalog-validated code correction and typo normalization; bilingual retrieval; preserve requested facet.

| Test | Focus | Observed problem |
|---|---|---|
| CQ019 | [Phrasing Sensitivity] | Asks first semester but receives Year1 Semester2. The formal and mixed-language counterparts retrieve Semester1, so this is demonstrated phrasing sensitivity rather than proof of missing data. |
| CQ020 | [Phrasing Sensitivity] | Asks a CS freshman course-planning question but receives a calendar start date. |
| CQ022 | [Phrasing Sensitivity] | Asks first semester but receives Year1 Semester2. The formal and mixed-language counterparts retrieve Semester1, so this is demonstrated phrasing sensitivity rather than proof of missing data. |
| CQ034 | [Phrasing Sensitivity] | Arabic CS degree-credit question receives an unsupported-information fallback. English full-name equivalent succeeds. |
| CQ042 | [Phrasing Sensitivity] | MECH348/MECH340 concurrency question receives CSBP319 registration instructions. |
| CQ064 | [Missing Knowledge] | Clear masters/GPA/IELTS question is treated as lacking a subject. A near-equivalent wording succeeds in CQ095. |
| CQ080 | [Phrasing Sensitivity] | Arabic mandatory-versus-elective question receives only CSBP411 prerequisites and credits. |
| CQ081 | [Phrasing Sensitivity] | Spaced csbp411 credit query receives12–19semester-load rules rather than3course credits. |
| CQ082 | [Phrasing Sensitivity] | Arabic CSBP319 compulsory-course question receives prerequisites without answering whether it is required. |
| CQ084 | [Phrasing Sensitivity] | Arabic/mixed CS elective question receives second-semester courses instead of electives. |
| CQ087 | [Phrasing Sensitivity] | Hyphen/space MECH348 concurrency variant receives undergraduate admission document instructions. Compact baseline succeeds. |
| CQ091 | [Phrasing Sensitivity] | Explicit Arabic CS international tuition/year/120credit query is treated as missing service identity. English counterpart succeeds. |
| CQ102 | [Phrasing Sensitivity] | Asks first semester but receives Year1 Semester2. The formal and mixed-language counterparts retrieve Semester1, so this is demonstrated phrasing sensitivity rather than proof of missing data. |

## Missing dated evidence and source-specific facts

Root cause: Missing indexed graduate/program/year-specific content; same graduate fee page contains a row not represented in the evidence.

Fix: Add official cohort, historical catalog and dated MPA/admission sections; retain validity/uncertainty; no current diploma availability invented.

| Test | Focus | Observed problem |
|---|---|---|
| CQ060 | [Weird Case] | Mechanical Engineering2026–27 calculus question receives CS Fall2025 second-semester courses. |
| CQ061 | [Missing Knowledge] | Does not supply the requested2023–24 archived PDF; repeats the current full undergraduate degree list. |
| CQ062 | [Missing Knowledge] | Does not supply either year-specific graduate catalog PDF; gives generic admission guidance. |
| CQ065 | [Weird Case] | Mentions a conditional GPA route from2.5, but does not directly answer the applicant or state the9-credit first-semester limit and required3.0 in those credits. |
| CQ069 | [Missing Knowledge] | Does not give MPA2750/credit or200application fee, even when the2025–26 year is specified. Repeats international undergraduate rates. |
| CQ094 | [Phrasing Sensitivity] | Does not give MPA2750/credit or200application fee, even when the2025–26 year is specified. Repeats international undergraduate rates. |

## Context and comparisons

Root cause: resolveConversation and semantic fallback treat multiple programs as one subject; follow-up lab facet lost; canonical answers shown verbatim.

Fix: Resolve references from user history with explicit ambiguity handling; preserve cohort for lab follow-up; retrieve both comparison sides; generate tailored answers.

| Test | Focus | Observed problem |
|---|---|---|
| CQ053 | [Weird Case] | Provides accurate Information Security120/6credit values but omits the CS120/12 side, so there is no actual comparison. |
| CQ063 | [Weird Case] | Correctly says admissions depend on current program/intake, but never addresses the historical-diploma evidence question directly. |
| CQ075 | [Weird Case] | First turn answers the first-semester plan correctly; follow-up asking which listed courses are labs receives generic semester-load policy instead of CSBP121(1credit). |
| CQ077 | [Weird Case] | First answer lists only Information Security instead of comparing both degrees. Ambiguous "its electives" follow-up silently chooses IS and repeats the whole paragraph, instead of clarifying or covering both. |

## Abstention, relevance and boundaries

Root cause: Loose semantic canonical selection can answer unrelated contact/unknown/future/injected requests; generic clarification asks for supplied identifiers.

Fix: Unknown identifier/source-aware fallback, explicit out-of-scope and injection boundaries, future-year abstention retaining supplied scope; contact page evidence instead of harassment paragraph.

| Test | Focus | Observed problem |
|---|---|---|
| CQ055 | [Weird Case] | No fabricated degree/course is produced, but the generic clarification does not explicitly explain that the supplied invented identifier/title could not be verified. It asks for a subject or course code already supplied. |
| CQ056 | [Weird Case] | No fabricated degree/course is produced, but the generic clarification does not explicitly explain that the supplied invented identifier/title could not be verified. It asks for a subject or course code already supplied. |
| CQ057 | [Weakness] | Does not adopt the injected999-credit claim, but answers second-semester courses instead of the real CS total. Security boundary held; task relevance failed. |
| CQ059 | [Weird Case] | Does not fabricate a2031deadline, but asks for term/year already given and provides no calendar link. |
| CQ070 | [Missing Knowledge] | Official contact page and numbers are relevant, but the bot unexpectedly frames ordinary general enquiries as harassment reporting and introduces emergency/police advice. |
| CQ089 | [Phrasing Sensitivity] | No fabricated degree/course is produced, but the generic clarification does not explicitly explain that the supplied invented identifier/title could not be verified. It asks for a subject or course code already supplied. |

## Guardrails and trade-offs

Use only official HTTPS UAEU URLs, excluding webtest/cms. Evidence/citation selection must remain source-specific. No secrets committed. Generation adds cost/latency; do not present offline/mock scores as live accuracy. Never relax expected facts to make a result pass. Retain ambiguity and dated-source limitations.
