"use client";

import { Dialog as D, Popover as P, Tooltip as T } from "radix-ui";
import { Question, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------- dialog */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof D.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-foreground/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
      <D.Content
        /* Capped and scrollable: a dialog with a form in it can outgrow a
           short window, and a body that scrolls behind a centred dialog is
           how content becomes unreachable. */
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-overlay)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <div className="mb-4 shrink-0 pr-8">
          <D.Title className="font-display text-lg font-semibold tracking-tight text-balance">
            {title}
          </D.Title>
          {description && (
            <D.Description className="mt-1.5 text-sm leading-relaxed text-balance text-muted-foreground">
              {description}
            </D.Description>
          )}
        </div>
        <div className="-mr-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
          {children}
        </div>
        <D.Close
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export const DialogClose = D.Close;

/* ---------------------------------------------------------------- popover */

/**
 * A small panel anchored to the thing that opened it.
 *
 * Distinct from a dialog: it does not take the screen, it does not dim what is
 * behind it, and dismissing it costs one click anywhere. Used for the identity
 * card, which is a thing you glance at rather than a task you complete.
 */
export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;

export function PopoverContent({
  className,
  align = "end",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-50 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-overlay)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}

/* ---------------------------------------------------------------- tooltip */

/**
 * Hover on desktop, tap on mobile.
 *
 * Radix tooltips do not open on touch, so the trigger is a button and the
 * same content is also wired to click. One clause, never a sentence with a
 * period, and never information the UI needs to work without.
 */
export function Tooltip({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <T.Provider delayDuration={200}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            sideOffset={6}
            collisionPadding={8}
            className="z-50 max-w-[min(18rem,calc(100vw-2rem))] rounded-sm bg-foreground px-2 py-1 text-xs leading-snug text-background shadow-[var(--shadow-overlay)] data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in"
          >
            {label}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

/**
 * A tooltip that holds more than a clause.
 *
 * Same surface and timing as `Tooltip`, but the content is nodes rather than a
 * string, for the few places where the useful answer has a mark and a number
 * in it and reads worse spelled out as a sentence.
 */
export function RichTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <T.Provider delayDuration={200}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            sideOffset={6}
            collisionPadding={8}
            className="z-50 max-w-[min(20rem,calc(100vw-2rem))] rounded-sm bg-foreground px-2.5 py-2 text-xs leading-snug text-background shadow-[var(--shadow-overlay)] data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in"
          >
            {content}
            <T.Arrow className="fill-foreground" width={10} height={5} />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

/**
 * A hint that shows itself.
 *
 * The one tooltip in the product that opens without being asked, because it
 * exists to point somewhere the reader does not yet know about. It stays open
 * until it is used, has no arrow-key trap and no close button: using the thing
 * it points at is how it goes away, and it never comes back.
 */
export function HintTooltip({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <T.Provider>
      <T.Root open>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side="bottom"
            sideOffset={8}
            collisionPadding={8}
            /* Not interactive: it must never sit between the pointer and the
               link it is pointing at. */
            className="pointer-events-none z-50 flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-[var(--shadow-overlay)] animate-in fade-in slide-in-from-top-1 duration-300"
          >
            {label}
            <T.Arrow className="fill-foreground" width={10} height={5} />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

/**
 * Inline help.
 *
 * A question mark adjacent to the thing it explains, per Rams: labels sit next
 * to what they label rather than floating. Tapping opens it on touch, where
 * hover does not exist.
 */
export function Help({ children }: { children: string }) {
  return (
    <Tooltip label={children}>
      <button
        type="button"
        aria-label={children}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Question size={14} />
      </button>
    </Tooltip>
  );
}
