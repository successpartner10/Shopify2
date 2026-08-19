# Storescope

Privacy-first **Shopify admin live scanner**. Share the admin tab (or drop a screenshot). Storescope reads the visible banner/toast, matches a local playbook, and shows the next click — with arrows — in your browser.

- **GitHub Pages:** https://successpartner10.github.io/Shopify2/?v=2.6.0
- **Cloudflare Worker:** https://shopify2.panchgani2025.workers.dev/?v=2.6.0
- **Cloudflare Pages:** https://storescope-cwl.pages.dev/?v=2.6.0
- **Repo:** https://github.com/successpartner10/Shopify2
- **Full guide:** [STORESCOPE.md](./STORESCOPE.md)
- **Offline zip:** see the latest GitHub Release (`storescope-offline.zip`)

## Why this exists

Generic AIs (ChatGPT, Gemini, Grok, Kimi, Perplexity) and even **Shopify Sidekick** do not see *this* admin banner. Forums know the wording but cannot see your account. Storescope is: **this screen → this cause → this click**.

Pixels stay in the browser. History stores tip text only.

## Run locally

```bash
python3 server.py
# http://localhost:4173
```

Or any static host. No build step.

**Tab share will not work inside an iframe.** Open the app as a top-level tab, then pick the Shopify admin tab — not Storescope.

If share is denied: **Upload screenshot**, type the banner, or tap a sample.

## Privacy

- No Storescope server receives screenshots.
- OCR is vendored (Tesseract.js, English) and can run offline after the first cache.
- IndexedDB on this device only.
- Pause before customer lists or secret keys.

## License

MIT
