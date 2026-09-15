"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  ChevronDown,
  FileText,
  Globe,
  GraduationCap,
  HeadphonesIcon,
  LibraryBig,
  ListChecks,
  LockKeyhole,
  LogIn,
  LogOut,
  Search,
  Send,
  ShieldCheck,
  User,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import {
  CitationList,
  CommunicationList,
  GuidedServicePanel,
  GuidePreview,
} from "@/components/ServiceGuide";
import { getQuotaLimit, getQuotaPlan, type QuotaPlan } from "@/lib/access";
import type {
  AssistantSource,
  Citation,
  EscalationReason,
  ServiceGuide,
  UniversityCommunication,
} from "@/lib/prototype-types";

type Role = "user" | "assistant";
type UiMessage = {
  id: string;
  role: Role;
  content: string;
  escalated?: boolean;
  source?: AssistantSource;
  citations?: Citation[];
  communications?: UniversityCommunication[];
  guide?: ServiceGuide;
  escalationReason?: EscalationReason;
  provider?: string;
  model?: string;
};
type LocalePref = "auto" | "ar" | "en";
type AuthUser = {
  id: string;
  username: string;
  email?: string | null;
  studentType: string;
  major: string | null;
  universityAffiliation?: "uaeu" | "general";
};
type AuthMode = "login" | "signup";
type AuthPrompt = {
  open: boolean;
  locked: boolean;
  mode: AuthMode;
  title: string;
  subtitle: string;
};
type ChatApiResponse = {
  content?: string;
  source?: AssistantSource;
  citations?: Citation[];
  communications?: UniversityCommunication[];
  guide?: ServiceGuide;
  escalationReason?: EscalationReason;
  provider?: string;
  model?: string;
  error?: string;
};

const GUEST_STATE_KEY = "uaeu-chatbot-guest-v4";
const ACCOUNT_USAGE_KEY = "uaeu-chatbot-account-usage-v1";
const ACCOUNT_MESSAGES_KEY = "uaeu-chatbot-account-messages-v1";

const SUGGESTIONS = [
  {
    label: "Student documents",
    prompt: "How do I request a To Whom It May Concern letter?",
    icon: FileText,
  },
  {
    label: "Academic dates",
    prompt: "Where can I check UAEU academic calendar deadlines?",
    icon: CalendarDays,
  },
  {
    label: "Library help",
    prompt: "How can UAEU students get library or research help?",
    icon: LibraryBig,
  },
  {
    label: "Talk to staff",
    prompt: "I want to speak to a human advisor.",
    icon: HeadphonesIcon,
  },
];

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function safeMarkdownUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://uaeu.local");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return url;
    }
  } catch {
    return "";
  }

  return "";
}

function isAssistantSource(value: unknown): value is AssistantSource {
  return (
    value === "faq" ||
    value === "rag" ||
    value === "web" ||
    value === "guide" ||
    value === "error" ||
    value === "escalated"
  );
}

function sanitizeStoredMessages(rawMessages: unknown): UiMessage[] {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const message = raw as Partial<UiMessage>;
    if (
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      typeof message.id !== "string"
    ) {
      return [];
    }

    return [
      {
        id: message.id,
        role: message.role,
        content: message.content,
        escalated: Boolean(message.escalated),
        source: isAssistantSource(message.source) ? message.source : undefined,
        citations: Array.isArray(message.citations) ? message.citations : undefined,
        communications: Array.isArray(message.communications)
          ? message.communications
          : undefined,
        guide: message.guide,
        escalationReason: message.escalationReason,
        provider: message.provider,
        model: message.model,
      },
    ];
  });
}

function readGuestState(): { messages: UiMessage[]; questionsUsed: number } {
  if (typeof window === "undefined") {
    return { messages: [], questionsUsed: 0 };
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_STATE_KEY) || "{}") as {
      messages?: unknown;
      questionsUsed?: unknown;
    };
    const questionsUsed = Number.isFinite(parsed.questionsUsed)
      ? Math.max(0, Number(parsed.questionsUsed))
      : 0;

    return { messages: sanitizeStoredMessages(parsed.messages), questionsUsed };
  } catch {
    return { messages: [], questionsUsed: 0 };
  }
}

