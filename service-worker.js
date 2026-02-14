/* ELDRITCH V2 — service-worker.js (PRODUCTION)
   Cache v32

   Fixes:
   - Uses RELATIVE paths so GitHub Pages base (/eldritch-v2/) always works
   - Install will NOT fail the whole SW if one asset 404s (allSettled)
   - Network-first for HTML, cache-first for static
*/

const CACHE_VERSION = 32;
const CACHE_NAME = `eldritch-v2-cache-v${CACHE_VERSION}`;

// IMPORTANT: all relative to SW scope: https://eldritchdaddy.github.io/eldritch-v2/
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon-192_BADASS.png",
  "./icon-512_BADASS.png",
  "./icon-512-maskable_BADASS.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // cache: 'reload' helps avoid weird browser HTTP cache during rapid deploys
    const reqs = CORE_ASSETS.map((p) => new Request(p, { cache: "reload" }));
    const results = await Promise.allSettled(reqs.map((r) => cache.add(r)));

    // If something fails, we still proceed (don’t brick install).
    // const failed = results.filter((x) => x.status === "rejected");
    // if (failed.length) console.log("[SW] precache partial fail:", failed.length);

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("eldritch-v2-cache-") && k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // Hardening: ignore non-GET (prevents weird edge-cases)
  if (req.method !== "GET") return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (_) {
    const cached = await cache.match(req);
    if (cached) return cached;

    const fallback = await cache.match("./index.html");
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
