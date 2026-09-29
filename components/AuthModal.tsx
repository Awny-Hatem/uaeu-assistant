"use client";

import { useEffect, useRef, useState } from "react";
import { passwordError } from "@/lib/auth-validation";
import { uiCopy, type UiLocale } from "@/lib/ui-copy";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  GraduationCap,
  LogIn,
  Mail,
  UserCircle2,
  UserPlus,
  X,
} from "lucide-react";

type AuthUser = {
  id: string;
  username: string;
  email?: string | null;
  studentType: string;
  major: string | null;
  universityAffiliation?: "uaeu" | "general";
};
type Mode = "login" | "signup";

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AuthUser>;
  return typeof user.id === "string" && user.id.length > 0 &&
    typeof user.username === "string" && typeof user.studentType === "string" &&
    (user.major === null || typeof user.major === "string");
}

const STUDENT_TYPES = [
  { value: "Visitor", label: "Visitor / Parent" },
  { value: "Applicant", label: "Prospective Applicant" },
  { value: "Current Student", label: "Current UAEU Student" },
  { value: "Alumni", label: "Alumni" },
];

interface AuthModalProps {
  onAuth: (user: AuthUser) => void | Promise<void>;
  onClose?: () => void;
  initialMode?: Mode;
  title?: string;
  subtitle?: string;
  language?: UiLocale;
}

