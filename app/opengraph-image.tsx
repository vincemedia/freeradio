import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Free Radio, live voice rooms on a frequency";

/** The share card: the panel, the scale, the wordmark small on a neutral field. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f3f2f0",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 6,
            fontWeight: 600,
            color: "#38352f",
          }}
        >
          FREE RADIO
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontSize: 68, fontWeight: 600, color: "#38352f", letterSpacing: -2 }}>
            Talking, on a frequency
          </div>

          {/* The scale, drawn the way the product draws it. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: 92,
              background: "#ffffff",
              border: "1px solid #dedcd8",
              borderRadius: 6,
              padding: "0 22px 18px",
              position: "relative",
            }}
          >
            {Array.from({ length: 42 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: i % 4 === 0 ? 22 : 11,
                  background: i % 4 === 0 ? "#38352f" : "#8a8783",
                  opacity: i % 4 === 0 ? 0.85 : 0.45,
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: 486,
                top: 10,
                bottom: 10,
                width: 4,
                background: "#e0483a",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 470,
                bottom: 18,
                width: 12,
                height: 44,
                background: "#f5c518",
                borderRadius: 2,
              }}
            />
          </div>

          <div style={{ fontSize: 27, color: "#6b6862", maxWidth: 900 }}>
            Live voice rooms across every ecosystem. Scan a band, find a
            Co-Channel, and talk.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
