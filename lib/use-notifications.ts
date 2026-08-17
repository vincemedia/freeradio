"use client";

import { useCallback, useEffect, useState } from "react";
import { useContacts } from "@/lib/contacts";

/**
 * OS notifications when somebody you know goes on air.
 *
 * ## The four states, which are genuinely different
 *
 * `unsupported` — this browser cannot do it at all, or, on iOS, the app is
 * being viewed in a tab rather than from the home screen. Safari only gives a
 * web app push once it has been installed, so the honest thing to say is "add
 * this to your home screen first" rather than showing a switch that will fail.
 *
 * `denied` — asked and refused, possibly months ago. The browser will not
 * prompt again, so a switch here is a lie: it has to send somebody to their
 * own settings instead.
 *
 * `off` — supported, not yet asked, or asked and granted but switched off.
 *
 * `on` — subscribed, and the server has the watch list.
 *
 * Collapsing these into a boolean is what makes notification settings
 * infuriating everywhere else: a switch that silently does nothing because
 * permission was refused in a different month.
 *
 * ## Keeping the list current
 *
 * The subscription carries a copy of your contacts, so adding somebody after
 * switching this on has to re-send it. That happens automatically whenever the
 * list changes, which is cheap — a few hundred bytes — and the alternative is a
 * feature that silently only covers the people you happened to know on the day
 * you turned it on.
 */

export type NotificationState = "unsupported" | "denied" | "off" | "on";

/** Base64url, as the Push API wants the key. */
function decodeKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  /* Backed by a plain ArrayBuffer, which is what `applicationServerKey` wants:
     a Uint8Array over a SharedArrayBuffer is the same bytes and the wrong
     type. */
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function supported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;

  /* iOS gives a web app push only once it has been added to the home screen.
     In a tab the APIs are present and subscribing fails, which is the worst
     shape of unsupported: it looks available until it is used. */
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  if (iOS) {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return false;
  }

  return true;
}

export function useNotifications(publicKey: string | null) {
  const { contacts } = useContacts();
  const [state, setState] = useState<NotificationState>("off");
  const [busy, setBusy] = useState(false);

  /* Read once on mount, from the browser rather than from anything remembered:
     permission can be revoked in browser settings without this app hearing. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supported()) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        if (!cancelled) setState(existing ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const keys = contacts.map((c) => c.key).sort().join(",");

  /* Whenever the list changes and this is on, the server gets the new one.
     Otherwise the feature quietly only ever covers the people you knew on the
     day you switched it on. */
  useEffect(() => {
    if (state !== "on" || !publicKey) return;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) return;
        await fetch("/api/push", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            watching: keys ? keys.split(",") : [],
          }),
        });
      } catch {
        /* Offline. The next change, or the next visit, carries it. */
      }
    })();
  }, [state, keys, publicKey]);

  const enable = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!supported()) return { ok: false, error: "This browser cannot do it." };
    if (!publicKey) {
      return { ok: false, error: "Connect a wallet first." };
    }

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return { ok: false, error: "Your browser refused notifications." };
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      /* A worker that is installing cannot be subscribed against yet. */
      await navigator.serviceWorker.ready;

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) return { ok: false, error: "Notifications are not configured." };

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          /* Required to be true, and honestly so: every push this app sends
             results in a notification the reader can see. */
          userVisibleOnly: true,
          applicationServerKey: decodeKey(key),
        }));

      const response = await fetch("/api/push", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          watching: contacts.map((c) => c.key),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        return { ok: false, error: body.error ?? "That did not work." };
      }

      setState("on");
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "That did not work.",
      };
    } finally {
      setBusy(false);
    }
  }, [publicKey, contacts]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      /* The browser's subscription and the server's copy of the watch list are
         two things, and both have to go: unsubscribing alone would leave the
         list uploaded for a device that can no longer be reached. */
      await subscription?.unsubscribe().catch(() => {});
      await fetch("/api/push", { method: "DELETE" }).catch(() => {});
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, watching: contacts.length };
}
