import { citationsFromRows } from "@/lib/citations";
import type { EvidenceRow } from "@/lib/knowledge-files";
import type { Citation } from "@/lib/prototype-types";
import type { GroundedAnswer } from "@/lib/provider-response";
import { courseCodes } from "@/lib/query-understanding";

export type SourceEvidence = { id: string; row: EvidenceRow; citation: Citation; text: string };

/** The routing answer is not a source excerpt. In a multi-source bundle each
 * reference must have its own reviewed factual summary, or it is not evidence.
 * Markdown sections and single-source reviewed records retain their own text.
 */
export function sourceEvidence(rows: EvidenceRow[]): SourceEvidence[] {
  return rows.flatMap((row, index) => {
    const citations = row.citations ?? citationsFromRows([row]);
    return citations.flatMap((citation, sourceIndex) => {
      const identityOnly = row.source.startsWith("course-identity:");
      const text = identityOnly ? row.text : citation.evidenceText?.trim() || (citations.length === 1 ? row.text : "");
      return text ? [{ id: `E${index + 1}S${sourceIndex + 1}`, row, citation, text }] : [];
    });
  });
}

export function sourceEvidenceContext(sources: SourceEvidence[]): string {
  return sources.map(({ id, row, citation, text }) => {
    const { evidenceText: _summary, ...metadata } = citation;
    void _summary;
    return `--- SOURCE ${id} ---\nRECORD: ${row.source}\nSCOPE: ${JSON.stringify(row.scope ?? {})}\nREFERENCE: ${JSON.stringify(metadata)}\nREVIEWED SOURCE-SPECIFIC FACTS (paraphrase, not a quotation):\n${text}\nOnly this source's facts can be cited with ${id}. Other records, conversation history and missing information are not additional evidence for this source.`;
  }).join("\n\n");
}

function normalizeNumbers(text: string): string {
  const months = [
    "january|jan|يناير", "february|feb|فبراير", "march|mar|مارس", "april|apr|ابريل|أبريل", "may|مايو", "june|jun|يونيو",
    "july|jul|يوليو", "august|aug|اغسطس|أغسطس", "september|sept|sep|سبتمبر", "october|oct|اكتوبر|أكتوبر", "november|nov|نوفمبر", "december|dec|ديسمبر",
  ];
  let normalized = text.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/٬/g, "").replace(/٫/g, ".")
    .replace(/(?<=\d),(?=\d{3}\b)/g, "");
  // Academic years use both2025–26 and2025–2026 in official publications.
  // Canonicalize only a consecutive year range, never an arbitrary amount or
  // ISO month/day, before comparing source-bound numeric tokens.
  normalized = normalized.replace(/((?:19|20)\d{2})\s*[–—/-]\s*(\d{2})(?!\d)/g, (original, first: string, short: string) =>
    Number(short) === (Number(first) + 1) % 100 ? `${first}–${Number(first) + 1}` : original);
  const counts: Record<string,string>={one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",ten:"10",eleven:"11",twelve:"12",thirteen:"13",fourteen:"14",fifteen:"15",sixteen:"16",seventeen:"17",eighteen:"18",nineteen:"19",twenty:"20"};
  normalized=normalized.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi,(word, _capture, offset:number, original:string)=>word.toLowerCase()==="one"&&!/^[ -]+(?:credit|course|hour|semester|year|month|day|chapter|article|item|renewal|option|route|of)\b/iu.test(original.slice(offset+word.length))?word:counts[word.toLowerCase()]);
  normalized = normalized.replace(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi, (original, hour: string, minute: string | undefined, period: string) => {
    const value = Number(hour);
    if (value < 1 || value > 12 || Number(minute ?? "0") > 59) return original;
    return `${value % 12 + (/^p/i.test(period) ? 12 : 0)}:${minute ?? "00"}`;
  });
  for (let index = 0; index < months.length; index += 1) normalized = normalized.replace(new RegExp(`(?<![\\p{L}])(?:${months[index]})(?![\\p{L}])`, "giu"), (match, offset: number, original: string) => {
    if (match.toLowerCase() === "may" && !/\d\s*$|\b(?:in|during|until|from|by|on|each|every)\s*$/i.test(original.slice(0, offset)) && !/^\s+\d/.test(original.slice(offset + match.length))) return match;
    // Keep boundaries even in compact source text such as 18September2026.
    return ` ${index + 1} `;
  });
  return normalized;
}

