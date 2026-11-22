'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AcademicProfile } from '@/lib/academic-profile/types';
type Citation = {
  title: string;
  url?: string;
};
type Message = {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
};
type Snapshot = {
  visitorRole: string | null;
  accounts: {
    slug: string;
    label: string;
    scenario: string;
    validation: {
      readiness: string;
      sourceIssues: string[];
    };
  }[];
  user: {
    id: string;
    username: string;
  } | null;
  profile: AcademicProfile | null;
  progress: {
    completedCredits: number;
    inProgressCredits: number;
    remainingEarnedCredits: number;
    blocks: {
      id: string;
      completedCredits: number;
      inProgressCredits: number;
      status: string;
    }[];
  } | null;
  proposal: {
    status: string;
    issues: string[];
    courses?: {
      code: string | null;
      title: string;
      credits: number;
    }[];
  } | null;
};
const roles = [['prospective-ug', 'Prospective undergraduate'], ['prospective-pg', 'Prospective postgraduate'], ['parent', 'Parent'], ['current-without-login', 'Current student without login'], ['partner', 'Partner organization or university']];
const field = 'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-2 focus:outline-red-700';
export default function TesterWorkbench() {
  const [s, setS] = useState<Snapshot | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [messages, setMessages] = useState<Message[]>([]), [question, setQuestion] = useState(''), [view, setView] = useState('audit');
  useEffect(() => { let live = true; (async () => { const r = await fetch('/api/tester', { cache: 'no-store' }); if (!r.ok)
    throw Error('The local tester is unavailable.'); const d = await r.json() as Snapshot; if (!live)
    return; setS(d); const h = await fetch('/api/history', { headers: d.user ? { 'x-chat-account-id': d.user.id } : {} }); if (h.ok && live)
    setMessages((await h.json()).messages ?? []); })().catch(e => { if (live)
    setError(e.message); }); return () => { live = false; }; }, []);
  async function select(body: {
    slug?: string;
    role?: string;
  }) { setBusy(true); setError(''); try {
    const r = await fetch('/api/tester/switch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok)
      throw Error((await r.json()).error ?? 'Could not switch.');
    window.location.reload();
  }
  catch (e) {
    setError(String(e));
    setBusy(false);
  } }
  async function ask(e: FormEvent) { e.preventDefault(); if (!question.trim() || busy || !s)
    return; const next: Message[] = [...messages, { role: 'user', content: question.trim() }]; setMessages(next); setQuestion(''); setBusy(true); setError(''); try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json', ...(s.user ? { 'x-chat-account-id': s.user.id } : {}) }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), locale: 'auto' }) });
    const d = await r.json();
    if (!r.ok)
      throw Error(d.content ?? d.error ?? `Request failed (${r.status}).`);
    setMessages([...next, { role: 'assistant', content: d.content, citations: d.citations ?? [] }]);
  }
  catch (e) {
    setError(String(e));
  }
  finally {
    setBusy(false);
  } }
  async function clear() { if (!s)
    return; const r = await fetch('/api/history', { method: 'DELETE', headers: s.user ? { 'x-chat-account-id': s.user.id } : {} }); if (r.ok)
    setMessages([]);
  else
    setError('Could not clear the stored conversation.'); }
  const p = s?.profile;
  return <main className="min-h-screen bg-zinc-50 text-zinc-900"><header className="border-b border-zinc-200 bg-white px-5 py-5"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-red-800">UAEU Assistant · Local tester</p><h1 className="mt-1 text-2xl font-bold">Student profiles and planning</h1></div><Link href="/" className="text-sm font-semibold text-red-800 underline">Open main chat</Link></div></header>
 <div className="mx-auto max-w-7xl p-5"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">All students here are fictional. These development fixtures are provisional: unselected electives and source conflicts remain visible. This page is disabled unless the local tester is explicitly enabled.</p>
 {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
 <section aria-label="Choose a fictional student" className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{s?.accounts.map(a => <button key={a.slug} type="button" disabled={busy} onClick={() => select({ slug: a.slug })} className="rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:border-red-700 disabled:opacity-50"><span className="block text-sm font-bold">{a.label.replace('Fictional Student ', '')}</span><span className="mt-1 block text-xs leading-5 text-zinc-600">{a.scenario}</span></button>)}</section>
 <div className="mt-3 flex flex-wrap items-center gap-3"><label htmlFor="visitor-role" className="text-sm font-semibold">Visitor mode</label><select id="visitor-role" className={field} value={s?.visitorRole ?? ""} disabled={busy} onChange={e => e.target.value && select({ role: e.target.value })}><option value="">Choose a visitor role</option>{roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><span className="text-xs text-zinc-500">{s?.user ? 'Signed in to a fictional account' : 'Visitor · no saved academic record'}</span></div>
 <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-lg font-bold">{p?.displayName ?? 'Visitor profile'}</h2>{p ? <><p className="mt-1 text-sm text-zinc-600">{p.program} · {p.college}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[['Catalog', p.catalogYear], ['Admit term', `${p.admitTerm.season} ${p.admitTerm.year}`], ['Position', `Year ${p.modelPosition.year}, Semester ${p.modelPosition.semester}`], ['Standing', p.academicStanding], ['GPA', p.overallGpa ?? 'Not recorded'], ['Minor', p.minors.join(', ') || 'None recorded']].map(([k, v]) => <div key={String(k)}><dt className="text-xs text-zinc-500">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
 <div className="mt-5 grid grid-cols-3 gap-2">{[['Completed', s?.progress?.completedCredits], ['In progress', s?.progress?.inProgressCredits], ['Not yet earned', s?.progress?.remainingEarnedCredits]].map(([k, v]) => <div key={String(k)} className="rounded-xl bg-zinc-50 p-3"><p className="text-xl font-bold">{v ?? '—'}</p><p className="text-xs text-zinc-600">{k}</p></div>)}</div>
 {s?.proposal?.issues?.length ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950">{s.proposal.issues.join(' ')}</p> : null}
 <div role="tablist" aria-label="Academic views" className="mt-5 flex gap-4 border-b">{['audit', 'history', 'planner'].map(t => <button key={t} role="tab" aria-selected={view === t} onClick={() => setView(t)} className={'border-b-2 px-1 py-2 text-sm font-semibold ' + (view === t ? 'border-red-700 text-red-800' : 'border-transparent text-zinc-500')}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
 {view === 'audit' ? <div className="mt-3 space-y-3">{p.blocks.map(b => <div key={b.id} className="rounded-lg border border-zinc-200 p-3"><p className="text-sm font-semibold">{b.title}</p><p className="mt-1 text-xs text-zinc-600">{s?.progress?.blocks.find(x => x.id === b.id)?.completedCredits ?? 0} / {b.requiredCredits} credits earned · {s?.progress?.blocks.find(x => x.id === b.id)?.inProgressCredits ?? 0} in progress · {s?.progress?.blocks.find(x => x.id === b.id)?.status ?? 'unknown'}. Allocation is self-reported.</p></div>)}</div> : view === 'history' ? <div className="mt-3 max-h-[500px] overflow-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left font-semibold">Self-reported course attempts</caption><thead><tr>{['Course', 'Grade', 'Credits', 'Status', 'Term'].map(h => <th key={h} className="border-b p-2">{h}</th>)}</tr></thead><tbody>{p.courses.map((c, i) => <tr key={i}><td className="border-b p-2">{c.code}{c.repeated ? ' (repeat)' : ''}</td><td className="border-b p-2">{c.grade ?? '—'}</td><td className="border-b p-2">{c.credits}</td><td className="border-b p-2">{c.status}</td><td className="border-b p-2">{c.term.season} {c.term.year}</td></tr>)}</tbody></table></div> : <div className="mt-4 text-sm"><p>Planner status: {s?.proposal?.status}</p><ul className="mt-2 space-y-2">{s?.proposal?.courses?.map((c, i) => <li key={i}>{c.code ?? 'Elective slot — select an approved course'} — {c.title} ({c.credits} credits)</li>)}</ul><p className="mt-2 text-zinc-600">Proposed courses require prerequisite and elective checks. Ask the chat what to take next semester.</p>{p.planner.map((t, i) => <div key={i} className="mt-3 rounded-lg border p-3">{t.term.season} {t.term.year}: {t.courseCodes.join(', ')}</div>)}</div>}
 <p className="mt-5 text-xs text-zinc-500">Degree Works and your advisor provide the official audit.</p></> : <p className="mt-4 text-sm text-zinc-600">Choose a fictional student above to inspect a saved academic record, or select a visitor role to test public questions.</p>}</section>
 <section className="flex min-h-[600px] flex-col rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex justify-between gap-2"><h2 className="text-lg font-bold">Chat with this profile</h2><button type="button" onClick={clear} disabled={busy} className="text-xs font-semibold text-red-800 underline">Clear conversation</button></div><p className="mt-1 text-xs text-zinc-500">Uses the app’s real chat endpoint and server-owned session memory.</p><div role="log" aria-label="Tester conversation" aria-live="polite" className="my-4 max-h-[650px] flex-1 space-y-4 overflow-auto">{!messages.length && <p className="py-8 text-sm text-zinc-500">Try “What should I take next semester?” or “How many credits do I have left?”</p>}{messages.map((m, i) => <article key={i} className={'rounded-xl p-3 text-sm leading-6 ' + (m.role === 'user' ? 'ml-8 bg-red-50' : 'mr-4 bg-zinc-50')} dir="auto"><p className="mb-1 text-xs font-bold text-zinc-500">{m.role === 'user' ? 'You' : 'UAEU Assistant'}</p><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>{m.citations?.map((c, j) => <a key={j} className="mt-2 block text-xs font-semibold text-red-800 underline" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>)}</article>)}</div><form onSubmit={ask} className="flex items-end gap-2"><label className="flex-1 text-xs font-semibold" htmlFor="tester-question">Your question<textarea id="tester-question" value={question} onChange={e => setQuestion(e.target.value)} rows={2} maxLength={6000} className={field + ' mt-1 w-full resize-y'} required/></label><button disabled={busy || !s} className="rounded-lg bg-red-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Working…' : 'Send'}</button></form></section></div></div></main>;
}
