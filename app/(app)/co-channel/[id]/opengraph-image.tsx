import { ImageResponse } from "next/og";
import { getEcosystem } from "@/data/ecosystems";
import { GATE_LABEL } from "@/lib/gates";
import { avatarFallback, avatarUri, bandMarkUri, logoUri } from "@/lib/og-assets";
import { getCoChannel } from "@/lib/server/store";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Co-Channel on Free Radio";

const INK = "#38352f";
const MUTED = "#6b6862";
const PANEL = "#f3f2f0";
const LINE = "#dedcd8";
const FACES = 6;

/**
 * A permalink's own share card.
 *
 * Carries what somebody needs to decide whether to follow the link, in the
 * order they need it: the frequency and the band, since a frequency alone
 * means nothing without the band it sits on; what the room is called and what
 * it is about; then who is in there and whether there is a door.
 *
 * A room that has closed says so rather than rendering an empty panel.
 */
export default async function CoChannelImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = getCoChannel(id);
  const band = room ? getEcosystem(room.ecosystem) : undefined;
  const mark = room ? bandMarkUri(room.ecosystem) : null;

  const faces = room ? room.occupants.slice(0, FACES) : [];
  const rest = room ? room.occupantCount - faces.length : 0;

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
        {/* ---- wordmark, and the states worth knowing before you click ---- */}
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

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {room && room.primaryGate !== "open" && (
              <div
                style={{
                  display: "flex",
                  border: `1px solid ${LINE}`,
                  color: MUTED,
                  fontSize: 19,
                  fontWeight: 500,
                  padding: "7px 13px",
                  borderRadius: 3,
                }}
              >
                {GATE_LABEL[room.primaryGate]}
              </div>
            )}
            {room?.recording && (
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
            )}
          </div>
        </div>

        {room ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* ---- frequency, and the band it belongs to ---- */}
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span
                style={{
                  fontSize: 104,
                  fontWeight: 700,
                  letterSpacing: -4,
                  color: INK,
                }}
              >
                {room.frequency.toFixed(1)}
              </span>
              <span style={{ fontSize: 27, color: MUTED, paddingTop: 34 }}>
                MHz
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  paddingTop: 34,
                }}
              >
                {mark && <img src={mark} width={28} height={28} alt="" />}
                <span style={{ fontSize: 27, color: MUTED }}>
                  {`@${band?.alias ?? room.ecosystem}`}
                </span>
              </div>
            </div>

            {/* ---- what it is called, and what it is about ---- */}
            <div
              style={{
                fontSize: 50,
                fontWeight: 600,
                color: INK,
                letterSpacing: -1.4,
                lineHeight: 1.12,
                maxWidth: 1010,
              }}
            >
              {room.title}
            </div>
            {room.topic && (
              <div
                style={{
                  fontSize: 27,
                  color: MUTED,
                  lineHeight: 1.4,
                  maxWidth: 940,
                }}
              >
                {room.topic}
              </div>
            )}

            {/* ---- who is in there ---- */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 10,
              }}
            >
              <div style={{ display: "flex" }}>
                {faces.map((o, i) => {
                  const photo = avatarUri(o.person);
                  return (
                    /* The ring is a padded wrapper rather than a border: a
                       border here is measured differently than in a browser,
                       and the photo ended up inset with the fill showing
                       around it. */
                    <div
                      key={o.id}
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
                          overflow: "hidden",
                          /* Most people have no photo. The app draws a
                             generated marble for them, and a gradient from the
                             same palette is the closest a static card gets. */
                          background: photo ? LINE : avatarFallback(o.person),
                        }}
                      >
                        {photo && (
                          /* The radius goes on the image, not the wrapper:
                             overflow:hidden does not clip a child image here,
                             so a square photo came out square. */
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
                {`${room.occupantCount} in the room${rest > 0 ? `, ${rest} not shown` : ""}`}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 56, fontWeight: 600, color: INK }}>
              This Co-Channel has closed
            </div>
            <div style={{ fontSize: 26, color: MUTED }}>
              Its frequency has gone back into the pool.
            </div>
          </div>
        )}

        {/* ---- the band, drawn ---- */}
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