const PHONE = /(?:\+?971[\s-]*)?(?:0?[234679][\s-]*\d{3}[\s-]*\d{4}|0?5\d[\s-]*\d{3}[\s-]*\d{4}|800[\s-]*\d{4,7})/g;
function phoneNumbers(text: string): string[] {
  // A consecutive academic-year range is not an eight-digit local telephone.
  const withoutYears = text.replace(/((?:19|20)\d{2})\s*[–—/-]\s*((?:19|20)\d{2})/g, (original, first: string, last: string) =>
    Number(last) === Number(first) + 1 ? " ".repeat(original.length) : original);
  return withoutYears.match(PHONE) ?? [];
}
const EMAIL = /[\w.+&-]+@[\w.-]+\.[a-z]{2,}/gi;
const phoneIdentity = (phone: string) => phone.replace(/\D/g, "").replace(/^971/, "").replace(/^0/, "");

/** A policy's scope exclusion is not a negative rule for the excluded group.
 * Keep this as a conservative guard, not a general entailment algorithm. */
export function policyExclusionOverreach(source: string, claim: string): boolean {
  if (!/\b(?:exclud\w*|does? not establish|not establish|not covered|outside (?:its|the) scope)\b|تستثني|يستثني|مستثن|لا (?:يثبت|تثبت|يحدد|تحدد)/iu.test(source)) return false;
  const negativeApplication = /\b(?:(?:do|does|will|would) not|cannot|never) apply (?:to|for)\b|\bnot applicable to\b|\b(?:exempt from|need not meet)\b|لا (?:ينطبق|تنطبق|يسري|تسري) (?:على|لـ?)|معفي.{0,10}من/giu;
  const materialRule = /\b(?:gpa|cgpa|threshold|minimum|maximum|deadline|dates?|fees?|charges?|credits?|requirements?|limits?)\b|\d|معدل|حد أدنى|حد ادنى|موعد|مواعيد|رسوم|متطلبات|اشتراط/iu;
  const policySubject = /\b(?:policy|policies|procedures?|document|publication|source|general rules)\b|سياس[ةه]|سياسات|إجراءات|اجراءات|وثيق[ةه]|القواعد العامة/iu;
  const prefixes = (text: string) => [...text.matchAll(negativeApplication)].map((match) =>
    text.slice(0, match.index).split(/[;\n]|(?<=[.!?])\s/u).at(-1) ?? "");
  const unsupportedRule = prefixes(claim).some((prefix) => materialRule.test(prefix) || !policySubject.test(prefix));
  // An explicit negative rule in the source is distinct from a mere scope limit.
  const explicitSourceRule = prefixes(source).some((prefix) => materialRule.test(prefix) && !policySubject.test(prefix));
  return unsupportedRule && !explicitSourceRule;
}

/** Necessary, not sufficient, grounding checks. They catch fabricated numbers,
 * contacts and code/date attribution without pretending to prove entailment.
 */
