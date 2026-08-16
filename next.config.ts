import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

/* No `experimental.viewTransition` here on purpose. It exists, and it enables
   React's ViewTransition component, which is not in the stable React build we
   are on: with it switched on the router still never called
   startViewTransition, measured at zero. Transitions are driven explicitly
   from lib/view-transition.ts instead, so the flag would only suggest
   something is happening that is not. */

export default nextConfig;
