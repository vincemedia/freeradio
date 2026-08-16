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
        /* The one call to action on a screen, and the only control made of a
           material rather than drawn as a rectangle. Clay: a tinted drop
           shadow lifting it off the panel, an inner shadow along the bottom
           for thickness, and an inner highlight along the top where the light
           lands. Pressing swaps in the pressed set so the piece squashes
           rather than slides. Everything else in the system stays flat, which
           is what leaves this reading as the thing to press.

           The corner comes from the base above, not from a radius of its own:
           a primary and a secondary sitting next to each other are the same
           key in two finishes, and two different corners made them look like
           parts from two different products. */
        primary:
          "bg-primary text-primary-foreground shadow-[var(--shadow-clay-primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] active:shadow-[var(--shadow-clay-primary-pressed)]",
        secondary:
          "border border-border bg-card text-foreground hover:bg-muted active:scale-[0.98]",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]",
        /* Destructive is a red one step darker than the on-air lamp, so a
           confirmation never reads as a recording indicator. Same clay as
           primary, because stopping a recording is as much a call to action as
           starting one, and the two are the same kind of control. */
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-clay-destructive)] hover:brightness-110 active:scale-[0.98] active:shadow-[var(--shadow-clay-destructive-pressed)]",
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