export function AuthModal({
  onAuth,
  onClose,
  initialMode = "login",
  title = "Sign in to continue",
  subtitle = "Create a prototype account with any email. University affiliation is not verified.",
  language = "en",
}: AuthModalProps) {
  const copy = uiCopy[language];
  const ar = language === "ar";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const uncertainRef = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      requestRef.current?.abort();
      dialog?.close();
      previous?.focus();
    };
  }, []);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studentType, setStudentType] = useState("Current Student");
  const [major, setMajor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionUncertain, setSessionUncertain] = useState(false);
  const closeBlocked = loading || sessionUncertain;

  function requestClose() {
    // Aborting a POST cannot undo an already received Set-Cookie header. Keep
    // ownership coherent until the response or a session recheck has settled.
    if (!requestRef.current && !uncertainRef.current) onClose?.();
  }

  function unresolvedSession() {
    uncertainRef.current = true;
    setSessionUncertain(true);
    setError(ar
      ? "تعذر تأكيد حالة الحساب. تحقق من حالة الدخول قبل متابعة المحادثة، أو أعد تحميل الصفحة."
      : "Your account status could not be confirmed. Check sign-in status before continuing, or reload this page.");
  }

  async function reconcileSession(controller: AbortController) {
    const res = await fetch("/api/auth/session", {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
    });
    const data: unknown = await res.json();
    if (!res.ok || !data || typeof data !== "object" || !("user" in data) ||
      (data.user !== null && !isAuthUser(data.user))) throw new Error("Session unavailable");
    if (controller.signal.aborted) return;
    uncertainRef.current = false;
    setSessionUncertain(false);
    if (data.user) await onAuth(data.user);
    else setError(copy.networkError);
  }

  async function retrySessionCheck() {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      await reconcileSession(controller);
    } catch {
      if (!controller.signal.aborted) unresolvedSession();
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Ref guard is synchronous; duplicate submit events can precede the React
    // render that disables the submit button.
    if (requestRef.current || uncertainRef.current) return;
    setError(null);
    if (mode === "signup" && passwordError(password)) {
      setError(ar ? "استخدم 8 أحرف على الأقل تتضمن حرفاً إنجليزياً ورقماً، وبحد أقصى 72 بايت UTF-8." : passwordError(password));
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      mode === "login"
        ? { username, password }
        : { username, email, password, studentType, major: major.trim() };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(ar
          ? res.status === 401 ? "اسم المستخدم أو كلمة المرور غير صحيحة." : res.status === 409 ? "اسم المستخدم أو البريد الإلكتروني غير متاح." : res.status === 429 ? "طلبات كثيرة. انتظر دقيقة وحاول مجدداً." : res.status >= 500 ? "خدمة الحساب غير متاحة مؤقتاً. حاول لاحقاً." : "تحقق من بيانات الحساب. اسم المستخدم من 3 إلى 32 حرفاً إنجليزياً أو رقماً أو . أو _ أو -."
          : data.error || "Something went wrong");
        return;
      }

      if (!isAuthUser(data.user)) throw new Error("Invalid account response");
      if (!controller.signal.aborted) await onAuth(data.user);
    } catch {
      if (!controller.signal.aborted) {
        try {
          await reconcileSession(controller);
        } catch {
          if (!controller.signal.aborted) unresolvedSession();
        }
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 outline-none transition placeholder-zinc-400 focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500";

  const needsMajor =
    studentType === "Current Student" || studentType === "Applicant";

  return (
    <dialog ref={dialogRef} aria-labelledby="auth-title" aria-describedby="auth-description" lang={language} dir={ar ? "rtl" : "ltr"} onCancel={(event) => { event.preventDefault(); requestClose(); }} className="fixed inset-0 z-50 m-0 hidden h-full max-h-none w-full max-w-none items-start justify-center overflow-y-auto overscroll-contain bg-white/85 px-4 py-4 backdrop-blur-md open:flex sm:py-6 dark:bg-zinc-950/85">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative my-2 w-full max-w-lg sm:my-4 sm:max-w-2xl"
      >
        <div className="flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
          <div className="relative shrink-0 border-b border-zinc-100 bg-zinc-50 px-5 py-5 text-zinc-950 sm:px-7 sm:py-6 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            {onClose && (
              <button
                type="button"
                onClick={requestClose}
                disabled={closeBlocked}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-950 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={ar ? "إغلاق تسجيل الدخول" : "Close sign in"}
                data-testid="auth-close"
              >
                <X size={16} />
              </button>
            )}
            <Image
              src="/uaeu-chatbot-logo.png"
              alt="UAEU Logo"
              width={208}
              height={56}
              className="h-auto w-44 object-contain sm:w-52"
            />
            <h1 id="auth-title" className="mt-4 text-xl font-bold tracking-tight">{title}</h1>
            <p id="auth-description" className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {subtitle}
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              aria-pressed={mode === "login"}
              disabled={closeBlocked}
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
                mode === "login"
                  ? "border-b-2 border-[#E0182D] text-[#E0182D]"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <LogIn size={15} />
              {copy.signIn}
            </button>
            <button
              type="button"
              aria-pressed={mode === "signup"}
              disabled={closeBlocked}
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
                mode === "signup"
                  ? "border-b-2 border-[#E0182D] text-[#E0182D]"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <UserPlus size={15} />
              {copy.create}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                    {error}
                    {sessionUncertain && (
                      <button type="button" disabled={loading} onClick={() => void retrySessionCheck()} className="mt-2 block rounded-lg border border-current px-3 py-2 font-semibold disabled:opacity-50">
                        {ar ? "تحقق من حالة الدخول" : "Check sign-in status"}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="auth-username" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {mode === "login" ? ar ? "اسم المستخدم أو البريد الإلكتروني" : "Username or email" : ar ? "اسم المستخدم" : "Username"}
              </label>
              <div className="relative">
                <UserCircle2
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === "login" ? "name or email@example.com" : ar ? "اختر اسم مستخدم" : "Choose a username"}
                  required
                  minLength={mode === "signup" ? 3 : undefined}
                  maxLength={mode === "signup" ? 32 : 254}
                  pattern={mode === "signup" ? "[A-Za-z0-9._-]{3,32}" : undefined}
                  autoComplete="username"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    <label htmlFor="auth-email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {ar ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        maxLength={254}
                        autoComplete="email"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {ar ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={ar ? "أدخل كلمة المرور" : "Enter your password"}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  maxLength={72}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
                  aria-label={showPassword ? ar ? "إخفاء كلمة المرور" : "Hide password" : ar ? "إظهار كلمة المرور" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="text-xs font-medium leading-5 text-zinc-500 dark:text-zinc-400">
                  {ar ? "8 أحرف على الأقل مع حرف إنجليزي ورقم؛ الحد الأقصى 72 بايت UTF-8." : "Use at least 8 characters with a letter and a number; maximum 72 UTF-8 bytes."}
                </p>
              )}
            </div>

            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p id="auth-profile-label" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {ar ? "نوع المستخدم" : "Profile"}
                      </p>
                      <div role="group" aria-labelledby="auth-profile-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {STUDENT_TYPES.map((type, index) => (
                          <button
                            key={type.value}
                            type="button"
                            aria-pressed={studentType === type.value}
                            onClick={() => setStudentType(type.value)}
                            className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition ${
                              studentType === type.value
                                ? "border-[#E0182D] bg-[#E0182D] text-white shadow-sm"
                                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
                            }`}
                          >
                            {ar ? ["زائر / ولي أمر", "متقدم للدراسة", "طالب حالي في الجامعة", "خريج"][index] : type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence>
                      {needsMajor && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            <label htmlFor="auth-major" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              {ar ? "الكلية / التخصص" : "College / Major"}
                            </label>
                            <div className="relative">
                              <GraduationCap
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                              />
                              <input
                                id="auth-major"
                                type="text"
                                value={major}
                                onChange={(e) => setMajor(e.target.value)}
                                placeholder={ar ? "تقنية المعلومات، الطب، القانون…" : "IT, Medicine, Law..."}
                                maxLength={80}
                                className={`${inputClass} pl-10`}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={closeBlocked}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E0182D] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-rose-900/30"
            >
              {loading ? (
                <span className="animate-pulse">
                  {mode === "login" ? ar ? "جارٍ تسجيل الدخول…" : "Signing in..." : ar ? "جارٍ إنشاء الحساب…" : "Creating account..."}
                </span>
              ) : (
                <>
                  {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                  {mode === "login" ? copy.signIn : copy.create}
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </dialog>
  );
}
