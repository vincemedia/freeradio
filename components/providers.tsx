"use client";

import { IconContext } from "@phosphor-icons/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LiveRoomProvider } from "@/components/live-room-provider";

/**
 * One icon weight for the whole product, set once.
 *
 * Mixing weights on a screen is the fastest way to make an instrument look
 * assembled from parts, which is the opposite of the point.
 */
const ICONS = { weight: "regular" as const, size: 18 };

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <IconContext.Provider value={ICONS}>
        {/* Above the router, so the room you are in survives looking at
            another page. */}
        <LiveRoomProvider>{children}</LiveRoomProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-md !border !border-border !bg-card !text-foreground !shadow-[var(--shadow-overlay)] !font-body",
              description: "!text-muted-foreground",
            },
          }}
        />
      </IconContext.Provider>
    </ThemeProvider>
  );
}
