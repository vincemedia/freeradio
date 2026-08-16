import { ImageResponse } from "next/og";
import { getCoChannel } from "@/lib/server/store";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Co-Channel on Free Radio";

/**
 * A permalink's own share card.
 *
 * Carries the frequency and the title, because those are the two things
 * somebody needs to decide whether to follow the link. A room that has closed
 * says so rather than rendering a blank panel.
 */
export default async function CoChannelImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = getCoChannel(id);

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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 20, letterSpacing: 6, fontWeight: 600, color: "#38352f" }}>
            FREE RADIO
          </div>
          {room?.recording && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#d13d2f",
                color: "#fff",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: 1,
                padding: "8px 14px",
                borderRadius: 3,
              }}
            >
              RECORDING
            </div>
          )}
        </div>

        {room ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                color: "#38352f",
              }}
            >
              <span style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
                {room.frequency.toFixed(1)}
              </span>
              <span style={{ fontSize: 30, color: "#6b6862" }}>
                {`MHz · ${room.ecosystem}`}
              </span>
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 600,
                color: "#38352f",
                letterSpacing: -1.4,
                maxWidth: 1000,
              }}
            >
              {room.title}
            </div>
            {/* One string, not several interpolations: Satori requires an
                explicit display on any element with more than one child. */}
            <div style={{ fontSize: 26, color: "#6b6862" }}>
              {`${room.occupantCount} in the room · hosted by @${room.host.handle}@${room.host.ecosystem}`}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 56, fontWeight: 600, color: "#38352f" }}>
              This Co-Channel has closed
            </div>
            <div style={{ fontSize: 26, color: "#6b6862" }}>
              Its frequency has gone back into the pool.
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: 40,
          }}
        >
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 2,
                height: i % 4 === 0 ? 20 : 10,
                background: i % 4 === 0 ? "#38352f" : "#8a8783",
                opacity: i % 4 === 0 ? 0.85 : 0.4,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
