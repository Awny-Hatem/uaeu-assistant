"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Send, UserCircle, Bot, HeadphonesIcon, Globe, LibraryBig, Search, Settings2 } from "lucide-react";

type Role = "user" | "assistant";

type UiMessage = { 
  id: string; 
  role: Role; 
  content: string; 
  escalated?: boolean;
  source?: "web" | "rag" | "faq" | "error"; 
};

type LocalePref = "auto" | "ar" | "en";

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useLoadingText(isLoading: boolean) {
  const [text, setText] = useState("Checking internal UAEU database...");
  
  useEffect(() => {
    if (!isLoading) {
      setText("Checking internal UAEU database...");
      return;
    }
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
  // We skip "welcome" state entirely because profile settings are now in the Sidebar
  const [locale, setLocale] = useState<LocalePref>("auto");
  const [studentType, setStudentType] = useState<string>("Visitor");
  const [major, setMajor] = useState<string>("");
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingText = useLoadingText(loading);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  
  const [banner, setBanner] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: id(),
          role: "assistant",
          content: `Welcome to the official **UAEU Digital Assistant**. As a ${studentType}${major ? ` studying ${major}` : ''}, how can I help you today? \n\n*I prioritize official policies first, but can search the live web for missing info.*`,
        },
      ]);
    }
  }, [studentType, major, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loadingText]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: UiMessage = { id: id(), role: "user", content: trimmed };
    const nextThread = [...messages, userMsg];
    setInput("");
    setBanner(null);
    setMessages(nextThread);
    setLoading(true);

    const payload = {
      locale,
      userContext: { studentType, major: major.trim() },
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
        setMessages((m) => [
          ...m,
          {
            id: id(),
            role: "assistant",
            content: "Network or proxy issue. Please try again.",
          },
        ]);
        return;
      }

      if (data.content) {
        setMessages((m) => [
          ...m, 
          { 
            id: id(), 
            role: "assistant", 
            content: data.content,
            escalated: data.source === "escalated",
            source: data.source
          }
        ]);
      }
    } catch {
      setBanner("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, locale, messages, studentType, major]);

  return (
    <div className="flex w-full h-full text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900">
      
      {/* LEFT SIDEBAR (Hidden on tiny mobile phones, full width sidebar on desktop) */}
      <div className="hidden md:flex flex-col w-72 lg:w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 h-full shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_8px_-4px_rgba(0,0,0,0.5)] z-10 shrink-0">
        
        {/* Massive Logo Header */}
        <div className="flex flex-col items-start justify-center p-8 pb-4 shrink-0 w-full">
          {/* The actual downloaded Logo.png without a box */}
          <img 
            src="/Logo.png" 
            alt="UAEU Chatbot Logo" 
            className="w-full max-w-[220px] object-contain transition hover:scale-105 duration-300"
          />
        </div>

        {/* User Profile Settings */}
        <div className="flex-1 overflow-y-auto w-full p-6 py-8">
          <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-stone-500 dark:text-stone-400 mb-6 px-1">
            <Settings2 size={16} strokeWidth={2.5} />
            Study Profile
          </div>

          <div className="space-y-6">
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Classification</label>
              <select 
                value={studentType} 
                onChange={e => setStudentType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-[13px] font-medium text-zinc-800 dark:text-zinc-200 shadow-sm focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 outline-none transition"
              >
                <option value="Visitor">Visitor / Parent</option>
                <option value="Applicant">Prospective Applicant</option>
                <option value="Current Student">Current UAEU Student</option>
                <option value="Alumni">Alumni</option>
              </select>
            </div>
            
            <AnimatePresence>
              {(studentType === "Current Student" || studentType === "Applicant") && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }} 
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="space-y-2.5 overflow-hidden"
                 >
                   <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">College / Major</label>
                   <input 
                     type="text" 
                     value={major}
                     onChange={e => setMajor(e.target.value)}
                     placeholder="e.g. IT, Law, Medicine..."
                     className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-[13px] font-medium text-zinc-800 dark:text-zinc-200 shadow-sm focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 outline-none transition"
                   />
                 </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Language</label>
              <select 
                value={locale} 
                onChange={e => setLocale(e.target.value as LocalePref)}
                className="w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-[13px] font-medium text-zinc-800 dark:text-zinc-200 shadow-sm focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 outline-none transition"
              >
                <option value="auto">Auto-detect based on chat</option>
                <option value="en">English (إنجليزي)</option>
                <option value="ar">Arabic (عربي)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Bottom spacer */}
        <div className="h-6 shrink-0"></div>
      </div>

      {/* RIGHT CHAT AREA (Full screen remaining width) */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#111111] overflow-hidden relative">
        
        {/* Mobile Header (Only visible on small screens where sidebar is hidden) */}
        <header className="md:hidden flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 shrink-0 shadow-sm z-10">
          <img src="/Logo.png" alt="UAEU Chatbot" className="h-8 object-contain" />
          <UserCircle size={20} className="text-zinc-400" />
        </header>

        {banner && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100 text-center shrink-0">
            {banner}
          </motion.div>
        )}

        {/* Scaled-up massive chat history scroll space */}
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
                {/* Avatar icons updated for giant landscape */}
                <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' : 'bg-stone-50 dark:bg-[#161616] text-stone-700 dark:text-stone-300 shadow-sm border border-stone-200 dark:border-stone-800'}`}>
                  {m.role === 'user' ? <UserCircle size={20} /> : <LibraryBig size={18} strokeWidth={2.5} />}
                </div>
                
                <div className={`flex flex-col gap-2 flex-max-w ${m.role === "user" ? "items-end" : "items-start w-[85%]"}`}>
                  {/* Chat message styling */}
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
                        
                        // Parse out "Source: <text>" or "[Source: <text>]" from the very end of the AI's response
                        const sourceRegex = /(?:(?:\n|<br>|\|\s*)?\[?(?:Source|المصدر|source):\s*(.+?)\]?)$/i;
                        const match = displayContent.match(sourceRegex);
                        if (match && match.index !== undefined) {
                          // Clean up any trailing markdown links from the source text
                          extractedSource = match[1].trim().replace(/\]\(.*?\)$/, '');
                          displayContent = displayContent.substring(0, match.index).trim();
                          
                          // Remove any extra trailing ']' or '[' if the regex missed it
                          displayContent = displayContent.replace(/[\n\s\]\[]+$/, "");
                        }

                        return (
                          <div className="flex flex-col gap-3">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {displayContent}
                            </ReactMarkdown>
                            
                            {/* Render the extracted source as a clean UI pill if found */}
                            {extractedSource && (
                              <div className="mt-1 flex flex-col items-start gap-2">
                                <button 
                                  onClick={() => {
                                    setExpandedSources((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(m.id)) next.delete(m.id);
                                      else next.add(m.id);
                                      return next;
                                    });
                                  }}
                                  className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                >
                                  <LibraryBig size={11} className="text-blue-500 dark:text-blue-400" />
                                  Sources
                                </button>

                                {/* Expanded Source Information Area */}
                                <AnimatePresence>
                                  {expandedSources.has(m.id) && (
                                    <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
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
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="mt-2 ml-6"
                    >
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

        {/* Vast, anchored text input field mimicking ChatGPT standard layout */}
        <div className="w-full bg-gradient-to-t from-white via-white to-white/0 dark:from-[#111111] dark:via-[#111111] dark:to-[#111111]/0 pt-6 pb-6 lg:pb-8 px-4 sm:px-12 lg:px-24 shrink-0 absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            <textarea
              className="min-h-[64px] max-h-[200px] w-full resize-none rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] px-6 py-4.5 pr-16 text-[1.05rem] font-medium text-zinc-900 dark:text-zinc-50 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10 placeholder-zinc-400 dark:placeholder-zinc-500"
              style={{ paddingTop: "1.1rem" }}
              rows={1}
              placeholder="Ask me anything about UAEU..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
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
        
        {/* Spacer to prevent text area overlapping content */}
        <div className="h-32 shrink-0"></div>
      </div>
    </div>
  );
}