function writeGuestState(messages: UiMessage[], questionsUsed: number) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      GUEST_STATE_KEY,
      JSON.stringify({
        messages: messages.slice(-80),
        questionsUsed,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Storage can fail in private browsing; the active chat still works.
  }
}

function readAccountMessages(userId: string): UiMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_MESSAGES_KEY) || "{}") as Record<
      string,
      { messages?: unknown }
    >;
    return sanitizeStoredMessages(parsed[userId]?.messages);
  } catch {
    return [];
  }
}

function writeAccountMessages(userId: string, messages: UiMessage[]) {
  if (typeof window === "undefined") return;

  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_MESSAGES_KEY) || "{}") as Record<
      string,
      { messages?: UiMessage[]; updatedAt?: number }
    >;
    parsed[userId] = { messages: messages.slice(-80), updatedAt: Date.now() };
    localStorage.setItem(ACCOUNT_MESSAGES_KEY, JSON.stringify(parsed));
  } catch {
    // Local account history is best effort.
  }
}

function readAccountUsage(userId: string): number {
  if (typeof window === "undefined") return 0;

  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_USAGE_KEY) || "{}") as Record<
      string,
      { date?: string; used?: unknown }
    >;
    const record = parsed[userId];
    if (!record || record.date !== todayKey()) return 0;
    return Number.isFinite(record.used) ? Math.max(0, Number(record.used)) : 0;
  } catch {
    return 0;
  }
}

function writeAccountUsage(userId: string, used: number) {
  if (typeof window === "undefined") return;

  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_USAGE_KEY) || "{}") as Record<
      string,
      { date: string; used: number }
    >;
    parsed[userId] = { date: todayKey(), used };
    localStorage.setItem(ACCOUNT_USAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Quota display is best effort when browser storage is unavailable.
  }
}

function planName(plan: QuotaPlan) {
  if (plan === "uaeu") return "UAEU account";
  if (plan === "standard") return "Standard account";
  return "Visitor access";
}

function sourceLabel(source: AssistantSource) {
  if (source === "faq") return "FAQ answer";
  if (source === "rag") return "Verified document search";
  if (source === "web") return "External grounding";
  if (source === "guide") return "Guided service";
  if (source === "escalated") return "Official verification needed";
  return "System notice";
}

function sourceIcon(source: AssistantSource) {
  if (source === "web") return <Globe size={10} />;
  if (source === "guide") return <ListChecks size={10} />;
  if (source === "escalated") return <HeadphonesIcon size={10} />;
  if (source === "error") return <LockKeyhole size={10} />;
  return <Search size={10} />;
}

