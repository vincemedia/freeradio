"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ECOSYSTEM } from "@/data/ecosystems";
import type {
  CoChannelView,
  EcosystemId,
  Person,
  TranscriptLineView,
} from "@/data/schema";
import { STATION_AUDIO } from "@/data/audio";
import { ApiError, apiFetch, apiPost } from "@/lib/api";
import * as player from "@/lib/player";

/**
 * Client state, deliberately thin.
 *
 * This is not a database. Everything that is a fact about the world lives on
 * the server and arrives through `apiFetch`; what is kept here is the handful
 * of things that are genuinely about this browser: which band you are looking
 * at and who is speaking right now.
 */

interface Session {
  me: Person;
  coChannelId: string | null;
  muted: boolean;
}

/**
 * A room you were in.
 *
 * Carries its own copy of the title and frequency because the room may not
 * exist any more, and the frequency may belong to somebody else by now. That
 * is the point of showing these: it is where the ephemerality becomes visible.
 */
export interface RecentRoom {
  id: string;
  title: string;
  frequency: number;
  ecosystem: EcosystemId;
  at: string;
}

interface RadioState {
  /* ---- persisted preferences ---- */
  /** the band you are looking at; one at a time, chosen in the top bar */
  ecosystem: EcosystemId;
  /**
   * The bands you follow.
   *
   * Distinct from the one you are on: following is a standing interest, and
   * the switch puts these first so the bands you care about are not buried
   * under the ones you do not. Never empty, since an empty list would leave
   * the switch with nothing to put at the top.
   */
  followed: EcosystemId[];
  onboarded: boolean;
  /**
   * Whether the hint pointing back at the band has been dismissed.
   *
   * First run drops you straight into a station, which is a good first
   * impression and a bad map: you are somewhere before you know there is
   * anywhere else. The hint says where the rest is, once, and never again.
   */
  seenOnAirHint: boolean;
  recent: RecentRoom[];
  /**
   * Whether to play the sound of a station you are in.
   *
   * Distinct from `muted`, which is your microphone. Muting yourself and
   * turning the room down are different acts and a radio has a control for
   * each; collapsing them into one is how you end up unable to listen
   * without also being heard.
   */
  listening: boolean;

  /* ---- live state ---- */
  session: Session | null;
  room: CoChannelView | null;
  transcript: TranscriptLineView[];
  speakingId: string | null;
  /**
   * Where the current turn sits in its recording, in seconds.
   *
   * Only set in a room with a file behind it. It is what lets the level meter
   * read the envelope at the part of the file being spoken rather than
   * replaying the opening on every turn.
   */
  speakingAt: number | null;
  /** the browser refused to start audio and is waiting for a gesture */
  audioBlocked: boolean;
  joining: boolean;

  setListening: (v: boolean) => void;
  /** try again after a gesture; resolves to whether sound is now playing */
  resumeAudio: () => Promise<boolean>;
  setEcosystem: (id: EcosystemId) => void;
  /** follow or unfollow a band; refuses to leave the list empty */
  toggleFollowed: (id: EcosystemId) => void;
  setOnboarded: (v: boolean) => void;
  dismissOnAirHint: () => void;

  refreshSession: () => Promise<void>;
  openRoom: (id: string) => Promise<void>;
  join: (id: string) => Promise<{ ok: boolean; error?: string; reasons?: string[] }>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  postNestLink: (url: string, title: string) => Promise<boolean>;
  refreshRoom: () => Promise<void>;
}

