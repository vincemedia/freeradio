"use client";

import { Switch as S } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* The small, unremarkable pieces. Kept together because each is a handful of
   lines and splitting them across files would be filing, not architecture. */

/* ------------------------------------------------------------------- card */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ badge */

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-tight tracking-[0.04em] whitespace-nowrap",
  {
    variants: {
      variant: {
        /* Neutral metadata: outline, muted text. The default, because most
           badges are facts rather than events. */
        outline: "border border-border text-muted-foreground",
        /* On air and recording. The only filled red in the system. */
        signal: "bg-accent text-accent-foreground",
        /* The active control, used for a tuned station and nothing else. */
        active: "bg-primary text-primary-foreground",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

/* ------------------------------------------------------------------ input */

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        /* 16px on mobile: iOS Safari zooms the viewport on focus below it. */
        "h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- skeleton */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-border", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------ empty state */

/**
 * Empty is an invitation, never a blank.
 *
 * One headline in the project vocabulary, one sentence of guidance, one
 * action. The shape is fixed so every empty list in the app reads the same.
 */
export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h2 className="font-display text-xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-balance text-muted-foreground">
        {children}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * A spinner, for the gap between asking and knowing.
 *
 * Borrowed geometry from nothing: a ring with a quarter missing, turning. It
 * exists because a control that has been pressed and has not finished is a
 * third state, and leaving it looking like the first invites a second press.
 *
 * Still under `prefers-reduced-motion` — a stationary broken ring still reads
 * as "working" without moving, which is the compromise every other spinner in
 * this position makes.
 */
export function Spinner({
  size = 15,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin",
        className,
      )}
      style={{ width: size, height: size, animationDuration: "700ms" }}
    />
  );
}

/**
 * A switch, with the primary control's material on the handle.
 *
 * The track is a recessed slot and the thumb is the same clay as the primary
 * button — the one thing in this interface that stands proud of the panel and
 * moves when you press it. That is not decoration: a switch and a call to
 * action are the same gesture in this product's language, so they are made of
 * the same stuff, and the thumb reads as a physical object sliding in a
 * channel rather than as a coloured rectangle changing state.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** the accessible name, and what is written beside it */
  label: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2",
        className,
      )}
    >
      <S.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
          "shadow-[inset_0_1px_2px_oklch(0_0_0/0.14)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary/35" : "bg-muted",
        )}
      >
        <S.Thumb
          className={cn(
            "block size-4 rounded-full transition-transform duration-150 ease-[var(--ease-out-quint)]",
            "translate-x-0.5 data-[state=checked]:translate-x-[1.125rem]",
            checked
              ? "bg-primary shadow-[var(--shadow-clay-primary)]"
              : "bg-card shadow-[0_1px_3px_oklch(0_0_0/0.18)]",
          )}
        />
      </S.Root>
      <span className="text-xs text-muted-foreground">{label}</span>
    </label>
  );
}
