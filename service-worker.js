/* ELDRITCH V2 — service-worker.js (PRODUCTION)
   Cache v22 (BADASS icons aligned)

   Key fix:
   - Install will NOT fail if one asset 404s (no more cache.addAll grenade).
   - Network-first for HTML
   - Cache-first for static assets
*/

const CACHE_VERSION = 22;
const CACHE_NAME = `eldritch-v2-cache-v${CACHE_VERSION}`;

const CORE_ASSETS = [
  "/eldritch-v2/",
  "/eldritch-v2/index.html",
  "/eldritch-v2/app.js",
  "/eldritch-v2/manifest.json",
  "/eldritch-v2/icon-192_BADASS.png",
  "/eldritch-v2/icon-512_BADASS.png",
  "/eldritch-v2/icon-512-maskable_BADASS.png"
];

// Install: pre-cache core (BEST EFFORT, never hard-fail)
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
      CORE_ASSETS.map((url) => cache.add(url))
    );

    // Optional: log any misses (won't break install)
    // results.forEach((r, i) => { if (r.status === "rejected") console.log("[SW] precache miss:", CORE_ASSETS[i]); });

    await self.skipWaiting();
  })());
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("eldritch-v2-cache-") && k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // HTML: network-first (prevents stale shell)
  const accept = req.headers.get("accept") || "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
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
