/* ELDRITCH V2 — service-worker.js (PRODUCTION)
   Cache v22 (as requested)

   Notes:
   - Network-first for HTML (prevents “stale shell” after deploy)
   - Cache-first for static assets (fast + offline)
   - Cleans old caches on activate
*/

const CACHE_VERSION = 22;
const CACHE_NAME = `eldritch-v2-cache-v${CACHE_VERSION}`;

const CORE_ASSETS = [
  "/eldritch-v2/",
  "/eldritch-v2/index.html",
  "/eldritch-v2/app.js",
  "/eldritch-v2/manifest.json",
  // If your icons exist, keep these. If not yet uploaded, either upload them or remove these 3 lines.
  "/eldritch-v2/icons/icon-192.png",
  "/eldritch-v2/icons/icon-512.png",
  "/eldritch-v2/icons/icon-512-maskable.png"
];

// Install: pre-cache core
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("eldritch-v2-cache-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // HTML: network-first (prevents stale deploy issues)
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    // Only cache good responses
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Fallback to cached index for offline nav
    const fallback = await cache.match("/eldritch-v2/index.html");
    return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
  return fresh;
}
```0