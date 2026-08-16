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
  short = false,
}: {
  className?: string;
  markSize?: number;
  showMark?: boolean;
  /**
   * The call sign instead of the name.
   *
   * On a phone the top bar has one row for the brand, the band switch and
   * everything else, and the brand is the part with the least to say — you
   * know what app you opened. So it contracts to its initials, which is what
   * a station does on air anyway: the long name once, the call sign the rest
   * of the time.
   */
  short?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark && <LogoMark size={markSize} />}
      {/* The box is centred, but the glyphs are not: uppercase has no
          descenders, so the ink sits high in the line box and reads as lifted
          against the mark. Nudged down by the descender's share, in em so it
          holds at any size. */}
      <span className="translate-y-[0.055em] font-display text-[13px] font-semibold uppercase leading-none tracking-[0.14em]">
        {short ? (
          <>
            F<span className="text-muted-foreground">R</span>
          </>
        ) : (
          <>
            Free<span className="text-muted-foreground">Radio</span>
          </>
        )}
      </span>
    </span>
  );
}
