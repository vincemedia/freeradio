import "server-only";

/**
 * Cloudflare RealtimeKit, from the server.
 *
 * This is the only file that holds the API token. Nothing about RealtimeKit
 * reaches the browser except a per-participant `authToken`, which is minted
 * here, is scoped to one person in one meeting, and expires — the account
 * token itself would let its holder create meetings and read every recording
 * on the account, so it never leaves the server.
 *
 * The shape is Cloudflare's v4 API rather than Dyte's old one:
 *
 *   /accounts/{account}/realtime/kit/{app}/meetings
 *   /accounts/{account}/realtime/kit/{app}/meetings/{id}/participants
 *
 * with a plain `Authorization: Bearer`. Every response is wrapped in the v4
 * envelope — `{ success, result, errors }` — so a failed call still arrives as
 * HTTP 200 with `success: false`, which is why `call` checks the body rather
 * than only the status.
 */

const BASE = "https://api.cloudflare.com/client/v4";

export interface RealtimeConfig {
  accountId: string;
  appId: string;
  token: string;
}

/**
 * Configuration, or null when the integration is not set up.
 *
 * Null is an ordinary answer. The app has to run without RealtimeKit — during
 * development, in a preview with no secrets, and for anybody who has cloned
 * the repo — so every caller handles the absence rather than throwing at
 * import time and taking the whole page with it.
 */
export function realtimeConfig(): RealtimeConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const appId = process.env.REALTIMEKIT_APP_ID?.trim();
  const token = process.env.CLOUDFLARE?.trim();
  if (!accountId || !appId || !token) return null;
  return { accountId, appId, token };
}

export class RealtimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: unknown,
  ) {
    super(message);
    this.name = "RealtimeError";
  }
}

async function call<T>(
  config: RealtimeConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${BASE}/accounts/${config.accountId}/realtime/kit/${config.appId}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    /* Never cached: a meeting's participants and a recording's state are the
       two things here that are only ever true at the moment they are read. */
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    result?: T;
    errors?: unknown;
  } | null;

  if (!response.ok || !body?.success) {
    const detail = JSON.stringify(body?.errors ?? null);
    throw new RealtimeError(
      `RealtimeKit ${init.method ?? "GET"} ${path} failed: ${detail}`,
      response.status,
      body?.errors ?? null,
    );
  }

  return body.result as T;
}

/* ------------------------------------------------------------------ types */

export interface Meeting {
  id: string;
  title: string;
  status?: string;
  created_at?: string;
}

export interface Participant {
  id: string;
  name: string;
  custom_participant_id: string;
  preset_name: string;
  /** what the browser needs, and the only thing that may be sent to it */
  token: string;
}

export interface RecordingRow {
  id: string;
  meeting_id: string;
  status: string;
  /** present once the file is ready; a signed URL that expires */
  download_url?: string | null;
  download_url_expiry?: string | null;
  started_time?: string | null;
  stopped_time?: string | null;
  file_size?: number | null;
  session_id?: string | null;
}

/* --------------------------------------------------------------- meetings */

export function createMeeting(
  config: RealtimeConfig,
  input: { title: string; preferredRegion?: string },
): Promise<Meeting> {
  return call<Meeting>(config, "/meetings", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      preferred_region: input.preferredRegion ?? "ap-south-1",
      record_on_start: false,
      live_stream_on_start: false,
    }),
  });
}

export function getMeeting(config: RealtimeConfig, meetingId: string) {
  return call<Meeting>(config, `/meetings/${meetingId}`);
}

/**
 * Mint a participant token.
 *
 * `custom_participant_id` is our own identity for them — the person id, which
 * is derived from their wallet key — so RealtimeKit's idea of who is in the
 * room and ours cannot drift apart. Calling this twice for the same person
 * returns the same participant rather than a duplicate.
 */
export function addParticipant(
  config: RealtimeConfig,
  meetingId: string,
  input: { name: string; presetName: string; customParticipantId: string; picture?: string },
): Promise<Participant> {
  return call<Participant>(config, `/meetings/${meetingId}/participants`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      preset_name: input.presetName,
      custom_participant_id: input.customParticipantId,
      ...(input.picture ? { picture: input.picture } : {}),
    }),
  });
}

export function listParticipants(config: RealtimeConfig, meetingId: string) {
  return call<{ id: string; custom_participant_id: string; name: string }[]>(
    config,
    `/meetings/${meetingId}/participants`,
  );
}

/* ------------------------------------------------------------- recordings */

export function startRecording(config: RealtimeConfig, meetingId: string) {
  return call<RecordingRow>(config, "/recordings", {
    method: "POST",
    body: JSON.stringify({ meeting_id: meetingId }),
  });
}

export function stopRecording(config: RealtimeConfig, recordingId: string) {
  return call<RecordingRow>(config, `/recordings/${recordingId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "stop" }),
  });
}

export function activeRecording(config: RealtimeConfig, meetingId: string) {
  return call<RecordingRow | null>(
    config,
    `/recordings/active-recording/${meetingId}`,
  );
}

export function getRecording(config: RealtimeConfig, recordingId: string) {
  return call<RecordingRow>(config, `/recordings/${recordingId}`);
}

export function listRecordings(config: RealtimeConfig) {
  return call<RecordingRow[]>(config, "/recordings");
}
