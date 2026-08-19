const VERSION = "storescope-v2.6.0";
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
  "./js/chat.js",
  "./js/cloud.js",
  "./js/routes.js",
  "./js/polaroids.js",
  "./js/vendor/fuse.min.js",
  "./js/vendor/tesseract/tesseract.min.js",
  "./js/vendor/tesseract/worker.min.js",
  "./js/vendor/tesseract/tesseract-core-simd.wasm.js",
  "./js/vendor/tesseract-lang/eng.traineddata.gz",
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
  "./samples/screenshots/01-payouts-on-hold.png",
  "./samples/screenshots/02-unable-to-accept-payments.png",
  "./samples/screenshots/03-no-shipping-rates.png",
  "./samples/screenshots/04-theme-has-errors.png",
  "./samples/test-mode.svg",
  "./samples/toast-declined.svg",
  "./samples/app-conflict.svg",
  "./samples/inventory-toast.svg",
  "./samples/polaroids/payout-hold.svg",
  "./samples/polaroids/shipping.svg",
  "./samples/polaroids/test-mode.svg",
  "./samples/polaroids/collective.svg",
  "./samples/polaroids/liquid.svg",
  "./samples/polaroids/edit-code.svg"
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

  const isHtml = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
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
