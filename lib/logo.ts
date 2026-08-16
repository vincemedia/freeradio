import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The logo as a data URI, for generated images.
 *
 * Satori cannot fetch a relative path and there is no absolute origin to rely
 * on at build time, so the file is inlined. Read once and cached: the same
 * bytes are wanted by the Apple icon and by every Co-Channel share card.
 */
let cached: string | undefined;

export function logoDataUri(): string {
  cached ??= `data:image/png;base64,${readFileSync(
    join(process.cwd(), "public", "freeradio-logo.png"),
  ).toString("base64")}`;
  return cached;
}
