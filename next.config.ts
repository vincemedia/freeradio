import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Avatars come from Vercel Blob and nowhere else. A wildcard here makes
       this app an open image proxy for the whole internet, which is somebody
       else's bandwidth bill and our reputation. */
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  /* sharp is a native binary. Bundled by the compiler it resolves to
     something that throws at import time, which turns an avatar upload into a
     500 before any of its own checks have run. Left external, the runtime
     loads the platform build. */
  serverExternalPackages: ["web-push"],

  /**
   * The audio is immutable, so say so.
   *
   * Every one of these files is fetched on a path that repeats: the bed on every
   * room somebody joins, the tuning sweep on every press of scan, a recorded
   * broadcast on every replay. None of them ever changes — a different track
   * would be a different filename — and without a header saying that, the
   * browser revalidates each one on every visit and re-downloads it whenever the
   * answer is unclear. Nearly two megabytes of files that need fetching once.
   */
  async headers() {
    return [
      {
        source: "/audio/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

/* No `experimental.viewTransition` here on purpose. It exists, and it enables
   React's ViewTransition component, which is not in the stable React build we
   are on: with it switched on the router still never called
   startViewTransition, measured at zero. Transitions are driven explicitly
   from lib/view-transition.ts instead, so the flag would only suggest
   something is happening that is not. */

export default nextConfig;
