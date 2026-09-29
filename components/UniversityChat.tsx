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
  Trash2,
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
import { boundOutgoingMessages, ConversationOwnership, dailyUsage, sanitizeAnswerMetadata, uaeDateKey } from "@/lib/chat-contract";
import { textLanguage, uiCopy } from "@/lib/ui-copy";
import type {
  AnswerMetadata,
  AssistantSource,
  ServiceGuide,
} from "@/lib/prototype-types";

type Role = "user" | "assistant";
type UiMessage = AnswerMetadata & {
  id: string;
  role: Role;
  content: string;
  escalated?: boolean;
  source?: AssistantSource;
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
type ChatApiResponse = AnswerMetadata & {
  content?: string;
  source?: AssistantSource;
  error?: string;
  code?: string;
};

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthUser>;
  return typeof candidate.id === 'string' && candidate.id.length > 0 &&
    typeof candidate.username === 'string' && typeof candidate.studentType === 'string' &&
    (candidate.major === null || typeof candidate.major === 'string');
}

const GUEST_STATE_KEY = "uaeu-chatbot-guest-v4";
const ACCOUNT_USAGE_KEY = "uaeu-chatbot-account-usage-v1";
const ACCOUNT_MESSAGES_KEY = "uaeu-chatbot-account-messages-v1";
const LANGUAGE_KEY = "uaeu-chatbot-language-v1";

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
  return uaeDateKey();
}

function safeMarkdownUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "mailto:") {
      return parsed.pathname.toLowerCase().endsWith("@uaeu.ac.ae") ? url : "";
    }
    if (parsed.protocol === "https:") {
      const host = parsed.hostname.toLowerCase();
      const official =
        host === "uaeu.ac.ae" ||
        host.endsWith(".uaeu.ac.ae") ||
        host === "u.ae" ||
        host.endsWith(".u.ae") ||
        host === "moe.gov.ae" ||
        host.endsWith(".moe.gov.ae") ||
        host === "mohesr.gov.ae" ||
        host.endsWith(".mohesr.gov.ae");
      return official ? url : "";
    }
  } catch {
    return "";
  }

  return "";
}

function isAssistantSource(value: unknown): value is AssistantSource {
  return (
    value === "conversation" ||
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

  return rawMessages.slice(-80).flatMap((raw) => {
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
        ...sanitizeAnswerMetadata(message),
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
      { messages?: unknown; cleared?: boolean }
    >;
    return sanitizeStoredMessages(parsed[userId]?.messages);
  } catch {
    return [];
  }
}

function hasClearedAccountHistory(userId: string): boolean {
  try {
    const records = JSON.parse(localStorage.getItem(ACCOUNT_MESSAGES_KEY) || "{}");
    return records[userId]?.cleared === true;
  } catch { return false; }
}

function writeAccountMessages(userId: string, messages: UiMessage[]) {
  if (typeof window === "undefined") return;

  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_MESSAGES_KEY) || "{}") as Record<
      string,
      { messages?: UiMessage[]; updatedAt?: number; cleared?: boolean }
    >;
    parsed[userId] = { messages: messages.slice(-80), updatedAt: Date.now(), cleared: messages.length === 0 && parsed[userId]?.cleared === true };
    localStorage.setItem(ACCOUNT_MESSAGES_KEY, JSON.stringify(parsed));
  } catch {
    // Local account history is best effort.
  }
}

