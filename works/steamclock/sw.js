// SteamClock PWA service worker
// Bump CACHE_VERSION when shipping a new release that should replace cached files.
const CACHE_VERSION = "steamclock-v3";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./codea-lite.js",
  "./sukimastock-engine.js",
  "./sketch.js",

  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",

  "./assets/background.png",
  "./assets/dial.png",
  "./assets/center_piece.png",
  "./assets/hour_hand.png",
  "./assets/minute_hand.png",
  "./assets/second_hand.png",
  "./assets/nixie_tube.png",
  "./assets/gear1.png",
  "./assets/gear2.png",
  "./assets/pendulum.png",
  "./assets/barometer_dial.png",
  "./assets/barometer_needle.png",
  "./assets/pipe_elbow.png",
  "./assets/pipe_straight.png",
  "./assets/valve.png",
  "./assets/gauge_dummy.png",
  "./assets/spring.png"
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
          .filter((key) => key !== CACHE_VERSION)
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

  // Navigation uses network-first so publishing a new index.html is reflected quickly.
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

  // Static app files are cache-first; fall back to network and cache successful responses.
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
