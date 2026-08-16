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

  /* Already here: there is nothing to morph between, and wrapping a
     navigation that will not change the URL is how the callback ends up
     waiting for a change that never comes. */
  if (!start || reduced || window.location.pathname === href) {
    push();
    return;
  }

  const transition = start(
    () =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(ceiling);
          resolve();
        };

        /* The ceiling is a timer, not a frame count. requestAnimationFrame
           stops firing in a backgrounded tab and can stall under load, so a
           deadline checked only inside rAF is a deadline that may never be
           reached: the callback then hangs until the browser gives up on its
           own and reports the transition as timed out. */
        const ceiling = setTimeout(finish, SETTLE_TIMEOUT_MS);

        push();

        const settle = () => {
          if (settled) return;
          if (window.location.pathname === href) {
            /* One more frame so the new route has painted before the browser
               takes its "after" snapshot. */
            requestAnimationFrame(finish);
            return;
          }
          requestAnimationFrame(settle);
        };
        requestAnimationFrame(settle);
      }),
  ) as {
    finished?: Promise<unknown>;
    ready?: Promise<unknown>;
    updateCallbackDone?: Promise<unknown>;
  };

  /* An abandoned transition is not a failure worth surfacing: the navigation
     still happened, only the animation did not. These promises reject when a
     transition is interrupted or skipped, and unhandled they arrive as a
     runtime error over a page that is working perfectly well. */
  void transition?.finished?.catch(() => {});
  void transition?.ready?.catch(() => {});
  void transition?.updateCallbackDone?.catch(() => {});
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
