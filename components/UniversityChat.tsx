"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, UserCircle, Bot, HeadphonesIcon, Globe, LibraryBig,
  Search, LogOut, User, ChevronDown
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";

type Role = "user" | "assistant";
type UiMessage = {
  id: string;
  role: Role;
  content: string;
  escalated?: boolean;
  source?: "web" | "rag" | "faq" | "error" | "escalated";
};
type LocalePref = "auto" | "ar" | "en";
type AuthUser = { id: string; username: string; studentType: string; major: string | null };

// Anonymous visitors may send this many messages before being asked to sign in.
const MESSAGE_GATE = 3;
const ANON_COUNT_KEY = "uaeu_anon_count";

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useLoadingText(isLoading: boolean) {
  const [text, setText] = useState("Checking internal UAEU database...");
  useEffect(() => {
    if (!isLoading) { setText("Checking internal UAEU database..."); return; }
    const timers = [
      setTimeout(() => setText("Verifying official sources..."), 1500),
      setTimeout(() => setText("Query missing: Launching live web search..."), 3500),
      setTimeout(() => setText("Reading uaeu.ac.ae results..."), 5500),
      setTimeout(() => setText("Formulating final response..."), 7500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isLoading]);
  return text;
}

export function UniversityChat() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Soft-gate state for anonymous visitors
  const [gateOpen, setGateOpen] = useState(false);
  const [anonCount, setAnonCount] = useState(0);

  const [locale, setLocale] = useState<LocalePref>("auto");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingText = useLoadingText(loading);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── On mount: check for existing session ─────────────────────────────────
  useEffect(() => {
    // Restore how many free messages this visitor has already used.
    try {
      const stored = parseInt(localStorage.getItem(ANON_COUNT_KEY) || "0", 10);
      if (!Number.isNaN(stored)) setAnonCount(stored);
    } catch { /* localStorage unavailable — treat as fresh visitor */ }

    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          await loadHistory(data.user);
        } else {
          setAnonWelcome();
        }
      } catch {
        setAnonWelcome();
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  function setAnonWelcome() {
    setMessages([{
      id: genId(),
      role: "assistant",
      content:
        "Hello! 👋 I'm the **UAEU Digital Assistant**. Ask me anything about admissions, programs, campus life, or university policies.\n\n*You can try a few questions as a guest — sign in later to save your conversation.*",
    }]);
  }

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Load user's previous chat history from the DB ─────────────────────────
  async function loadHistory(loggedUser: AuthUser) {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length) {
        setMessages(data.messages);
      } else {
        setWelcomeMessage(loggedUser);
      }
    } catch {
      setWelcomeMessage(loggedUser);
    }
  }

  function setWelcomeMessage(u: AuthUser) {
    setMessages([{
      id: genId(),
      role: "assistant",
      content: `Welcome back, **${u.username}**! 👋 As a ${u.studentType}${u.major ? ` studying ${u.major}` : ""}, how can I help you today?\n\n*I prioritize official UAEU policies first, but can search the live web for any missing info.*`,
    }]);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loadingText]);

  // ── Auth Handlers ─────────────────────────────────────────────────────────
  async function handleAuth(loggedUser: AuthUser) {
    // Reached here via the soft gate. Keep the visitor's existing conversation
    // on screen so they continue seamlessly, just now as a signed-in user.
    setUser(loggedUser);
    setGateOpen(false);
    setAnonCount(0);
    try { localStorage.removeItem(ANON_COUNT_KEY); } catch { /* ignore */ }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setProfileOpen(false);
    setAnonCount(0);
    try { localStorage.removeItem(ANON_COUNT_KEY); } catch { /* ignore */ }
    setAnonWelcome();
  }

  // ── Send Message ──────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Soft gate: an anonymous visitor gets MESSAGE_GATE free messages, then
    // must sign in to continue. We block the attempt and open the auth modal.
    if (!user && anonCount >= MESSAGE_GATE) {
      setGateOpen(true);
      return;
    }

    const userMsg: UiMessage = { id: genId(), role: "user", content: trimmed };
    const nextThread = [...messages, userMsg];
    setInput("");
    setBanner(null);
    setMessages(nextThread);
    setLoading(true);

    // Count this message against the visitor's free allowance.
    if (!user) {
      const next = anonCount + 1;
      setAnonCount(next);
      try { localStorage.setItem(ANON_COUNT_KEY, String(next)); } catch { /* ignore */ }
    }

    const payload = {
      locale,
      userContext: { studentType: user?.studentType, major: user?.major },
      messages: nextThread.map(({ role, content }) => ({ role, content })),
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setBanner(data.error || "Request failed.");
        setMessages(m => [...m, { id: genId(), role: "assistant", content: "Network or proxy issue. Please try again." }]);
        return;
      }

      if (data.content) {
        setMessages(m => [...m, {
          id: genId(),
          role: "assistant",
          content: data.content,
          escalated: data.source === "escalated",
          source: data.source,
        }]);
      }
    } catch {
      setBanner("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, locale, messages, user, anonCount]);

  // ── State: Loading auth check ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <img src="/Logo.png" alt="UAEU" className="h-14 object-contain animate-pulse" />
          <p className="text-sm text-zinc-400">Checking session…</p>
        </div>
      </div>
    );
  }

  // No login wall: anonymous visitors land straight in the chat. The AuthModal
  // is shown as a blocking overlay only once the soft gate is reached.
  const displayName = user?.username ?? "Guest";
  const roleLabel = user?.studentType ?? "Visitor";
  const remainingFree = Math.max(0, MESSAGE_GATE - anonCount);

  // ── Chat UI (anonymous or signed-in) ─────────────────────────────────────
  return (
    <div className="flex w-full h-full text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900">

      {/* LEFT SIDEBAR */}
      <div className="hidden md:flex flex-col w-72 lg:w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 h-full shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_8px_-4px_rgba(0,0,0,0.5)] z-10 shrink-0">

        {/* Logo */}
        <div className="flex flex-col items-start justify-center p-8 pb-4 shrink-0 w-full">
          <img
            src="/Logo.png"
            alt="UAEU Chatbot Logo"
            className="w-full max-w-[220px] object-contain transition hover:scale-105 duration-300"
          />
        </div>

        {/* User Profile Card */}
        <div className="mx-4 mb-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E0182D]/10 flex items-center justify-center shrink-0">
              <User size={18} className="text-[#E0182D]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">{displayName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {user ? `${user.studentType}${user.major ? ` · ${user.major}` : ""}` : "Guest preview"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 overflow-y-auto w-full p-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 dark:text-stone-600 mb-4 px-1">Active Profile</p>

          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3">
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Role</p>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{roleLabel}</p>
            </div>

            {!user && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3">
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">Guest Preview</p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {remainingFree > 0
                    ? `${remainingFree} free message${remainingFree === 1 ? "" : "s"} left`
                    : "Sign in to keep chatting"}
                </p>
              </div>
            )}

            {user?.major && (
              <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3">
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Major</p>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{user.major}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <label className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Language</label>
              <select
                value={locale}
                onChange={e => setLocale(e.target.value as LocalePref)}
                className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-sm focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 outline-none transition"
              >
                <option value="auto">Auto-detect</option>
                <option value="en">English (إنجليزي)</option>
                <option value="ar">Arabic (عربي)</option>
              </select>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-600 mt-5 px-1">
            Your profile context is sent with every question so the AI tailors responses to your role.
          </p>
        </div>

        {/* Auth Button */}
        <div className="p-4 shrink-0 border-t border-zinc-100 dark:border-zinc-800">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 transition"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => setGateOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E0182D] hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
            >
              <User size={13} />
              Sign In / Create Account
            </button>
          )}
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#111111] overflow-hidden relative">

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 shrink-0 shadow-sm z-10">
          <img src="/Logo.png" alt="UAEU Chatbot" className="h-8 object-contain" />
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
            >
              <User size={14} className="text-[#E0182D]" />
              {displayName}
              <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{displayName}</p>
                    <p className="text-[10px] text-zinc-400">{roleLabel}</p>
                  </div>
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={() => { setProfileOpen(false); setGateOpen(true); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-[#E0182D] hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                    >
                      <User size={13} />
                      Sign In / Create Account
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {banner && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100 text-center shrink-0">
            {banner}
          </motion.div>
        )}

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-12 lg:px-24 py-10 scroll-smooth">
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex gap-4 mb-8 max-w-4xl mx-auto w-full ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500" : "bg-stone-50 dark:bg-[#161616] text-stone-700 dark:text-stone-300 shadow-sm border border-stone-200 dark:border-stone-800"}`}>
                  {m.role === "user" ? <UserCircle size={20} /> : <LibraryBig size={18} strokeWidth={2.5} />}
                </div>

                <div className={`flex flex-col gap-2 flex-max-w ${m.role === "user" ? "items-end" : "items-start w-[85%]"}`}>
                  <div
                    className={`rounded-3xl px-6 py-4 text-[1rem] leading-[1.6] ${
                      m.role === "user"
                        ? "bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm shadow-sm font-medium"
                        : "bg-transparent text-zinc-800 dark:text-zinc-200 prose dark:prose-invert prose-stone max-w-full prose-p:leading-[1.7] prose-ul:my-2 prose-li:my-1 prose-a:text-[#E0182D] dark:prose-a:text-rose-400 font-medium prose-a:underline decoration-stone-300 dark:decoration-stone-700 underline-offset-4"
                    }`}
                    dir="auto"
                  >
                    {(() => {
                      if (m.role === "assistant") {
                        let displayContent = m.content;
                        let extractedSource = null;
                        const sourceRegex = /(?:(?:\n|<br>|\|\s*)?\[?(?:Source|المصدر|source):\s*(.+?)\]?)$/i;
                        const match = displayContent.match(sourceRegex);
                        if (match && match.index !== undefined) {
                          extractedSource = match[1].trim().replace(/\]\(.*?\)$/, "");
                          displayContent = displayContent.substring(0, match.index).trim().replace(/[\n\s\]\[]+$/, "");
                        }
                        return (
                          <div className="flex flex-col gap-3">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                            {extractedSource && (
                              <div className="mt-1 flex flex-col items-start gap-2">
                                <button
                                  onClick={() => {
                                    setExpandedSources(prev => {
                                      const next = new Set(prev);
                                      if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                                      return next;
                                    });
                                  }}
                                  className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                                >
                                  <LibraryBig size={11} className="text-blue-500 dark:text-blue-400" />
                                  Sources
                                </button>
                                <AnimatePresence>
                                  {expandedSources.has(m.id) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 bg-white/50 dark:bg-black/20 border-l-2 border-blue-400 dark:border-blue-600 pl-3 py-1 my-1">
                                        <span className="font-semibold block mb-0.5 text-zinc-700 dark:text-zinc-300">Referenced material:</span>
                                        {extractedSource}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return <p className="whitespace-pre-wrap m-0">{m.content}</p>;
                    })()}
                  </div>

                  {m.source && m.source !== "error" && !m.escalated && (
                    <div className="flex items-center gap-1.5 px-6 text-[10px] uppercase font-bold text-stone-300 dark:text-stone-600 tracking-wider">
                      {m.source === "faq" && <><Search size={10} /> Instant DB Cache</>}
                      {m.source === "rag" && <><Search size={10} /> Vector Document Search</>}
                      {m.source === "web" && <><Globe size={10} /> Google Grounding</>}
                    </div>
                  )}

                  {m.escalated && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="mt-2 ml-6">
                      <a href="mailto:advising@uaeu.ac.ae" className="inline-flex items-center gap-2 justify-center bg-[#E0182D] hover:bg-red-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold py-3 px-6 rounded-xl transition duration-200 shadow-md text-sm">
                        <HeadphonesIcon size={16} />
                        Connect to UAEU Human Advisor
                      </a>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-4xl mx-auto w-full mb-8">
              <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
                <Search size={16} className="animate-spin-slow" />
              </div>
              <div className="bg-transparent py-2 flex flex-col justify-center">
                <p className="text-sm font-semibold text-zinc-500 tracking-wide animate-pulse">{loadingText}</p>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} className="h-6" />
        </div>

        {/* Input Area */}
        <div className="w-full bg-gradient-to-t from-white via-white to-white/0 dark:from-[#111111] dark:via-[#111111] dark:to-[#111111]/0 pt-6 pb-6 lg:pb-8 px-4 sm:px-12 lg:px-24 shrink-0 absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            <textarea
              className="min-h-[64px] max-h-[200px] w-full resize-none rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] px-6 py-4.5 pr-16 text-[1.05rem] font-medium text-zinc-900 dark:text-zinc-50 outline-none transition focus:border-[#E0182D] focus:ring-4 focus:ring-[#E0182D]/10 placeholder-zinc-400 dark:placeholder-zinc-500"
              style={{ paddingTop: "1.1rem" }}
              rows={1}
              placeholder={user ? `Ask me anything about UAEU, ${user.username}…` : "Ask me anything about UAEU…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="absolute right-3.5 bottom-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-200 dark:hover:bg-white dark:text-stone-900 p-2 text-white shadow-md transition disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:shadow-none focus:outline-none flex items-center justify-center h-[38px] w-[38px]"
            >
              <Send size={16} className={input.trim() && !loading ? "translate-x-[1px] translate-y-[-1px]" : ""} />
            </button>
          </div>
        </div>

        <div className="h-32 shrink-0" />
      </div>

      {/* Soft-gate overlay: shown after the visitor uses their free messages */}
      {gateOpen && !user && (
        <AuthModal
          variant="overlay"
          notice={`You've used your ${MESSAGE_GATE} free messages. Sign in or create a free account to keep chatting — your conversation stays right here.`}
          onAuth={handleAuth}
        />
      )}
    </div>
  );
}
