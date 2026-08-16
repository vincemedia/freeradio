import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Person } from "@/data/schema";

/**
 * Images for generated share cards.
 *
 * Satori cannot fetch a relative path and there is no absolute origin at build
 * time, so every image is inlined as a data URI. It also decodes PNG and JPEG
 * and nothing else, which is why the ecosystem marks are rasterised copies in
 * `public/og/ecosystems` rather than the WebP and SVG originals the app uses.
 *
 * Cached per path: one card asks for the logo, a band mark and several
 * avatars, and the same bytes are wanted again by the next card.
 */
const cache = new Map<string, string | null>();

function dataUri(publicPath: string): string | null {
  if (cache.has(publicPath)) return cache.get(publicPath)!;

  const file = join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  let uri: string | null = null;

  if (existsSync(file)) {
    const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";
    uri = `data:${mime};base64,${readFileSync(file).toString("base64")}`;
  }

  cache.set(publicPath, uri);
  return uri;
}

export function logoUri(): string {
  return dataUri("/freeradio-logo.png")!;
}

export function bandMarkUri(ecosystem: string): string | null {
  return dataUri(`/og/ecosystems/${ecosystem}.png`);
}

/**
 * A person's photo, when it is a format a share card can draw.
 *
 * Returns null for the GIF avatars and for everybody with no photo at all,
 * which is most people. The caller draws their colours instead: the app falls
 * back to a generated marble, and a two-stop gradient from the same palette is
 * the closest a static card can get to it.
 */
export function avatarUri(person: Person): string | null {
  if (!person.photo) return null;
  if (!/\.(png|jpe?g)$/i.test(person.photo)) return null;
  return dataUri(person.photo);
}

/** The gradient standing in for a marble avatar. */
export function avatarFallback(person: Person): string {
  const [a, b] = person.avatarColors;
  return `linear-gradient(135deg, ${a ?? "#5b1d99"}, ${b ?? "#0074b4"})`;
}
