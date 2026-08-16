"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MinimisedBar } from "@/components/co-channel/minimised-bar";
import { TopBar } from "@/components/shell/top-bar";
import { startSpeaking, useRadio } from "@/lib/store";

/**
 * The shell: a top bar, a variable-width content area, and nothing else.
 *
 * There is no left column by design. The right sidepane is not here either,
 * because it belongs to a Co-Channel rather than to the app, so the room owns
 * it and every other screen gets the full width.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const refreshSession = useRadio((s) => s.refreshSession);
  const inRoom = useRadio((s) => s.session?.coChannelId);

  /* First run goes to the welcome flow.
     The check reads live state rather than a render-scoped value: this runs
     once, and at first render `onboarded` is still the pre-hydration default,
     so a captured copy would send a returning user back through onboarding. */
  useEffect(() => {
    const check = () => {
      if (!useRadio.getState().onboarded) router.replace("/welcome");
    };
    if (useRadio.persist.hasHydrated()) check();
    return useRadio.persist.onFinishHydration(check);
  }, [router]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  /* The room runs from here rather than from its own page, so the station
     keeps talking and its audio keeps playing while you look at something
     else. That is what makes the dock at the bottom true: it says you are
     still in a room, and you still are. */
  useEffect(() => {
    if (!inRoom) return;
    return startSpeaking(inRoom);
  }, [inRoom]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-28">
        {children}
      </main>
      <MinimisedBar />
    </div>
  );
}