export function sourceClaimViolations(answer: GroundedAnswer, sources: SourceEvidence[], requestedQuery = ""): string[] {
  return answer.claims.flatMap((claim, index) => {
    const source = sources.find(({ id }) => claim.evidenceIds.includes(id));
    if (!source) return [`Claim ${index + 1}: unknown source.`];
    const body = normalizeNumbers(source.text);
    const text = normalizeNumbers(claim.text);
    if (policyExclusionOverreach(body, text)) return [`Claim ${index + 1}, assigned source ${source.id}: exclusion from this policy or missing applicability evidence does not prove that the same requirement, fee or deadline cannot apply under another policy. State only this source's scope limitation and leave the excluded group's rule unverified.`];
    const sourceNumbers = new Set((body.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
    // A phone number may be formatted differently, so check its digit sequence
    // separately and avoid rejecting each space-separated component as a number.
    const phones = phoneNumbers(text);
    const sourcePhones = new Set(phoneNumbers(body).map(phoneIdentity));
    const unsupportedPhones = phones.filter((phone) => !sourcePhones.has(phoneIdentity(phone)));
    const unknownPhone = unsupportedPhones.length > 0;
    const numericText = phones.reduce((rest, phone) => rest.replaceAll(phone, ""), text).replace(/^\s*\d+[.)]\s/gm, "");
    const unsupportedNumbers = (numericText.match(/\d+(?:\.\d+)?/g) ?? []).filter((number) => {
      if (sourceNumbers.has(Number(number))) return false;
      // A specifically requested future year may be named in an explicit evidence
      // gap. It is not a date fact. Other numbers and affirmative schedules remain
      // source-bound; user claims never become evidence for them.
      const isRequestedNumber = (normalizeNumbers(requestedQuery).match(/\d+(?:\.\d+)?/g) ?? []).some((value) => Number(value) === Number(number));
      const sentence = numericText.split(/(?<=[.!?])\s|\n/).find((part) => part.includes(number)) ?? "";
      const negativeCorrection = /(?:(?:do|does) not (?:have|establish|state|confirm)|cannot (?:verify|confirm)|no verified|not (?:verified|established|a fixed|a universal)|unverified|لم.*(?:يتحقق|يثبت)|لا (?:أملك|تتوفر|يتوفر|يمكنني تأكيد|يثبت|تثبت)|ليس.*(?:ثابت|موحد))/iu.test(sentence);
      // A requested numerical instance can follow from a published bound without
      // itself being printed there (e.g. a requested load below an 'up to' cap).
      // This is only permission to run the semantic check, never proof of the
      // student's eligibility or permission to invent a new university threshold.
      const creditCaps = [...body.matchAll(/\b(?:up to|maximum(?: of)?|max(?:imum)?[ :]+)\s*(\d+(?:\.\d+)?)\s*(?:semester )?credits?\b/gi)].map((match) => Number(match[1]));
      const requestedCreditInstance = isRequestedNumber && /credits?\b/i.test(requestedQuery) &&
        new RegExp(`\\b${number.replace(".", "\\.")}\\s+(?:undergraduate |semester )?credits?\\b`, "i").test(sentence) &&
        creditCaps.some((maximum) => Number(number) >= 0 && Number(number) <= maximum);
      return !(isRequestedNumber && negativeCorrection) && !requestedCreditInstance;
    });
    const unknownNumber = unsupportedNumbers.length > 0;
    const sourceCodes = courseCodes(body);
    const unsupportedCodes = courseCodes(text).filter((code) => !sourceCodes.includes(code));
    const unknownCode = unsupportedCodes.length > 0;
    const emails = text.match(EMAIL) ?? [];
    const sourceEmails = new Set((body.match(EMAIL) ?? []).map((email) => email.toLowerCase()));
    const unsupportedEmails = emails.filter((email) => !sourceEmails.has(email.toLowerCase()));
    const unknownEmail = unsupportedEmails.length > 0;
    const identityOverreach = source.row.source.startsWith("course-identity:") && text.split(/[;.!?\n]|\b(?:but|however)\b/).some((part) =>
      /\b(?:eligib\w*|register\w*|registration|prerequisite\w*|corequisite\w*|grade\w*|credits?|requir\w*)\b|تسجيل|متطلب|مؤهل|موهل|درجة|درج[ةه]|ساع[ةه]/iu.test(part) &&
      !/(?:do|does) not (?:establish|state|confirm)|not (?:verified|established)|لا (?:يثبت|تثبت)|لم يثبت/iu.test(part));
    const universalAbsence = /(?:not|never) publicly (?:published|available)|no (?:universal |other |separate )?(?:application )?(?:deadline|permit route|booking route|timetable)\b/i.test(text) &&
      !/\b(?:source|page|handbook|available evidence|record|verified|inspected)\b/i.test(text);
    const blanketApproval = /\bin other circumstances\b/i.test(body) && /\b(?:either|qualifying routes|alternative\w*)\b/i.test(body) &&
      /\b(?:need\w*|requir\w*|must)\b[^.]*\bapproval\b|\bapproval\b[^.]*\b(?:needed|required|necessary)\b|(?:يتطلب|تتطلب|يحتاج|تحتاج|يلزم|يجب)[^.]*موافق|الموافق[ةه][^.]*مطلوب/iu.test(text) &&
      !/\b(?:unless|otherwise|in other circumstances|do not always|does not always|not every|not all|qualifying routes)\b|في (?:الحالات|الظروف) (?:الأخرى|الاخرى)|ما لم|إلا إذا|الا اذا|عند استيفاء|ليس.*دائم|لا.*دائم/iu.test(text);
    if (blanketApproval) return [`Claim ${index + 1}: an unconditional approval requirement contradicts ${source.id}'s alternative qualifying routes; preserve the qualifying conditions and distinguish approval only in other circumstances.`];
    const details = [unsupportedNumbers.length ? `unsupported numeric tokens: ${[...new Set(unsupportedNumbers)].join(", ")}` : "", unsupportedPhones.length ? `unsupported phone: ${unsupportedPhones.join(", ")}` : "", unsupportedEmails.length ? `unsupported email: ${unsupportedEmails.join(", ")}` : ""].filter(Boolean).join("; ");
    return unknownNumber || unknownPhone || unknownEmail || unknownCode || universalAbsence || identityOverreach ? [`Claim ${index + 1}, assigned source ${source.id}: ${details || "a course identifier, eligibility or universal absence assertion"} is not established by this source's own evidence. Split the offending clause and assign its actual supporting source, or remove it; do not repeat the rejected clause unchanged.${unsupportedCodes.length ? ` This source does not name ${unsupportedCodes.join(", ")}; state its general policy without applying it to unnamed course codes. Use the specific course source separately for its requirements.` : ""}`] : [];
  });
}
