"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveRoom } from "@/lib/use-live-room";

/**
 * The part that makes the room audible.
 *
 * ## What was wrong
 *
 * Nothing played the other people. The core SDK is not a UI: it negotiates the
 * connection, hands you a `MediaStreamTrack` per participant, and stops there.
 * Cloudflare's own component library has a piece that renders the audio
 * elements, and this app deliberately does not use that library — so the
 * tracks arrived, the participant list updated, the mute badges were correct,
 * the meters moved, and not one word ever came out of anybody's speakers. Two
 * people could sit in the same room watching each other's levels rise and hear
 * silence.
 *
 * It is the kind of bug that survives a long time because every visible thing
 * says it is working. Nothing in the interface is downstream of playback, so
 * nothing in the interface could report its absence.
 *
 * ## Why it lives in the provider
 *
 * Where the meeting lives. The dock at the bottom of the screen promises that
 * you stay in a conversation while you browse the band, and audio owned by the
 * station's page would stop the moment you navigated — which is the same
 * mistake in a different medium.
 *
 * ## One element each
 *
 * Rather than mixing everybody into one graph. A per-participant element is
 * what lets the browser do its own thing with each stream — its own jitter
 * buffer, its own device routing, its own recovery when a track restarts — and
 * it means one person's connection failing is one silent person rather than a
 * silent room.
 *
 * Never your own microphone. Playing your own track back to you is a
 * howl-round, and the reason every call in the world mutes local playback.
 */
export function RoomAudio({ live }: { live: LiveRoom }) {
  const meeting = live.meeting;
  const [tracks, setTracks] = useState<{ id: string; track: MediaStreamTrack }[]>(
    [],
  );

  useEffect(() => {
    if (!meeting || live.status !== "live") {
      /* Nothing to play. The elements come down because `tracks` is keyed off
         the meeting, and a room that has ended has no participants to read —
         so the next read empties it rather than this doing it synchronously,
         which would be a setState in an effect body. */
      return;
    }

    const read = () => {
      const next: { id: string; track: MediaStreamTrack }[] = [];
      for (const p of meeting.participants.joined.toArray()) {
        /* A muted participant has no track worth attaching, and attaching a
           dead one is how you get an element stuck in a failed state. */
        if (p.audioEnabled && p.audioTrack) {
          next.push({ id: p.id, track: p.audioTrack });
        }
      }
      setTracks((current) => {
        /* Only replace when the set actually changed: re-creating an element
           for an unchanged track restarts its buffer and clips a syllable. */
        if (
          current.length === next.length &&
          current.every((c, i) => c.id === next[i].id && c.track === next[i].track)
        ) {
          return current;
        }
        return next;
      });
    };

    read();
    const EVENTS = [
      "participantJoined",
      "participantLeft",
      "audioUpdate",
    ] as const;
    for (const event of EVENTS) meeting.participants.joined.on(event, read);
    return () => {
      for (const event of EVENTS) meeting.participants.joined.off(event, read);
      /* Torn down here rather than in the branch above: a cleanup runs after
         the render that caused it, so this is not a cascade. */
      setTracks([]);
    };
  }, [meeting, live.status]);

  /* A plain container, not `sr-only`. An `<audio>` without `controls` has no
     size of its own, so there is nothing to hide — and a clipped or
     visually-hidden ancestor is exactly the sort of thing a browser is
     entitled to treat as "not really on the page". */
  return (
    <div aria-hidden>
      {tracks.map(({ id, track }) => (
        <Voice key={`${id}:${track.id}`} track={track} />
      ))}
    </div>
  );
}

/**
 * One person's voice.
 *
 * `srcObject` is set through a ref because it is a property and not an
 * attribute — React will not put a MediaStream in the DOM for you, and `src`
 * with a blob URL is the old way that breaks when the track is replaced.
 *
 * `playsInline` matters on iOS, where without it the browser is entitled to
 * take a media element fullscreen, and a fullscreen player for somebody
 * talking is not what anybody meant. `autoPlay` alone is not enough either:
 * the element is also told to play explicitly, because the attribute fires
 * once at mount and a track attached a moment later would sit paused.
 */
function Voice({ track }: { track: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const stream = new MediaStream([track]);
    el.srcObject = stream;

    /* Joining was a click, so the gesture requirement is satisfied. A refusal
       is worth retrying once on the next interaction rather than reporting:
       there is nothing the reader could do about it that they have not already
       done by being here. */
    const attempt = () => {
      void el.play().catch(() => {});
    };
    attempt();

    /* Some browsers pause a media element when a remote track is replaced
       mid-call — a device change at the other end, or a reconnect. */
    el.addEventListener("pause", attempt);
    document.addEventListener("visibilitychange", attempt);

    return () => {
      el.removeEventListener("pause", attempt);
      document.removeEventListener("visibilitychange", attempt);
      el.srcObject = null;
    };
  }, [track]);

  return <audio ref={ref} autoPlay playsInline />;
}
