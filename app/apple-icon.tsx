import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon.
 *
 * Flattened onto the dark shell rather than left transparent: iOS composites a
 * transparent icon onto black, which would put hard black corners inside its
 * own rounded mask. The logo is a white object, so the dark ground is also
 * what makes it read at this size.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e1d1c",
        }}
      >
        <img src={logoDataUri()} width={152} height={152} alt="" />
      </div>
    ),
    size,
  );
}
