# Storescope

Privacy-first **Shopify admin live scanner**. Share the admin tab (or drop a screenshot). Storescope reads the visible banner/toast, matches a local playbook, and shows the next click — with arrows — in your browser.

Live reference: [storescope-cwl.pages.dev](https://storescope-cwl.pages.dev/)

## Why this exists

Generic AIs (ChatGPT, Gemini, Grok, Kimi, Perplexity) and even **Shopify Sidekick** do not see *this* admin banner. Forums know the wording but cannot see your account. Storescope is the missing piece: **this screen → this cause → this click**.

Pixels stay in the browser. History stores tip text only.

## Run locally

```bash
python3 server.py
# open http://localhost:4173
```

Or any static host (Cloudflare Pages, GitHub Pages, Netlify). No build step.

**Tab share will not work inside an iframe.** Open the app as a top-level tab (https or localhost), then click **Start scanning** and pick the Shopify admin tab — not the Storescope tab.

If share is denied: **Upload screenshot**, type the banner, or tap a sample. Those paths do not need display-capture.

## Features

1. Error-banner / toast / validation recognition + arrows
2. Multi-step guided flows with re-scan and “Stuck?”
3. “Why am I seeing this?” + official docs
4. Before / after diff
5. OCR + optional DOM-lite bookmarklet
6. App / theme conflict detector
7. Privacy-scrubbed diagnostic export
8. Local known-issue playbook (import/export JSON)
9. Offline-first once playbooks (and first OCR) are cached
10. Voice, keyboard shortcuts, Sidekick prompt hand-off

## Privacy

- No Storescope server receives screenshots.
- OCR (Tesseract.js) may load from a CDN the first time.
- IndexedDB on this device: tip text, local contributions, optional event log.
- Export scrubs emails, API keys, phones, cards, order numbers.
- Pause before opening customer lists or secret keys.

## Deploy

Cloudflare Pages / GitHub Pages: publish the repo root. `index.html` is the entry. Service worker caches playbooks for offline use.

## Contributing playbooks

`data/errors.json`, `payments.json`, `shipping.json`, `general.json` — each entry is a phrase list + cause + steps + optional `arrow` / `flow_id`. Keep steps as real admin clicks. Do not commit real merchant screenshots.

## License

MIT
