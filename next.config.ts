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
};

/* No `experimental.viewTransition` here on purpose. It exists, and it enables
   React's ViewTransition component, which is not in the stable React build we
   are on: with it switched on the router still never called
   startViewTransition, measured at zero. Transitions are driven explicitly
   from lib/view-transition.ts instead, so the flag would only suggest
   something is happening that is not. */

export default nextConfig;
