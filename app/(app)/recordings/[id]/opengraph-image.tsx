import { ImageResponse } from "next/og";
import { getEcosystem } from "@/data/ecosystems";
import { formatDuration } from "@/lib/format";
import { avatarFallback, avatarUri, bandMarkUri, logoUri } from "@/lib/og-assets";
import { getPerson, getRecording } from "@/lib/server/store";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A recording on Free Radio";

const INK = "#38352f";
const MUTED = "#6b6862";
const PANEL = "#f3f2f0";
const LINE = "#dedcd8";
const FACES = 6;

/**
 * A recording's own card.
 *
 * Unlike a live room, everything here is fixed forever: the length, the date,
 * who was in it. That is the whole difference between the two cards, and why
 * this one can safely carry numbers where the archive's index cannot. A
 * scraper caching this is caching something that was never going to change.
 */
export default async function RecordingImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recording = getRecording(id);
  const host = recording ? getPerson(recording.hostId) : undefined;
  const band = recording ? getEcosystem(recording.ecosystem) : undefined;
  const mark = recording ? bandMarkUri(recording.ecosystem) : null;

  const people = recording
    ? recording.occupantIds
        .map((personId) => getPerson(personId))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : [];
  const faces = people.slice(0, FACES);

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
            <div
              style={{
                fontSize: 18,
                letterSpacing: 5,
                fontWeight: 600,
                color: MUTED,
              }}
            >
              FREE RADIO
            </div>
          </div>
          <div
            style={{
              display: "flex",
              background: "#d13d2f",
              color: "#fff",
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: 1,
              padding: "8px 14px",
              borderRadius: 3,
            }}
          >
            RECORDING
          </div>
        </div>

        {recording ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: INK,
                  letterSpacing: -1,
                }}
              >
                {formatDuration(recording.duration)}
              </span>
              <span style={{ fontSize: 25, color: MUTED }}>
                {`from ${recording.frequency.toFixed(1)} MHz`}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {mark && <img src={mark} width={26} height={26} alt="" />}
                <span style={{ fontSize: 25, color: MUTED }}>
                  {`@${band?.alias ?? recording.ecosystem}`}
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: 54,
                fontWeight: 600,
                color: INK,
                letterSpacing: -1.6,
                lineHeight: 1.1,
                maxWidth: 1010,
              }}
            >
              {recording.title}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex" }}>
                {faces.map((p, i) => {
                  const photo = avatarUri(p);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        padding: 3,
                        borderRadius: 31,
                        background: PANEL,
                        marginLeft: i === 0 ? 0 : -18,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          background: photo ? LINE : avatarFallback(p),
                        }}
                      >
                        {photo && (
                          <img
                            src={photo}
                            width={56}
                            height={56}
                            alt=""
                            style={{ objectFit: "cover", borderRadius: 28 }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <span style={{ fontSize: 25, color: MUTED }}>
                {host
                  ? `hosted by @${host.handle}@${host.ecosystem}`
                  : `${people.length} in the room`}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 56, fontWeight: 600, color: INK }}>
              No such recording
            </div>
            <div style={{ fontSize: 26, color: MUTED }}>
              It may never have existed, or the host may have taken it down.
            </div>
          </div>
        )}

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
