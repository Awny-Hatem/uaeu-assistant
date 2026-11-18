"use client";

import dynamic from "next/dynamic";
import { ChatLoadBoundary } from "@/components/ChatLoadBoundary";

function ChatLoadingFallback() {
  return (
    <div role="status" aria-live="polite" className="flex h-full w-full items-center justify-center bg-zinc-50 text-zinc-600">
      <div className="flex flex-col items-center gap-3">
        <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-[#E0182D]" />
        <p className="text-sm font-medium">Loading UAEU Assistant…</p>
      </div>
    </div>
  );
}

// Disable SSR for the chat surface because session and local quota state hydrate in the browser.
const UniversityChat = dynamic(
  () => import("@/components/UniversityChat").then((module) => module.UniversityChat),
  { ssr: false, loading: ChatLoadingFallback },
);

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
      <ChatLoadBoundary>
        <UniversityChat />
      </ChatLoadBoundary>
    </main>
  );
}
