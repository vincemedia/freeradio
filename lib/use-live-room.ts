"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RealtimeKitClient from "@cloudflare/realtimekit";
import { apiPost } from "@/lib/api";

/**
 * A live station, for real.
 *
 * Everything above this line in the product used to be a simulation: a script
 * advancing on a timer, a level meter driven by sines. This is the thing it
 * was pretending to be — a Cloudflare RealtimeKit meeting with microphones in
 * it.
 *
 * ## What the roles mean here
 *
 * The token minted by `/rtk` carries a preset, and the preset is the whole
 * permission model. A listener physically cannot transmit: `can_produce` is
 * NOT_ALLOWED on their token, so a bug in this file cannot accidentally put a
 * wallet-less visitor on air. A host can mute and remove anybody. Everybody
 * else can talk.
 *
 * ## Muted on arrival, always
 *
 * `enableAudio` is never called on join. Permission to speak is not the same
 * as an open microphone, and a product that puts you on air the instant you
 * arrive is one people stop opening. The first unmute is also where the
 * browser asks for the microphone, which is the right moment to ask: it is
 * the one point where the person has just said they want to be heard.
 */

export type LiveRole = "host" | "speaker" | "listener";

export interface LiveParticipant {
  id: string;
  name: string;
  /** the wallet key we gave RealtimeKit, or a listener's throwaway id */
  customId: string;
  speaking: boolean;
  muted: boolean;
  isSelf: boolean;
}

export type LiveStatus =
  | "idle"
  | "joining"
  | "live"
  | "unavailable"
  | "error";

export interface LiveRoom {
  status: LiveStatus;
  role: LiveRole | null;
  participants: LiveParticipant[];
  /** your own microphone; false until you ask for it */
  micOn: boolean;
  /** the browser refused the microphone, or you did */
  micDenied: boolean;
  recording: boolean;
  error: string | null;
  /**
   * The meeting itself, for the few things that need it directly.
   *
   * Exposed reluctantly. Everything the room does should have a named method
   * on this object rather than a caller reaching into the SDK — but the bed
   * is broadcast between participants, and wrapping a general message channel
   * in a specific one would be inventing a protocol here instead of where it
   * is used. Null until the room is live.
   */
  meeting: Meeting | null;
  join: () => Promise<void>;
  leave: () => void;
  toggleMic: () => Promise<void>;
  muteOther: (participantId: string) => Promise<void>;
  removeOther: (participantId: string) => Promise<void>;
  toggleRecording: () => Promise<void>;
}

/* The SDK's types are broad; these are the parts this product uses. */
type Meeting = Awaited<ReturnType<typeof RealtimeKitClient.init>>;

