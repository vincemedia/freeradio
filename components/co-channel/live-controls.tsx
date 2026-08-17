"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Microphone,
  MicrophoneSlash,
  Record,
  SignOut,
  WarningCircle,
} from "@phosphor-icons/react";
import { BedPicker } from "@/components/co-channel/bed-picker";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import type { BedControl } from "@/lib/use-bed";
import type { LiveRoom } from "@/lib/use-live-room";
import type { CoChannelView } from "@/data/schema";
import { PlayButton } from "@/components/co-channel/play-button";

/**
 * The controls for a station that is actually on air.
 *
 * Four states, and they are genuinely different rather than variations of a
 * button label: you have not joined; you are in and muted; you are in and
 * transmitting; the browser will not give you a microphone.
 *
 * The microphone is the only primary here. Everything else — leaving, copying
 * a link, recording — is secondary, because in a room the one thing you are
 * deciding, over and over, is whether to be heard.
 *
 * On a phone the labelled ones lose their labels. A host has the most controls
 * of anybody — microphone, music, record, copy, leave — and five labelled
 * buttons do not fit across a phone; they wrapped onto a second row that
 * pushed the room down the page, or ran off the edge. The icons are the ones
 * everybody already knows from every other call they have been in, and the
 * label survives as the accessible name, so nothing is lost but the width.
 */
export function LiveControls({
  live,
  bed,
  connected,
  onConnect,
  onCopy,
}: {
  live: LiveRoom;
  bed: BedControl;
  connected: boolean;
  onConnect: () => void;
  onCopy: () => void;
}) {
  if (live.status !== "live") {
    return (
      <>
        {connected ? (
          <Button
            variant="primary"
            size="sm"
            disabled={live.status === "joining"}
            onClick={() => void live.join()}
          >
            {live.status === "joining" ? "Joining" : "Join"}
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={onConnect}>
            Connect to join
          </Button>
        )}

        {/* Listening without a wallet is a real state, not a lesser one: the
            token minted for it cannot transmit at all. */}
        {!connected && (
          <Button variant="secondary" size="sm" onClick={() => void live.join()}>
            Listen
          </Button>
        )}

        {live.status === "unavailable" && (
          <Tooltip label={live.error ?? "This station is not reachable"}>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <WarningCircle size={14} />
              Unreachable
            </span>
          </Tooltip>
        )}

        <Button variant="ghost" size="icon-sm" aria-label="Copy link" onClick={onCopy}>
          <Copy />
        </Button>
      </>
    );
  }

  return (
    <>
      {live.role === "listener" ? (
        <Tooltip label="Connect a wallet to speak here">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground">
            <MicrophoneSlash size={15} />
            <span className="max-sm:hidden">Listening</span>
          </span>
        </Tooltip>
      ) : (
        <Button
          variant={live.micOn ? "primary" : "secondary"}
          size="sm"
          aria-pressed={live.micOn}
          aria-label={live.micOn ? "Mute yourself" : "Unmute yourself"}
          onClick={() => void live.toggleMic()}
          className="max-sm:w-9 max-sm:px-0"
        >
          {live.micOn ? (
            <>
              <Microphone size={15} />
              <span className="max-sm:hidden">Live</span>
            </>
          ) : (
            <>
              <MicrophoneSlash size={15} />
              <span className="max-sm:hidden">Unmute</span>
            </>
          )}
        </Button>
      )}

      {/* A refused microphone is the browser's decision and cannot be undone
          from here, so it is said plainly rather than retried silently. */}
      {live.micDenied && (
        <Tooltip label="Your browser refused the microphone. Allow it in the address bar, then unmute.">
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <WarningCircle size={14} />
            No microphone
          </span>
        </Tooltip>
      )}

      {/* Next to Record, because both are things only the host can do to the
          room rather than to themselves. */}
      {live.role === "host" && <BedPicker control={bed} />}

      {live.role === "host" && <RecordButton live={live} />}

      <Button variant="ghost" size="icon-sm" aria-label="Copy link" onClick={onCopy}>
        <Copy />
      </Button>

      <Button variant="ghost" size="icon-sm" aria-label="Leave" onClick={live.leave}>
        <SignOut />
      </Button>
    </>
  );
}

