import "server-only";

import { head, list, put, del } from "@vercel/blob";
import webpush from "web-push";

/**
 * Push subscriptions, and the one thing they cost.
 *
 * ## The trade this feature makes, said out loud
 *
 * Contacts live in your browser and are never uploaded. That was a deliberate
 * decision with a reason: the server has no business holding a list of who
 * anybody knows, and asking it only "of these keys, which are in a room right
 * now" kept the graph on the client where it belongs.
 *
 * Notifications cannot work that way. To tell you that somebody you know has
 * gone live, something has to know they matter to you *while your browser is
 * closed* — that is the whole point of a push notification. So switching them
 * on uploads your watch list, and the interface says so at the moment you are
 * asked, rather than in a policy nobody reads.
 *
 * Nothing else changes: the list is still yours, still editable, and deleted
 * outright when you switch notifications off. Anybody who never switches them
 * on uploads nothing, which is why this is off by default and stays off.
 *
 * ## Where it is kept
 *
 * Vercel Blob, one small JSON object per subscriber, keyed by identity. Not
 * because Blob is a good database — it is not one — but because it is the
 * storage this deployment already has, and a real database for one JSON object
 * per person would be a lot of new machinery for a feature that is a list of
 * endpoints. It is honest about its limits: a fan-out reads every watcher's
 * file, which is fine at this size and would not be at a hundred thousand.
 *
 * The endpoint from the browser is a URL at Apple, Google or Mozilla with a
 * pair of keys that encrypt to that one device. It is a capability, not an
 * identity: anybody holding it can send that device a notification and nothing
 * else, and it stops working the moment the subscription is revoked.
 */

const PREFIX = "push/";

export interface Subscriber {
  /** the identity this subscription belongs to */
  key: string;
  /** the browser's push endpoint and its encryption keys */
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  /**
   * Identity keys this person wants to hear about.
   *
   * The upload the feature costs. Empty is legitimate and means "notify me
   * about nothing", which is what a subscription with no contacts is.
   */
  watching: string[];
  /** ISO, so a stale subscription can be recognised as stale */
  at: string;
}

export function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.BLOB_READ_WRITE_TOKEN,
  );
}

function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:notifications@example.invalid",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/** One file per identity, so saving twice replaces rather than accumulates. */
function pathFor(key: string) {
  return `${PREFIX}${key.slice(0, 32)}.json`;
}

export async function saveSubscriber(sub: Subscriber): Promise<void> {
  await put(pathFor(sub.key), JSON.stringify(sub), {
    access: "public",
    contentType: "application/json",
    /* Overwrites rather than suffixes: there is one subscription per identity
       per browser, and the newest is the only one worth keeping. */
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

export async function removeSubscriber(key: string): Promise<void> {
  try {
    const found = await head(pathFor(key));
    await del(found.url);
  } catch {
    /* Never subscribed, or already gone. Both are the desired end state. */
  }
}

/**
 * Everybody who has asked to hear about this person.
 *
 * Reads every subscriber and filters, which is the honest cost of not having a
 * database with an index. At this scale it is a handful of small files; the day
 * it is not, this function is the one that has to change and nothing else
 * does.
 */
export async function watchersOf(key: string): Promise<Subscriber[]> {
  if (!pushConfigured()) return [];

  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });

  const loaded = await Promise.all(
    blobs.map(async (blob) => {
      try {
        const response = await fetch(blob.url, { cache: "no-store" });
        if (!response.ok) return null;
        return (await response.json()) as Subscriber;
      } catch {
        return null;
      }
    }),
  );

  return loaded.filter((s): s is Subscriber => {
    if (!s?.subscription?.endpoint) return false;
    /* Never yourself: a notification that you have joined a room is a
       notification about a button you just pressed. */
    if (s.key === key) return false;
    return Array.isArray(s.watching) && s.watching.includes(key);
  });
}

export interface Notification {
  title: string;
  body: string;
  /** where pressing it goes */
  url: string;
  /** collapses repeats of the same subject on the device */
  tag: string;
}

/**
 * Send one notification to everybody watching this person.
 *
 * A subscription that has expired or been revoked answers 404 or 410, which is
 * not an error to log and retry: it means that browser is gone. Those are
 * deleted, because a store that only ever grows will eventually be mostly dead
 * endpoints and every fan-out pays for them.
 */
export async function notifyWatchers(
  subjectKey: string,
  notification: Notification,
): Promise<number> {
  if (!pushConfigured()) return 0;
  configure();

  const watchers = await watchersOf(subjectKey).catch(() => []);
  if (watchers.length === 0) return 0;

  let sent = 0;

  await Promise.all(
    watchers.map(async (watcher) => {
      try {
        await webpush.sendNotification(
          watcher.subscription,
          JSON.stringify(notification),
          { TTL: 600 },
        );
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await removeSubscriber(watcher.key).catch(() => {});
        }
        /* Anything else is a bad moment at a push service. The notification is
           worth nothing in ten minutes anyway, so there is nothing to retry. */
      }
    }),
  );

  return sent;
}
