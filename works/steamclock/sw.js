// SteamClock PWA service worker
// Bump CACHE_VERSION when shipping a new release that should replace cached files.
const CACHE_VERSION = "steamclock-staging-v12";

// Keep installation light. Decorative images are cached by the fetch handler
// when they are requested after the first screen has appeared.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./codea-lite.js",
  "../../engine/sukimastock-engine.v0.2.0.js",
  "./sketch.js",

  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",

  "./assets/background.jpg",
  "./assets/dial.png",
  "./assets/hour_hand.png",
  "./assets/minute_hand.png",
  "./assets/second_hand.png",
  "./assets/nixie_tube.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) =>
            key.startsWith("steamclock-staging-v") &&
            key !== CACHE_VERSION
          )
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
