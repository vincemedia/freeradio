"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * moving and stops when it lands, so the silence at the end is the arrival.
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
  /** send the needle somewhere, then do something when it arrives */
  tuneTo: (frequency: number, arrive?: () => void) => void;
  /** stop where you are — dragging the dial should win over a sweep */
  cancel: () => void;
}

export function useTuner(from: number, soundSrc: string): Tuner {
  const [sweeping, setSweeping] = useState<number | null>(null);

  const frame = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const arrival = useRef<(() => void) | null>(null);
  /* The live position, so a second press mid-journey turns from where the
     needle actually is rather than from where it started. */
  const at = useRef(from);

  const stopSound = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }, []);

  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    arrival.current = null;
    stopSound();
    setSweeping(null);
  }, [stopSound]);

  /* A sweep left running into an unmount is a sound with nobody listening. */
  useEffect(() => cancel, [cancel]);

  const tuneTo = useCallback(
    (target: number, arrive?: () => void) => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);

      const start = sweeping ?? from;
      at.current = start;
      arrival.current = arrive ?? null;

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
        arrive?.();
        return;
      }

      if (!audio.current) {
        audio.current = new Audio(soundSrc);
        audio.current.loop = true;
        audio.current.volume = 0.35;
      }
      /* Started by a click, so the browser allows it. A refusal is not worth
         reporting: the needle still moves and the page still works. */
      void audio.current.play().catch(() => {});

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
        stopSound();
        setSweeping(null);
        const done = arrival.current;
        arrival.current = null;
        done?.();
      };

      frame.current = requestAnimationFrame(step);
    },
    [from, sweeping, soundSrc, stopSound],
  );

  return { sweeping, tuneTo, cancel };
}
