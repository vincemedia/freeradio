"use client";

import { Dialog as D } from "radix-ui";
import { play } from "@/lib/sfx";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * The default detail-and-action surface on mobile.
 *
 * Slides on `translateY`, sized in `svh` so iOS Safari's collapsing URL bar
 * does not cause a jump. Full height by default; the `tall` variant leaves the
 * page peeking behind, which is what you want when the occupant grid should
 * stay visible while a panel is open over it.
 */
/**
 * A sheet is a menu that came in from the side, so it clicks like one. The
 * sound follows `onOpenChange` rather than the trigger, which is what makes a
 * swipe-away and an escape sound the same as a tap on the close button.
 */
export function Sheet(props: React.ComponentProps<typeof D.Root>) {
  return (
    <D.Root
      {...props}
      onOpenChange={(open) => {
        play(open ? "open-menu" : "close-menu");
        props.onOpenChange?.(open);
      }}
    />
  );
}
export const SheetTrigger = D.Trigger;

export function SheetContent({
  className,
  children,
  title,
  description,
  tall = false,
  ...props
}: React.ComponentProps<typeof D.Content> & {
  title: string;
  description?: string;
  tall?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-foreground/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-lg border border-border bg-card shadow-[var(--shadow-overlay)]",
          tall ? "h-[92svh]" : "h-[100svh]",
          /* Never spans the desktop viewport: capped and centred. */
          "sm:inset-x-auto sm:left-1/2 sm:h-auto sm:max-h-[85svh] sm:w-full sm:max-w-[560px] sm:-translate-x-1/2 sm:rounded-lg",
          "duration-250 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className,
        )}
        {...props}
      >
        {/* Grab handle on mobile, close button on desktop. */}
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border sm:hidden"
        />
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0">
            <D.Title className="font-display text-lg font-semibold tracking-tight text-balance">
              {title}
            </D.Title>
            {description && (
              <D.Description className="mt-1 text-sm leading-relaxed text-balance text-muted-foreground">
                {description}
              </D.Description>
            )}
          </div>
          <D.Close
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </D.Content>
    </D.Portal>
  );
}
