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

/** `RIFF` … `WEBP`: twelve bytes that a WebP has and other things do not. */
function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const tag = (at: number) =>
    String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  return tag(0) === "RIFF" && tag(8) === "WEBP";
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
  if (!isWebp(bytes)) {
    return NextResponse.json(
      { error: "That is not a WebP. The app resizes images before sending them." },
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
  const key = `avatars/${connected.publicKey.slice(0, 16)}.webp`;

  const blob = await put(key, Buffer.from(bytes), {
    access: "public",
    /* Set here, never taken from the upload: a blob served as text/html would
       be a stored cross-site script. */
    contentType: "image/webp",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });

  /* The previous one, if any, is removed rather than left paid for. */
  const previous = request.cookies.get(avatarCookieName())?.value ?? null;
  if (previous && previous !== blob.url) {
    await del(previous).catch(() => {
      /* Already gone, or never ours. Not worth failing the upload over. */
    });
  }

  const response = NextResponse.json({ url: blob.url });
  response.cookies.set(avatarCookieName(), blob.url, {
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
    await del(current).catch(() => {});
  }

  const response = NextResponse.json({ url: null });
  response.cookies.delete(avatarCookieName());
  return response;
}
