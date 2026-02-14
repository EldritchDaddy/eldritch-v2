/* ELDRITCH V2 — service-worker.js (PRODUCTION)
   Cache v23

   - Network-first for HTML
   - Cache-first for static assets
   - Cleans old caches on activate
*/

const CACHE_VERSION = 23;
const CACHE_NAME = `eldritch-v2-cache-v${CACHE_VERSION}`;

const CORE_ASSETS = [
  "/eldritch-v2/",
  "/eldritch-v2/index.html",
  "/eldritch-v2/app.js",
  "/eldritch-v2/manifest.json",

  // BADASS icons (root-level, matching repo)
  "/eldritch-v2/icon-192_BADASS.png",
  "/eldritch-v2/icon-512_BADASS.png",
  "/eldritch-v2/icon-512-maskable_BADASS.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch {
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
