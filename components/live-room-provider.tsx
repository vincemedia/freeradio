"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLiveRoom, type LiveRoom } from "@/lib/use-live-room";

/**
 * The room you are in, for as long as you are in it.
 *
 * Held above the router on purpose. A meeting owned by the station's page ends
 * the moment you navigate away, which would mean browsing the band drops you
 * out of the conversation you are having — the opposite of what the dock at
 * the bottom of the screen has always promised.
 *
 * So the meeting lives here, and the station page is a view onto it. Leaving
 * is something you do, not something that happens because you looked at
 * another page.
 */

interface LiveContext extends LiveRoom {
  /** the station this meeting belongs to, or null when not in one */
  stationId: string | null;
  /** enter a station; leaves whichever one you were in */
  enter: (id: string) => void;
}

const Context = createContext<LiveContext | null>(null);

export function LiveRoomProvider({ children }: { children: React.ReactNode }) {
  const [stationId, setStationId] = useState<string | null>(null);
  const room = useLiveRoom(stationId);

  const enter = (id: string) => {
    if (id === stationId) return;
    /* One room at a time, which was always the rule; now it is also a
       physical fact about the microphone. */
    if (stationId) room.leave();
    setStationId(id);
  };

  /* Being pointed at a station is the same as being in it, and the join is
     started here rather than inside the hook so it is an effect on an
     external system — a WebRTC connection — rather than a setState cascade. */
  const joined = useRef<string | null>(null);
  useEffect(() => {
    if (!stationId || joined.current === stationId) return;
    joined.current = stationId;
    void room.join();
  }, [stationId, room]);

  const leave = () => {
    joined.current = null;
    room.leave();
    setStationId(null);
  };

  return (
    <Context.Provider value={{ ...room, stationId, enter, leave }}>
      {children}
    </Context.Provider>
  );
}

export function useLive(): LiveContext {
  const value = useContext(Context);
  if (!value) throw new Error("useLive outside LiveRoomProvider");
  return value;
}
