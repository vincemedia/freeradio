"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RealtimeKitClient from "@cloudflare/realtimekit";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";
import { play } from "@/lib/sfx";

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
  /**
   * Whether their microphone is open.
   *
   * Not whether they are making a sound — that is measured, in `use-levels`,
   * off the track itself. This is the SDK's flag and answers a different
   * question: an open microphone in a pause is still open, and the room
   * should show that.
   */
  micOpen: boolean;
  /** their uploaded avatar, if they have one; the token carries it in */
  picture?: string;
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
  /**
   * Recording has been asked for and has not started yet.
   *
   * Its own state rather than "not recording": starting a recording is a round
   * trip to Cloudflare and takes a visible moment, and a button that looks
   * exactly the same before and during that moment invites a second press —
   * which is how you get two recordings of one conversation.
   */
  recordingPending: boolean;
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
  const [recordingPending, setRecordingPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetingRef = useRef<Meeting | null>(null);
  /**
   * The station this browser is *trying* to be in.
   *
   * Distinct from the meeting, which is whether it currently is. A dropped
   * connection leaves the intent intact and the meeting null, which is exactly
   * the state a reconnect needs to recognise: locking a phone suspends the
   * page and kills the transport, and coming back to a room that quietly gave
   * up is the single most annoying thing a voice app can do.
   */
  const intent = useRef<string | null>(null);
  /** How many times a drop has been answered, so it cannot loop forever. */
  const attempts = useRef(0);

  /**
   * When anybody in this room last had a microphone open.
   *
   * The meter Cloudflare bills in non-recording mode is participant-minutes,
   * not bytes: a connection costs the same per minute whether anybody is
   * talking or not. Which makes a tab left open in a quiet room the most
   * expensive thing in the product — measured across this app's first day,
   * forty-three per cent of everything consumed was sessions that never had
   * two people in them, and the two longest were ninety minutes of one browser
   * sitting alone in an empty station.
   *
   * So a room that nobody is using lets go of you — but "nobody is using it" is
   * a much narrower claim than "nobody has spoken", and the first version of
   * this conflated them and evicted people who were waiting in a quiet room on
   * purpose. See the watchdog below for the test that replaced it.
   *
   * Zero until the room is actually joined, because `Date.now()` during render
   * is a different value on every pass and the compiler is right to refuse it.
   * The join sets it; the watchdog treats zero as "not started yet".
   */
  const lastVoice = useRef(0);

  /**
   * When this browser was last touched.
   *
   * The honest signal for "somebody is still here", and the one the first
   * version of the watchdog lacked entirely — which is why it evicted people who
   * were sitting in a quiet room on purpose. A pointer or a key means a person,
   * and a person waiting for somebody to turn up is not waste.
   */
  const lastTouch = useRef(0);

  /** When the question was put, or 0 if it has not been. */
  const asked = useRef(0);

  /**
   * A join already in flight.
   *
   * `meetingRef` cannot do this job. It is assigned after two awaits — the
   * token request, then the SDK's own setup — so two callers arriving in that
   * window both saw no meeting and both built one. There are now several things
   * that can start a join: the provider pointing at a station, a retry after a
   * drop, and waking the tab. Two of them overlapping means two media
   * connections negotiating for one participant id, which is precisely the
   * shape that fails as "could not establish media connection".
   *
   * So the flag is set synchronously, before anything can yield.
   */
  const joining = useRef(false);
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

    const rows: LiveParticipant[] = [
      {
        id: self.id,
        name: self.name,
        customId: self.customParticipantId ?? self.id,
        picture: self.picture || undefined,
        micOpen: Boolean(self.audioEnabled),
        muted: !self.audioEnabled,
        isSelf: true,
      },
      ...others.map((p) => ({
        id: p.id,
        name: p.name,
        customId: p.customParticipantId ?? p.id,
        picture: p.picture || undefined,
        micOpen: Boolean(p.audioEnabled),
        muted: !p.audioEnabled,
        isSelf: false,
      })),
    ];

    /* One identity, one row. Two peers can briefly share a key — a second tab,
       a reconnect that overlapped its own predecessor — and the resolution
       below removes the loser, but the list must not show somebody twice even
       for the second it takes. Self is first, so self always wins the slot. */
    const seen = new Set<string>();
    setParticipants(
      rows.filter((row) => {
        if (seen.has(row.customId)) return false;
        seen.add(row.customId);
        return true;
      }),
    );
    setMicOn(Boolean(self.audioEnabled));

    /* Anybody producing counts, including you. A room where one person is
       talking to nobody is still a room in use. */
    if (rows.some((row) => row.micOpen)) lastVoice.current = Date.now();
  }, []);

  const leave = useCallback(() => {
    /* Leaving is a decision, so it withdraws the intent — nothing should bring
       this browser back into a room it chose to leave. A join already in flight
       sees the cleared intent when it lands and abandons itself rather than
       depositing somebody in a room they have just left. */
    intent.current = null;
    attempts.current = 0;
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

  /**
   * Ask to be back in the room.
   *
   * A counter rather than a call, because the thing that wants to reconnect is
   * an SDK event handler bound during a join, and having it invoke that join's
   * own closure would pin one attempt forever. Bumping a number lets the effect
   * below run the current one.
   *
   * Backs off — a second, then two, then four — because the usual reason a
   * connection failed is that the network is not there yet, and hammering it
   * neither helps nor is free. Six attempts is a little over a minute, which
   * covers a lift, a tunnel and a phone that was face-down for a while, and
   * stops well short of a tab reconnecting all night on a dead network.
   */
  const [retry, setRetry] = useState(0);

  const reconnect = useCallback(() => {
    if (!intent.current) return;
    if (attempts.current >= 6) {
      setStatus("unavailable");
      setError("Lost the connection to this station. Press join to try again.");
      return;
    }
    const wait = Math.min(8000, 1000 * 2 ** attempts.current);
    attempts.current += 1;
    setTimeout(() => setRetry((n) => n + 1), wait);
  }, []);

  const join = useCallback(async () => {
    if (!coChannelId || meetingRef.current || joining.current) return;
    joining.current = true;
    intent.current = coChannelId;
    setStatus("joining");
    setError(null);

    /* Held so a failure can tear down whatever was half-built. A meeting that
       was created and then failed to connect still holds a socket and a
       microphone claim, and leaving it behind is how the next attempt inherits
       the problem that killed this one. */
    let building: Meeting | null = null;

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
      building = meeting;

      /* The station changed under this attempt — somebody pressed a different
         one while it was connecting. Abandon rather than land in a room nobody
         asked for. */
      if (intent.current !== coChannelId) {
        await meeting.leave().catch(() => {});
        return;
      }

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

      /**
       * The same identity cannot be in a room twice.
       *
       * Opening a station in a second tab, or on a second device with the same
       * wallet, produced two peers carrying one key: two faces, two meters,
       * two of you in the occupant count, and both of them able to talk. There
       * is no server-side kick for a single participant — only kick-all — so
       * the resolution is here, and the rule is the one every other app uses:
       * the newest connection is the one the person is actually looking at, so
       * the older one stands down.
       *
       * Which of the two is older is decided by *how* each learned about the
       * other. The one already in the room sees an arrival; the one arriving
       * sees somebody already present in its opening roster. So this fires
       * only on the event, never on the initial read.
       *
       * Two connections opened in the same instant can both see an arrival and
       * both leave. That is rare, recoverable by pressing join, and much the
       * better failure: two of you talking over each other is worse than none.
       */
      meeting.participants.joined.on("participantJoined", (arrived) => {
        /* Only while this is still the meeting. A listener bound to a
           connection that has already been replaced would otherwise tear down
           its successor — which is a room that dies a second after opening,
           for no reason the reader could ever guess. */
        if (meetingRef.current !== meeting) return;
        const mine = meeting.self.customParticipantId;
        if (!mine) return;
        const list = Array.isArray(arrived) ? arrived : [arrived];
        if (!list.some((p) => p?.customParticipantId === mine)) return;

        /* Deliberate, so the reconnect logic does not treat it as a drop and
           bring this tab straight back into a room it was told to give up. */
        intent.current = null;
        setError("You joined this station somewhere else, so this tab left it.");
        leave();
      });

      /* A set tells you somebody walked in. In a voice room that is a fact you
         would otherwise have to be watching a grid to learn, and the point of
         a voice room is that you are not looking at it. Bound here rather than
         derived from the participant list: a diff over a re-rendered array
         would also fire for the people who were already there when you
         arrived, which is a burst of arrivals for events that happened before
         you did. */
      meeting.participants.joined.on("participantJoined", () =>
        play("user-connect"),
      );
      meeting.participants.joined.on("participantLeft", () =>
        play("user-disconnect"),
      );
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
        void meeting.leave().catch(() => {});

        if (state === "kicked") {
          intent.current = null;
          setStatus("idle");
          setError("The host removed you from this station.");
          return;
        }
        if (state === "ended") {
          intent.current = null;
          setStatus("idle");
          setError("This station has ended.");
          return;
        }

        /* Anything else is a transport that went away rather than a decision
           anybody made — a phone locking, a tunnel, a network handover. The
           intent is still to be in this room, so the room comes back. */
        if (intent.current) {
          setStatus("joining");
          setError(null);
          reconnect();
          return;
        }
        setStatus("idle");
      });
      meeting.recording?.on?.("recordingUpdate", () => {
        const state = meeting.recording?.recordingState;
        setRecording(state === "RECORDING");
        /* Whatever it settled on, it is no longer on its way there. */
        if (state === "RECORDING" || state === "IDLE") setRecordingPending(false);
      });

      await meeting.join();
      sync();
      /* Back in. Whatever it took to get here is no longer owed, and the quiet
         clock starts from the moment of arrival rather than from whenever this
         hook happened to be constructed. */
      attempts.current = 0;
      lastVoice.current = Date.now();
      setStatus("live");
    } catch (e) {
      /* A failed join is usually a network that is not ready — the token
         request timing out, the transport refusing — and those recover on
         their own if asked again. So it retries quietly and only says
         "unreachable" once it has genuinely stopped trying, rather than at the
         first stumble. */
      meetingRef.current = null;
      setMeeting(null);
      /* Whatever was built before it failed goes with it. */
      if (building) await building.leave().catch(() => {});
      if (intent.current && attempts.current < 6) {
        setError(null);
        setStatus("joining");
        reconnect();
        return;
      }
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Could not reach the room.",
      );
      setStatus("unavailable");
    } finally {
      joining.current = false;
    }
  }, [coChannelId, sync, leave, reconnect]);

  /**
   * Let go of a room nobody is using — and only then.
   *
   * The first version of this tested silence alone and threw people out of
   * rooms they were sitting in on purpose. Waiting in a quiet room *is* the
   * product: Open mic exists so somebody can sit in it until another person
   * turns up, and evicting them at fifteen minutes for being early is far worse
   * than paying for the connection. It was doing exactly that.
   *
   * So a visible tab that is being touched counts as somebody being there,
   * whatever the room sounds like, and the visible case asks before it acts.
   * Hidden and silent needs no question — nobody is looking at the answer.
   *
   * Never while your own microphone is open and never while a recording is
   * running: both mean the connection is doing its job.
   */
  useEffect(() => {
    if (status !== "live") return;

    /* Backgrounded and silent: nobody is listening, and nobody has to be asked. */
    const HIDDEN_MS = 5 * 60 * 1000;
    /* Visible, silent, and untouched. Long, because being wrong here means
       throwing out somebody who is present. */
    const IDLE_MS = 30 * 60 * 1000;
    /* How long the question stands before silence answers it. */
    const GRACE_MS = 90 * 1000;

    lastTouch.current = Date.now();
    const touched = () => {
      lastTouch.current = Date.now();
      asked.current = 0;
    };
    const EVENTS = ["pointerdown", "keydown", "wheel"] as const;
    for (const event of EVENTS) {
      window.addEventListener(event, touched, { passive: true });
    }

    const check = setInterval(() => {
      if (!meetingRef.current || lastVoice.current === 0) return;

      if (micOn || recording) {
        lastVoice.current = Date.now();
        asked.current = 0;
        return;
      }

      const now = Date.now();
      const quietFor = now - lastVoice.current;

      if (document.hidden) {
        if (quietFor < HIDDEN_MS) return;
        intent.current = null;
        setError(
          "This tab was in the background and the room was quiet, so it let the station go. Press join to come back.",
        );
        leave();
        return;
      }

      /* Being touched counts for as much as being spoken in. */
      const idleFor = Math.min(quietFor, now - lastTouch.current);
      if (idleFor < IDLE_MS) return;

      if (asked.current && now - asked.current > GRACE_MS) {
        intent.current = null;
        setError(
          "Nobody answered, so this tab let the station go. Press join to come back.",
        );
        leave();
        return;
      }

      /* Ask first. Touching anything at all cancels it. */
      if (!asked.current) {
        asked.current = now;
        toast("Still listening?", {
          description:
            "The room has been quiet for a while. Touch anything to stay, or this tab will let the station go.",
          duration: GRACE_MS,
        });
      }
    }, 20_000);

    return () => {
      clearInterval(check);
      for (const event of EVENTS) window.removeEventListener(event, touched);
    };
  }, [status, micOn, recording, leave]);

  /* Every retry, whatever asked for it, lands here with the current `join`. */
  useEffect(() => {
    if (retry === 0) return;
    if (!intent.current || meetingRef.current || joining.current) return;
    void join();
  }, [retry, join]);

  /**
   * Coming back to the page.
   *
   * A locked phone suspends everything, and the transport is usually gone by
   * the time it wakes. The SDK sometimes reports that as a `roomLeft` and
   * sometimes simply stops carrying audio, so waking is treated as its own
   * reason to check: if this browser means to be in a room and is not in one,
   * it rejoins.
   */
  useEffect(() => {
    const check = () => {
      if (document.hidden) return;
      if (!intent.current || meetingRef.current || joining.current) return;
      /* A fresh start: waking up is not the same as a failed attempt, and
         should not inherit the backoff from one. */
      attempts.current = 0;
      setRetry((n) => n + 1);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
      window.removeEventListener("pageshow", check);
    };
  }, []);

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
      setRecordingPending(true);
      try {
        await meeting.recording.stop();
      } finally {
        /* The event settles this normally; this is the backstop for a stop
           that fails, so the button cannot be left spinning forever. */
        setRecordingPending(false);
      }
      return;
    }

    setRecordingPending(true);
    try {
      await meeting.recording.start();
    } catch (e) {
      setRecordingPending(false);
      throw e;
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
    recordingPending,
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
