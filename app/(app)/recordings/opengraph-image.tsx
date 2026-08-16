import { ImageResponse } from "next/og";
import { logoUri } from "@/lib/og-assets";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Recordings on Free Radio";

const INK = "#38352f";
const MUTED = "#6b6862";
const PANEL = "#f3f2f0";

/**
 * The archive's card.
 *
 * Like the scanner's, it carries no counts: a scraped card keeps whatever
 * number it was born with. What it says instead is the one durable fact about
 * this page, which is also the product's sharpest rule, that a recording is
 * the only thing a Co-Channel leaves behind.
 */
export default function RecordingsImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PANEL,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logoUri()} width={52} height={52} alt="" />
            <div style={{ fontSize: 18, letterSpacing: 5, fontWeight: 600, color: MUTED }}>
              FREE RADIO
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#d13d2f",
              color: "#fff",
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: 1,
              padding: "8px 14px",
              borderRadius: 3,
            }}
          >
            RECORDED
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 600,
              color: INK,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            Recordings
          </div>
          <div style={{ fontSize: 27, color: MUTED, maxWidth: 860, lineHeight: 1.4 }}>
            A Co-Channel closes when the last person leaves and its frequency
            goes back into the pool. A recording is the only thing that
            outlives the room.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: 34,
          }}
        >
          {Array.from({ length: 44 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 2,
                height: i % 4 === 0 ? 18 : 9,
                background: i % 4 === 0 ? INK : "#8a8783",
                opacity: i % 4 === 0 ? 0.8 : 0.4,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
