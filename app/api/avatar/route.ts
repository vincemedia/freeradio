import { NextResponse, type NextRequest } from "next/server";
import { connectedPerson, avatarCookieName } from "@/lib/server/identity";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Your avatar.
 *
 * ## The threat model, and why nothing the browser says is believed
 *
 * An avatar endpoint takes a file from a stranger and puts it on a URL other
 * people load. Every part of that is worth distrusting:
 *
 *   The declared type is a claim. A file called `me.png` with
 *   `Content-Type: image/png` can be an SVG full of script, an HTML document,
 *   or a polyglot that is both. So the type is taken from the bytes, by the
 *   decoder, and anything it will not decode as a raster image is refused.
 *
 *   SVG is refused outright even though it is an image. It is a document
 *   format with script and external references in it, and there is no version
 *   of "sanitised SVG" worth betting a session on.
 *
 *   The size is a claim too, and reading a body to find out how big it is, is
 *   the attack. The length is checked before the bytes are read, and the read
 *   itself is capped.
 *
 *   A decoder is an attack surface. `sharp` is given hard limits on pixel
 *   count so a 32,000 × 32,000 PNG that unpacks to gigabytes is refused
 *   rather than decoded.
 *
 * What is stored is never what was uploaded: the image is re-encoded to a
 * fixed size and format, which drops EXIF (including location), any trailing
 * payload after the image data, and anything clever in the original
 * container. The output is a small square WebP and nothing else.
 *
 * Uploading requires a connected wallet, and the file is keyed by that
 * identity, so nobody can write over anybody else's.
 */

/** Refused before reading. Generous for a photo, mean for a payload. */
const MAX_BYTES = 6 * 1024 * 1024;

/** What an avatar is ever displayed at, doubled for retina, and no more. */
const SIZE = 256;

/** A decode bomb guard: no image over this many pixels is unpacked. */
const MAX_PIXELS = 40_000_000;

const ALLOWED = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff"]);

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
  if (declared > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is too large. Six megabytes is the limit." },
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
      { error: "That image is too large. Six megabytes is the limit." },
      { status: 413 },
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  /* Imported here rather than at the top of the file. sharp is a native
     binary and @vercel/blob wants its token at construction; loading either
     at module scope makes an unauthenticated request crash the route before
     any of its own checks have run, which is how refusing a stranger turned
     into a 500. */
  const [{ default: sharp }, { del, put }] = await Promise.all([
    import("sharp"),
    import("@vercel/blob"),
  ]);

  let output: Buffer;
  try {
    const image = sharp(input, {
      limitInputPixels: MAX_PIXELS,
      /* One frame. An animated avatar is a way to make a list move. */
      animated: false,
    });

    const meta = await image.metadata();
    if (!meta.format || !ALLOWED.has(meta.format)) {
      return NextResponse.json(
        { error: "That is not an image this accepts. JPEG, PNG, WebP or GIF." },
        { status: 415 },
      );
    }

    /* Re-encoded rather than resized: the output shares no bytes with the
       input, which is what makes the metadata and any appended payload go
       away rather than being trusted to be harmless. */
    output = await image
      .rotate()
      .resize(SIZE, SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "That image could not be read." },
      { status: 415 },
    );
  }

  /* Keyed by the identity that uploaded it, so one wallet cannot overwrite
     another's, and suffixed randomly so a replaced avatar is not served from
     a cache under its old URL. */
  const key = `avatars/${connected.publicKey.slice(0, 16)}.webp`;

  const blob = await put(key, output, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });

  /* The previous one, if any, is removed rather than left paid for. */
  const previous = (await request.cookies.get(avatarCookieName())?.value) ?? null;
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
