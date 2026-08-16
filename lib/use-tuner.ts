"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startTuning, stopTuning } from "@/lib/tuning-sound";

/**
 * Travelling to a frequency the way a radio does.
 *
 * Pressing scan used to set the number. That is what a list does — you asked
 * for the next item and you got it — and it threw away the one thing a dial
 * has that a list does not, which is the distance between two stations. On a
 * real set you hear how far you went: a long crawl up an empty stretch and a
 * short hop between two rooms sitting next to each other are different
 * experiences, and the difference is information about the band.
 *
 * So the needle travels, at a fixed rate in megahertz per second rather than
 * over a fixed duration. A fixed duration would make every journey feel the
 * same length, which is exactly the fact being thrown away. Crossing the whole
 * band takes about three seconds; stepping between two adjacent stations takes
 * a moment.
 *
 * The noise is the same idea in the other medium. It runs while the needle is
 * moving and stops when it lands, so the silence at the end is the arrival —
 * unless the caller says the journey is not over, which is what Surprise me
 * does: there, arriving means being in the room, and the room is a page away.
 * The sound itself lives in `lib/tuning-sound` for that reason, outliving any
 * component that starts it.
 *
 * ## What it does not do
 *
 * It does not update whatever state the rest of the page is derived from.
 * Sixty frames a second of "the frequency is now 94.3" would refetch a
 * station, re-render its card and hammer the API with every room the needle
 * passes over. The sweep owns a display value; the page commits once, on
 * arrival. Everything downstream sees one change, at the end, which is also
 * when it actually became true.
 */

/** Megahertz per second. About three seconds end to end on a 20 MHz band. */
const RATE = 7;

/** Below this it is not a journey, it is a jump. */
const MIN_MS = 140;

export interface Tuner {
  /** where the needle is while travelling, or null when it is still */
  sweeping: number | null;
  /**
   * Send the needle somewhere, then do something when it arrives.
   *
   * `keepSound` leaves the noise running past the arrival, for a caller whose
   * journey continues somewhere this hook cannot see. Whoever passes it owns
   * stopping it; `lib/tuning-sound` has a backstop in case they never do.
   */
  tuneTo: (
    frequency: number,
    arrive?: () => void,
    keepSound?: boolean,
  ) => void;
  /** stop where you are — dragging the dial should win over a sweep */
  cancel: () => void;
}

export function useTuner(from: number): Tuner {
  const [sweeping, setSweeping] = useState<number | null>(null);

  const frame = useRef<number | null>(null);
  const arrival = useRef<(() => void) | null>(null);
  /* Whether this journey's noise is somebody else's to stop. */
  const handOver = useRef(false);
  /* The live position, so a second press mid-journey turns from where the
     needle actually is rather than from where it started. */
  const at = useRef(from);

  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    arrival.current = null;
    handOver.current = false;
    stopTuning();
    setSweeping(null);
  }, []);

  /* A sweep left running into an unmount is a sound with nobody listening —
     unless it was handed over on the way out, which is the whole point of
     handing it over. */
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      arrival.current = null;
      if (!handOver.current) stopTuning();
    },
    [],
  );

  const tuneTo = useCallback(
    (target: number, arrive?: () => void, keepSound = false) => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);

      const start = sweeping ?? from;
      at.current = start;
      arrival.current = arrive ?? null;
      handOver.current = keepSound;

      const distance = Math.abs(target - start);
      const duration = (distance / RATE) * 1000;

      /* Somebody who has asked not to be moved gets the destination and no
         journey. The sound goes with it: it is the travel made audible, and
         there is no travel. */
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced || duration < MIN_MS) {
        setSweeping(null);
        arrival.current = null;
        /* No journey, but a caller who is still going somewhere gets the
           noise anyway: it is covering the connecting now, not the travel. */
        if (keepSound) startTuning();
        arrive?.();
        return;
      }

      startTuning();

      const began = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - began) / duration);
        /* Eased out only. A radio's needle is pushed and then stops; easing
           into the movement as well would read as a machine deciding to go
           rather than as a hand having moved it. */
        const eased = 1 - Math.pow(1 - t, 3);
        const value = start + (target - start) * eased;
        at.current = value;
        setSweeping(Number(value.toFixed(1)));

        if (t < 1) {
          frame.current = requestAnimationFrame(step);
          return;
        }

        frame.current = null;
        /* The arrival is the end of the noise, unless somebody else is
           carrying the journey on from here. */
        if (!handOver.current) stopTuning();
        setSweeping(null);
        const done = arrival.current;
        arrival.current = null;
        done?.();
      };

      frame.current = requestAnimationFrame(step);
    },
    [from, sweeping],
  );

  return { sweeping, tuneTo, cancel };
}
