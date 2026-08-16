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
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
