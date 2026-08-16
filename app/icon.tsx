import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The mark: a scale and a needle.
 *
 * At 32px there is room for exactly one idea, and the needle on a scale is
 * the one thing this product is about. No wordmark, no gloss.
 */
export default function Icon() {
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
          padding: "9px 4px 8px",
          position: "relative",
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              width: 2,
              height: i % 2 === 0 ? 11 : 6,
              background: "#8a8783",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 17,
            top: 4,
            width: 2,
            height: 24,
            background: "#e0483a",
          }}
        />
      </div>
    ),
    size,
  );
}
