import { ImageResponse } from "next/og";
import { BAND } from "@/data/ecosystems";
import { logoUri } from "@/lib/og-assets";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Scan the band on Free Radio";

const INK = "#38352f";
const MUTED = "#6b6862";
const PANEL = "#f3f2f0";

/**
 * The scanner's card.
 *
 * Deliberately carries no counts. A share card is cached by whoever scrapes
 * it, so a number baked in here would be frozen at whatever it was the first
 * time somebody posted the link, and would then be wrong for as long as it
 * survives. What is permanently true about this page is the instrument: a
 * band with gaps in it, and a needle somewhere along it.
 */
export default function ScanImage() {
  const ticks = Array.from({ length: 42 });
  /* Marks at no particular frequencies: this is the shape of a band, not a
     snapshot of one. */
  const stations = [4, 11, 19, 26, 34];
  const needle = 19;

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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={logoUri()} width={52} height={52} alt="" />
          <div style={{ fontSize: 18, letterSpacing: 5, fontWeight: 600, color: MUTED }}>
            FREE RADIO
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
            Scan the band
          </div>
          <div style={{ fontSize: 27, color: MUTED, maxWidth: 820, lineHeight: 1.4 }}>
            Every Co-Channel at the frequency it holds, and the gaps in
            between. The gaps are the point: a list tells you what exists, a
            band tells you how much of it there is.
          </div>
        </div>

        {/* The dial, drawn the way the product draws it. */}
        <div
          style={{
            display: "flex",
            position: "relative",
            height: 116,
            background: "#fff",
            border: "1px solid #dedcd8",
            borderRadius: 6,
            padding: "16px 26px",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          {ticks.map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 2,
              }}
            >
              <div
                style={{
                  width: 2,
                  height: i % 4 === 0 ? 20 : 10,
                  background: i % 4 === 0 ? INK : "#8a8783",
                  opacity: i % 4 === 0 ? 0.85 : 0.45,
                }}
              />
              {stations.includes(i) && (
                <div
                  style={{
                    width: i === needle ? 8 : 4,
                    height: i === needle ? 44 : 30,
                    marginTop: 20,
                    borderRadius: 2,
                    background: i === needle ? "#f5c518" : "#8a8783",
                    opacity: i === needle ? 1 : 0.6,
                  }}
                />
              )}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 26 + (needle / (ticks.length - 1)) * (1072 - 52) + 1,
              top: 12,
              width: 3,
              height: 92,
              background: "#e0483a",
            }}
          />
        </div>

        <div style={{ display: "flex", fontSize: 22, color: MUTED }}>
          {`${BAND.min.toFixed(1)} to ${BAND.max.toFixed(1)} MHz, on every ecosystem`}
        </div>
      </div>
    ),
    size,
  );
}
