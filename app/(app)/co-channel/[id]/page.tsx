"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CaretLeft,
  Sliders,
} from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Nest, OccupantGrid, RoomStatus, Transcript } from "@/components/co-channel/room";
import { LiveControls, RecordedControls } from "@/components/co-channel/live-controls";
import { LiveOccupants } from "@/components/co-channel/live-occupants";
import { useLiveRoom } from "@/lib/use-live-room";
import { SidePane } from "@/components/co-channel/side-pane";
import { GateBadge } from "@/components/co-channel/card";
import { EcosystemMark, Facepile, Identity } from "@/components/identity";
import { Panel } from "@/components/instrument/parts";
import { Button } from "@/components/ui/button";
import { Help } from "@/components/ui/overlays";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/primitives";
import type { CoChannelView } from "@/data/schema";
import { GATE_HELP } from "@/lib/gates";
import { elapsedSince, formatDuration, formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";
import { coChannelTransitionName } from "@/lib/view-transition";

type RoomResponse = CoChannelView;

export default function CoChannelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const session = useRadio((s) => s.session);
  const room = useRadio((s) => s.room);
  const transcript = useRadio((s) => s.transcript);
  const connected = useRadio((s) => s.session?.connected) === true;
  const tunedTo = useRadio((s) => s.tunedTo);
  const connect = useRadio((s) => s.connect);

  const { data: preview, loading, error } = useFetch<RoomResponse>(`/api/co-channels/${id}`);

  /* A live station is a real meeting with real microphones in it. A recorded
     one already happened: there is nobody to join and something to play. */
  const isLive = preview?.kind === "live";
  const live = useLiveRoom(isLive ? id : null);

  const inThisRoom = session?.coChannelId === id;
  /* Listening is not membership. You can hear this room without a wallet and
     without appearing in it; joining is the thing that puts you in the list. */
  const listeningHere = tunedTo === id;
  const view = (inThisRoom || listeningHere) && room ? room : preview;

  /* Kept for the recorded grid's stagger, which still animates in. */
  const leaving = false;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!view) return;
    const update = () => setElapsed(elapsedSince(view.startedAt));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [view]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/co-channel/${id}`,
    );
    toast.success("Link copied");
  };

  if (error) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          This Co-Channel has closed
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-balance text-muted-foreground">
          The last person left, so the room stopped existing and its frequency
          went back into the pool.
        </p>
        <Button variant="primary" size="sm" className="mt-6" onClick={() => router.push("/")}>
          See what else is on air
        </Button>
      </div>
    );
  }

  if (loading && !view) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!view) return null;

  /* A gated room is described rather than judged now: holdings belong to a
     wallet and this app does not read them, so the badge says what the door
     asks for and the door itself answers when you try it. */
  const locked = false;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="-ml-2"
        >
          <CaretLeft size={14} />
          On air
        </Button>

        {/* ---- header ---- */}
        {/* Claims the same name the card or dock had, so the room does not
            replace them: it is what they turn into. */}
        <Panel
          className="panel-raised p-4 sm:p-5"
          style={
            { viewTransitionName: coChannelTransitionName(view.id) } as React.CSSProperties
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* A real basis, not `flex-1` alone. With `flex: 1 1 0%` this
                column never contributes enough width to push the controls
                onto a line of their own, so on a phone the shrink-0 controls
                keep the row and squeeze the text down to its longest word.
                Asking for 18rem makes the row overflow first, which is what
                flex-wrap is here to catch. */}
            <div className="min-w-0 flex-1 basis-72">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <RoomStatus room={view} />
                <GateBadge gate={view.primaryGate} />
                {view.primaryGate !== "open" && (
                  <Help>{GATE_HELP[view.primaryGate]}</Help>
                )}
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="readout font-display text-3xl leading-none tracking-tight">
                  {formatFrequency(view.frequency)}
                </span>
                <span className="text-xs text-muted-foreground">MHz</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <EcosystemMark ecosystem={view.ecosystem} size={12} />
                  {view.ecosystem}
                </span>
              </div>

              <h1 className="mt-1.5 font-display text-xl font-semibold leading-snug tracking-tight text-balance">
                {view.title}
              </h1>
              {view.topic && (
                <p className="mt-1 text-sm text-balance text-muted-foreground">
                  {view.topic}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  Host
                  <Identity person={view.host} className="text-xs" />
                </span>
                <span className="readout">{formatDuration(elapsed)}</span>
                <span>{view.occupantCount} in the room</span>
              </div>
            </div>

            {/* ---- controls ---- */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {isLive ? (
                <LiveControls
                  live={live}
                  connected={connected}
                  onConnect={() => {
                    void connect().then((r) => {
                      if (!r.ok) {
                        toast.error("Your wallet did not connect", {
                          description: r.error,
                        });
                      }
                    });
                  }}
                  onCopy={copyLink}
                />
              ) : (
                <RecordedControls room={view} onCopy={copyLink} />
              )}

              {/* The sidepane docks at xl; below that it is a sheet. */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Co-Channel settings"
                    className="xl:hidden"
                  >
                    <Sliders />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  tall
                  title={view.title}
                  description={`${formatFrequency(view.frequency)} MHz`}
                >
                  <SidePane room={view} />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {!inThisRoom && !locked && (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Facepile
                people={view.occupants.map((o) => o.person)}
                max={4}
                size={22}
              />
              {/* What each of the two controls does, said before either is
                  pressed rather than in a toast afterwards. */}
              {connected
                ? "Joining shows your handle and avatar to everyone here. You arrive muted. Listening shows nothing."
                : "Listening needs no wallet and shows nothing. Joining puts your handle in the room, muted."}
            </p>
          )}
        </Panel>

        {/* Everything below the header waits for the header to finish
            morphing out of the card, then arrives in reading order. The
            header is the only thing that was already on screen; letting the
            rest appear with it wastes the one movement the eye can follow.
            Timing lives in globals.css so it cannot drift from the view
            transition's own duration. */}
        <div data-settle style={{ "--settle-index": 0 } as React.CSSProperties}>
          <Nest room={view} canPost={inThisRoom} />
        </div>
        <div data-settle style={{ "--settle-index": 1 } as React.CSSProperties}>
          {isLive ? (
            <LiveOccupants live={live} canModerate={live.role === "host"} />
          ) : (
            /* Who was in it, which is history rather than a claim about now. */
            <OccupantGrid room={view} leaving={leaving} />
          )}
        </div>
        <div data-settle style={{ "--settle-index": 2 } as React.CSSProperties}>
          {/* The transcript follows the room, not your membership of it.
              Anyone listening is hearing the same words, so withholding them
              from a listener would be hiding what is already audible. */}
          {isLive ? null : view.hasAudio ? (
            <Transcript lines={transcript} />
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No recording was kept of this broadcast, so there is no
              transcript either. The frequency and who was on it are all that
              survived.
            </p>
          )}
        </div>
      </div>

      {/* Docked sidepane, at xl and above only. */}
      <aside
        data-settle
        style={{ "--settle-index": 3 } as React.CSSProperties}
        className="hidden w-[20rem] shrink-0 xl:block"
      >
        <div className="sticky top-20 rounded-lg border border-border bg-card p-4">
          <SidePane room={view} />
        </div>
      </aside>
    </div>
  );
}
