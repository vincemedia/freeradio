/*
 * The service worker, which exists for exactly one reason.
 *
 * It is not a cache and it is not an offline strategy. Caching this app would
 * mean serving a stale band listing and a stale occupant count, which are the
 * two things on screen that must never be stale — a radio that shows you last
 * night's stations is worse than one that shows you nothing. So there is no
 * fetch handler at all, deliberately, and every request goes to the network
 * exactly as it would without this file.
 *
 * What it is for is push. A notification has to be able to arrive when no tab
 * is open, and a service worker is the only thing a browser will wake up to do
 * that. Hence the two handlers below and nothing else.
 */

self.addEventListener("install", () => {
  /* Take over immediately rather than waiting for every tab to close. There is
     no cached state to migrate, so there is nothing an old worker is protecting. */
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = payload.title || "Free Radio";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      /* The set's own mark, at the size Android asks for. */
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      /* Repeats about the same station replace each other rather than stacking:
         somebody joining a room three times is one fact, not three. */
      tag: payload.tag || "free-radio",
      renotify: false,
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      /* Prefer a window that is already here. Opening a second copy of the app
         to show a room you could have been taken to is how you end up in two
         rooms at once, which this product does not allow. */
      for (const client of open) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* Cross-origin or disallowed; the focus alone is still useful. */
            }
          }
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