export const useRadio = create<RadioState>()(
  persist(
    (set, get) => ({
      ecosystem: DEFAULT_ECOSYSTEM,
      /* Nexus to begin with: it is the hub you are signed into, so it is the
         one band you are definitely on. */
      followed: [DEFAULT_ECOSYSTEM],
      onboarded: false,
      seenOnAirHint: false,
      recent: [],
      listening: true,

      session: null,
      room: null,
      transcript: [],
      speakingId: null,
      speakingAt: null,
      audioBlocked: false,
      joining: false,

      setListening: (listening) => {
        set({ listening });
        player.setMuted(!listening);
        /* Turning the sound on is a gesture, so it is also the moment a
           blocked player is allowed to start. */
        if (listening) void get().resumeAudio();
      },

      resumeAudio: async () => {
        const ok = await player.resume();
        set({ audioBlocked: !ok });
        return ok;
      },

      setEcosystem: (ecosystem) => set({ ecosystem }),

      toggleFollowed: (id) =>
        set((s) => {
          const following = s.followed.includes(id);
          /* Unfollowing the last one would empty the list, so the control
             stops rather than the state going somewhere unusable. */
          if (following && s.followed.length === 1) return s;
          return {
            followed: following
              ? s.followed.filter((x) => x !== id)
              : [...s.followed, id],
          };
        }),
      setOnboarded: (onboarded) => set({ onboarded }),
      dismissOnAirHint: () => set({ seenOnAirHint: true }),

      refreshSession: async () => {
        const session = await apiFetch<Session>("/api/session");
        set({ session });
        if (session.coChannelId && !get().room) {
          await get().openRoom(session.coChannelId);
        }
      },

      openRoom: async (id) => {
        const [room, transcript] = await Promise.all([
          apiFetch<CoChannelView>(`/api/co-channels/${id}`),
          apiFetch<TranscriptLineView[]>(`/api/co-channels/${id}/transcript`),
        ]);
        set({ room, transcript });
      },

      refreshRoom: async () => {
        const id = get().room?.id;
        if (!id) return;
        try {
          set({ room: await apiFetch<CoChannelView>(`/api/co-channels/${id}`) });
        } catch {
          /* The room closed while we were in it. */
          set({ room: null, transcript: [], speakingId: null });
        }
      },

      join: async (id) => {
        set({ joining: true });
        try {
          await apiPost(`/api/co-channels/${id}/join`);
          await get().refreshSession();
          await get().openRoom(id);
          const room = get().room;
          if (room) {
            /* Newest first, deduped, capped. A recent list that grows without
               limit is an archive nobody asked for. */
            set((s) => ({
              recent: [
                {
                  id: room.id,
                  title: room.title,
                  frequency: room.frequency,
                  ecosystem: room.ecosystem,
                  at: new Date().toISOString(),
                },
                ...s.recent.filter((r) => r.id !== room.id),
              ].slice(0, 6),
            }));
          }
          return { ok: true };
        } catch (e) {
          if (e instanceof ApiError) {
            return { ok: false, error: e.message, reasons: e.reasons };
          }
          return { ok: false, error: "Could not join." };
        } finally {
          set({ joining: false });
        }
      },

      leave: async () => {
        await apiFetch("/api/session", { method: "DELETE" });
        set({ room: null, transcript: [], speakingId: null });
        await get().refreshSession();
      },

      toggleMute: async () => {
        const { session, room } = get();
        if (!session || !room) return;
        const muted = !session.muted;
        set({ session: { ...session, muted } });
        await apiPost(`/api/co-channels/${room.id}/mute`, { muted });
        await get().refreshRoom();
      },

      toggleRecording: async () => {
        const { room } = get();
        if (!room) return;
        await apiPost(`/api/co-channels/${room.id}/recording`, {
          recording: !room.recording,
        });
        await get().refreshRoom();
      },

      postNestLink: async (url, title) => {
        const { room } = get();
        if (!room) return false;
        try {
          const updated = await apiPost<CoChannelView>(
            `/api/co-channels/${room.id}/nest`,
            { url, title },
          );
          set({ room: updated });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "free-radio",
      /* Only preferences persist. Live state is the server's to tell us. */
      partialize: (s) => ({
        ecosystem: s.ecosystem,
        followed: s.followed,
        onboarded: s.onboarded,
        seenOnAirHint: s.seenOnAirHint,
        recent: s.recent,
        listening: s.listening,
      }),
    },
  ),
);

/**
 * Drives the room: who is speaking, for how long, and the sound of it.
 *
 * "Somebody is speaking" means the server advanced the room's script by one
 * line. One call gives back the speaker, the line and its timing, which is
 * what keeps the ring, the words and the clock from disagreeing.
 *
 * On the three stations with a file behind them that call also says where the
 * turn sits in the recording, so the player is seeked there and the sound is
 * the thing you are reading. The audio is not a second timeline running
 * alongside the transcript; it is the same one, playing.
 *
 * Call this once, from the component that owns the room.
 */
export function startSpeaking(coChannelId: string): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;

  const src = STATION_AUDIO[coChannelId]?.src;
  /* Somebody else took the player. Nothing to undo: the next line claims it
     back if this room is still the one on screen. */
  const onLost = () => {};

  const tick = async () => {
    if (cancelled) return;
    try {
      const spoken = await apiPost<{
        personId: string;
        line: TranscriptLineView;
        holdMs: number;
        gapMs: number;
        audioAtMs?: number;
      }>(`/api/co-channels/${coChannelId}/transcript`);
      if (cancelled) return;

      const at = spoken.audioAtMs != null ? spoken.audioAtMs / 1000 : null;

      useRadio.setState((s) => ({
        speakingId: spoken.personId,
        speakingAt: at,
        transcript: [...s.transcript, spoken.line],
      }));

      if (src && at != null) {
        const { listening } = useRadio.getState();
        player.setMuted(!listening);
        void player.claim(src, at, onLost).then((started) => {
          if (!cancelled) useRadio.setState({ audioBlocked: !started });
        });
      }

      /* The ring is lit for exactly as long as the line lasts, then goes out
         for the silence after it. A ring that stays on between turns says the
         room is louder than it is. */
      setTimeout(() => {
        if (!cancelled) useRadio.setState({ speakingId: null, speakingAt: null });
      }, spoken.holdMs);

      timer = setTimeout(tick, spoken.holdMs + spoken.gapMs);
    } catch {
      /* Room closed. Stop rather than retrying into a hole. */
      cancelled = true;
    }
  };

  timer = setTimeout(tick, 900);

  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (src) player.release(onLost);
    useRadio.setState({ speakingId: null, speakingAt: null, audioBlocked: false });
  };
}
