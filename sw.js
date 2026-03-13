const CACHE_NAME = "keisan-quiz-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./app-icon.svg",
  "./app-icon-192.png",
  "./app-icon-512.png",
  "./apple-touch-icon.png"
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
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isCoreAsset =
    requestUrl.origin === self.location.origin &&
    (requestUrl.pathname.endsWith("/") ||
      requestUrl.pathname.endsWith("/index.html") ||
      requestUrl.pathname.endsWith("/styles.css") ||
      requestUrl.pathname.endsWith("/app.js") ||
      requestUrl.pathname.endsWith("/manifest.json") ||
      requestUrl.pathname.endsWith("/app-icon.svg") ||
      requestUrl.pathname.endsWith("/app-icon-192.png") ||
      requestUrl.pathname.endsWith("/app-icon-512.png") ||
      requestUrl.pathname.endsWith("/apple-touch-icon.png"));

  if (isCoreAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("./index.html"));
    })
  );
});
