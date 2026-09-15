import Link from "next/link";
import { headers } from "next/headers";
import {
  BarChart3,
  BookOpenCheck,
  Languages,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { getAnalyticsSummary } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type Count = {
  label: string;
  count: number;
};

function StatList({ title, rows }: { title: string; rows: Count[] }) {
  const visible = rows.filter((row) => row.label !== "none").slice(0, 6);
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-zinc-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {visible.length ? (
          visible.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="truncate text-sm font-medium text-zinc-600">{row.label}</span>
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">
                {row.count}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No events yet.</p>
        )}
      </div>
    </section>
  );
}

function adminToken() {
  return process.env.ADMIN_ANALYTICS_TOKEN?.trim() || null;
}

function LockedAnalyticsPage({ configured }: { configured: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-5 py-8 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E0182D]/10 text-[#E0182D]">
          <LockKeyhole size={20} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-normal">Analytics locked</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {configured
            ? "Provide the admin token from a trusted server-side request to view this dashboard."
            : "Set ADMIN_ANALYTICS_TOKEN in the deployment environment before this dashboard can be viewed."}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          Back to chat
        </Link>
      </section>
    </main>
  );
}

export default async function AnalyticsPage() {
  const expectedToken = adminToken();
  const providedToken = (await headers()).get("x-admin-token")?.trim();

  if (!expectedToken || providedToken !== expectedToken) {
    return <LockedAnalyticsPage configured={Boolean(expectedToken)} />;
  }

  const summary = getAnalyticsSummary();

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-8 text-zinc-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E0182D]">
              Prototype Operations
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-zinc-950">
              Privacy-Safe Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Aggregate assistant health signals without raw student questions, names, or email
              addresses.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 shadow-sm transition hover:border-zinc-300"
          >
            Back to chat
          </Link>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <BarChart3 className="text-[#E0182D]" size={22} />
            <p className="mt-4 text-3xl font-bold">{summary.totalEvents}</p>
            <p className="mt-1 text-sm font-medium text-zinc-500">Total events</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <ShieldCheck className="text-[#E0182D]" size={22} />
            <p className="mt-4 text-3xl font-bold">0</p>
            <p className="mt-1 text-sm font-medium text-zinc-500">Raw queries stored</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <UserRoundCheck className="text-[#E0182D]" size={22} />
            <p className="mt-4 text-3xl font-bold">
              {summary.bySource.find((row) => row.label === "escalated")?.count ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-500">Handoffs suggested</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <BookOpenCheck className="text-[#E0182D]" size={22} />
            <p className="mt-4 text-3xl font-bold">
              {summary.bySource.find((row) => row.label === "guide")?.count ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-500">Guides offered</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <StatList title="Answer Sources" rows={summary.bySource} />
          <StatList title="Topics" rows={summary.byTopic} />
          <StatList title="Languages" rows={summary.byLocale} />
          <StatList title="Escalation Reasons" rows={summary.byEscalationReason} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <StatList title="Guided Workflows" rows={summary.byGuide} />
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Languages size={18} className="text-[#E0182D]" />
              <h2 className="text-sm font-bold text-zinc-950">Privacy Note</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              The analytics table stores source, topic, language, guide ID, escalation reason, and
              timestamps only. Conversation text remains local by default.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