export function UniversityChat() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authPrompt, setAuthPrompt] = useState<AuthPrompt>({
    open: false,
    locked: false,
    mode: "login",
    title: "Sign in to continue",
    subtitle:
      "Create an account with any email, or use a UAEU email for extended local access.",
  });

  const [locale, setLocale] = useState<LocalePref>("auto");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [guestQuestionsUsed, setGuestQuestionsUsed] = useState(0);
  const [accountQuestionsUsed, setAccountQuestionsUsed] = useState(0);
  const [activeGuide, setActiveGuide] = useState<ServiceGuide | null>(null);
  const guestHydratedRef = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const plan = getQuotaPlan(user);
  const quotaLimit = getQuotaLimit(plan);
  const quotaUsed = user ? accountQuestionsUsed : guestQuestionsUsed;
  const quotaRemaining = Math.max(0, quotaLimit - quotaUsed);
  const quotaPercent = Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));
  const quotaBlocked = quotaRemaining <= 0;
  const hasUserMessages = messages.some((message) => message.role === "user");

  const openAuthPrompt = useCallback(
    (
      mode: AuthMode,
      locked = false,
      title = "Sign in to continue",
      subtitle = "Create an account with any email, or use a UAEU email for extended local access.",
    ) => {
      setAuthPrompt({ open: true, locked, mode, title, subtitle });
    },
    [],
  );

  const closeAuthPrompt = useCallback(() => {
    setAuthPrompt((current) =>
      current.locked ? current : { ...current, open: false },
    );
  }, []);

  const loadGuestConversation = useCallback(() => {
    const guestState = readGuestState();
    setGuestQuestionsUsed(guestState.questionsUsed);
    setMessages(guestState.messages);
    guestHydratedRef.current = true;
  }, []);

  const loadAccountConversation = useCallback(async (loggedUser: AuthUser) => {
    const localMessages = readAccountMessages(loggedUser.id);
    if (localMessages.length) {
      setMessages(localMessages);
      return;
    }

    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = (await res.json()) as { messages?: unknown };
        const serverMessages = sanitizeStoredMessages(data.messages);
        if (serverMessages.length) {
          setMessages(serverMessages);
          return;
        }
      }
    } catch {
      // Server history is optional; local history is the default.
    }

    setMessages([]);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = (await res.json()) as { user?: AuthUser | null };
        if (!mounted) return;

        if (data.user) {
          setUser(data.user);
          setAccountQuestionsUsed(readAccountUsage(data.user.id));
          await loadAccountConversation(data.user);
        } else {
          loadGuestConversation();
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadAccountConversation, loadGuestConversation]);

  useEffect(() => {
    if (!authLoading && !user && guestHydratedRef.current) {
      writeGuestState(messages, guestQuestionsUsed);
    }
  }, [authLoading, guestQuestionsUsed, messages, user]);

  useEffect(() => {
    if (!authLoading && user) {
      writeAccountMessages(user.id, messages);
    }
  }, [authLoading, messages, user]);

  useEffect(() => {
    if (user) {
      setAccountQuestionsUsed(readAccountUsage(user.id));
    } else {
      setAccountQuestionsUsed(0);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user && quotaBlocked && guestHydratedRef.current) {
      openAuthPrompt(
        "login",
        true,
        "Question allowance used",
        "Sign in or create an account to keep asking. UAEU emails receive extended local access.",
      );
    }
  }, [authLoading, openAuthPrompt, quotaBlocked, user]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleAuth(loggedUser: AuthUser) {
    setUser(loggedUser);
    setAccountQuestionsUsed(readAccountUsage(loggedUser.id));
    setAuthPrompt((current) => ({ ...current, open: false, locked: false }));
    setBanner(null);
    setInput("");
    setActiveGuide(null);
    await loadAccountConversation(loggedUser);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setProfileOpen(false);
    setActiveGuide(null);
    setBanner("Signed out. Visitor access is available on this device.");
    loadGuestConversation();
  }

  const incrementUsage = useCallback(() => {
    if (user) {
      setAccountQuestionsUsed((current) => {
        const next = current + 1;
        writeAccountUsage(user.id, next);
        return next;
      });
      return;
    }

    setGuestQuestionsUsed((current) => current + 1);
  }, [user]);

  const applySuggestion = useCallback((prompt: string) => {
    setInput(prompt);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (quotaBlocked) {
      if (!user) {
        openAuthPrompt(
          "login",
          true,
          "Question allowance used",
          "Sign in or create an account to keep asking. UAEU emails receive extended local access.",
        );
      } else {
        setBanner("You have used today's local question allowance for this account.");
      }
      return;
    }

    const userMsg: UiMessage = { id: genId(), role: "user", content: trimmed };
    const nextThread = [...messages, userMsg];
    setInput("");
    setBanner(null);
    setMessages(nextThread);
    setLoading(true);

    const payload: {
      locale: LocalePref;
      userContext?: {
        studentType?: string;
        major?: string | null;
        affiliation?: string;
      };
      messages: { role: Role; content: string }[];
    } = {
      locale,
      messages: nextThread.map(({ role, content }) => ({ role, content })),
    };

    if (user) {
      payload.userContext = {
        studentType: user.studentType,
        major: user.major,
        affiliation: user.universityAffiliation,
      };
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ChatApiResponse;

      if (!res.ok) {
        const error =
          data.content ||
          data.error ||
          "The assistant could not reach the AI provider. Please try again later.";
        setBanner(error);
        setMessages((current) => [
          ...current,
          {
            id: genId(),
            role: "assistant",
            content: error,
            source: "error",
            citations: data.citations,
          },
        ]);
        return;
      }

      if (data.content) {
        const source = data.source ?? "rag";
        setMessages((current) => [
          ...current,
          {
            id: genId(),
            role: "assistant",
            content: data.content ?? "",
            escalated: source === "escalated",
            source,
            citations: data.citations,
            communications: data.communications,
            guide: data.guide,
            escalationReason: data.escalationReason,
            provider: data.provider,
            model: data.model,
          },
        ]);
        incrementUsage();
      }
    } catch {
      const error = "Network error. Check your connection and try again.";
      setBanner(error);
      setMessages((current) => [
        ...current,
        { id: genId(), role: "assistant", content: error, source: "error" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    locale,
    messages,
    incrementUsage,
    openAuthPrompt,
    quotaBlocked,
    user,
  ]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/uaeu-chatbot-logo.png"
            alt="UAEU"
            width={224}
            height={60}
            className="h-auto w-56 object-contain"
            priority
          />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Checking session...
          </p>
        </div>
      </div>
    );
  }

  const profileTitle = user?.username ?? "Visitor";
  const profileSubtitle = user
    ? [user.studentType, user.major].filter(Boolean).join(" / ")
    : "Local browser session";

  return (
    <div className="flex h-full w-full bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950 md:flex lg:w-80">
        <div className="border-b border-zinc-200 px-7 py-7 dark:border-zinc-800">
          <Image
            src="/uaeu-chatbot-logo.png"
            alt="UAEU Chatbot Logo"
            width={260}
            height={70}
            className="h-auto w-full max-w-[260px] object-contain"
            priority
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E0182D]/10 text-[#E0182D]">
                {plan === "uaeu" ? <ShieldCheck size={19} /> : <User size={18} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {profileTitle}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {profileSubtitle || planName(plan)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/70">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  {planName(plan)}
                </p>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {quotaRemaining} left
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-[#E0182D] transition-all duration-300"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {quotaUsed} of {quotaLimit} questions used
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Language
            </label>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as LocalePref)}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </div>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-rose-900 dark:hover:text-rose-400"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openAuthPrompt("login")}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <LogIn size={14} />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuthPrompt("signup")}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#E0182D] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <UserPlus size={14} />
                Create
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className="flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#111111]">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
          <Image
            src="/uaeu-chatbot-logo.png"
            alt="UAEU Chatbot"
            width={144}
            height={39}
            className="h-9 w-auto object-contain"
            priority
          />
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex max-w-[190px] items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm dark:bg-zinc-800 dark:text-zinc-200"
            >
              {plan === "uaeu" ? (
                <ShieldCheck size={14} className="shrink-0 text-[#E0182D]" />
              ) : (
                <User size={14} className="shrink-0 text-[#E0182D]" />
              )}
              <span className="truncate">{profileTitle}</span>
              <ChevronDown size={12} className="shrink-0" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    <p className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {profileTitle}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {quotaRemaining} of {quotaLimit} questions left
                    </p>
                  </div>
                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => openAuthPrompt("login")}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => openAuthPrompt("signup")}
                        className="rounded-lg bg-[#E0182D] px-3 py-2 text-xs font-bold text-white"
                      >
                        Create
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {banner}
          </motion.div>
        )}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-14">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className={`mx-auto mb-7 flex w-full max-w-4xl gap-3 sm:gap-4 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      message.role === "user"
                        ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                        : "border border-zinc-200 bg-white text-[#E0182D] shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    {message.role === "user" ? (
                      <UserCircle size={20} />
                    ) : (
                      <Bot size={18} strokeWidth={2.4} />
                    )}
                  </div>

                  <div
                    className={`flex min-w-0 max-w-[84%] flex-col gap-2 ${
                      message.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`break-words rounded-2xl px-5 py-3.5 text-[0.96rem] leading-7 ${
                        message.role === "user"
                          ? "rounded-tr-md bg-zinc-950 font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                          : "rounded-tl-md bg-zinc-50 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                      }`}
                      dir="auto"
                    >
                      {message.role === "assistant" ? (
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={safeMarkdownUrl}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    {message.source && (
                      <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                        {sourceIcon(message.source)}
                        {sourceLabel(message.source)}
                        {message.provider && message.model && (
                          <span className="normal-case tracking-normal text-zinc-300 dark:text-zinc-700">
                            {message.provider} / {message.model}
                          </span>
                        )}
                      </div>
                    )}

                    <CitationList citations={message.citations} />

                    {message.guide && (
                      <GuidePreview guide={message.guide} onStart={setActiveGuide} />
                    )}

                    <CommunicationList communications={message.communications} />

                    {message.escalated && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-2"
                      >
                        <a
                          href="https://www.uaeu.ac.ae/en/contact/index.shtml"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-[#E0182D] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-700"
                        >
                          <HeadphonesIcon size={16} />
                          Open UAEU contact page
                        </a>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!hasUserMessages && (
              <div className="mx-auto mb-8 w-full max-w-4xl pt-6">
                <h1 className="text-2xl font-bold tracking-normal text-zinc-950 sm:text-3xl">
                  What can I help you with?
                </h1>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map(({ label, prompt, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => applySuggestion(prompt)}
                      className="flex min-h-[56px] items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-700 shadow-sm transition hover:border-[#E0182D]/40 hover:bg-rose-50/40 hover:text-[#E0182D]"
                    >
                      <Icon size={17} className="shrink-0 text-[#E0182D]" />
                      <span className="min-w-0 truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto mb-8 flex w-full max-w-4xl gap-4"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                  <Search size={16} className="animate-spin" />
                </div>
                <div className="flex items-center py-2">
                  <p className="text-sm font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
                    Checking verified UAEU sources...
                  </p>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} className="h-2" />
          </div>

          {activeGuide && (
            <GuidedServicePanel guide={activeGuide} onClose={() => setActiveGuide(null)} />
          )}
        </div>

        <footer className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-[#111111] sm:px-8 lg:px-14">
          <div className="mx-auto max-w-4xl">
            {!user && quotaRemaining <= 2 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                <span>{quotaRemaining} questions remaining</span>
                <button
                  type="button"
                  onClick={() => openAuthPrompt("signup")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-2.5 py-1.5 text-white transition hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-950"
                >
                  <GraduationCap size={13} />
                  Create account
                </button>
              </div>
            )}

            <div className="relative">
              <textarea
                ref={inputRef}
                className="max-h-40 min-h-[58px] w-full resize-none rounded-2xl border border-zinc-200 bg-white px-5 py-4 pr-16 text-[1rem] font-medium text-zinc-900 shadow-sm outline-none transition placeholder-zinc-400 focus:border-[#E0182D] focus:ring-4 focus:ring-[#E0182D]/10 disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:disabled:bg-zinc-900/60"
                rows={1}
                placeholder={
                  quotaBlocked
                    ? "Sign in to continue"
                    : user
                      ? `Ask UAEU, ${user.username}`
                      : `Ask a UAEU question (${quotaRemaining} left)`
                }
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                disabled={loading || quotaBlocked}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim() || quotaBlocked}
                className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-md transition hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                aria-label="Send message"
              >
                <Send
                  size={16}
                  className={
                    input.trim() && !loading && !quotaBlocked
                      ? "translate-x-[1px] translate-y-[-1px]"
                      : ""
                  }
                />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-600">
              Prototype answers are guidance only; use official UAEU pages for final decisions.
            </p>
          </div>
        </footer>
      </section>

      <AnimatePresence>
        {authPrompt.open && (
          <AuthModal
            onAuth={handleAuth}
            onClose={authPrompt.locked ? undefined : closeAuthPrompt}
            initialMode={authPrompt.mode}
            title={authPrompt.title}
            subtitle={authPrompt.subtitle}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