function clearAccountMessages(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_MESSAGES_KEY) || "{}") as Record<
      string,
      unknown
    >;
    parsed[userId] = { messages: [], cleared: true };
    localStorage.setItem(ACCOUNT_MESSAGES_KEY, JSON.stringify(parsed));
  } catch {
    // Clearing local history is best effort when storage is unavailable.
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
    return dailyUsage(record);
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

function planName(plan: QuotaPlan, language: "en" | "ar") {
  return plan === "guest" ? uiCopy[language].visitorAccess : uiCopy[language].account;
}

function sourceLabel(source: AssistantSource, disposition: UiMessage["disposition"], language: "en" | "ar") {
  const copy = uiCopy[language];
  if (source === "escalated") return disposition === "urgent" ? copy.urgent : disposition === "handoff" ? copy.handoff : copy.clarify;
  return copy[source];
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

  const [locale, setLocale] = useState<LocalePref>(() => {
    try { const value = localStorage.getItem(LANGUAGE_KEY); return value === "en" || value === "ar" ? value : "auto"; }
    catch { return "auto"; }
  });
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [guestQuestionsUsed, setGuestQuestionsUsed] = useState(0);
  const [accountQuestionsUsed, setAccountQuestionsUsed] = useState(0);
  const [activeGuide, setActiveGuide] = useState<ServiceGuide | null>(null);
  const guestHydratedRef = useRef(false);
  const historyOwnerRef = useRef<string | null>(null);
  const ownershipRef = useRef(new ConversationOwnership());
  const authTransitionRef = useRef<symbol | null>(null);
  const [authTransition, setAuthTransition] = useState(false);
  const [sessionUncertain, setSessionUncertain] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const usageDateRef = useRef(todayKey());
  const accountUsageRef = useRef({ userId: "", date: todayKey(), used: 0 });
  const latestUserText = [...messages].reverse().find((message) => message.role === "user")?.content;
  const uiLocale = locale === "auto" ? (latestUserText ? textLanguage(latestUserText) : "en") : locale;
  const copy = uiCopy[uiLocale];

  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_KEY, locale); } catch { /* Optional preference storage. */ }
  }, [locale]);

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
      title = copy.signInTitle,
      subtitle = copy.accountNotice,
    ) => {
      if (authTransitionRef.current) return;
      setAuthPrompt({ open: true, locked, mode, title, subtitle });
    },
    [copy],
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
    const request = ownershipRef.current.begin();
    let identityChanged = false;
    historyOwnerRef.current = null;
    setHistoryLoading(true);
    setMessages([]);
    try {
      const localMessages = readAccountMessages(loggedUser.id);
      if (localMessages.length || hasClearedAccountHistory(loggedUser.id)) {
        if (request.isCurrent()) {
          historyOwnerRef.current = loggedUser.id;
          setMessages(localMessages);
        }
        return true;
      }
      const res = await fetch("/api/history", {
        headers: { 'x-chat-account-id': loggedUser.id },
        cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
      });
      if (res.status === 409) {
        identityChanged = true;
        return false;
      }
      if (res.ok) {
        const data = (await res.json()) as { messages?: unknown };
        if (request.isCurrent()) {
          historyOwnerRef.current = loggedUser.id;
          setMessages(sanitizeStoredMessages(data.messages));
        }
      }
    } catch {
      // Server history is optional; local history is the default.
    } finally {
      if (request.isCurrent() && !identityChanged) {
        historyOwnerRef.current = loggedUser.id;
        setHistoryLoading(false);
      }
      request.finish();
    }
    return true;
  }, []);

  const reconcileAccount = useCallback(async () => {
    const transition = Symbol('session-reconciliation');
    authTransitionRef.current = transition;
    setAuthTransition(true);
    setSessionUncertain(false);
    ownershipRef.current.invalidate();
    historyOwnerRef.current = null;
    guestHydratedRef.current = false;
    setLoading(false);
    setHistoryLoading(false);
    setMessages([]);
    setInput('');
    setActiveGuide(null);
    setProfileOpen(false);
    setDeletionPending(false);
    const request = ownershipRef.current.begin();
    try {
      const res = await fetch('/api/auth/session', {
        cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
      });
      if (!res.ok) throw new Error('Session unavailable');
      const data = await res.json() as { user?: unknown };
      if (data.user !== null && !isAuthUser(data.user)) throw new Error('Invalid session response');
      if (!request.isCurrent()) return;
      setUser(data.user);
      if (data.user) {
        setAccountQuestionsUsed(readAccountUsage(data.user.id));
        if (!await loadAccountConversation(data.user)) throw new Error('Session changed again');
      } else {
        loadGuestConversation();
      }
      if (authTransitionRef.current !== transition || !request.isCurrent()) return;
      setBanner(uiLocale === 'ar'
        ? 'تغير الحساب. تم تحميل محادثة الحساب الحالي دون نقل المحادثة السابقة. أعد كتابة سؤالك إذا رغبت.'
        : 'Your account changed. The current account conversation is loaded without transferring the previous conversation. Re-enter your question if needed.');
      authTransitionRef.current = null;
      setAuthTransition(false);
    } catch {
      if (authTransitionRef.current === transition && request.isCurrent()) {
        setSessionUncertain(true);
        setBanner(uiLocale === 'ar'
          ? 'تعذر التأكد من الحساب الحالي. تم إيقاف المحادثة مؤقتاً لحماية سجلّك. أعد التحقق من حالة تسجيل الدخول.'
          : 'The current account could not be confirmed. Chat is paused to protect your history. Check sign-in status again.');
      }
    } finally {
      request.finish();
    }
  }, [loadAccountConversation, loadGuestConversation, uiLocale]);

  // The mount effect uses a stable indirection so language changes do not reload
  // sessions or overwrite a conversation already in progress.
  const reconcileAccountRef = useRef(reconcileAccount);
  useEffect(() => { reconcileAccountRef.current = reconcileAccount; }, [reconcileAccount]);

  useEffect(() => {
    let mounted = true;
    const ownership = ownershipRef.current;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        });
        if (!res.ok) throw new Error("Session unavailable");
        const data = (await res.json()) as { user?: unknown };
        if (data.user !== null && !isAuthUser(data.user)) throw new Error('Invalid session response');
        if (!mounted) return;

        if (data.user) {
          setUser(data.user);
          setAccountQuestionsUsed(readAccountUsage(data.user.id));
          if (!await loadAccountConversation(data.user)) await reconcileAccountRef.current();
        } else {
          loadGuestConversation();
        }
      } catch {
        if (mounted) {
          loadGuestConversation();
          setBanner(uiCopy.en.sessionFailed);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
      ownership.invalidate();
    };
  }, [loadAccountConversation, loadGuestConversation]);

  useEffect(() => {
    if (!authLoading && !user && guestHydratedRef.current) {
      writeGuestState(messages, guestQuestionsUsed);
    }
  }, [authLoading, guestQuestionsUsed, messages, user]);

  useEffect(() => {
    if (!authLoading && !historyLoading && user && historyOwnerRef.current === user.id) {
      writeAccountMessages(user.id, messages);
    }
  }, [authLoading, historyLoading, messages, user]);

  useEffect(() => {
    if (user) {
      setAccountQuestionsUsed(readAccountUsage(user.id));
    } else {
      setAccountQuestionsUsed(0);
    }
  }, [user]);

  useEffect(() => {
    function refreshUsage() {
      usageDateRef.current = todayKey();
      if (user) setAccountQuestionsUsed(readAccountUsage(user.id));
    }
    const timer = window.setInterval(refreshUsage, 30_000);
    window.addEventListener("focus", refreshUsage);
    window.addEventListener("storage", refreshUsage);
    document.addEventListener("visibilitychange", refreshUsage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshUsage);
      window.removeEventListener("storage", refreshUsage);
      document.removeEventListener("visibilitychange", refreshUsage);
    };
  }, [user]);

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
    const transition = Symbol("account-change");
    authTransitionRef.current = transition;
    setAuthTransition(true);
    setSessionUncertain(false);
    ownershipRef.current.invalidate();
    setLoading(false);
    setDeletionPending(false);
    setUser(loggedUser);
    setAccountQuestionsUsed(readAccountUsage(loggedUser.id));
    setAuthPrompt((current) => ({ ...current, open: false, locked: false }));
    setBanner(null);
    setInput("");
    setActiveGuide(null);
    try {
      if (!await loadAccountConversation(loggedUser)) await reconcileAccount();
    } finally {
      if (authTransitionRef.current === transition) {
        authTransitionRef.current = null;
        setAuthTransition(false);
      }
    }
  }

  async function handleLogout() {
    if (authTransitionRef.current) return;
    const transition = Symbol("logout");
    authTransitionRef.current = transition;
    setAuthTransition(true);
    ownershipRef.current.invalidate();
    setLoading(false);
    const request = ownershipRef.current.begin();
    try {
      const result = await fetch("/api/auth/logout", {
        method: "POST", headers: { 'x-chat-account-id': user?.id ?? 'guest' }, signal: request.signal,
      });
      if (result.status === 409 && request.isCurrent()) { await reconcileAccount(); return; }
      if (!result.ok) throw new Error("Logout failed");
      if (!request.isCurrent()) return;
      // Switching owners is a second boundary. Even a request started while
      // sign-out was pending must never append into the guest conversation.
      ownershipRef.current.invalidate();
      historyOwnerRef.current = null;
      setHistoryLoading(false);
      setUser(null);
      setProfileOpen(false);
      setActiveGuide(null);
      setDeletionPending(false);
      setBanner(copy.signedOut);
      loadGuestConversation();
    } catch {
      if (request.isCurrent()) setBanner(copy.logoutFailed);
    } finally {
      request.finish();
      if (authTransitionRef.current === transition) {
        authTransitionRef.current = null;
        setAuthTransition(false);
      }
    }
  }

  async function handleClearConversation() {
    if (authTransitionRef.current) return;
    ownershipRef.current.invalidate();
    setLoading(false);
    setHistoryLoading(false);
    const request = ownershipRef.current.begin();
    setMessages([]);
    setInput("");
    setActiveGuide(null);
    if (user) {
      clearAccountMessages(user.id);
      try {
        const result = await fetch("/api/history", {
          method: "DELETE", headers: { 'x-chat-account-id': user.id }, signal: request.signal,
        });
        if (result.status === 409 && request.isCurrent()) { await reconcileAccount(); return; }
        if (!result.ok) throw new Error("Delete failed");
        if (request.isCurrent()) { setDeletionPending(false); setBanner(copy.cleared); }
      } catch {
        if (request.isCurrent()) { setDeletionPending(true); setBanner(copy.clearFailed); }
      }
    } else {
      writeGuestState([], guestQuestionsUsed);
      setBanner(copy.cleared);
    }
    if (request.isCurrent()) setProfileOpen(false);
    request.finish();
  }

  const incrementUsage = useCallback(() => {
    if (user) {
      const date = todayKey();
      const memory = accountUsageRef.current;
      const remembered = memory.userId === user.id && memory.date === date ? memory.used : 0;
      const next = Math.max(remembered, readAccountUsage(user.id)) + 1;
      accountUsageRef.current = { userId: user.id, date, used: next };
      usageDateRef.current = date;
      // Event side effects must not run inside a React updater: Strict Mode
      // intentionally calls updater functions more than once.
      writeAccountUsage(user.id, next);
      setAccountQuestionsUsed(next);
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
    if (!trimmed || loading || historyLoading || authTransitionRef.current) return;

    const currentUsage = user ? readAccountUsage(user.id) : guestQuestionsUsed;
    if (user) setAccountQuestionsUsed(currentUsage);
    if (currentUsage >= quotaLimit) {
      if (!user) {
        openAuthPrompt(
          "login",
          false,
          copy.allowanceTitle,
          copy.allowanceNotice,
        );
      } else {
        setBanner(copy.dailyLimit);
      }
      return;
    }

    const userMsg: UiMessage = { id: genId(), role: "user", content: trimmed };
    const nextThread = [...messages, userMsg];
    setInput("");
    setBanner(null);
    setMessages(nextThread);
    setLoading(true);
    const request = ownershipRef.current.begin();

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
      messages: boundOutgoingMessages(nextThread.map(({ role, content }) => ({ role, content }))),
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
        headers: { "Content-Type": "application/json", 'x-chat-account-id': user?.id ?? 'guest' },
        credentials: user ? 'same-origin' : 'omit',
        body: JSON.stringify(payload),
        signal: request.signal,
      });
      const data = (await res.json().catch(() => ({}))) as ChatApiResponse;
      if (!request.isCurrent()) return;

      if (res.status === 409 && data.code === 'account_changed') {
        await reconcileAccount();
        return;
      }

      if (!res.ok) {
        const error =
          data.content ||
          data.error ||
          copy.requestError;
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
            escalated: data.disposition === "handoff" || data.disposition === "urgent",
            source,
            ...sanitizeAnswerMetadata(data),
          },
        ]);
        incrementUsage();
      }
    } catch {
      if (!request.isCurrent()) return;
      const error = copy.networkError;
      setBanner(error);
      setMessages((current) => [
        ...current,
        { id: genId(), role: "assistant", content: error, source: "error" },
      ]);
    } finally {
      if (request.isCurrent()) setLoading(false);
      request.finish();
    }
  }, [
    input,
    loading,
    historyLoading,
    locale,
    messages,
    incrementUsage,
    openAuthPrompt,
    guestQuestionsUsed,
    quotaLimit,
    copy,
    user,
    reconcileAccount,
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
            {copy.checkingSession}
          </p>
        </div>
      </div>
    );
  }

  const profileTitle = user?.username ?? copy.visitor;
  const profileSubtitle = user
    ? [user.studentType, user.major].filter(Boolean).join(" / ")
    : copy.browserSession;

  return (
    <div lang={uiLocale} dir={uiLocale === "ar" ? "rtl" : "ltr"} className="flex h-full w-full bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
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
                  {profileSubtitle || planName(plan, uiLocale)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/70">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  {planName(plan, uiLocale)}
                </p>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {quotaRemaining} {copy.left}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-[#E0182D] transition-all duration-300"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {quotaUsed} {copy.of} {quotaLimit} {copy.used}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label htmlFor="desktop-language" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {copy.language}
            </label>
            <select
              id="desktop-language"
              data-testid="desktop-language"
              value={locale}
              onChange={(event) => setLocale(event.target.value as LocalePref)}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 outline-none transition focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="auto">{copy.auto}</option>
              <option value="en">{copy.english}</option>
              <option value="ar">{copy.arabic}</option>
            </select>
          </div>
        </div>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          {(hasUserMessages || deletionPending) && (
            <button
              type="button"
              onClick={() => void handleClearConversation()}
              data-testid="clear-conversation"
              disabled={authTransition}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <Trash2 size={15} />
              {copy.clear}
            </button>
          )}
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              data-testid="sign-out"
              disabled={authTransition}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-rose-900 dark:hover:text-rose-400"
            >
              <LogOut size={15} />
              {copy.signOut}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openAuthPrompt("login")}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <LogIn size={14} />
                {copy.signIn}
              </button>
              <button
                type="button"
                onClick={() => openAuthPrompt("signup")}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#E0182D] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <UserPlus size={14} />
                {copy.create}
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
          <select
            data-testid="mobile-language"
            aria-label={copy.language}
            value={locale}
            onChange={(event) => setLocale(event.target.value as LocalePref)}
            className="mx-2 max-w-28 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:bg-zinc-900"
          >
            <option value="auto">{copy.auto}</option>
            <option value="en">{copy.english}</option>
            <option value="ar">{copy.arabic}</option>
          </select>
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-controls="mobile-profile-menu"
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
                  id="mobile-profile-menu"
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
                      {quotaRemaining} {copy.of} {quotaLimit} {copy.remaining}
                    </p>
                  </div>
                  {(hasUserMessages || deletionPending) && (
                    <button
                      type="button"
                      onClick={() => void handleClearConversation()}
                      disabled={authTransition}
                      className="flex w-full items-center gap-2 border-b border-zinc-100 px-4 py-3 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Trash2 size={13} />
                      {copy.clear}
                    </button>
                  )}
                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={authTransition}
                      className="flex w-full items-center gap-2 px-4 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    >
                      <LogOut size={13} />
                      {copy.signOut}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => openAuthPrompt("login")}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                      >
                        {copy.signIn}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAuthPrompt("signup")}
                        className="rounded-lg bg-[#E0182D] px-3 py-2 text-xs font-bold text-white"
                      >
                        {copy.create}
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
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {banner}
            {sessionUncertain && (
              <button type="button" onClick={() => void reconcileAccount()} className="mx-3 rounded border border-current px-3 py-1 underline">
                {uiLocale === 'ar' ? 'إعادة التحقق من تسجيل الدخول' : 'Check sign-in status'}
              </button>
            )}
          </motion.div>
        )}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div role="log" aria-label={uiLocale === "ar" ? "المحادثة" : "Conversation"} aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-14">
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
                      dir={textLanguage(message.content) === "ar" ? "rtl" : "ltr"}
                      lang={textLanguage(message.content)}
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
                        {sourceLabel(message.source, message.disposition, textLanguage(message.content))}
                        {message.provider && message.model && (
                          <span className="normal-case tracking-normal text-zinc-300 dark:text-zinc-700">
                            {message.provider} / {message.model}
                          </span>
                        )}
                      </div>
                    )}

                    <CitationList citations={message.citations} />

                    {message.guide && (
                      <GuidePreview guide={message.guide} onStart={setActiveGuide} language={textLanguage(message.content)} />
                    )}

                    <CommunicationList communications={message.communications} />

                    {message.disposition === "handoff" && (
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
                          {copy.contact}
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
                  {copy.heading}
                </h1>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map(({ label, prompt, icon: Icon }, index) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => applySuggestion(prompt)}
                      className="flex min-h-[56px] items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-700 shadow-sm transition hover:border-[#E0182D]/40 hover:bg-rose-50/40 hover:text-[#E0182D]"
                    >
                      <Icon size={17} className="shrink-0 text-[#E0182D]" />
                      <span className="min-w-0 truncate">{[copy.studentDocuments, copy.academicDates, copy.library, copy.staff][index]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(loading || historyLoading) && (
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
                    {historyLoading ? copy.historyLoading : copy.checkingSources}
                  </p>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} className="h-2" />
          </div>

          {activeGuide && (
            <GuidedServicePanel key={activeGuide.id} guide={activeGuide} language={uiLocale} onClose={() => setActiveGuide(null)} />
          )}
        </div>

        <footer className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-[#111111] sm:px-8 lg:px-14">
          <div className="mx-auto max-w-4xl">
            {!user && quotaRemaining <= 2 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                <span>{quotaRemaining} {copy.remaining}</span>
                <button
                  type="button"
                  onClick={() => openAuthPrompt("signup")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-2.5 py-1.5 text-white transition hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-950"
                >
                  <GraduationCap size={13} />
                  {copy.create}
                </button>
              </div>
            )}

            <div className="relative">
              <label className="sr-only" htmlFor="chat-question">{copy.askLabel}</label>
              <textarea
                id="chat-question"
                data-testid="chat-input"
                ref={inputRef}
                className="max-h-40 min-h-[58px] w-full resize-none rounded-2xl border border-zinc-200 bg-white px-5 py-4 pr-16 text-[1rem] font-medium text-zinc-900 shadow-sm outline-none transition placeholder-zinc-400 focus:border-[#E0182D] focus:ring-4 focus:ring-[#E0182D]/10 disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:disabled:bg-zinc-900/60"
                maxLength={6000}
                rows={1}
                placeholder={
                  quotaBlocked
                    ? user ? copy.dailyLimit : copy.signInTitle
                    : user
                      ? `${copy.askLabel}, ${user.username}`
                      : `${copy.askLabel} (${quotaRemaining} ${copy.left})`
                }
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
                disabled={loading || historyLoading || authTransition || quotaBlocked}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || historyLoading || authTransition || !input.trim() || quotaBlocked}
                className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-md transition hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                aria-label={copy.send}
                data-testid="send-message"
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
            {loading && (
              <button type="button" data-testid="stop-response" className="mt-2 rounded-lg border px-3 py-1 text-sm" onClick={() => {
                ownershipRef.current.invalidate();
                setLoading(false);
              }}>{copy.cancel}</button>
            )}
            <p className="mt-2 text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-600">
              {copy.historyNotice}
            </p>
          </div>
        </footer>
      </section>

      <AnimatePresence>
        {authPrompt.open && (
          <AuthModal
            language={uiLocale}
            onAuth={handleAuth}
            onClose={closeAuthPrompt}
            initialMode={authPrompt.mode}
            title={authPrompt.title}
            subtitle={authPrompt.subtitle}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
