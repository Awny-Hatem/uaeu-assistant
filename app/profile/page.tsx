"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  college: string | null; major: string | null; academicYear: string | null; language: "en" | "ar" | null;
  hasStudentId: boolean; studentIdLast4: string | null; topicHistoryEnabled: boolean;
};
type Options = { colleges: string[]; academicYears: string[]; languages: string[] };
type FieldErrors = Partial<Record<"studentId" | "college" | "major" | "academicYear" | "language", string>>;

const label = "block text-xs font-bold text-zinc-700 dark:text-zinc-300";
const input = "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function ProfilePage() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [form, setForm] = useState({ major: "", college: "", academicYear: "", language: "", studentId: "", topicHistoryEnabled: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<"loading" | "signed-out" | "ready" | "saving" | "saved" | "error">("loading");
  const [topics, setTopics] = useState<{ topic: string; at: number }[]>([]);

  useEffect(() => {
    (async () => {
      const session = await fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()).catch(() => null) as { user?: { id: string } | null } | null;
      if (!session?.user) { setStatus("signed-out"); return; }
      setAccountId(session.user.id);
      const res = await fetch("/api/profile", { cache: "no-store", headers: { "x-chat-account-id": session.user.id } });
      if (!res.ok) { setStatus("error"); return; }
      const data = await res.json() as { profile: Profile; options: Options };
      setProfile(data.profile);
      setOptions(data.options);
      setForm({ major: data.profile.major ?? "", college: data.profile.college ?? "", academicYear: data.profile.academicYear ?? "", language: data.profile.language ?? "", studentId: "", topicHistoryEnabled: data.profile.topicHistoryEnabled });
      if (data.profile.topicHistoryEnabled) {
        const t = await fetch("/api/profile/topics", { cache: "no-store", headers: { "x-chat-account-id": session.user.id } }).then((r) => r.json()).catch(() => ({ topics: [] }));
        setTopics(t.topics ?? []);
      }
      setStatus("ready");
    })();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!accountId) return;
    setStatus("saving");
    setErrors({});
    setSuggestions({});
    const body: Record<string, unknown> = { major: form.major, college: form.college, academicYear: form.academicYear, language: form.language, topicHistoryEnabled: form.topicHistoryEnabled };
    if (form.studentId.trim()) body.studentId = form.studentId;
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json", "x-chat-account-id": accountId }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 422) { setErrors(data.fields ?? {}); setSuggestions(data.suggestions ?? {}); setStatus("ready"); return; }
    if (!res.ok) { setStatus("error"); return; }
    setProfile(data.profile);
    setForm((f) => ({ ...f, major: data.profile.major ?? "", college: data.profile.college ?? "", studentId: "" }));
    if (!data.profile.topicHistoryEnabled) setTopics([]);
    setStatus("saved");
  }

  async function removeStudentId() {
    if (!accountId) return;
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json", "x-chat-account-id": accountId }, body: JSON.stringify({ studentId: "" }) });
    if (res.ok) setProfile((await res.json()).profile);
  }

  async function deleteTopicHistory() {
    if (!accountId) return;
    const res = await fetch("/api/profile/topics", { method: "DELETE", headers: { "x-chat-account-id": accountId } });
    if (res.ok) setTopics([]);
  }

  if (status === "loading") return <main className="p-8 text-sm text-zinc-500">Loading…</main>;
  if (status === "signed-out") return (
    <main className="mx-auto max-w-lg p-8 text-sm">
      <p className="text-zinc-700 dark:text-zinc-300">Sign in on the chat page to edit your profile.</p>
      <Link className="mt-4 inline-block font-bold text-red-800 underline" href="/">Back to chat</Link>
    </main>
  );

  return (
    <main className="mx-auto max-w-lg p-6 text-sm sm:p-8" data-testid="profile-page">
      <Link className="text-xs font-bold text-red-800 underline" href="/">← Back to chat</Link>
      <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Your profile · ملفك</h1>
      <p className="mt-2 text-xs text-zinc-500">The assistant uses your major, college and year only when a question is about your own program, and tells you when it does. These are your own entries, not a university record. Your student ID is encrypted and never sent to the AI.</p>
      <form onSubmit={save} className="mt-6 space-y-5" noValidate>
        <div>
          <label className={label} htmlFor="major">Major · التخصص</label>
          <input id="major" data-testid="profile-major" className={input} value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} placeholder="e.g. Computer Science / علوم الحاسوب" autoComplete="off" />
          {errors.major && <p className="mt-1 text-xs text-rose-700" role="alert">{errors.major}</p>}
          {suggestions.major?.length ? <p className="mt-1 text-xs text-zinc-600">Did you mean: {suggestions.major.map((s) => <button key={s} type="button" className="mr-2 underline" onClick={() => setForm({ ...form, major: s })}>{s}</button>)}</p> : null}
        </div>
        <div>
          <label className={label} htmlFor="college">College · الكلية</label>
          <select id="college" data-testid="profile-college" className={input} value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })}>
            <option value="">Not set (filled from your major)</option>
            {options?.colleges.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.college && <p className="mt-1 text-xs text-rose-700" role="alert">{errors.college}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="year">Academic year · السنة</label>
            <select id="year" data-testid="profile-year" className={input} value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
              <option value="">Not set</option>
              {options?.academicYears.map((y) => <option key={y} value={y}>{y === "graduate" ? "Graduate" : `Year ${y}`}</option>)}
            </select>
            {errors.academicYear && <p className="mt-1 text-xs text-rose-700" role="alert">{errors.academicYear}</p>}
          </div>
          <div>
            <label className={label} htmlFor="language">Language · اللغة</label>
            <select id="language" data-testid="profile-language" className={input} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="">Match my message</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="studentId">Student ID (optional) · الرقم الجامعي</label>
          <input id="studentId" data-testid="profile-student-id" className={input} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} inputMode="numeric" autoComplete="off" placeholder={profile?.hasStudentId ? `Saved, ending ${profile.studentIdLast4}` : "Digits only"} />
          {errors.studentId && <p className="mt-1 text-xs text-rose-700" role="alert">{errors.studentId}</p>}
          {profile?.hasStudentId && <button type="button" className="mt-1 text-xs underline" onClick={removeStudentId}>Remove saved student ID</button>}
        </div>
        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" data-testid="profile-topic-history" checked={form.topicHistoryEnabled} onChange={(e) => setForm({ ...form, topicHistoryEnabled: e.target.checked })} />
            Keep a list of topics I asked about (off by default)
          </label>
          <p className="mt-1 text-xs text-zinc-500">Only topic labels are kept, never your messages. Turning this off deletes the list.</p>
          {topics.length > 0 && (
            <>
              <ul className="mt-2 list-disc pl-5 text-xs">{topics.map((t, i) => <li key={i}>{t.topic}</li>)}</ul>
              <button type="button" className="mt-2 text-xs font-bold text-rose-700 underline" onClick={deleteTopicHistory}>Delete topic history</button>
            </>
          )}
        </div>
        <button type="submit" data-testid="profile-save" disabled={status === "saving"} className="rounded-md bg-red-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {status === "saving" ? "Saving…" : "Save profile"}
        </button>
        {status === "saved" && <p className="text-xs text-emerald-700" role="status" data-testid="profile-saved">Saved.{profile?.major ? ` Major: ${profile.major}.` : ""}{profile?.college ? ` College: ${profile.college}.` : ""}</p>}
        {status === "error" && <p className="text-xs text-rose-700" role="alert">Something went wrong. Please try again.</p>}
      </form>
    </main>
  );
}
