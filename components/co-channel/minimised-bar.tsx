"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  CornersOut,
  Microphone,
  MicrophoneSlash,
  X,
} from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Lamp } from "@/components/instrument/parts";
import { useLive } from "@/components/live-room-provider";
import type { CoChannelView } from "@/data/schema";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  coChannelTransitionName,
  navigateWithTransition,
} from "@/lib/view-transition";

/**
 * The room you are in, while you are looking at something else.
 *
 * It can finally tell the truth. The meeting is held above the router, so
 * navigating away from a station no longer ends it — you really are still in
 * the room this bar is describing, and your microphone really is still where
 * this bar says it is.
 *
 * Hidden on the room's own page, where it would duplicate the header.
 */
export function MinimisedBar() {
  const router = useRouter();
  const pathname = usePathname();
  const live = useLive();

  const { data: room } = useFetch<CoChannelView>(
    live.stationId ? `/api/co-channels/${live.stationId}` : null,
  );

  if (!live.stationId || live.status !== "live" || !room) return null;
  if (pathname === `/co-channel/${room.id}`) return null;

  const href = `/co-channel/${room.id}`;
  const open = () => navigateWithTransition(() => router.push(href), href);
  const canSpeak = live.role !== "listener";

  return (
    <div
      style={
        { viewTransitionName: coChannelTransitionName(room.id) } as React.CSSProperties
      }
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md",
        "pb-[env(safe-area-inset-bottom)]",
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
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <Lamp
                state={live.recording ? "recording" : "on-air"}
                label={live.recording ? "Recording" : "On air"}
              />
              <span className="readout text-xs">
                {formatFrequency(room.frequency)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {live.participants.length} in the room
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-medium leading-tight">
              {room.title}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {/* The real microphone, from anywhere in the app. */}
          {canSpeak && (
            <button
              type="button"
              onClick={() => void live.toggleMic()}
              aria-label={live.micOn ? "Mute" : "Unmute"}
              aria-pressed={live.micOn}
              className={cn(
                "flex size-9 items-center justify-center rounded-md transition-colors",
                live.micOn
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {live.micOn ? <Microphone /> : <MicrophoneSlash />}
            </button>
          )}
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
            onClick={live.leave}
            aria-label="Leave the Co-Channel"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X />
          </button>
        </div>
      </div>
    </div>
  );
}
