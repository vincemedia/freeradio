"use client";

import {
  Check,
  Microphone,
  MicrophoneSlash,
  Prohibit,
  UserPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar } from "@/components/identity";
import { Grille } from "@/components/instrument/parts";
import { Button } from "@/components/ui/button";
import { LevelMeter } from "@/components/instrument/level-meter";
import { useContacts, MAX_CONTACTS } from "@/lib/contacts";
import { useLevels } from "@/lib/use-levels";
import { isIdentityKey, personFromKey } from "@/lib/identity-key";
import type { Person } from "@/data/schema";
import type { LiveRoom } from "@/lib/use-live-room";
import { cn } from "@/lib/utils";

/**
 * Who is actually in the room.
 *
 * Read from the meeting rather than from a fixture, which is the whole point:
 * these faces are people whose browsers are connected right now, and the grid
 * empties when they leave because they left.
 *
 * The meters are real. Each open microphone is measured off its own track, so
 * the bars move with the voice — including your own, which is the one that
 * matters most: a new speaker's first question is always whether anybody can
 * hear them, and a portrait that answers it is worth more than any amount of
 * reassuring copy. A room where three people are unmuted shows which of the
 * three is actually talking, which is the entire reason to draw a meter
 * instead of a lamp.
 *
 * This is also the only place a contact can be made, which is deliberate: you
 * add somebody because you heard them, in the room where you heard them, and
 * there is no directory to browse instead. Listeners cannot be added — their
 * participant id is a seat rather than a person, so there would be nobody to
 * remember.
 */
/**
 * A participant as a person the avatar can draw.
 *
 * A listener has a seat rather than a key, so there is no identity to derive
 * one from: they get their participant id as the seed, which is stable for
 * that browser and belongs to nobody else. Everyone with a wallet gets the
 * same derivation the top bar uses.
 */
function personFor(p: {
  id: string;
  name: string;
  customId: string;
  picture?: string;
}): Person {
  /* The photo rides in on the token, so somebody who uploaded one is that
     picture in the room as well as in the top bar rather than reverting to a
     generated tile the moment they join. */
  if (isIdentityKey(p.customId)) {
    return personFromKey(p.customId, p.name, p.picture ?? null);
  }
  return {
    ...personFromKey(`02${"0".repeat(64)}`, p.name, p.picture ?? null),
    /* Seeded on the seat, so two anonymous listeners are two faces. */
    id: p.customId,
    publicKey: undefined,
  };
}

export function LiveOccupants({
  live,
  canModerate,
}: {
  live: LiveRoom;
  canModerate: boolean;
}) {
  const { add, has } = useContacts();
  const levels = useLevels(live);
  if (live.status !== "live") {
    return (
      <section className="relative overflow-hidden rounded-lg border border-dashed border-border p-8 text-center">
        {/* Connecting to a room takes a second or two of real work — a token,
            then a negotiation — and a line of text alone reads as a page that
            has stopped. Three dots that move say the same thing and say it is
            still happening. */}
        {live.status === "joining" && <Dots />}
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
              {/* The ring's opacity follows the voice rather than switching on
                  with the microphone, so a room of unmuted people is not a
                  wall of identical halos. It never reaches zero while the
                  microphone is open: an open one is a fact worth showing even
                  during a pause. */}
              {/* `flex`, not `block`. A block wrapper around an inline-block
                  avatar is as tall as a line box, so the ring it carried was
                  taller than the circle inside it and hung below — a stretched
                  pill rather than a halo. A flex box hugs its child. */}
              <span
                className={cn(
                  "flex rounded-full",
                  !p.muted &&
                    "ring-2 ring-[var(--ring-speaking)] ring-offset-2 ring-offset-card",
                )}
                style={
                  p.muted
                    ? undefined
                    : { opacity: 0.35 + 0.65 * (levels[p.id] ?? 0) }
                }
              >
                {/* The app's own avatar, not a tile drawn here. This used to
                    call boring-avatars directly, seeded on the full public key
                    with its own palette and no creature — so your portrait in
                    a station was a different colour and a different animal
                    from the one representing you in the top bar, six inches
                    above it. One person, one face. */}
                <Avatar person={personFor(p)} size={56} />
              </span>

              {/* The badge is the microphone's state, which is a fact; the
                  meter inside it is the voice, which is a measurement. A
                  muted person gets the crossed microphone and no meter,
                  because there is nothing to measure. */}
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 z-10 flex items-center justify-center rounded-full border-2 border-card",
                  p.muted ? "size-5 bg-muted text-muted-foreground" : "h-5 w-[26px] bg-card",
                )}
                title={p.muted ? "Muted" : "Microphone open"}
              >
                {p.muted ? (
                  <MicrophoneSlash size={10} weight="fill" />
                ) : (
                  <LevelMeter level={levels[p.id] ?? 0} className="h-3.5" />
                )}
                <span className="sr-only">
                  {p.muted ? "Muted" : "Microphone open"}
                </span>
              </span>
            </span>

            <span className="w-full min-w-0">
              <span className="block truncate text-[13px] font-medium">
                {p.isSelf ? "You" : p.name}
              </span>
            </span>

            {/* Adding somebody is available to everybody, moderating is not,
                so the two sit on one row and the row is not the host's. */}
            {!p.isSelf && (
              <span className="flex items-center gap-1">
                {isIdentityKey(p.customId) &&
                  (has(p.customId) ? (
                    <span
                      className="flex size-7 items-center justify-center text-muted-foreground"
                      title={`${p.name} is in your contacts`}
                    >
                      <Check size={13} weight="bold" />
                      <span className="sr-only">In your contacts</span>
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Add ${p.name} to contacts`}
                      onClick={() => {
                        const ok = add({ key: p.customId, name: p.name });
                        if (ok) {
                          toast.success(`${p.name} added to contacts`, {
                            description:
                              "You will see them in People you know when they are on air.",
                          });
                        } else {
                          toast.error("Your contacts are full", {
                            description: `Remove somebody first — the list holds ${MAX_CONTACTS}.`,
                          });
                        }
                      }}
                    >
                      <UserPlus size={13} />
                    </Button>
                  ))}
                {canModerate && (
                  <>
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
                  </>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Three dots, taking turns.
 *
 * Staggered by a third of the cycle each so the motion travels rather than
 * pulsing together — a row that breathes in unison reads as decoration, and a
 * row that moves left to right reads as progress. Still under
 * `prefers-reduced-motion`, where the dots stay put and the sentence carries
 * the message on its own.
 */
function Dots() {
  return (
    <span aria-hidden className="mb-2.5 flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground/70 motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 140}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  );
}
