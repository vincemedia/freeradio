"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowSquareOut,
  Crown,
  LinkSimple,
  Microphone,
  MicrophoneSlash,
  Plus,
} from "@phosphor-icons/react";
import { Avatar, Identity } from "@/components/identity";
import { PersonCard } from "@/components/person-card";
import { Grille, Lamp, SpeakingRing } from "@/components/instrument/parts";
import { LevelMeter } from "@/components/instrument/level-meter";
import { Button } from "@/components/ui/button";
import { Help } from "@/components/ui/overlays";
import { Badge, Input } from "@/components/ui/primitives";
import type { CoChannelView, TranscriptLineView } from "@/data/schema";
import { formatClock } from "@/lib/format";
import { useSpeakingLevel } from "@/lib/use-level";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * The Nest.
 *
 * Links people put up while talking, above the occupant grid, because a link
 * mentioned out loud is useless unless it is somewhere you can reach without
 * interrupting. Newest first: the one just mentioned is the one you want.
 */
export function Nest({
  room,
  canPost,
}: {
  room: CoChannelView;
  canPost: boolean;
}) {
  const postNestLink = useRadio((s) => s.postNestLink);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await postNestLink(url, title);
    if (ok) {
      toast.success("Pinned to the nest");
      setUrl("");
      setTitle("");
      setAdding(false);
    } else {
      toast.error("That is not a link this room can open");
    }
  };

  if (room.nest.length === 0 && !canPost) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Nest
          <Help>Links anyone in the room pinned while talking</Help>
        </h2>
        {canPost && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
          >
            <Plus size={14} />
            Pin a link
          </Button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row"
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            aria-label="Link address"
            type="url"
            required
            className="h-10 sm:flex-1"
          />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is it?"
            aria-label="Link title"
            className="h-10 sm:flex-1"
          />
          <Button type="submit" variant="primary" size="sm" className="shrink-0">
            Pin
          </Button>
        </form>
      )}

      {room.nest.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {room.nest.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LinkSimple
                  size={15}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {link.title}
                  </span>
                  {/* The site sits next to the title, not floating elsewhere. */}
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {link.site} · pinned by @
                    {link.postedBy.username ?? link.postedBy.handle}
                  </span>
                </span>
                <ArrowSquareOut
                  size={13}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The occupant grid.
 *
 * Everybody in the room, all the time, with their mute state showing whether
 * you hover or not. There is no anonymous listening in this product, so this
 * grid is the complete membership and not a sample of it.
 *
 * The ring around whoever is speaking thickens rather than changing colour, so
 * the signal survives for somebody who cannot separate yellow from grey.
 */
export function OccupantGrid({
  room,
  leaving = false,
}: {
  room: CoChannelView;
  /** reverses the stagger and runs it faster, on the way out */
  leaving?: boolean;
}) {
  const speakingId = useRadio((s) => s.speakingId);
  const me = useRadio((s) => s.session?.me.id);
  const count = room.occupants.length;
  /* One meter reading for the grid: exactly one person speaks at a time, so
     six hooks would be five of them idling. */
  const level = useSpeakingLevel(speakingId !== null, {
    stationId: room.hasAudio ? room.id : undefined,
  });

  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-card">
      <Grille className="absolute inset-0 opacity-70" />
      <ul className="relative grid grid-cols-3 gap-x-2 gap-y-5 p-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {room.occupants.map((o, i) => {
          const speaking = speakingId === o.personId;
          /* The room fills in reading order and empties in reverse, so
             arriving reads as the room assembling and leaving as it packing
             up. Exits are quicker than entrances, per DESIGN.md: going should
             feel lighter than coming. */
          const delay = leaving ? (count - 1 - i) * 18 : i * 28;
          return (
            /* min-w-0: a grid item defaults to min-width:auto, so without it
               the identity line sets the track width and the columns collide
               instead of truncating. */
            <li
              key={o.id}
              style={{ animationDelay: `${delay}ms` }}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1.5 text-center fill-mode-both ease-out-quint",
                leaving
                  ? "animate-out fade-out zoom-out-95 duration-200"
                  : "animate-in fade-in zoom-in-95 duration-300",
              )}
            >
              <span className="relative">
                <SpeakingRing speaking={speaking}>
                  <Avatar person={o.person} size={56} />
                </SpeakingRing>

                {/* Mute state, for every occupant, always. While somebody is
                    speaking the badge becomes their level, since a microphone
                    icon and a meter say the same thing and only one of them
                    says how loudly. */}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 z-10 flex items-center justify-center rounded-full border-2 border-card transition-[width] duration-150",
                    speaking ? "h-5 w-[26px] bg-card" : "size-5",
                    !speaking &&
                      (o.muted
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground"),
                  )}
                  title={o.muted ? "Muted" : speaking ? "Speaking" : "Unmuted"}
                >
                  {speaking ? (
                    <LevelMeter level={level} className="h-3.5" />
                  ) : o.muted ? (
                    <MicrophoneSlash size={10} weight="fill" />
                  ) : (
                    <Microphone size={10} weight="fill" />
                  )}
                  <span className="sr-only">
                    {o.muted ? "Muted" : speaking ? "Speaking" : "Unmuted"}
                  </span>
                </span>

                {o.role === "host" && (
                  <span
                    className="absolute -left-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full border-2 border-card bg-foreground text-background"
                    title="Host"
                  >
                    <Crown size={10} weight="fill" />
                    <span className="sr-only">Host</span>
                  </span>
                )}
              </span>

              <PersonCard person={o.person} className="w-full">
                <span className="block w-full min-w-0">
                  <span className="block truncate text-[13px] font-medium leading-tight">
                    {o.personId === me ? "You" : o.person.name}
                  </span>
                  <Identity
                    person={o.person}
                    className="justify-center text-[10px] leading-tight"
                  />
                </span>
              </PersonCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The transcript.
 *
 * Below the occupant grid, with the speaker's portrait in front of each line.
 * It scrolls itself and follows the newest line, but only while the reader is
 * already at the bottom: yanking somebody back down while they are reading
 * something further up is the fastest way to make a transcript useless.
 */
export function Transcript({ lines }: { lines: TranscriptLineView[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Transcript
        <Help>Written down as people talk, and kept only if the room records</Help>
      </h2>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="max-h-[22rem] space-y-3 overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-4"
      >
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nobody has said anything yet.
          </p>
        ) : (
          lines.map((line) => (
            <article key={line.id} className="flex gap-2.5">
              {/* The portrait in front of the line, as the brief asks, and the
                  name opens the card so you can reach whatever room they are
                  in without leaving this one. */}
              <Avatar person={line.person} size={26} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <PersonCard person={line.person}>
                    <span className="truncate text-[13px] font-medium">
                      {line.person.name}
                    </span>
                  </PersonCard>
                  <span className="readout shrink-0 text-[10px] text-muted-foreground">
                    {formatClock(line.at)}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                  {line.text}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

/**
 * What the room is doing.
 *
 * One state, not two. A room you are looking at is on air by definition, so
 * saying so beside a recording lamp is two reds carrying one fact. Recording
 * is the state that actually varies, so it takes the red and the pulse, and
 * a room that is merely live says so in words.
 */
export function RoomStatus({ room }: { room: CoChannelView }) {
  if (room.recording) {
    return (
      <Badge variant="signal" className="gap-1">
        <span aria-hidden className="lamp-pulse size-1.5 rounded-full bg-current" />
        Recording
      </Badge>
    );
  }
  return <Lamp state="on-air" label="On air" showLabel />;
}
