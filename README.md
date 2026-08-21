# Storescope

Privacy-first **Shopify admin helper**. Share the admin tab (or drop a screenshot). Storescope reads the visible banner, matches a local playbook, and shows numbered next clicks in your browser.

| Host | URL |
|---|---|
| **GitHub Pages** (source of truth) | https://successpartner10.github.io/Shopify2/?v=3.6.6 |
| **Cloudflare Worker** | https://shopify2.panchgani2025.workers.dev/?v=3.6.6 |
| **Cloudflare Pages** | https://storescope-cwl.pages.dev/?v=3.6.6 — still the old 1.x until you reconnect Git; see [DEPLOY.md](./DEPLOY.md) |
| **Source** | https://github.com/successpartner10/Shopify2 |
| **Offline zip** | [GitHub Release v3.6.6](https://github.com/successpartner10/Shopify2/releases/tag/v3.6.6) |
| **Shopify app notes** | [SHOPIFY_APP.md](./SHOPIFY_APP.md) |
| **Full guide** | [STORESCOPE.md](./STORESCOPE.md) |
| **Go live (GitHub / Cloudflare / Shopify)** | [IMPLEMENT.md](./IMPLEMENT.md) |
| **Privacy** | [privacy.html](./privacy.html) |

Pixels stay in the browser. History stores tip text only.

## Run locally

```bash
python3 server.py
# http://localhost:4173
```

Or any static host. No build step.

**Tab share will not work inside an iframe.** Open the app as a top-level tab, then pick the Shopify admin tab — not Storescope.

On a phone: screenshot Shopify → Upload from Photos (not a camera photo).

## Privacy

- No Storescope server receives screenshots.
- OCR is vendored (Tesseract.js, English) and can run offline after the first cache.
- IndexedDB on this device only.
- Pause before customer lists or secret keys.

## License

MIT
