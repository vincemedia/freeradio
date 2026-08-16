"use client";

/**
 * Navigate with a view transition, where the browser supports one.
 *
 * The point is continuity: a Co-Channel's frequency and title are the same
 * object on the card you tapped and in the room you land in, so they should
 * travel rather than one page replacing another. Elements opt in by sharing a
 * `view-transition-name`.
 *
 * The App Router updates the DOM asynchronously, so the callback cannot just
 * call `push` and return: the browser would snapshot the new state before the
 * route rendered. It returns a promise instead, resolved a frame after the URL
 * becomes the one we asked for, with a ceiling so a failed navigation can
 * never leave the page frozen under a transition that never ends.
 */
const SETTLE_TIMEOUT_MS = 600;

type StartViewTransition = (callback: () => void | Promise<void>) => unknown;

export function navigateWithTransition(push: () => void, href: string): void {
  const start = (
    document as Document & { startViewTransition?: StartViewTransition }
  ).startViewTransition?.bind(document);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!start || reduced) {
    push();
    return;
  }

  start(
    () =>
      new Promise<void>((resolve) => {
        const deadline = Date.now() + SETTLE_TIMEOUT_MS;
        push();

        const settle = () => {
          if (window.location.pathname === href || Date.now() > deadline) {
            /* One more frame so the new route has painted before the browser
               takes its "after" snapshot. */
            requestAnimationFrame(() => resolve());
            return;
          }
          requestAnimationFrame(settle);
        };
        requestAnimationFrame(settle);
      }),
  );
}

/**
 * The name a Co-Channel's identity carries across routes.
 *
 * A name may appear only once per document or the browser abandons the whole
 * transition, so exactly one element may claim it at a time. The rule is that
 * whatever represents the room you are in owns it: the dock when you are in a
 * room, the card otherwise.
 */
export const coChannelTransitionName = (id: string) => `room-${id}`;
