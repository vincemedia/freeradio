"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { useLive } from "@/components/live-room-provider";
import { stopTuning } from "@/lib/tuning-sound";
import { useBed } from "@/lib/use-bed";
import { SidePane } from "@/components/co-channel/side-pane";
import { GateBadge } from "@/components/co-channel/card";
import { EcosystemMark, Identity } from "@/components/identity";
import { Panel } from "@/components/instrument/parts";
import { Button } from "@/components/ui/button";
import { Help } from "@/components/ui/overlays";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/primitives";
import type { CoChannelView, TranscriptLineView } from "@/data/schema";
import { GATE_HELP } from "@/lib/gates";
import { elapsedSince, formatDuration, formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";
import { coChannelTransitionName } from "@/lib/view-transition";

type RoomResponse = CoChannelView;

export default function CoChannelPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  /* First run lands here already playing, which is the point of landing here. */
  const autoPlay = search.get("play") === "1";
  const router = useRouter();

  const connected = useRadio((s) => s.session?.connected) === true;
  const connect = useRadio((s) => s.connect);

  const { data: preview, loading, error } = useFetch<RoomResponse>(`/api/co-channels/${id}`);
  /* A recorded broadcast's words are a fact about the past, fetched once. */
  const { data: transcriptLines } = useFetch<TranscriptLineView[]>(
    preview && preview.kind === "recorded" && preview.hasAudio
      ? `/api/co-channels/${id}/transcript`
      : null,
  );

  /* A live station is a real meeting with real microphones in it. A recorded
     one already happened: there is nobody to join and something to play. */
  const isLive = preview?.kind === "live";
  const live = useLive();

  /* Opening a live station is entering it. The provider owns the meeting, so
     this is a pointer rather than a join, and leaving the page does not leave
     the room. */
  useEffect(() => {
    if (isLive && live.stationId !== id) live.enter(id);
  }, [isLive, id, live]);

  /* What plays under an empty room. The station's own choice to begin with,
     and the host's to change while it is running. */
  const bed = useBed(live, preview?.bed);

  /* Whether the meeting itself can answer for this room. */
  const inRoom = isLive && live.stationId === id && live.status === "live";

  /* Surprise me leaves the tuning noise running while this page connects, so
     the silence lands on arrival rather than on the sweep ending. Stopped
     here, on any settled outcome — being in the room, or finding out there is
     no room to be in. `lib/tuning-sound` has its own backstop for the case
     where neither ever happens. */
  useEffect(() => {
    if (
      live.status === "live" ||
      live.status === "unavailable" ||
      live.status === "error" ||
      !isLive
    ) {
      stopTuning();
    }
  }, [live.status, isLive]);

  const view = preview;

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
                {/* An open station has no host until somebody walks in, and
                    says so rather than leaving the label with nothing after
                    it. It is also the invitation: the room is yours if you
                    are the one in it. */}
                {view.host ? (
                  <span className="flex items-center gap-1.5">
                    Host
                    <Identity person={view.host} className="text-xs" />
                  </span>
                ) : (
                  <span>Open station — whoever is here runs it</span>
                )}
                <span className="readout">{formatDuration(elapsed)}</span>
                {/* The meeting outranks the fetch. Once you are connected the
                    room in front of you is the truth, and a number that came
                    back from a request a moment ago is at best a moment
                    behind — which is how somebody standing in a station was
                    told nobody was there. */}
                <span>
                  {inRoom ? live.participants.length : view.occupantCount} in
                  the room
                </span>
              </div>
            </div>

            {/* ---- controls ---- */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {isLive ? (
                <LiveControls
                  live={live}
                  bed={bed}
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
                <RecordedControls room={view} autoPlay={autoPlay} onCopy={copyLink} />
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

          {/* What pressing the control will do, before it is pressed. */}
          {isLive && live.status !== "live" && (
            <p className="mt-4 text-xs text-muted-foreground">
              {connected
                ? "You arrive muted, and your name appears to everyone in the room."
                : "Listening needs no wallet and shows nothing. Connect one to be heard."}
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
          <Nest room={view} />
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
            <Transcript lines={transcriptLines ?? []} />
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
