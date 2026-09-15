"use client";

import dynamic from "next/dynamic";

// Disable SSR for the chat surface because session and local quota state hydrate in the browser.
const UniversityChat = dynamic(
  () => import("@/components/UniversityChat").then((module) => module.UniversityChat),
  { ssr: false },
);

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      <UniversityChat />
    </main>
  );
}
