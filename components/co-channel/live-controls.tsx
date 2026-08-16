"use client";

import {
  Copy,
  Microphone,
  MicrophoneSlash,
  Record,
  SignOut,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays";
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
 */
export function LiveControls({
  live,
  connected,
  onConnect,
  onCopy,
}: {
  live: LiveRoom;
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
            Listening
          </span>
        </Tooltip>
      ) : (
        <Button
          variant={live.micOn ? "primary" : "secondary"}
          size="sm"
          aria-pressed={live.micOn}
          onClick={() => void live.toggleMic()}
        >
          {live.micOn ? (
            <>
              <Microphone size={15} />
              Live
            </>
          ) : (
            <>
              <MicrophoneSlash size={15} />
              Unmute
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

      {live.role === "host" && (
        <Button
          variant={live.recording ? "destructive" : "secondary"}
          size="sm"
          aria-pressed={live.recording}
          onClick={() => void live.toggleRecording()}
        >
          <Record size={15} weight={live.recording ? "fill" : "regular"} />
          {live.recording ? "Stop" : "Record"}
        </Button>
      )}

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
