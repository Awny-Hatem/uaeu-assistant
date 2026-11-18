"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  ListChecks,
  Megaphone,
  X,
} from "lucide-react";
import type { Citation, ServiceGuide, UniversityCommunication } from "@/lib/prototype-types";
import type { UiLocale } from "@/lib/ui-copy";

function safeExternalUrl(url?: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function CitationList({ citations }: { citations?: Citation[] }) {
  if (!citations?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-2">
      {citations.map((citation) => {
        const key = citation.url || citation.document || citation.title;
        const safeUrl = safeExternalUrl(citation.url);
        const content = (
          <>
            <FileText size={12} className="shrink-0" />
            <span className="truncate">{citation.title}</span>
            {citation.lastVerified && (
              <span className="shrink-0 text-zinc-400">{citation.lastVerified}</span>
            )}
            {safeUrl && <ExternalLink size={11} className="shrink-0" />}
          </>
        );

        if (safeUrl) {
          return (
            <a
              key={key}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-600 shadow-sm transition hover:border-[#E0182D]/40 hover:text-[#E0182D]"
            >
              {content}
            </a>
          );
        }

        return (
          <div
            key={key}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-600 shadow-sm"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function CommunicationList({
  communications,
}: {
  communications?: UniversityCommunication[];
}) {
  if (!communications?.length) return null;

  return (
    <div className="px-2">
      <div className="flex flex-col gap-2">
        {communications.map((item) => {
          const safeUrl = safeExternalUrl(item.url);
          if (!safeUrl) return null;

          return (
            <a
              key={item.id}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm transition hover:border-[#E0182D]/40 hover:text-[#E0182D]"
            >
              <Megaphone size={13} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate font-bold">{item.title}</span>
                <span className="mt-0.5 line-clamp-2 leading-5">{item.description}</span>
              </span>
              <ExternalLink size={11} className="mt-0.5 shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function GuidePreview({
  guide,
  onStart,
  language = "en",
}: {
  guide: ServiceGuide;
  onStart: (guide: ServiceGuide) => void;
  language?: UiLocale;
}) {
  const officialUrl = safeExternalUrl(guide.officialUrl);
  const ar = language === "ar";

  return (
    <div dir={ar ? "rtl" : "ltr"} lang={language} className="w-full max-w-xl px-2">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E0182D]/10 text-[#E0182D]">
            <ListChecks size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900">{ar ? guide.titleAr ?? guide.title : guide.title}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {ar ? `${guide.steps.length} خطوات إرشادية. يُرسل الطلب النهائي عبر صفحات الجامعة الرسمية.` : `${guide.steps.length} guided steps. Final submission stays on UAEU official pages.`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStart(guide)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E0182D] px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <ListChecks size={15} />
            {ar ? "أرشدني" : "Guide me"}
          </button>
          {officialUrl && (
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:border-zinc-300"
            >
              <ExternalLink size={15} />
              {ar ? "الصفحة الرسمية" : "Official page"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function GuidedServicePanel({
  guide,
  onClose,
  language = "en",
}: {
  guide: ServiceGuide;
  onClose: () => void;
  language?: UiLocale;
}) {
  const [index, setIndex] = useState(0);
  const [requestSummary, setRequestSummary] = useState(guide.title);
  const [requestNotes, setRequestNotes] = useState("");
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(() => guide.steps.map(() => false));
  const [showDraftPreview, setShowDraftPreview] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const current = guide.steps[index];
  const officialUrl = safeExternalUrl(guide.officialUrl);
  const ar = language === "ar";
  const stepUrl = safeExternalUrl(current?.url);
  const progress = useMemo(
    () => Math.round(((index + 1) / guide.steps.length) * 100),
    [guide.steps.length, index],
  );
  if (!current) return null;

  return (
    <aside dir={ar ? "rtl" : "ltr"} lang={language} aria-label={ar ? "خطوات الخدمة" : "Guided service"} className="max-h-[60vh] overflow-y-auto border-t border-zinc-200 bg-zinc-50/95 p-4 lg:max-h-none lg:border-l lg:border-t-0">
      <div className="mx-auto max-w-4xl lg:max-w-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E0182D]">
              {ar ? "خطوات الخدمة" : "Guided Service"}
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">
              {ar ? guide.titleAr ?? guide.title : guide.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ar ? "إغلاق الخطوات" : "Close guide"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-900"
          >
            <X size={16} />
          </button>
        </div>

        <div role="progressbar" aria-label={ar ? "تقدم الخطوات" : "Guide progress"} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full bg-[#E0182D]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs font-bold text-zinc-500">
          {ar ? `الخطوة ${index + 1} من ${guide.steps.length}` : `Step ${index + 1} of ${guide.steps.length}`}
        </p>

        <div aria-live="polite" className="mt-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#E0182D]" />
            <div>
              <h3 className="text-base font-bold text-zinc-950">
                {ar ? current.titleAr ?? current.title : current.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {ar ? current.instructionAr ?? current.instruction : current.instruction}
              </p>
              {current.note && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
                  {ar ? current.noteAr ?? current.note : current.note}
                </p>
              )}
              {stepUrl && <a href={stepUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-semibold text-[#E0182D] underline">{ar ? "فتح صفحة هذه الخطوة" : "Open this step's page"}</a>}
            </div>
          </div>
        </div>

        {guide.requiresVerification && guide.verificationNote && (
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            {ar ? guide.verificationNoteAr ?? guide.verificationNote : guide.verificationNote}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-45"
          >
            <ArrowLeft size={15} className={ar ? "rotate-180" : ""} />
            {ar ? "السابق" : "Back"}
          </button>
          {index < guide.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((value) => Math.min(guide.steps.length - 1, value + 1))}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              {ar ? "التالي" : "Next"}
              <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
            </button>
          ) : (
            officialUrl ? (
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#E0182D] px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700"
              >
                {ar ? "الصفحة الرسمية" : "Official page"}
                <ExternalLink size={15} />
              </a>
            ) : null
          )}
        </div>

        <section aria-labelledby="request-draft-heading" data-testid="service-request-draft" className="mt-6 border-t border-zinc-200 pt-5">
          <h3 id="request-draft-heading" className="text-base font-bold text-zinc-950">{ar ? "جهّز طلبك" : "Prepare your request"}</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{ar ? "تبقى قائمة التحقق والمسودة في هذه الصفحة فقط. لا يتم حفظهما أو إرسالهما. لا تُدخل كلمات المرور أو رموز التحقق أو بيانات الدخول." : "This checklist and draft stay in this page session. They are not saved or submitted. Never enter passwords, verification codes, or account credentials."}</p>

          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-semibold text-zinc-800">{ar ? "قائمة التحقق للإرشاد" : "Guide checklist"}</legend>
            {guide.steps.map((step, stepIndex) => (
              <label key={`${step.title}-${stepIndex}`} className="flex items-start gap-2 text-xs leading-5 text-zinc-700">
                <input
                  type="checkbox"
                  checked={checkedSteps[stepIndex] ?? false}
                  onChange={(event) => setCheckedSteps((items) => items.map((checked, itemIndex) => itemIndex === stepIndex ? event.target.checked : checked))}
                  className="mt-1 accent-[#E0182D]"
                />
                <span>{ar ? step.titleAr ?? step.title : step.title}</span>
              </label>
            ))}
          </fieldset>

          <div className="mt-4 rounded-lg bg-white p-3 text-xs leading-5 text-zinc-700">
            <p><strong>{ar ? "المستندات" : "Documents"}:</strong> {ar ? guide.requestDetails.documents.ar : guide.requestDetails.documents.en}</p>
            <p className="mt-2"><strong>{ar ? "الموعد" : "Deadline"}:</strong> {ar ? guide.requestDetails.deadline.ar : guide.requestDetails.deadline.en}</p>
          </div>

          <label htmlFor="request-summary" className="mt-4 block text-sm font-semibold text-zinc-800">{ar ? "ملخص الطلب" : "Request summary"} <span className="font-normal text-zinc-500">{ar ? "(مطلوب)" : "(required)"}</span></label>
          <input
            id="request-summary"
            value={requestSummary}
            onChange={(event) => { setRequestSummary(event.target.value); setShowDraftPreview(false); setDraftError(false); }}
            maxLength={160}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20"
          />
          <label htmlFor="request-notes" className="mt-3 block text-sm font-semibold text-zinc-800">{ar ? "تفاصيل لإضافتها" : "Details to include"} <span className="font-normal text-zinc-500">{ar ? "(اختياري)" : "(optional)"}</span></label>
          <textarea
            id="request-notes"
            value={requestNotes}
            onChange={(event) => { setRequestNotes(event.target.value); setShowDraftPreview(false); }}
            maxLength={1200}
            rows={3}
            placeholder={ar ? "أضف تفاصيل غير حساسة تريد تذكّرها بشأن طلبك." : "Add non-sensitive details you want to remember for your request."}
            className="mt-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20"
          />
          {draftError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{ar ? "أدخل ملخص الطلب لمعاينة المسودة." : "Add a request summary to preview your draft."}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { if (!requestSummary.trim()) { setDraftError(true); setShowDraftPreview(false); return; } setDraftError(false); setShowDraftPreview(true); }} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white">{ar ? "معاينة المسودة" : "Preview draft"}</button>
            <button type="button" onClick={() => { setRequestSummary(guide.title); setRequestNotes(""); setCheckedSteps(guide.steps.map(() => false)); setShowDraftPreview(false); setDraftError(false); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700">{ar ? "مسح المسودة" : "Clear draft"}</button>
          </div>

          {showDraftPreview && (
            <div aria-live="polite" data-testid="request-draft-preview" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-zinc-800">
              <p className="font-bold text-amber-900">{ar ? "مسودة فقط — لم يتم الإرسال" : "Draft only — NOT SUBMITTED"}</p>
              <p className="mt-2"><strong>{ar ? "الطلب:" : "Request:"}</strong> {requestSummary.trim()}</p>
              {requestNotes.trim() && <p className="mt-1 whitespace-pre-wrap"><strong>{ar ? "التفاصيل:" : "Details:"}</strong> {requestNotes.trim()}</p>}
              <p className="mt-2"><strong>{ar ? "التحضير:" : "Preparation:"}</strong> {ar ? `${checkedSteps.filter(Boolean).length} من ${guide.steps.length} من عناصر القائمة تمت مراجعتها.` : `${checkedSteps.filter(Boolean).length} of ${guide.steps.length} checklist items reviewed.`}</p>
              <p className="mt-2">{ar ? guide.requestDetails.handoff.ar : guide.requestDetails.handoff.en}</p>
              {officialUrl && <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-[#E0182D] underline">{ar ? "المتابعة عبر صفحة UAEU الرسمية" : "Continue on UAEU official page"} <ExternalLink size={12} /></a>}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
