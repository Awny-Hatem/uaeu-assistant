"use client";

import { useEffect, useState } from "react";
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

const STUDENT_TYPES = [
  { value: "Visitor", label: "Visitor / Parent" },
  { value: "Applicant", label: "Prospective Applicant" },
  { value: "Current Student", label: "Current UAEU Student" },
  { value: "Alumni", label: "Alumni" },
];

interface AuthModalProps {
  onAuth: (user: AuthUser) => void;
  onClose?: () => void;
  initialMode?: Mode;
  title?: string;
  subtitle?: string;
}

export function AuthModal({
  onAuth,
  onClose,
  initialMode = "login",
  title = "Sign in to continue",
  subtitle = "Create an account with any email, or use a UAEU email for extended local access.",
}: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studentType, setStudentType] = useState("Current Student");
  const [major, setMajor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

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
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      onAuth(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 outline-none transition placeholder-zinc-400 focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500";

  const needsMajor =
    studentType === "Current Student" || studentType === "Applicant";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-white/85 px-4 py-4 backdrop-blur-md sm:py-6 dark:bg-zinc-950/85">
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
                onClick={onClose}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-950 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close sign in"
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
            <h1 className="mt-4 text-xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {subtitle}
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
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
              Sign In
            </button>
            <button
              type="button"
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
              Create Account
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
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {mode === "login" ? "Username or email" : "Username"}
              </label>
              <div className="relative">
                <UserCircle2
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === "login" ? "name or email@uaeu.ac.ae" : "Choose a username"}
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@uaeu.ac.ae"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  maxLength={128}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="text-xs font-medium leading-5 text-zinc-500 dark:text-zinc-400">
                  Use at least 8 characters with a letter and a number.
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Profile
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {STUDENT_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setStudentType(type.value)}
                            className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition ${
                              studentType === type.value
                                ? "border-[#E0182D] bg-[#E0182D] text-white shadow-sm"
                                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
                            }`}
                          >
                            {type.label}
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
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              College / Major
                            </label>
                            <div className="relative">
                              <GraduationCap
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                              />
                              <input
                                type="text"
                                value={major}
                                onChange={(e) => setMajor(e.target.value)}
                                placeholder="IT, Medicine, Law..."
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
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E0182D] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-rose-900/30"
            >
              {loading ? (
                <span className="animate-pulse">
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <>
                  {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                  {mode === "login" ? "Sign In" : "Create Account"}
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
