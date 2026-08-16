/**
 * Where this copy of Free Radio is served from.
 *
 * Everything absolute in the metadata hangs off this: `metadataBase` turns the
 * relative `opengraph-image` routes into the full URLs a scraper is given, and
 * a scraper cannot fetch `http://localhost:3000`. Getting this wrong does not
 * fail a build or a page — the image renders perfectly and the card is empty
 * everywhere it is shared, which is why it went unnoticed until somebody
 * pasted a link.
 *
 * In order of authority:
 *
 *   1. `NEXT_PUBLIC_SITE_URL`, for a custom domain, which is the only one of
 *      these that knows the name people actually type.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL`, the stable production domain. Used
 *      ahead of the per-deployment URL so a production card does not point at
 *      an immutable deployment hostname that nobody links to.
 *   3. `VERCEL_URL`, the deployment's own hostname, which is all a preview
 *      has and is correct for one.
 *   4. localhost, for development.
 *
 * The Vercel variables carry no protocol, so one is added.
 */
function fromEnv(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;

  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (host) return host.startsWith("http") ? host : `https://${host}`;

  return "http://localhost:3000";
}

export const SITE_URL = fromEnv();

export function siteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}
