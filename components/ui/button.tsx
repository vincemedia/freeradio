"use client";

import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Braun key.
 *
 * Small radius, flat fill, no gloss. Yellow is the one active control on a
 * screen, so `primary` is deliberately the only filled variant: if two
 * buttons on a screen are yellow, one of them should be `secondary`.
 *
 * Labels never wrap. A label that will not fit gets the short copy variant or
 * goes icon-only, never a second line.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-[var(--ease-out-quint)] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* The one call to action on a screen, and the only control that is
           built rather than drawn: a hard border and a hard offset shadow with
           no blur, so it reads as a physical key sitting proud of the panel.
           Pressing it moves the key onto the shadow, which is the whole trick
           and the reason the offset has to be a real distance rather than a
           soft edge. Everything else in the system stays flat. */
        primary:
          "border-2 border-foreground bg-primary text-primary-foreground shadow-[var(--shadow-key)] hover:bg-[var(--primary-hover)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0",
        secondary:
          "border border-border bg-card text-foreground hover:bg-muted active:scale-[0.98]",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]",
        /* Destructive is a red one step darker than the on-air lamp, so a
           confirmation never reads as a recording indicator. It takes the same
           built treatment as primary, because stopping a recording is as much
           a call to action as starting one. */
        destructive:
          "border-2 border-foreground bg-destructive text-destructive-foreground shadow-[var(--shadow-key)] hover:brightness-110 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-[13px]",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
