// Cache only public shell assets. Exam PDFs, API responses and private pages are never cached.
const CACHE = "gc-assets-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        c.addAll([
          "/icons/icon-192.png",
          "/icons/icon-512.png",
          "/manifest.webmanifest",
        ]),
      ),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (
    url.origin !== self.location.origin ||
    ![
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/manifest.webmanifest",
    ].includes(url.pathname)
  )
    return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
