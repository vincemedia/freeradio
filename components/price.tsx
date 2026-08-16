"use client";

import { formatSats, formatUsd, usdToSats, usePrice } from "@/lib/use-price";
import { cn } from "@/lib/utils";

/**
 * A price, in satoshis, with the dollars it came from underneath.
 *
 * Satoshis lead because that is what is actually paid: the dollar figure is
 * the quote, the satoshi figure is the transaction. Showing it the other way
 * round makes the money look like a card payment with a crypto footnote,
 * which is the opposite of what this product settles in.
 *
 * The dollar amount is authored and the satoshi amount is derived from a live
 * rate, so the secondary line is also the honest one: it says which of the two
 * numbers was fixed. When there is no rate the satoshis are omitted rather
 * than guessed, and the dollars stand on their own.
 */
export function Price({
  usd,
  className,
  /** lay the two out side by side rather than stacked */
  inline = false,
}: {
  usd: number;
  className?: string;
  inline?: boolean;
}) {
  const rate = usePrice();

  if (!rate) {
    return (
      <span className={cn("readout tabular-nums", className)}>
        {formatUsd(usd)}
      </span>
    );
  }

  const sats = formatSats(usdToSats(usd, rate.usdPerBsv));

  return (
    <span
      className={cn(
        "min-w-0",
        inline ? "inline-flex items-baseline gap-1.5" : "inline-flex flex-col leading-tight",
        className,
      )}
      title={`${sats} at $${rate.usdPerBsv.toFixed(2)} per BSV, ${rate.source}`}
    >
      <span className="readout tabular-nums">{sats}</span>
      <span className="text-[0.85em] text-muted-foreground tabular-nums">
        {formatUsd(usd)}
      </span>
    </span>
  );
}

/**
 * The same amount on one line, for a button or a sentence.
 *
 * Returns a string rather than nodes so it can go inside a label, an
 * `aria-label` and a toast without three versions of the same conversion.
 */
export function usePriceLabel(): (usd: number) => string {
  const rate = usePrice();
  return (usd: number) =>
    rate
      ? `${formatSats(usdToSats(usd, rate.usdPerBsv))} (${formatUsd(usd)})`
      : formatUsd(usd);
}
