/* BYOT PWA service worker — cache supervisor tree list for offline use */

const CACHE = "byot-pwa-v3";
const OFFLINE_TREE_URL = "/api/v1/trees?page_size=50";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/manifest.webmanifest", "/field-ops/offline-trees"]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  const isTreeList =
    url.pathname.endsWith("/api/v1/trees") ||
    url.pathname.includes("/api/v1/trees?");

  if (isTreeList) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ items: [], total: 0, offline: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/field-ops/offline-trees");
        return cached ?? Response.error();
      }),
    );
  }
});
