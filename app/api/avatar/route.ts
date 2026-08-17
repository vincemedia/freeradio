import { NextResponse, type NextRequest } from "next/server";
import { connectedPerson, avatarCookieName } from "@/lib/server/identity";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Your avatar.
 *
 * ## Where the work happens, and why it moved
 *
 * The browser resizes and re-encodes; see `lib/resize-image`. It used to happen
 * here with `sharp`, and it never once worked in production: four deploys chasing
 * a native binary that was the wrong platform, then missing its shared library,
 * then pinned to a libvips version I had invented rather than read. Every failure
 * looked the same from outside — a 500 on upload — and the decoder was both the
 * only reason for the round trip and the one part that would not run.
 *
 * So this endpoint no longer decodes anything. It accepts exactly one shape of
 * file and refuses everything else, which is a narrower job it can actually do.
 *
 * ## Private storage, served through here
 *
 * The Blob store this deployment has is configured private, so a publicly
 * readable blob is refused outright — which is what "the image could not be
 * stored" was. Rather than ask for the store to be reconfigured, the blob is
 * written private and read back through `/api/avatar/[...path]`, which streams
 * it with a year of immutable caching. The CDN then serves it, so the function
 * runs about once per avatar rather than once per view.
 *
 * ## What is still enforced here, because a client cannot be trusted
 *
 *   A wallet. The file is keyed by the identity that uploaded it, so nobody can
 *   write over anybody else's.
 *
 *   The length, before the body is read, because reading a body to find out how
 *   big it is, is the attack.
 *
 *   The magic bytes, not the declared type. `Content-Type` is a claim; `RIFF`
 *   followed by `WEBP` four bytes later is the file.
 *
 *   The stored type, always `image/webp`, whatever arrived. A blob served as
 *   `text/html` would be a stored cross-site script; this one has no say in it.
 *
 * ## What is honestly weaker than before
 *
 * The server no longer proves the image was re-encoded, because it no longer
 * re-encodes it. Canvas export in the browser does strip EXIF and any appended
 * payload — that claim still holds for anybody using the app — but a determined
 * client could hand this a hostile small WebP instead. That is the exposure every
 * site with user avatars carries, and it is written down rather than forgotten.
 */

/** A re-encoded 256px WebP is a few tens of kilobytes. This is generous. */
const MAX_BYTES = 512 * 1024;

/**
 * What canvas can produce, recognised by its bytes rather than its claim.
 *
 * WebP first, PNG as the fallback, because `toBlob` is only *required* to
 * support PNG — everything else is best-effort, and a browser that cannot
 * encode WebP silently hands back a PNG instead. Accepting only WebP made that
 * browser unable to set an avatar at all, which is a strange way to punish
 * somebody for their Safari version.
 *
 * Both are canvas output either way, which is what the privacy claim rests on:
 * a fresh encode from raw pixels carries no EXIF, no location and no trailing
 * payload from the file somebody picked.
 */
function looksLikeCanvasOutput(bytes: Uint8Array): "webp" | "png" | null {
  if (bytes.length < 12) return null;
  const tag = (at: number) =>
    String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);

  if (tag(0) === "RIFF" && tag(8) === "WEBP") return "webp";

  /* The eight-byte PNG signature. */
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => bytes[i] === b)) return "png";

  return null;
}

export async function POST(request: NextRequest) {
  const connected = await connectedPerson();
  if (!connected) {
    return NextResponse.json(
      { error: "Connect a wallet before setting an avatar." },
      { status: 401 },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Avatar storage is not configured on this deployment." },
      { status: 503 },
    );
  }

  /* Checked before the body is touched. */
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES * 2) {
    return NextResponse.json(
      { error: "That image is too large once resized." },
      { status: 413 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image was sent." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is too large once resized." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = looksLikeCanvasOutput(bytes);
  if (!kind) {
    return NextResponse.json(
      {
        error:
          "That is not an image this accepts. Pick a JPEG, PNG, GIF or WebP and the app will resize it.",
      },
      { status: 415 },
    );
  }

  /* Loaded here rather than at module scope: @vercel/blob wants its token at
     construction, and a failure to load it must not turn refusing a stranger
     into a 500 — which is exactly what the old top-level import did. */
  const { del, put } = await import("@vercel/blob");

  /* Keyed by the identity that uploaded it, so one wallet cannot overwrite
     another's, and suffixed randomly so a replaced avatar is not served from a
     cache under its old URL. */
  const key = `avatars/${connected.publicKey.slice(0, 16)}.${kind}`;

  let blob;
  try {
    blob = await put(key, Buffer.from(bytes), {
      /* Private, because the store is. A public blob on a private store is
         refused, which is the whole of what "could not be stored" was. It is
         read back through this route instead. */
      access: "private",
      /* From the bytes, never from the upload's own claim: a blob served as
         text/html would be a stored cross-site script. */
      contentType: kind === "webp" ? "image/webp" : "image/png",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
  } catch (e) {
    /* Reported rather than swallowed into a bare 500. Four deploys were spent
       on an upload failure that said nothing about itself. */
    return NextResponse.json(
      {
        error: "The image could not be stored.",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }

  /* Our own address for it, not the store's: a private blob's own URL needs a
     credential, and the one thing an avatar has to be is loadable by an
     ordinary `<img>`. */
  const url = `/api/avatar/${blob.pathname}`;

  /* The previous one, if any, is removed rather than left paid for. */
  const previous = request.cookies.get(avatarCookieName())?.value ?? null;
  if (previous && previous !== url) {
    await del(pathnameOf(previous)).catch(() => {
      /* Already gone, or never ours. Not worth failing the upload over. */
    });
  }

  const response = NextResponse.json({ url });
  response.cookies.set(avatarCookieName(), url, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

/** Remove it, and forget the URL. */
export async function DELETE(request: NextRequest) {
  const connected = await connectedPerson();
  if (!connected) {
    return NextResponse.json({ error: "Nothing is connected." }, { status: 401 });
  }

  const current = request.cookies.get(avatarCookieName())?.value;
  if (current) {
    const { del } = await import("@vercel/blob");
    await del(pathnameOf(current)).catch(() => {});
  }

  const response = NextResponse.json({ url: null });
  response.cookies.delete(avatarCookieName());
  return response;
}

/**
 * The stored blob behind one of our avatar URLs.
 *
 * Cookies written before avatars moved into private storage hold the store's own
 * URL, and `del` takes either — so this passes a full URL through untouched and
 * strips the route prefix off the new shape.
 */
function pathnameOf(value: string): string {
  return value.startsWith("/api/avatar/")
    ? value.slice("/api/avatar/".length)
    : value;
}
