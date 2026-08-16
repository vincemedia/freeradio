/**
 * One-time RealtimeKit setup.
 *
 * Creates the app if there is not one, then the three presets the product
 * needs, then prints the ids to put in the environment. Idempotent: run it
 * again and it finds what already exists rather than making a second of
 * everything.
 *
 * The presets are the whole permission model, and they are defined here rather
 * than clicked together in a dashboard so the rules a room runs under are in
 * the repository next to the code that relies on them:
 *
 *   host      — talks, mutes anyone, removes anyone, records.
 *   speaker   — talks. Cannot mute anybody but themselves.
 *   listener  — hears the room and cannot transmit. What a visitor with no
 *               wallet gets, and the reason that state is not a fiction.
 *
 * Everybody arrives with their microphone off. `can_produce: ALLOWED` is
 * permission to speak, not an open microphone: the client joins muted and the
 * person decides when to be heard.
 *
 * Run with `bun run realtime:bootstrap`.
 */

const BASE = "https://api.cloudflare.com/client/v4";

const token = process.env.CLOUDFLARE?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

if (!token) {
  console.error("CLOUDFLARE is not set. Add the API token to .env.local.");
  process.exit(1);
}
if (!accountId) {
  console.error(
    "CLOUDFLARE_ACCOUNT_ID is not set.\n" +
      "Find it in the Cloudflare dashboard sidebar, or in the URL after /accounts/.",
  );
  process.exit(1);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    result?: T;
    errors?: unknown;
  } | null;
  if (!response.ok || !body?.success) {
    throw new Error(
      `${init.method ?? "GET"} ${path} → ${response.status} ${JSON.stringify(body?.errors ?? body)}`,
    );
  }
  return body.result as T;
}

/** Shared by every preset: an audio room, no video anywhere. */
const CONFIG = {
  view_type: "AUDIO_ROOM" as const,
  max_screenshare_count: 0,
  max_video_streams: { desktop: 0, mobile: 0 },
  media: {
    audio: { enable_high_bitrate: true, enable_stereo: false },
    video: { frame_rate: 24, quality: "vga" as const },
    screenshare: { frame_rate: 24, quality: "vga" as const },
  },
};

const NONE = { can_produce: "NOT_ALLOWED" as const };
const ALLOWED = { can_produce: "ALLOWED" as const };

function permissions(role: "host" | "speaker" | "listener") {
  const canTalk = role !== "listener";
  const isHost = role === "host";
  return {
    media: {
      audio: canTalk ? ALLOWED : NONE,
      video: NONE,
      screenshare: NONE,
    },
    /* Only the host moderates. A room where anybody can silence anybody is
       not a room with a host, it is a fight. */
    disable_participant_audio: isHost,
    disable_participant_video: false,
    disable_participant_screensharing: false,
    kick_participant: isHost,
    can_record: isHost,
    can_livestream: false,
    can_spotlight: isHost,
    pin_participant: isHost,
    can_change_participant_permissions: isHost,
    can_accept_production_requests: isHost,
    accept_waiting_requests: isHost,
    accept_stage_requests: isHost,
    stage_enabled: false,
    is_recorder: false,
    hidden_participant: false,
    /* Everyone in a Co-Channel is visible to everyone else. That is the one
       rule this product has always had, and it is a permission here rather
       than a convention. */
    show_participant_list: true,
    can_edit_display_name: false,
    transcription_enabled: true,
    waiting_room_type: "SKIP",
    recorder_type: "SFU",
    /* The Nest is ours, not RealtimeKit's chat. */
    chat: {
      public: { can_send: false, text: false, files: false },
      private: { can_send: false, text: false, files: false },
    },
    polls: { can_create: false, can_vote: false, can_view: false },
    plugins: { can_close: false, can_start: false, can_edit_config: false },
    connected_meetings: {
      can_alter_connected_meetings: false,
      can_switch_connected_meetings: false,
      can_switch_to_parent_meeting: false,
    },
  };
}

async function main() {
  /* ---- the app ---- */
  const apps = await api<{ id: string; name: string }[]>("/realtime/kit/apps");
  const wanted = "free-radio";
  let app = apps.find((a) => a.name === wanted);

  if (app) {
    console.log(`app        ${app.id}  (existing, "${app.name}")`);
  } else {
    app = await api<{ id: string; name: string }>("/realtime/kit/apps", {
      method: "POST",
      body: JSON.stringify({ name: wanted }),
    });
    console.log(`app        ${app.id}  (created, "${wanted}")`);
  }

  /* ---- the presets ---- */
  const existing = await api<{ id: string; name: string }[]>(
    `/realtime/kit/${app.id}/presets`,
  );

  for (const role of ["host", "speaker", "listener"] as const) {
    const name = `free-radio-${role}`;
    const found = existing.find((p) => p.name === name);
    if (found) {
      console.log(`preset     ${name}  (existing)`);
      continue;
    }
    await api(`/realtime/kit/${app.id}/presets`, {
      method: "POST",
      body: JSON.stringify({
        name,
        config: CONFIG,
        permissions: permissions(role),
      }),
    });
    console.log(`preset     ${name}  (created)`);
  }

  console.log(
    `\nAdd to .env.local and to Vercel:\n\n  CLOUDFLARE_ACCOUNT_ID=${accountId}\n  REALTIMEKIT_APP_ID=${app.id}\n`,
  );
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
