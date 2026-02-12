consttch-v13-cache CACHE_NAME = "eldritch-v32-cache";

const FILES_TO_CACHE = [
  "/eldritch-v2/",
  "/eldritch-v2/index.html",
  "/eldritch-v2/manifest.json",
  "/eldritch-v2/icon-192.png",
  "/eldritch-v2/icon-512.png"
];

// Install
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
