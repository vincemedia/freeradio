import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Free Radio",
    short_name: "Free Radio",
    description:
      "Live voice rooms on a frequency. Scan a band, find a Co-Channel, and talk.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f0",
    theme_color: "#f3f2f0",
    icons: [
      /* The logo itself for the maskable slot, since it is already a rounded
         square on a transparent ground, and the flattened Apple icon for the
         home screen. */
      {
        src: "/freeradio-logo.png",
        sizes: "600x600",
        type: "image/png",
        purpose: "any",
      },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
