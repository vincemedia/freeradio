import { NextResponse } from "next/server";

/**
 * An avatar, out of private storage.
 *
 * The Blob store on this deployment is private, so a blob cannot be handed
 * straight to an `<img>` — its own URL needs a credential, and an avatar's one
 * job is to be loadable by an ordinary image tag. So it is streamed through
 * here.
 *
 * That would be expensive if it happened per view, which is why the response
 * carries a year of immutable caching. Avatars are stored with a random suffix,
 * so a replaced picture is a different path and there is nothing to invalidate;
 * the CDN then answers almost every request and this function runs roughly once
 * per avatar per region.
 *
 * No authorisation, deliberately. Avatars are shown to everybody in every room
 * their owner enters — they are public content that happens to live in a private
 * bucket. What the private store buys is that nobody can enumerate the bucket,
 * which is a different thing from hiding a face somebody chose to show.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pathname = path.join("/");

  /* Only ever avatars. Without this the route is a read primitive for the whole
     store, which is the one thing a private bucket is for. */
  if (!pathname.startsWith("avatars/") || pathname.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { get } = await import("@vercel/blob");

  const found = await get(pathname, { access: "private" }).catch(() => null);
  if (!found || found.statusCode !== 200 || !found.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(found.stream, {
    headers: {
      /* From the stored metadata, which this route set on upload from the
         file's own magic bytes rather than from anything a client claimed. */
      "content-type": found.blob.contentType,
      "content-length": String(found.blob.size),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
