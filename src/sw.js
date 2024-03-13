const CACHE_NAME = "2024-03-13 09:40";
const urlsToCache = [
  "/pppp-ja/",
  "/pppp-ja/index.js",
  "/pppp-ja/mp3/bgm.mp3",
  "/pppp-ja/mp3/cat.mp3",
  "/pppp-ja/mp3/correct3.mp3",
  "/pppp-ja/mp3/end.mp3",
  "/pppp-ja/mp3/keyboard.mp3",
  "/pppp-ja/problems.json",
  "/pppp-ja/favicon/favicon.svg",
  "https://marmooo.github.io/fonts/textar-light.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );
});
