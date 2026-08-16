"use client";

import { Microphone, MicrophoneSlash, Prohibit } from "@phosphor-icons/react";
import Avatar from "boring-avatars";
import { Grille } from "@/components/instrument/parts";
import { Button } from "@/components/ui/button";
import { LevelMeter } from "@/components/instrument/level-meter";
import type { LiveRoom } from "@/lib/use-live-room";
import { cn } from "@/lib/utils";

/**
 * Who is actually in the room.
 *
 * Read from the meeting rather than from a fixture, which is the whole point:
 * these faces are people whose browsers are connected right now, and the grid
 * empties when they leave because they left.
 *
 * The speaking indicator is the participant's real audio state, not a
 * simulation of one. It is a meter rather than a dot because a room where
 * three people are unmuted needs to show which of them is actually talking.
 */
export function LiveOccupants({
  live,
  canModerate,
}: {
  live: LiveRoom;
  canModerate: boolean;
}) {
  if (live.status !== "live") {
    return (
      <section className="relative overflow-hidden rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {live.status === "joining"
            ? "Opening the room…"
            : live.status === "unavailable"
              ? "This station is not reachable right now."
              : "Join to see who is here and to be heard yourself."}
        </p>
      </section>
    );
  }

  if (live.participants.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-lg border border-border bg-card p-8 text-center">
        <Grille className="absolute inset-0 opacity-70" />
        <p className="relative text-sm text-muted-foreground">
          Nobody else is here yet. Unmute and say something — the frequency is
          open.
        </p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-card">
      <Grille className="absolute inset-0 opacity-70" />
      <ul className="relative grid grid-cols-3 gap-x-2 gap-y-5 p-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {live.participants.map((p) => (
          <li
            key={p.id}
            className="flex min-w-0 flex-col items-center gap-1.5 text-center"
          >
            <span className="relative">
              <span
                className={cn(
                  "block rounded-full transition-shadow",
                  p.speaking && "ring-2 ring-[var(--ring-speaking)] ring-offset-2 ring-offset-card",
                )}
              >
                <Avatar
                  size={56}
                  name={p.customId}
                  variant="marble"
                  colors={["#eab300", "#cc2e1d", "#4353ff", "#16a34a", "#7c3aed"]}
                />
              </span>

              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 z-10 flex items-center justify-center rounded-full border-2 border-card",
                  p.speaking ? "h-5 w-[26px] bg-card" : "size-5",
                  !p.speaking && "bg-muted text-muted-foreground",
                )}
                title={p.muted ? "Muted" : "Speaking"}
              >
                {p.speaking ? (
                  <LevelMeter level={0.7} className="h-3.5" />
                ) : (
                  <MicrophoneSlash size={10} weight="fill" />
                )}
                <span className="sr-only">{p.muted ? "Muted" : "Speaking"}</span>
              </span>
            </span>

            <span className="w-full min-w-0">
              <span className="block truncate text-[13px] font-medium">
                {p.isSelf ? "You" : p.name}
              </span>
            </span>

            {/* Only the host sees these, and only for other people: a control
                to silence yourself already exists in the header. */}
            {canModerate && !p.isSelf && (
              <span className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Mute ${p.name}`}
                  onClick={() => void live.muteOther(p.id)}
                  disabled={p.muted}
                >
                  <Microphone size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => void live.removeOther(p.id)}
                >
                  <Prohibit size={13} />
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
