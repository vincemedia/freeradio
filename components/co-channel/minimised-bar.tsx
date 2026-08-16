"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  CornersOut,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from "@phosphor-icons/react";
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
 * three things you need while your attention is elsewhere: that you are still
 * on air, who is in there, and your own microphone.
 *
 * Hidden on the room's own page, where it would be a duplicate of the header.
 */
export function MinimisedBar() {
  const router = useRouter();
  const pathname = usePathname();
  const room = useRadio((s) => s.room);
  const session = useRadio((s) => s.session);
  const tunedTo = useRadio((s) => s.tunedTo);
  const toggleMute = useRadio((s) => s.toggleMute);
  const leave = useRadio((s) => s.leave);
  const tuneOut = useRadio((s) => s.tuneOut);
  const listening = useRadio((s) => s.listening);
  const setListening = useRadio((s) => s.setListening);

  if (!room || !tunedTo) return null;
  if (pathname === `/co-channel/${room.id}`) return null;

  /* Everybody but you, when there is a you. Listening without a wallet means
     nobody in this list is you, and all of them show. */
  const others = room.occupants
    .filter((o) => o.personId !== session?.me?.id)
    .map((o) => o.person);

  /* In the room, so there is a microphone of yours to switch. Merely tuned to
     it and there is not, and the control that would mean something is the
     volume instead. */
  const inThisRoom = session?.coChannelId === room.id;

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
          {inThisRoom ? (
            <button
              type="button"
              onClick={() => void toggleMute()}
              aria-label={session?.muted ? "Unmute" : "Mute"}
              aria-pressed={!session?.muted}
              className={cn(
                "flex size-9 items-center justify-center rounded-md transition-colors",
                session?.muted
                  ? "text-muted-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {session?.muted ? <MicrophoneSlash /> : <Microphone />}
            </button>
          ) : (
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
            onClick={() => (inThisRoom ? void leave() : tuneOut())}
            aria-label={inThisRoom ? "Leave the Co-Channel" : "Stop listening"}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X />
          </button>
        </div>
      </div>
    </div>
  );
}
