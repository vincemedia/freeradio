"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ECOSYSTEM, DEFAULT_FOLLOWED } from "@/data/ecosystems";
import type { CoChannelView, EcosystemId, Person } from "@/data/schema";
import { ApiError, apiFetch, apiPost, apiPut } from "@/lib/api";

/**
 * Client state, deliberately thin.
 *
 * This is not a database, and it is no longer a simulation either. Everything
 * that is a fact about the world lives on the server or inside the RealtimeKit
 * meeting; what is kept here is the handful of things that are genuinely about
 * this browser — which band you are looking at, who you are connected as, and
 * where you have been.
 *
 * There used to be a machine in this file that pretended a room was talking: a
 * script advancing on a timer, a speaking id, a level derived from two sines.
 * Live rooms have real microphones now and recorded ones have real files, so
 * none of it has anything left to imitate.
 */

/**
 * What the server says about who is connected.
 *
 * `connected: false` is ordinary rather than an error. The band, the recorded
 * stations and listening to a live one all work without a wallet; only being
 * heard needs one.
 */
interface Session {
  connected: boolean;
  me: Person | null;
  username: string | null;
  coChannelId: string | null;
  muted: boolean;
}

/**
 * A station you have been in or played.
 *
 * Carries its own copy of the title and frequency because a live room may not
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
  /**
   * The bands you follow.
   *
   * Distinct from the one you are on: following is a standing interest, and
   * the switch puts these first. Never empty.
   */
  followed: EcosystemId[];
  onboarded: boolean;
  /** whether the hint pointing back at the band has been dismissed */
  seenOnAirHint: boolean;
  recent: RecentRoom[];

  /* ---- live state ---- */
  session: Session | null;
  connecting: boolean;

  setEcosystem: (id: EcosystemId) => void;
  toggleFollowed: (id: EcosystemId) => void;
  setOnboarded: (v: boolean) => void;
  dismissOnAirHint: () => void;

  refreshSession: () => Promise<void>;
  /** hand the wallet's identity key to the server */
  connect: () => Promise<{ ok: boolean; error?: string }>;
  /** name this identity; works before a wallet is connected */
  setUsername: (username: string) => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  /** remember a station you opened, for "You were in" */
  remember: (room: CoChannelView) => void;
}

export const useRadio = create<RadioState>()(
  persist(
    (set, get) => ({
      ecosystem: DEFAULT_ECOSYSTEM,
      followed: [...DEFAULT_FOLLOWED],
      onboarded: false,
      seenOnAirHint: false,
      recent: [],

      session: null,
      connecting: false,

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
        try {
          set({ session: await apiFetch<Session>("/api/session") });
        } catch {
          /* Read as disconnected, which the app fully supports. */
          set({ session: null });
        }
      },

      /**
       * Connect.
       *
       * Asks the browser's wallet for an identity key and hands it to the
       * server. A missing wallet is reported rather than worked around: there
       * is no demo identity any more, because two people sharing one is
       * exactly what broke once rooms became real.
       */
      connect: async () => {
        set({ connecting: true });
        try {
          const { connectWallet, signChallenge } = await import("@/lib/wallet");
          const identity = await connectWallet();

          /* A key on its own proves nothing — it is public, and printed in
             every room its owner enters. So the server issues a nonce, the
             wallet signs it with the private key it never hands over, and the
             signature is what establishes the session. */
          const { challenge } = await apiPut<{ challenge: string }>(
            "/api/session",
          );
          const signature = await signChallenge(challenge);

          const session = await apiPost<Session>("/api/session", {
            publicKey: identity.publicKey,
            challenge,
            signature,
            /* Carried through so a name chosen before connecting sticks to
               the key that arrives. */
            username: get().session?.username ?? undefined,
          });
          set({ session });
          return { ok: true };
        } catch (e) {
          const error =
            (e as Error)?.name === "NoWalletError"
              ? "No BRC-100 wallet answered in this browser."
              : e instanceof ApiError
                ? e.message
                : "Your wallet did not connect.";
          return { ok: false, error };
        } finally {
          set({ connecting: false });
        }
      },

      setUsername: async (username) => {
        try {
          const session = await apiFetch<Session>("/api/session", {
            method: "PATCH",
            body: JSON.stringify({ username }),
            headers: { "Content-Type": "application/json" },
          });
          set({ session });
          return { ok: true };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof ApiError ? e.message : "That name will not do.",
          };
        }
      },

      disconnect: async () => {
        const session = await apiFetch<Session>("/api/session", {
          method: "DELETE",
        });
        set({ session });
      },

      remember: (room) =>
        set((s) => ({
          /* Newest first, deduped, capped. A recent list that grows without
             limit is an archive nobody asked for. */
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
        })),
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
      }),
    },
  ),
);
