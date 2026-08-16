"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ECOSYSTEM } from "@/data/ecosystems";
import { SPEAKING_MS } from "@/data/transcripts";
import type {
  CoChannelView,
  EcosystemId,
  Person,
  TranscriptLineView,
} from "@/data/schema";
import { ApiError, apiFetch, apiPost } from "@/lib/api";

/**
 * Client state, deliberately thin.
 *
 * This is not a database. Everything that is a fact about the world lives on
 * the server and arrives through `apiFetch`; what is kept here is the handful
 * of things that are genuinely about this browser: which band you are looking
 * at, whether the room is minimised, and who is speaking right now.
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
  ecosystem: EcosystemId;
  onboarded: boolean;
  minimised: boolean;
  recent: RecentRoom[];

  /* ---- live state ---- */
  session: Session | null;
  room: CoChannelView | null;
  transcript: TranscriptLineView[];
  speakingId: string | null;
  joining: boolean;

  setEcosystem: (id: EcosystemId) => void;
  setOnboarded: (v: boolean) => void;
  setMinimised: (v: boolean) => void;

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
      onboarded: false,
      minimised: false,
      recent: [],

      session: null,
      room: null,
      transcript: [],
      speakingId: null,
      joining: false,

      setEcosystem: (ecosystem) => set({ ecosystem }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setMinimised: (minimised) => set({ minimised }),

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
              minimised: false,
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
        set({ room: null, transcript: [], speakingId: null, minimised: false });
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
        onboarded: s.onboarded,
        recent: s.recent,
      }),
    },
  ),
);

/**
 * Drives the mock speaking.
 *
 * There is no audio, so "somebody is speaking" means the server advanced the
 * room's script by one line. One call gives back both the speaker and the
 * line, which is what keeps the ring and the transcript from disagreeing.
 *
 * Call this once, from the component that owns the room.
 */
export function startSpeaking(coChannelId: string): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;

  const tick = async () => {
    if (cancelled) return;
    try {
      const spoken = await apiPost<{
        personId: string;
        line: TranscriptLineView;
      }>(`/api/co-channels/${coChannelId}/transcript`);
      if (cancelled) return;

      useRadio.setState((s) => ({
        speakingId: spoken.personId,
        transcript: [...s.transcript, spoken.line],
      }));

      /* The ring is lit for exactly as long as the line lasts, then goes out.
         A ring that stays on between lines says the room is louder than it is. */
      setTimeout(() => {
        if (!cancelled) useRadio.setState({ speakingId: null });
      }, SPEAKING_MS - 600);
    } catch {
      /* Room closed. Stop rather than retrying into a hole. */
      cancelled = true;
      return;
    }
    timer = setTimeout(tick, SPEAKING_MS);
  };

  timer = setTimeout(tick, 900);

  return () => {
    cancelled = true;
    clearTimeout(timer);
    useRadio.setState({ speakingId: null });
  };
}
