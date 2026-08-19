const VERSION = "storescope-v2.0.0";
const PRECACHE = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/dictionary.js",
  "./js/banners.js",
  "./js/ocr.js",
  "./js/capture.js",
  "./js/hybrid.js",
  "./js/explain.js",
  "./js/guide.js",
  "./js/diff.js",
  "./js/conflicts.js",
  "./js/session.js",
  "./js/voice.js",
  "./js/share.js",
  "./js/samples.js",
  "./js/privacy.js",
  "./js/vendor/fuse.min.js",
  "./data/payments.json",
  "./data/shipping.json",
  "./data/general.json",
  "./data/errors.json",
  "./data/systems.json",
  "./data/flows.json",
  "./data/conflicts.json",
  "./data/sources.json",
  "./manifest.json",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/qr-app.png",
  "./samples/payout-hold.svg",
  "./samples/no-shipping.svg",
  "./samples/no-provider.svg",
  "./samples/theme-errors.svg",
  "./samples/test-mode.svg",
  "./samples/toast-declined.svg",
  "./samples/app-conflict.svg",
  "./samples/inventory-toast.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
