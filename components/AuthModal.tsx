"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, UserCircle2, GraduationCap, LogIn, UserPlus } from "lucide-react";

type AuthUser = { id: string; username: string; studentType: string; major: string | null };
type Mode = "login" | "signup";

const STUDENT_TYPES = [
  { value: "Visitor", label: "Visitor / Parent" },
  { value: "Applicant", label: "Prospective Applicant" },
  { value: "Current Student", label: "Current UAEU Student" },
  { value: "Alumni", label: "Alumni" },
];

interface AuthModalProps {
  onAuth: (user: AuthUser) => void;
  /** "page" = full-screen (legacy). "overlay" = blocking modal over the chat. */
  variant?: "page" | "overlay";
  /** Optional message shown above the form, e.g. the soft-gate explanation. */
  notice?: string;
}

export function AuthModal({ onAuth, variant = "page", notice }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studentType, setStudentType] = useState("Current Student");
  const [major, setMajor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload = mode === "login"
      ? { username, password }
      : { username, password, studentType, major: major.trim() };

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
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-100 outline-none focus:border-[#E0182D] focus:ring-2 focus:ring-[#E0182D]/20 transition placeholder-zinc-400 dark:placeholder-zinc-500";

  const needsMajor = studentType === "Current Student" || studentType === "Applicant";

  const wrapperClass =
    variant === "overlay"
      ? "fixed inset-0 z-50 flex flex-col items-center justify-center px-4 bg-zinc-900/60 backdrop-blur-sm"
      : "min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4";

  return (
    <div className={wrapperClass}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-rose-50 dark:bg-rose-950/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-stone-100 dark:bg-stone-900/20 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-zinc-200/60 dark:shadow-black/40 border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-stone-900 via-zinc-800 to-zinc-900 p-8 pb-10 flex flex-col items-center gap-4">
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IndoaXRlIi8+PC9nPjwvc3ZnPg==')] pointer-events-none" />
            <img
              src="/Logo.png"
              alt="UAEU Logo"
              className="h-16 object-contain brightness-0 invert"
            />
            <div className="text-center">
              <h1 className="text-xl font-bold text-white tracking-tight">UAEU Digital Assistant</h1>
              <p className="text-zinc-400 text-xs mt-1">Powered by official UAEU knowledge base</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "text-[#E0182D] border-b-2 border-[#E0182D]"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition ${
                mode === "signup"
                  ? "text-[#E0182D] border-b-2 border-[#E0182D]"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <UserPlus size={15} />
              Create Account
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Soft-gate notice */}
            {notice && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-medium rounded-xl px-4 py-3">
                {notice}
              </div>
            )}

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-medium rounded-xl px-4 py-3">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <UserCircle2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Sign Up Only: Profile Fields */}
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-5"
                >
                  {/* Classification */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      I am a…
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {STUDENT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setStudentType(type.value)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition text-left ${
                            studentType === type.value
                              ? "bg-[#E0182D] border-[#E0182D] text-white shadow-sm"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Major (conditional) */}
                  <AnimatePresence>
                    {needsMajor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          College / Major
                        </label>
                        <div className="relative">
                          <GraduationCap size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            type="text"
                            value={major}
                            onChange={(e) => setMajor(e.target.value)}
                            placeholder="e.g. IT, Medicine, Law..."
                            className={`${inputClass} pl-10`}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                    Your profile helps the assistant tailor responses specifically to your role and academic background.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#E0182D] hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-rose-200 dark:shadow-rose-900/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">
                  {mode === "login" ? "Signing in…" : "Creating account…"}
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

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-5">
          Official UAE University Digital Assistant · Secured Session
        </p>
      </motion.div>
    </div>
  );
}
