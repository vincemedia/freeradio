import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The same mark with room to breathe, on the panel rather than the shell. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          background: "#1e1d1c",
          padding: "52px 24px 46px",
          position: "relative",
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: i % 2 === 0 ? 46 : 24,
              background: "#8a8783",
              opacity: i % 2 === 0 ? 0.9 : 0.5,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 30,
            width: 8,
            height: 120,
            background: "#e0483a",
          }}
        />
      </div>
    ),
    size,
  );
}
