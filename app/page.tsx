"use client";

import dynamic from "next/dynamic";

// Disable SSR for the entire chat component.
// Why: The auth check (useEffect → fetch /api/auth/session) only runs on the client,
// so the server HTML will always differ from the first client render, causing
// React hydration mismatch warnings. Skipping SSR avoids this entirely.
const UniversityChat = dynamic(
  () => import("@/components/UniversityChat").then((m) => m.UniversityChat),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      <UniversityChat />
    </main>
  );
}
