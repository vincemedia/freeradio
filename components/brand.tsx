import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The mark and the wordmark, defined once.
 *
 * The logo is a detailed object: a dial, a tick scale, a grille and a needle.
 * That detail is the point at 180px and mud at 16px, so the mark has a floor
 * of 24px and the top bar pairs it with the wordmark rather than relying on it
 * alone. The wordmark is small and sits on a neutral field, per DESIGN.md.
 */
export function LogoMark({
  size = 26,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/freeradio-logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({
  className,
  markSize = 26,
  showMark = true,
}: {
  className?: string;
  markSize?: number;
  showMark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark && <LogoMark size={markSize} />}
      {/* The box is centred, but the glyphs are not: uppercase has no
          descenders, so the ink sits high in the line box and reads as lifted
          against the mark. Nudged down by the descender's share, in em so it
          holds at any size. */}
      <span className="translate-y-[0.055em] font-display text-[13px] font-semibold uppercase leading-none tracking-[0.14em]">
        Free<span className="text-muted-foreground">Radio</span>
      </span>
    </span>
  );
}
