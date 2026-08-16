"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CaretLeft,
  Copy,
  SignOut,
  Sliders,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Nest, OccupantGrid, RoomStatus, Transcript } from "@/components/co-channel/room";
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

  const tunedTo = useRadio((s) => s.tunedTo);
  const room = useRadio((s) => s.room);
  const transcript = useRadio((s) => s.transcript);
  const tuneIn = useRadio((s) => s.tuneIn);
  const tuneOut = useRadio((s) => s.tuneOut);
  const listening = useRadio((s) => s.listening);
  const audioBlocked = useRadio((s) => s.audioBlocked);
  const setListening = useRadio((s) => s.setListening);
  const resumeAudio = useRadio((s) => s.resumeAudio);

  const { data: preview, loading, error } = useFetch<RoomResponse>(`/api/co-channels/${id}`);

  /* Tuned to this one, not in it. The receiver itself runs in the app shell
     so the station keeps playing when you look at something else. */
  const listeningHere = tunedTo === id;
  const view = listeningHere && room ? room : preview;

  /* The room empties before the route changes, so tuning out is something you
     watch happen rather than a page that vanishes. */
  const [leaving, setLeaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!view) return;
    const update = () => setElapsed(elapsedSince(view.startedAt));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [view]);

  const handleTuneIn = async () => {
    if (!(await tuneIn(id))) {
      toast.error("That station has closed", {
        description: "Its last occupant left, so the frequency is free again.",
      });
      return;
    }
    toast.success("Tuned in", { description: "You are listening, not talking." });
  };

  const LEAVE_MS = 260;
  const handleTuneOut = async () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      setLeaving(true);
      await new Promise((r) => setTimeout(r, LEAVE_MS));
    }
    tuneOut();
    setLeaving(false);
    toast("Tuned out");
  };

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
                <span className="flex items-center gap-1.5">
                  Host
                  <Identity person={view.host} className="text-xs" />
                </span>
                <span className="readout">{formatDuration(elapsed)}</span>
                <span>{view.occupantCount} in the room</span>
              </div>
            </div>

            {/* ---- controls ---- */}
            {/* Nobody is signed in, so there is no microphone to mute and no
                recording to start: what is left is the receiver. Tune in,
                turn the sound down, take the link. */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {listeningHere ? (
                <>
                  {/* When the browser has refused to start audio the control
                      says so and is the gesture that unblocks it, because a
                      silent room with no explanation reads as broken. */}
                  {view.hasAudio && (
                    <Button
                      variant={audioBlocked ? "primary" : "secondary"}
                      size="sm"
                      aria-pressed={listening && !audioBlocked}
                      onClick={() => {
                        if (audioBlocked) {
                          void resumeAudio();
                          return;
                        }
                        setListening(!listening);
                      }}
                    >
                      {audioBlocked ? (
                        <>
                          <SpeakerHigh size={15} />
                          Listen
                        </>
                      ) : listening ? (
                        <>
                          <SpeakerHigh size={15} />
                          Sound on
                        </>
                      ) : (
                        <>
                          <SpeakerSlash size={15} />
                          Sound off
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy a link to this Co-Channel"
                    onClick={copyLink}
                  >
                    <Copy />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Tune out"
                    onClick={() => void handleTuneOut()}
                  >
                    <SignOut />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleTuneIn()}
                  >
                    Tune in
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy a link to this Co-Channel"
                    onClick={copyLink}
                  >
                    <Copy />
                  </Button>
                </>
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

          {!listeningHere && (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Facepile
                people={view.occupants.map((o) => o.person)}
                max={4}
                size={22}
              />
              {/* What tuning in does and does not do, said before you press it
                  rather than in a toast afterwards. */}
              You will hear the room. Nobody in it will hear you, and you do
              not appear in the list.
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
          <OccupantGrid room={view} leaving={leaving} />
        </div>
        <div data-settle style={{ "--settle-index": 2 } as React.CSSProperties}>
          {listeningHere ? (
            <Transcript lines={transcript} />
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Tune in to follow the transcript as people talk.
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
