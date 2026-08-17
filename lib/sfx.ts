"use client";

/**
 * The sounds the interface itself makes.
 *
 * A radio makes noises. Not as decoration — a physical set tells you things
 * through sound that it never shows you, and the two most useful are the ones
 * here: somebody arrived, somebody left. In a voice room those are facts you
 * would otherwise have to be watching the occupant grid to learn, and the
 * whole point of a voice room is that you are not looking at it.
 *
 * The menu sounds are a different argument and a weaker one: they are
 * mechanical feedback for a mechanical action, the click of a switch that
 * moved. They earn their place by being short and by never firing without a
 * gesture behind them.
 *
 * ## Rules these follow
 *
 * Nothing plays that the reader did not cause or would not want. Arrivals and
 * departures only sound while you are in the room they happened in. Menu
 * sounds only follow a real open or close, never a re-render that happened to
 * change a boolean.
 *
 * Nothing plays if the reader has turned them off, which is one switch in
 * settings and remembered. Somebody listening to a broadcast with headphones
 * on should be able to stop the furniture from talking over it.
 *
 * Nothing queues. If four people join at once you hear one arrival, because
 * four is not four times as informative and it is four times as annoying.
 *
 * ## Why the elements are pooled
 *
 * One element per sound, rewound and replayed. Creating an `Audio` per event
 * leaks decoders on a busy room, and these are short enough that overlapping
 * copies of the same one would be mush rather than emphasis.
 */

export type Sfx =
  | "user-connect"
  | "user-disconnect"
  | "open-menu"
  | "close-menu";

const SRC: Record<Sfx, string> = {
  "user-connect": "/audio/user-connect.mp3",
  "user-disconnect": "/audio/user-disconnect.mp3",
  "open-menu": "/audio/open-menu.mp3",
  "close-menu": "/audio/close-menu.mp3",
};

/* Quiet. These sit under a conversation, and a notification that competes
   with the thing it is notifying you about is a bad notification. */
const VOLUME: Record<Sfx, number> = {
  "user-connect": 0.3,
  "user-disconnect": 0.3,
  "open-menu": 0.22,
  "close-menu": 0.22,
};

/** The shortest gap between two of the same sound. Anything closer is one. */
const DEBOUNCE_MS = 220;

const STORAGE_KEY = "fr_sfx";

const pool = new Map<Sfx, HTMLAudioElement>();
const lastPlayed = new Map<Sfx, number>();

/* Read once and cached, because this is consulted on every event. */
let enabled: boolean | null = null;

export function sfxEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return false;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    enabled = true;
  }
  return enabled;
}

export function setSfxEnabled(next: boolean) {
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    /* Storage refused. It holds for this session, which is enough. */
  }
}

export function play(sound: Sfx) {
  if (typeof window === "undefined") return;
  if (!sfxEnabled()) return;

  const now = performance.now();
  const last = lastPlayed.get(sound) ?? 0;
  if (now - last < DEBOUNCE_MS) return;
  lastPlayed.set(sound, now);

  let el = pool.get(sound);
  if (!el) {
    el = new Audio(SRC[sound]);
    el.volume = VOLUME[sound];
    pool.set(sound, el);
  }

  /* Rewound rather than restarted, so a rapid second one is heard from the
     top instead of continuing the first. */
  try {
    el.currentTime = 0;
  } catch {
    /* Not seekable yet. Playing from wherever it is, is fine. */
  }
  /* Every one of these follows a gesture or an event inside a room somebody
     has already clicked into, so autoplay permits it. A refusal is silence,
     which is the failure mode you want from a sound effect. */
  void el.play().catch(() => {});
}