export function useLiveRoom(coChannelId: string | null): LiveRoom {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [role, setRole] = useState<LiveRole | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetingRef = useRef<Meeting | null>(null);
  /* Mirrored into state as well as held in a ref. The ref is what the
     callbacks use, because they must not be rebuilt every time it changes;
     the state is what the room can render from, because a ref read during
     render is a value React has not agreed to. */
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  /** Read the room out of the SDK. One place, so every event agrees. */
  const sync = useCallback(() => {
    const meeting = meetingRef.current;
    if (!meeting) return;

    const self = meeting.self;
    const others = meeting.participants.joined.toArray();

    setParticipants([
      {
        id: self.id,
        name: self.name,
        customId: self.customParticipantId ?? self.id,
        speaking: Boolean(self.audioEnabled),
        muted: !self.audioEnabled,
        isSelf: true,
      },
      ...others.map((p) => ({
        id: p.id,
        name: p.name,
        customId: p.customParticipantId ?? p.id,
        speaking: Boolean(p.audioEnabled),
        muted: !p.audioEnabled,
        isSelf: false,
      })),
    ]);
    setMicOn(Boolean(self.audioEnabled));
  }, []);

  const leave = useCallback(() => {
    const meeting = meetingRef.current;
    meetingRef.current = null;
    setMeeting(null);
    setStatus("idle");
    setRole(null);
    setParticipants([]);
    setMicOn(false);
    setRecording(false);
    void meeting?.leave().catch(() => {
      /* Already gone, or the tab is closing. Nothing to recover. */
    });
  }, []);

  const join = useCallback(async () => {
    if (!coChannelId || meetingRef.current) return;
    setStatus("joining");
    setError(null);

    try {
      const { authToken, role: granted } = await apiPost<{
        authToken: string;
        role: LiveRole;
      }>(`/api/co-channels/${coChannelId}/rtk`);

      const meeting = await RealtimeKitClient.init({
        authToken,
        defaults: {
          /* Muted on arrival, and no camera at all: this is a radio. */
          audio: false,
          video: false,
        },
      });

      meetingRef.current = meeting;
      setMeeting(meeting);
      setRole(granted);

      for (const event of [
        "participantJoined",
        "participantLeft",
        "audioUpdate",
      ] as const) {
        meeting.participants.joined.on(event, sync);
      }
      meeting.self.on("audioUpdate", sync);

      /* Leaving is not always your idea. The host can remove you, the station
         can hit its two hours and be ended under you, and a connection can
         simply go. Without this the hook stays in `live` holding a meeting
         that is not connected to anything: the occupant list freezes at
         whoever was there when it died, the microphone button still claims to
         work, and nothing says the room has gone. So the SDK's own word for
         it is what ends the session, whoever caused it. */
      meeting.self.on("roomLeft", ({ state }) => {
        if (meetingRef.current !== meeting) return;
        meetingRef.current = null;
        setMeeting(null);
        setRole(null);
        setParticipants([]);
        setMicOn(false);
        setRecording(false);
        setStatus("idle");
        if (state === "kicked") {
          setError("The host removed you from this station.");
        } else if (state === "ended") {
          setError("This station has ended.");
        } else if (state === "disconnected") {
          setError("You were disconnected from this station.");
        }
        void meeting.leave().catch(() => {});
      });
      meeting.recording?.on?.("recordingUpdate", () => {
        setRecording(meeting.recording?.recordingState === "RECORDING");
      });

      await meeting.join();
      sync();
      setStatus("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the room.");
      /* A station with no live audio configured is not an error the reader
         can act on, so it reads as unavailable rather than as a failure. */
      setStatus("unavailable");
    }
  }, [coChannelId, sync]);

  /**
   * Your microphone.
   *
   * The first `enableAudio` is what triggers the browser's permission prompt.
   * A refusal is a state rather than an error: the room still works, you are
   * simply in it listening, and the interface has to say which.
   */
  const toggleMic = useCallback(async () => {
    const meeting = meetingRef.current;
    if (!meeting) return;
    try {
      if (meeting.self.audioEnabled) {
        await meeting.self.disableAudio();
      } else {
        await meeting.self.enableAudio();
        setMicDenied(false);
      }
      sync();
    } catch {
      setMicDenied(true);
      setMicOn(false);
    }
  }, [sync]);

  const muteOther = useCallback(async (participantId: string) => {
    const meeting = meetingRef.current;
    const participant = meeting?.participants.joined.get(participantId);
    await participant?.disableAudio?.();
  }, []);

  const removeOther = useCallback(async (participantId: string) => {
    const meeting = meetingRef.current;
    const participant = meeting?.participants.joined.get(participantId);
    await participant?.kick?.();
  }, []);

  const toggleRecording = useCallback(async () => {
    const meeting = meetingRef.current;
    if (!meeting?.recording) return;
    if (meeting.recording.recordingState === "RECORDING") {
      await meeting.recording.stop();
    } else {
      await meeting.recording.start();
    }
  }, []);

  /* Tear down when the station changes or the tree unmounts: a meeting left
     running holds the microphone open. */
  useEffect(() => leave, [leave, coChannelId]);

  return {
    status,
    role,
    participants,
    micOn,
    micDenied,
    recording,
    error,
    meeting,
    join,
    leave,
    toggleMic,
    muteOther,
    removeOther,
    toggleRecording,
  };
}