/**
 * The controls for a broadcast that already happened.
 *
 * There is nothing to join and nobody to talk to, so the only action is to
 * play it — and where the recording was not kept, to say so rather than
 * offering a control that would do nothing.
 */
export function RecordedControls({
  room,
  autoPlay,
  onCopy,
}: {
  room: CoChannelView;
  autoPlay?: boolean;
  onCopy: () => void;
}) {
  return (
    <>
      <PlayButton
        src={room.hasAudio ? `/api/co-channels/${room.id}/audio` : undefined}
        title={room.title}
        labelled
        autoPlay={autoPlay}
      />
      <Button variant="ghost" size="icon-sm" aria-label="Copy link" onClick={onCopy}>
        <Copy />
      </Button>
    </>
  );
}

/**
 * Start and stop the recording, with the three seconds in between.
 *
 * ## The countdown is real
 *
 * Not a flourish. The terms promise that recording is announced, and the lamp
 * in the header does that from the moment it starts — but "from the moment it
 * starts" is too late for the sentence somebody was already halfway through.
 * Three seconds is long enough to stop talking and not long enough to be a
 * ceremony, and everybody in the room is told, not only the host: being
 * recorded without notice is the exact thing the terms say will not happen,
 * and the host is the one person who does not need telling.
 *
 * ## The spinner
 *
 * Starting a recording is a round trip to Cloudflare and takes a visible
 * moment. A button that looks identical before and during that moment invites
 * a second press, which is how you get two recordings of one conversation. So
 * it spins from the click until the state actually settles, and refuses to be
 * pressed again while it does.
 */
function RecordButton({ live }: { live: LiveRoom }) {
  const [counting, setCounting] = useState(0);
  const busy = counting > 0 || live.recordingPending;

  const start = () => {
    const id = toast.loading("Recording starts in 3…", {
      description: "Everybody in the room has been told.",
    });

    /* Announced to the room over the same channel the bed uses, so the other
       people get the warning rather than only the person who caused it. */
    live.meeting?.participants
      .broadcastMessage("recording-countdown", { from: 3 })
      .catch(() => {});

    setCounting(3);
    let left = 3;
    const tick = setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCounting(left);
        toast.loading(`Recording starts in ${left}…`, { id });
        return;
      }
      clearInterval(tick);
      setCounting(0);
      toast.success("Recording", {
        id,
        description: "The lamp in the header stays on the whole time.",
      });
      void live.toggleRecording().catch(() => {
        toast.error("Recording did not start", { id });
      });
    }, 1000);
  };

  const stop = () => {
    void live.toggleRecording().then(
      () => toast("Recording stopped"),
      () => toast.error("Could not stop the recording"),
    );
  };

  return (
    <Button
      variant={live.recording ? "destructive" : "secondary"}
      size="sm"
      disabled={busy}
      aria-pressed={live.recording}
      aria-label={live.recording ? "Stop recording" : "Start recording"}
      onClick={live.recording ? stop : start}
      className="max-sm:w-9 max-sm:px-0"
    >
      {busy ? (
        <Spinner size={15} />
      ) : (
        <Record size={15} weight={live.recording ? "fill" : "regular"} />
      )}
      <span className="max-sm:hidden">
        {counting > 0 ? counting : live.recordingPending ? "…" : live.recording ? "Stop" : "Record"}
      </span>
    </Button>
  );
}

/**
 * The countdown, for everybody who did not press the button.
 *
 * Mounted with the room rather than with the control, because the people who
 * need this warning are precisely the ones with no record button on screen.
 */
export function RecordingWarning({ live }: { live: LiveRoom }) {
  useEffect(() => {
    const meeting = live.meeting;
    if (!meeting || live.role === "host") return;

    const onMessage = ({ type }: { type: string }) => {
      if (type !== "recording-countdown") return;
      toast.warning("This station is about to be recorded", {
        description: "Starting in a few seconds. Leave now if you would rather not be.",
        duration: 6000,
      });
    };

    meeting.participants.on("broadcastedMessage", onMessage);
    return () => {
      meeting.participants.off("broadcastedMessage", onMessage);
    };
  }, [live.meeting, live.role]);

  return null;
}
