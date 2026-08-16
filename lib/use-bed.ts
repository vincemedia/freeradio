"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBed, isBedId, type BedId } from "@/data/beds";
import type { LiveRoom } from "@/lib/use-live-room";

/**
 * Music under an empty room, and out of the way of a full one.
 *
 * ## Where it plays
 *
 * On each listener's own machine, not mixed into the room's audio. Nobody
 * uploads a track and nothing is transmitted: the file is served from this
 * origin and every browser plays the same one. That keeps it out of the
 * recording — a broadcast should be the people in it, not the hold music —
 * and it means a listener on a bad connection is not spending bandwidth on
 * a piano.
 *
 * The consequence is that the two are not sample-aligned between listeners.
 * Nobody can tell. You are not in the same room as the other people, and
 * there is nothing to be out of sync with.
 *
 * ## When it plays
 *
 * While nobody in the room has their microphone open, and not otherwise. The
 * moment there is a voice, the voice is the signal and the music is in the
 * way, so it fades rather than cuts — a hard stop the instant somebody
 * unmutes sounds like a fault, and the fade is short enough not to be a
 * production.
 *
 * Coming back is slower than going away. Somebody muting for three seconds
 * to cough should not be answered with a piano, so the room has to be quiet
 * for a moment before the bed returns. Asymmetric on purpose: the cost of
 * being slow to return is nothing, and the cost of being slow to get out of
 * the way is talking over somebody.
 *
 * ## Who chooses
 *
 * The host. Their choice is broadcast to the room, so everybody hears the
 * same station rather than each person's own idea of it, and the host
 * re-announces it whenever somebody new arrives — a broadcast is fire and
 * forget, and a late arrival would otherwise be listening to whatever the
 * station was created with.
 */

const FADE_OUT_MS = 450;
const FADE_IN_MS = 900;
/** How long a room has to stay quiet before the bed comes back. */
const SETTLE_MS = 2500;
/** Loud enough to be present, quiet enough to talk over. */
const VOLUME = 0.22;

export interface BedControl {
  /** what the room is playing */
  bed: BedId;
  /** whether it is audible right now */
  playing: boolean;
  /** host only; changes it for everybody */
  setBed: (next: BedId) => void;
}

export function useBed(live: LiveRoom, initial: BedId | undefined): BedControl {
  const [bed, setBedState] = useState<BedId>(isBedId(initial) ? initial : "none");
  /* Whether the element is actually running. Whether it is *audible* is
     derived from that and from the room, so nothing has to be corrected when
     somebody unmutes. */
  const [started, setStarted] = useState(false);

  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Read inside callbacks that must not re-subscribe when it changes. Written
     in an effect rather than during render: a ref assigned while rendering is
     a value React has not agreed to yet. */
  const bedRef = useRef(bed);
  useEffect(() => {
    bedRef.current = bed;
  }, [bed]);

  /* The station's own choice arrives after the room does — it comes back with
     the room, and the room is fetched. So it is applied when it turns up
     rather than read once at mount, and only while nothing louder has spoken:
     once the host has said something, in this tab or over the wire, that is
     what the room is playing and a late fetch must not undo it. */
  const decided = useRef(false);
  useEffect(() => {
    if (decided.current || !isBedId(initial)) return;
    setBedState(initial);
  }, [initial]);

  const inRoom = live.status === "live";
  const someoneSpeaking = live.participants.some((p) => !p.muted);
  const src = getBed(bed).src;

  /* ---------------------------------------------------------------- fades */

  const rampTo = useCallback((target: number, ms: number, thenStop = false) => {
    const el = audio.current;
    if (!el) return;
    if (fade.current !== null) cancelAnimationFrame(fade.current);

    const from = el.volume;
    const began = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - began) / ms);
      el.volume = Math.max(0, Math.min(1, from + (target - from) * t));
      if (t < 1) {
        fade.current = requestAnimationFrame(step);
        return;
      }
      fade.current = null;
      if (thenStop) {
        el.pause();
        setStarted(false);
      }
    };

    fade.current = requestAnimationFrame(step);
  }, []);

  /* ------------------------------------------------------------ the audio */

  useEffect(() => {
    if (!src || !inRoom) {
      const el = audio.current;
      if (el) {
        el.pause();
        audio.current = null;
      }
      return;
    }

    const el = new Audio(src);
    el.loop = true;
    el.volume = 0;
    audio.current = el;

    return () => {
      if (fade.current !== null) cancelAnimationFrame(fade.current);
      el.pause();
      audio.current = null;
    };
  }, [src, inRoom]);

  /* ---------------------------------------------------- quiet, or not */

  useEffect(() => {
    const el = audio.current;
    if (!el) return;

    if (settle.current) {
      clearTimeout(settle.current);
      settle.current = null;
    }

    if (someoneSpeaking) {
      if (!el.paused) rampTo(0, FADE_OUT_MS, true);
      return;
    }

    /* Quiet. Wait a moment in case it is a pause rather than an ending. */
    settle.current = setTimeout(() => {
      const current = audio.current;
      if (!current) return;
      /* Started by the click that joined the room, so the browser permits it.
         A refusal is not worth reporting: the room works without music. */
      void current
        .play()
        .then(() => {
          setStarted(true);
          rampTo(VOLUME, FADE_IN_MS);
        })
        .catch(() => {});
    }, el.paused ? SETTLE_MS : 0);

    return () => {
      if (settle.current) clearTimeout(settle.current);
    };
  }, [someoneSpeaking, src, inRoom, rampTo]);

  /* ------------------------------------------------------ the host's word */

  useEffect(() => {
    const meeting = live.meeting;
    if (!meeting) return;

    const onMessage = ({
      type,
      payload,
    }: {
      type: string;
      payload: Record<string, unknown>;
    }) => {
      if (type !== "bed") return;
      if (!isBedId(payload.bed)) return;
      decided.current = true;
      setBedState(payload.bed);
    };

    meeting.participants.on("broadcastedMessage", onMessage);
    return () => {
      meeting.participants.off("broadcastedMessage", onMessage);
    };
  }, [live.meeting]);

  /* Somebody arriving has missed every announcement made before they got
     here, so the host makes it again for them. */
  useEffect(() => {
    const meeting = live.meeting;
    if (!meeting || live.role !== "host") return;

    const announce = () => {
      void meeting.participants
        .broadcastMessage("bed", { bed: bedRef.current })
        .catch(() => {});
    };

    meeting.participants.joined.on("participantJoined", announce);
    return () => {
      meeting.participants.joined.off("participantJoined", announce);
    };
  }, [live.meeting, live.role]);

  const setBed = useCallback(
    (next: BedId) => {
      decided.current = true;
      setBedState(next);
      const meeting = live.meeting;
      if (!meeting || live.role !== "host") return;
      void meeting.participants
        .broadcastMessage("bed", { bed: next })
        .catch(() => {});
    },
    [live.meeting, live.role],
  );

  /* Audible, rather than merely running: the element is paused as it fades,
     so this is the honest answer to "is music playing right now". */
  const playing = started && !someoneSpeaking && inRoom && Boolean(src);

  return { bed, playing, setBed };
}
