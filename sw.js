const VERSION = "storescope-v3.3.2";
const PRECACHE = [
  "./",
  "./index.html",
  "./privacy.html",
  "./css/app.css",
  "./fonts/montserrat-latin.woff2",
  "./fonts/montserrat-latin-ext.woff2",
  "./fonts/raleway-latin.woff2",
  "./fonts/raleway-latin-ext.woff2",
  "./js/app.js",
  "./js/dictionary.js",
  "./js/publicPages.js",
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
  "./js/pwa.js",
  "./js/pip.js",
  "./js/version.js",
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
  "./data/issues.json",
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
  "./samples/polaroids/edit-code.svg",
  "./samples/polaroids/privacy-policy.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION && k !== "ss-share").map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.method === "POST" && /\/share\/?$/.test(url.pathname)) {
    event.respondWith(handleSharePost(req));
    return;
  }

  if (req.method !== "GET") return;

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
        .catch(async () => {
          return (await caches.match(req))
            || (await caches.match("./index.html"))
            || (await caches.match("./"))
            || new Response("Storescope is offline and this page is not cached yet. Reopen once online.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            });
        })
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

async function handleSharePost(request) {
  try {
    const form = await request.formData();
    const file = form.get("image") || form.get("file") || form.get("media");
    const text = [form.get("text"), form.get("title"), form.get("url")].filter(Boolean).join(" ").trim();
    const cache = await caches.open("ss-share");
    if (file && typeof file === "object" && file.size) {
      const headers = new Headers({
        "Content-Type": file.type || "image/png",
        "X-Name": file.name || "shared.png"
      });
      await cache.put("pending-file", new Response(file, { headers }));
    }
    if (text) await cache.put("pending-text", new Response(text));
  } catch {
    /* still bounce home */
  }
  return Response.redirect(new URL("./index.html?v=3.3.2&shared=1", request.url), 303);
}
