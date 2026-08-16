"use client";

/**
 * The noise the set makes while it is looking for something.
 *
 * A module singleton rather than a hook's private element, because it has to
 * outlive the page that started it. Surprise me sweeps the dial and then opens
 * a station, and the connecting is part of the journey — the noise should stop
 * when you arrive in the room, not when the needle stops moving. The needle
 * stops on the scan page and the room is a different page, so anything owned
 * by a component would be torn down in between and the sound would cut out at
 * exactly the moment there is nothing else to listen to.
 *
 * One element for the whole app. Two sweeps cannot overlap, because there is
 * one dial.
 */

const SRC = "/audio/fm-tuning.mp3";
const VOLUME = 0.35;

/**
 * A backstop, because the thing that stops this lives on another page.
 *
 * If a room never finishes connecting — the network went, the station had
 * closed, the tab was backgrounded and the join stalled — nobody calls stop
 * and the noise would run forever. Ten seconds is longer than any join that
 * is going to succeed.
 */
const MAX_MS = 10_000;

let el: HTMLAudioElement | null = null;
let deadline: ReturnType<typeof setTimeout> | null = null;

function element(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!el) {
    el = new Audio(SRC);
    el.loop = true;
    el.volume = VOLUME;
  }
  return el;
}

/** Start, or keep going if it is already running. */
export function startTuning() {
  const audio = element();
  if (!audio) return;
  if (deadline) clearTimeout(deadline);
  deadline = setTimeout(stopTuning, MAX_MS);
  /* Always begun by a click, so the browser permits it. A refusal is not
     worth reporting: the dial still moves and the room still opens. */
  void audio.play().catch(() => {});
}

/** Stop, wherever it was started from. */
export function stopTuning() {
  if (deadline) {
    clearTimeout(deadline);
    deadline = null;
  }
  if (!el) return;
  el.pause();
  el.currentTime = 0;
}

/** Whether it is running, for the page that has to decide whether to stop it. */
export function tuning(): boolean {
  return Boolean(el && !el.paused);
}
