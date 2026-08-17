"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveRoom } from "@/lib/use-live-room";

/**
 * How loudly each person in the room is actually talking.
 *
 * The meters used to be drawn at a constant 0.7 whenever somebody was
 * unmuted. That is a lamp wearing a meter's clothes: it answers "is this
 * microphone on", which the mute badge already answered, and it answers the
 * question a meter exists for — who is talking right now, and is my own
 * microphone hearing me — with a decoration. In a room of five unmuted people
 * five identical animations tell you nothing about which one is speaking, and
 * a new speaker watching their own portrait cannot tell a working microphone
 * from a dead one, which is the single most common thing to be uncertain
 * about in the first ten seconds of any call.
 *
 * So it is measured. Each open microphone gets an analyser over its own
 * track, and the number on screen is the amplitude of that track.
 *
 * ## Reading it
 *
 * RMS over the time domain, not the frequency bins: the question is loudness,
 * not timbre. Then a curve, because loudness is logarithmic and a linear RMS
 * spends most of its range looking like silence — normal speech reads about
 * 0.05 and would barely move a bar.
 *
 * The value falls slower than it rises. A voice is mostly gaps — between
 * words, between syllables — and a meter that tracked them honestly would
 * flicker to zero constantly and read as a fault. Ballistics like this are
 * what every physical VU meter has, for exactly this reason.
 *
 * ## Cost
 *
 * One AudioContext for the room, one analyser per *open* microphone, one
 * animation frame loop. Muted people are not analysed, because there is
 * nothing to analyse. The loop runs at the display's rate but publishes to
 * React about fifteen times a second: a meter is smooth at fifteen, and the
 * grid it sits in should not re-render sixty times a second to move five
 * two-pixel bars.
 *
 * It also stops entirely when the tab is hidden — the browser throttles the
 * frames anyway, and nobody is looking at a meter they cannot see.
 */

/** Published to React this often. Smooth enough to read, cheap enough to run. */
const PUBLISH_MS = 66;

/** Attack and release, as a share of the gap closed per frame. */
const RISE = 0.5;
const FALL = 0.12;

/** Below this it is room noise, not a voice, and the meter should rest. */
const FLOOR = 0.008;

/** Maps RMS to something that uses the whole meter at speaking volume. */
function shape(rms: number): number {
  if (rms < FLOOR) return 0;
  /* A square root twice over: ~0.05 RMS (ordinary speech) lands near 0.5, and
     the loud end still has somewhere to go. */
  return Math.min(1, Math.pow(rms / 0.25, 0.45));
}

interface Rig {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  data: Float32Array<ArrayBuffer>;
  track: MediaStreamTrack;
}

export function useLevels(live: LiveRoom): Record<string, number> {
  const [levels, setLevels] = useState<Record<string, number>>({});

  const context = useRef<AudioContext | null>(null);
  const rigs = useRef(new Map<string, Rig>());
  const smoothed = useRef(new Map<string, number>());
  const frame = useRef<number | null>(null);

  const meeting = live.meeting;
  const inRoom = live.status === "live";

  /* Which participants are worth measuring, and which track is theirs. Read
     from the SDK inside the loop rather than captured here, so a track that
     changes device mid-sentence is picked up without re-running the effect. */
  const openMics = live.participants
    .filter((p) => !p.muted)
    .map((p) => p.id)
    .sort()
    .join(",");

  useEffect(() => {
    const built = rigs.current;
    const held = smoothed.current;

    if (!meeting || !inRoom || !openMics) {
      /* Nothing to measure. Tear down rather than idle: an AudioContext left
         running holds the audio hardware awake.

         The published map is left as it was rather than cleared. Clearing it
         is a setState in an effect body, and it would buy nothing: a meter is
         only drawn for somebody whose microphone is open, so a level with
         nobody to belong to is never read. */
      for (const rig of built.values()) teardown(rig);
      built.clear();
      held.clear();
      void context.current?.close().catch(() => {});
      context.current = null;
      return;
    }

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    if (!context.current || context.current.state === "closed") {
      context.current = new Ctor();
    }
    const ctx = context.current;
    /* Suspended until a gesture on some browsers; joining was a gesture. */
    void ctx.resume().catch(() => {});

    let lastPublish = 0;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      frame.current = requestAnimationFrame(tick);

      /* Who is open right now, straight from the SDK. */
      const wanted = new Map<string, MediaStreamTrack>();

      const self = meeting.self;
      if (self?.audioEnabled && self.audioTrack) {
        wanted.set(self.id, self.audioTrack);
      }
      for (const p of meeting.participants.joined.toArray()) {
        if (p.audioEnabled && p.audioTrack) wanted.set(p.id, p.audioTrack);
      }

      /* Rigs for the ones that are new, and away with the ones that stopped. */
      for (const [id, rig] of built) {
        if (!wanted.has(id) || wanted.get(id) !== rig.track) {
          teardown(rig);
          built.delete(id);
          held.delete(id);
        }
      }
      for (const [id, track] of wanted) {
        if (built.has(id)) continue;
        const rig = build(ctx, track);
        if (rig) built.set(id, rig);
      }

      /* Read every rig, with the ballistics applied. */
      for (const [id, rig] of built) {
        rig.analyser.getFloatTimeDomainData(rig.data);
        let sum = 0;
        for (let i = 0; i < rig.data.length; i++) sum += rig.data[i] * rig.data[i];
        const target = shape(Math.sqrt(sum / rig.data.length));

        const previous = held.get(id) ?? 0;
        const rate = target > previous ? RISE : FALL;
        held.set(id, previous + (target - previous) * rate);
      }

      if (now - lastPublish >= PUBLISH_MS) {
        lastPublish = now;
        setLevels(Object.fromEntries(held));
      }
    };

    const start = () => {
      if (frame.current === null) frame.current = requestAnimationFrame(tick);
    };
    const halt = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
    const onVisibility = () => (document.hidden ? halt() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      halt();
      document.removeEventListener("visibilitychange", onVisibility);
      for (const rig of built.values()) teardown(rig);
      built.clear();
      held.clear();
    };
  }, [meeting, inRoom, openMics]);

  return levels;
}

/**
 * An analyser over one track.
 *
 * Remote tracks used to get a muted `<audio>` element here, because Chromium
 * will not pull data through a WebRTC receiver that is not attached to a media
 * element. `RoomAudio` now attaches every remote track to an element that is
 * actually playing — which is the fix for a much larger problem — so the
 * workaround is no longer needed and the second element is gone. Two elements
 * on one remote track is asking for trouble on iOS in particular.
 */
function build(ctx: AudioContext, track: MediaStreamTrack): Rig | null {
  try {
    const stream = new MediaStream([track]);

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    /* Small window: this is a level, and a big FFT only adds latency. */
    analyser.fftSize = 512;
    source.connect(analyser);
    /* Never connected to the destination. The SDK plays the room; this is
       only here to look at it. */

    return {
      source,
      analyser,
      data: new Float32Array(new ArrayBuffer(analyser.fftSize * 4)),
      track,
    };
  } catch {
    /* A track that has ended, or a browser that will not build the graph.
       One silent meter is better than a broken room. */
    return null;
  }
}

function teardown(rig: Rig) {
  try {
    rig.source.disconnect();
    rig.analyser.disconnect();
  } catch {
    /* Already torn down. */
  }
}
