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
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-600 shadow-sm transition hover:border-[#E0182D]/40 hover:text-[#E0182D] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {content}
            </a>
          );
        }

        return (
          <div
            key={key}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
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
              className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm transition hover:border-[#E0182D]/40 hover:text-[#E0182D] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
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
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E0182D]/10 text-[#E0182D]">
            <ListChecks size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ar ? guide.titleAr ?? guide.title : guide.title}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
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
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
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
    <aside dir={ar ? "rtl" : "ltr"} lang={language} aria-label={ar ? "خطوات الخدمة" : "Guided service"} className="max-h-[60vh] overflow-y-auto border-t border-zinc-200 bg-zinc-50/95 p-4 dark:border-zinc-800 dark:bg-zinc-950/95 lg:max-h-none lg:border-l lg:border-t-0">
      <div className="mx-auto max-w-4xl lg:max-w-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E0182D]">
              {ar ? "خطوات الخدمة" : "Guided Service"}
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950 dark:text-zinc-100">
              {ar ? guide.titleAr ?? guide.title : guide.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ar ? "إغلاق الخطوات" : "Close guide"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <X size={16} />
          </button>
        </div>

        <div role="progressbar" aria-label={ar ? "تقدم الخطوات" : "Guide progress"} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full bg-[#E0182D]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs font-bold text-zinc-500">
          {ar ? `الخطوة ${index + 1} من ${guide.steps.length}` : `Step ${index + 1} of ${guide.steps.length}`}
        </p>

        <div aria-live="polite" className="mt-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#E0182D]" />
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                {ar ? current.titleAr ?? current.title : current.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {ar ? current.instructionAr ?? current.instruction : current.instruction}
              </p>
              {current.note && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  {ar ? current.noteAr ?? current.note : current.note}
                </p>
              )}
              {stepUrl && <a href={stepUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-semibold text-[#E0182D] underline">{ar ? "فتح صفحة هذه الخطوة" : "Open this step's page"}</a>}
            </div>
          </div>
        </div>

        {guide.requiresVerification && guide.verificationNote && (
          <p className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {ar ? guide.verificationNoteAr ?? guide.verificationNote : guide.verificationNote}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-45 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <ArrowLeft size={15} className={ar ? "rotate-180" : ""} />
            {ar ? "السابق" : "Back"}
          </button>
          {index < guide.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((value) => Math.min(guide.steps.length - 1, value + 1))}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
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
      </div>
    </aside>
  );
}
