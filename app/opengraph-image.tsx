import { ImageResponse } from "next/og";
import { logoUri } from "@/lib/og-assets";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Free Radio, live voice rooms on a frequency";

/**
 * The share card.
 *
 * The logo carries the whole idea already, so the card is the object on the
 * panel and one line of copy. The drawn tick scale that used to sit here was
 * a worse version of the dial the logo has on it.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          background: "#f3f2f0",
          padding: "0 88px",
          fontFamily: "sans-serif",
        }}
      >
        <img src={logoUri()} width={380} height={380} alt="" />

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 21,
              letterSpacing: 6,
              fontWeight: 600,
              color: "#6b6862",
            }}
          >
            FREE RADIO
          </div>
          <div
            style={{
              fontSize: 62,
              fontWeight: 600,
              color: "#38352f",
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            Talking, on a frequency
          </div>
          <div style={{ fontSize: 26, color: "#6b6862", maxWidth: 520, lineHeight: 1.45 }}>
            Live voice rooms across every ecosystem. Scan a band, find a
            Co-Channel, and talk.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
