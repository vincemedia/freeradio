"use client";

import { usePathname, useRouter } from "next/navigation";
import { CornersOut, SpeakerHigh, SpeakerSlash, X } from "@phosphor-icons/react";
import { Facepile } from "@/components/identity";
import { Lamp } from "@/components/instrument/parts";
import { useRadio } from "@/lib/store";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  coChannelTransitionName,
  navigateWithTransition,
} from "@/lib/view-transition";

/**
 * The Co-Channel you are in, while you are looking at something else.
 *
 * Docks bottom right on desktop and full width above the safe area on mobile,
 * where a floating pill would sit under the home indicator. It carries the
 * three things you need while your attention is elsewhere: that the station
 * is still on air, who is in it, and the volume.
 *
 * Hidden on the room's own page, where it would be a duplicate of the header.
 */
export function MinimisedBar() {
  const router = useRouter();
  const pathname = usePathname();
  const room = useRadio((s) => s.room);
  const tunedTo = useRadio((s) => s.tunedTo);
  const listening = useRadio((s) => s.listening);
  const setListening = useRadio((s) => s.setListening);
  const tuneOut = useRadio((s) => s.tuneOut);

  if (!room || !tunedTo) return null;
  if (pathname === `/co-channel/${room.id}`) return null;

  /* Everybody in it, since none of them is you. */
  const others = room.occupants.map((o) => o.person);

  const href = `/co-channel/${room.id}`;
  const open = () => navigateWithTransition(() => router.push(href), href);

  return (
    <div
      /* The dock is what represents this room while you are elsewhere, so it
         owns the shared name and the room grows out of it rather than
         appearing over it. The card for the same room stands down. */
      style={
        { viewTransitionName: coChannelTransitionName(room.id) } as React.CSSProperties
      }
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md",
        "pb-[env(safe-area-inset-bottom)]",
        /* Arrives from below, the direction the room left in. */
        "animate-in slide-in-from-bottom-4 fade-in duration-250 ease-out-quint",
        "sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[28rem] sm:rounded-lg sm:border sm:pb-0 sm:shadow-[var(--shadow-overlay)]",
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          type="button"
          onClick={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Facepile people={others} max={3} size={26} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <Lamp
                state={room.recording ? "recording" : "on-air"}
                label={room.recording ? "Recording" : "On air"}
              />
              <span className="readout text-xs">
                {formatFrequency(room.frequency)}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-medium leading-tight">
              {room.title}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {/* The volume, not a microphone. Nothing of yours is going out, so
              the only sound control that means anything here is whether you
              can hear them. */}
          <button
            type="button"
            onClick={() => setListening(!listening)}
            aria-label={listening ? "Turn the sound off" : "Turn the sound on"}
            aria-pressed={listening}
            className={cn(
              "flex size-9 items-center justify-center rounded-md transition-colors",
              listening
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {listening ? <SpeakerHigh /> : <SpeakerSlash />}
          </button>
          <button
            type="button"
            onClick={open}
            aria-label="Open the Co-Channel"
            className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          >
            <CornersOut />
          </button>
          <button
            type="button"
            onClick={tuneOut}
            aria-label="Tune out"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X />
          </button>
        </div>
      </div>
    </div>
  );
}
