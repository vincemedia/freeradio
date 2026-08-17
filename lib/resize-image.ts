"use client";

/**
 * Turning whatever somebody picked into the one thing the server accepts.
 *
 * ## Why this moved out of the server
 *
 * It was `sharp`, on the server, and it never once worked in production. Four
 * deploys chasing a native binary — the wrong platform, then a missing shared
 * library, then a version of libvips invented rather than read — and every
 * failure looked identical from outside: a 500 on upload. The decoder was the
 * whole reason the route existed and the only part of it that could not be made
 * to run.
 *
 * The browser already has an image decoder. It is the one that will display the
 * result, it is sandboxed, it needs no binary shipped to a Lambda, and it can do
 * the work before six megabytes are sent anywhere. So the resize happens here
 * and the server's job becomes narrower and stricter: accept one format, one
 * size, one shape, and refuse everything else.
 *
 * ## What is kept, and what is given up
 *
 * Kept: the stored file shares no bytes with the one somebody picked. Canvas
 * export is a fresh encode from raw pixels, so EXIF goes — including where the
 * photograph was taken — along with any trailing payload and anything clever in
 * the original container. That was the security claim worth having and it still
 * holds.
 *
 * Given up: the server no longer *proves* that by re-encoding. It checks the
 * magic bytes, the declared type and the length, so what it stores is a small
 * WebP or nothing — but a determined client could hand it a hostile small WebP
 * rather than one this function made. That is the same exposure every site with
 * user avatars carries, and it is a real reduction from before. It is written
 * down here rather than quietly forgotten, and the privacy policy says the
 * browser does the re-encoding rather than claiming the server does.
 */

/** What an avatar is ever displayed at, doubled for retina, and no more. */
const SIZE = 256;

/** Enough for a face at 256px; small enough that the server can be strict. */
const QUALITY = 0.82;

export class ImageTooLargeError extends Error {
  constructor() {
    super("That image is too large.");
    this.name = "ImageTooLargeError";
  }
}

export class NotAnImageError extends Error {
  constructor() {
    super("That file is not an image.");
    this.name = "NotAnImageError";
  }
}

/** Refused before decoding. Generous for a photo, mean for a payload. */
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/**
 * A square WebP, cropped from the middle, ready to upload.
 *
 * SVG is refused here as well as on the server. It is a document format with
 * script and external references in it, and while a canvas would flatten it,
 * "we render your SVG in order to make it safe" is not a sentence worth
 * standing behind.
 */
export async function squareWebp(file: File): Promise<Blob> {
  if (file.size > MAX_INPUT_BYTES) throw new ImageTooLargeError();
  if (file.type === "image/svg+xml") throw new NotAnImageError();

  const bitmap = await decode(file);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new NotAnImageError();

    /* Cover, centred: the shortest side fills the square and the rest is
       cropped, which is what every avatar in the product assumes. Letterboxing
       a portrait into a circle looks like a mistake. */
    const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(
      bitmap,
      (SIZE - width) / 2,
      (SIZE - height) / 2,
      width,
      height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", QUALITY);
    });
    /* A browser with no WebP encoder would hand back a PNG under the wrong
       type, or nothing. Either way this is not the file the server accepts. */
    if (!blob || blob.type !== "image/webp") throw new NotAnImageError();
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Decode, without letting a hostile file become an exception nobody expected.
 *
 * `createImageBitmap` is the decoder the browser uses for everything else, and
 * anything it will not decode is not an image as far as this product is
 * concerned — which is the same test the server used to apply, in the same
 * decoder family, one process closer to the person who chose the file.
 */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new NotAnImageError();
  }
}
