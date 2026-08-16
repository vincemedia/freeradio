"use client";

/**
 * One audio element for the whole app.
 *
 * A radio has one speaker. Two sources playing at once — a station you are in
 * and a recording you pressed play on — is not a thing a radio can do, and
 * modelling it as two independent `<audio>` elements would let it happen. So
 * there is a single element and whoever plays claims it; the previous holder
 * is told it has been taken and stops.
 *
 * Browsers refuse to start audio without a gesture, which is not an error to
 * swallow: it is a state the interface has to show, because a silent room
 * with no explanation reads as broken. `claim` reports whether it was allowed
 * to start, and the caller offers a control if it was not.
 */

type Holder = {
  /** told when somebody else takes the element */
  onLost: () => void;
};

let element: HTMLAudioElement | null = null;
let holder: Holder | null = null;

function audio(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = "auto";
  }
  return element;
}

/**
 * Take the player for `src`, starting at `atSeconds`.
 *
 * Returns false when the browser refused to start, which happens until the
 * reader has interacted with the page at least once.
 */
export async function claim(
  src: string,
  atSeconds: number,
  onLost: () => void,
): Promise<boolean> {
  const el = audio();
  const previous = holder;
  holder = { onLost };
  if (previous && previous !== holder) previous.onLost();

  /* Setting src to the same value would restart the download, so only touch
     it when the source has actually changed. Comparing against the resolved
     `el.src` means comparing an absolute URL with a relative one. */
  const resolved = new URL(src, window.location.href).href;
  if (el.src !== resolved) el.src = resolved;
  if (Math.abs(el.currentTime - atSeconds) > 0.35) el.currentTime = atSeconds;

  try {
    await el.play();
    return true;
  } catch {
    return false;
  }
}

/** Try again after a gesture, for a source already claimed. */
export async function resume(): Promise<boolean> {
  try {
    await audio().play();
    return true;
  } catch {
    return false;
  }
}

/** Give the player up, if this holder still has it. */
export function release(onLost: () => void) {
  if (holder?.onLost !== onLost) return;
  holder = null;
  const el = audio();
  el.pause();
  /* Dropping the source frees the decoder and stops a paused stream from
     resuming when the tab comes back. */
  el.removeAttribute("src");
  el.load();
}

/** Where the player is, in seconds. */
export function position(): number {
  return element?.currentTime ?? 0;
}

export function seek(seconds: number) {
  audio().currentTime = seconds;
}

export function setMuted(muted: boolean) {
  audio().muted = muted;
}

export function isPlaying(): boolean {
  return !!element && !element.paused && !element.ended;
}

/** Subscribe to the element's own events, for components that follow it. */
export function listen(event: string, handler: () => void): () => void {
  const el = audio();
  el.addEventListener(event, handler);
  return () => el.removeEventListener(event, handler);
}
