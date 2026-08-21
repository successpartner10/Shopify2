# Storescope — complete product guide

Privacy-first Shopify admin live scanner. **v3.5.0** · 20 August 2026.

| | |
|---|---|
| **GitHub Pages** | https://successpartner10.github.io/Shopify2/?v=3.5.0 |
| **Cloudflare Worker** | https://shopify2.panchgani2025.workers.dev/?v=3.5.0 |
| **Cloudflare Pages** | https://storescope-cwl.pages.dev/?v=3.5.0 (still old 1.x until Git reconnect — [DEPLOY.md](./DEPLOY.md)) |
| **Source** | https://github.com/successpartner10/Shopify2 |
| **Offline package** | [storescope-offline.zip](https://github.com/successpartner10/Shopify2/releases/download/v3.4.0/storescope-offline.zip) |
| **Privacy page** | https://successpartner10.github.io/Shopify2/privacy.html |
| **License** | MIT |

Pixels stay in the browser. History stores tip text only. No Storescope server receives screenshots.

---

## 1. What it does

Share a Shopify admin tab (or drop a screenshot). Storescope:

1. Reads banners, toasts, and validation text (band-first OCR + optional DOM-lite).
2. Matches a local playbook (banner rows + **150 hub issues**) from Shopify admin paths. Critical/High/Medium have unique click-paths.
3. Shows the **cause**, **next clicks**, **Step X of N**, and an **arrow** on the capture.
4. Walks numbered steps. **This worked** ranks that playbook higher next time on this device.

It does **not** log into Shopify, click for you, or lift a Risk/Payments hold.

Merchant path (nothing to set up):

1. Upload a screenshot, type the problem, or paste an `admin.shopify.com` link.
2. On a computer you can also **Share Shopify tab**.
3. Follow the numbered steps.

---

## 2. Live URLs

| Purpose | URL |
|---|---|
| Open the app | https://successpartner10.github.io/Shopify2/?v=3.5.0 |
| Worker mirror | https://shopify2.panchgani2025.workers.dev/?v=3.5.0 |
| Original Pages host | https://storescope-cwl.pages.dev/?v=3.5.0 |
| Shared playbook | `https://successpartner10.github.io/Shopify2/?v=3.5.0&fix=error-payout-hold-banner` |
| Typed search | `https://successpartner10.github.io/Shopify2/?v=3.5.0&q=klarna` |
| Home-screen shortcut (upload) | `https://successpartner10.github.io/Shopify2/?v=3.5.0&action=upload` |
| Privacy | https://successpartner10.github.io/Shopify2/privacy.html |

`?v=3.5.0` cache-busts CSS/JS and the service worker (`storescope-v3.5.0`). Hard-refresh if an old build is stuck.

---

## 3. Why “Share denied” happens

Browsers block **tab share** (`getDisplayMedia`) when the app is inside an **iframe** (Arena preview, many embeds). That is a browser security rule, not a broken scanner.

| Situation | What to do |
|---|---|
| Embedded preview | **Open in a new tab**, then share the **Shopify admin** tab |
| You dismissed the picker | Run it again → Allow → pick Shopify admin, not Storescope |
| iPhone / Android | Screenshot Shopify → **Upload** from Photos (not a camera photo) |
| `http://` (not localhost) | Use https or localhost |
| Just want to try the UI | Tap **See a demo first** |

Upload, samples, typed search, and pasted admin URLs work without tab share.

---

## 4. Features

### Merchant path (always visible)

| Feature | What you see |
|---|---|
| Home search | “What’s wrong in Shopify?” — type words or paste `admin.shopify.com/…` |
| Upload / drop / paste | Screenshot from Photos or clipboard image |
| Share Shopify tab | Desktop only; phones open Photos instead |
| Numbered steps | **Step X of N**, **Next step**, **Copy steps**, **This worked** |
| 10 topics | Payments, Checkout, Shipping, Themes, Products, Inventory, Apps, SEO, Domains, Admin |
| Polaroids | Tiny “tap here” crop on common paths (payouts, shipping, Collective, Liquid, Edit code) |
| Help | Stuck-cases + Privacy. Power tools stay hidden |
| Play this fix | One button; becomes Pause. **Next step** continues. |
| Light / dark | ☾ / ☼ · saved as `ss_theme` |

### Built-in, not on the home screen

| Feature | Where |
|---|---|
| Error-banner & toast recognition | Zone OCR: color bands first, then full frame |
| Guided flows | `data/flows.json` — checklist, **I did this**, **Stuck?** |
| “Why am I seeing this?” | Cause + Shopify system + Help Center chips |
| Diff / before-after | Hidden pro controls |
| DOM-lite bookmarklet | Paste `STORESCOPE_DOM:` into Ask |
| App & theme conflict detector | `data/conflicts.json` |
| Session / diagnostic export | Text only, PII scrubbed |
| Local notes | IndexedDB; import/export JSON; nothing uploaded |
| Offline + history | Service worker + IndexedDB |
| Voice + keyboard + Sidekick hand-off | Hidden pro / keyboard |
| Optional Gemini / Grok | Miss-only, text only, keys in `localStorage` |
| PWA pack (v2.7) | Share target, clipboard chip, shortcuts, launch-existing, wake lock + resume |

### PWA (1–5 shipped)

1. **Share to Storescope** — Android share sheet → POST `./share` → screenshot opens in the app. iOS does **not** support `share_target`.
2. **Clipboard on open** — if you copied a useful banner or admin URL, a chip asks “Use this?”
3. **Home-screen shortcuts** — Upload / Payouts / Shipping / Collective.
4. **Same-window launch** — `launch_handler.client_mode = navigate-existing`.
5. **Wake lock + resume** — screen stays awake during OCR; last playbook restores for 6 hours.

Parked (not built): screenshot inbox, badge, open-with, Shopify-is-down chip, desk-side PiP.

---

## 5. How to use

1. Open https://successpartner10.github.io/Shopify2/?v=3.5.0 as a **top-level tab**.
2. Open Shopify admin in another tab (computer) or take a screenshot (phone).
3. Share the Shopify tab, upload the screenshot, or type the banner.
4. Follow the numbered steps. Re-scan after each change.
5. Pause before customer lists or API keys.

---

## 6. Offline zip

1. Download [storescope-offline.zip](https://github.com/successpartner10/Shopify2/releases/download/v3.4.0/storescope-offline.zip).
2. Unzip.
3. Run `python3 server.py` and open http://localhost:4173  
   (Opening `index.html` as `file://` breaks ES modules and OCR workers in most browsers.)

The zip includes playbooks, samples, icons, **local Montserrat + Raleway**, and vendored Tesseract (English). No network is required after unzip **if** you use samples, typed search, or a screenshot. Tab share still needs a modern desktop browser.

---

## 7. Run from source

```bash
git clone https://github.com/successpartner10/Shopify2.git
cd Shopify2
python3 server.py
# http://localhost:4173
```

No build step. Static files only.

---

## 8. Playbook data

Searchable playbooks: banner rows plus **150 hub issues**. No duplicate ids. Not a 1,500-row generated grid.

| File | Role | Count |
|---|---|---|
| `data/issues.json` | 150 ranked issues in **10 topics** (not 5) | 150 |
| `data/errors.json` | Exact banners / toasts / validation | 16 |
| `data/payments.json` | Payments & payouts | 18 |
| `data/shipping.json` | Rates, zones, carriers | 18 |
| `data/general.json` | Themes, domains, Collective, Liquid, social, policies, how-tos | 47 |
| `data/howto.json` | Shopify Help how-tos (unique admin paths, not clones) | 2524 |
| `data/flows.json` | Guided checklists | 6 |
| `data/systems.json` | “Why am I seeing this?” | 10 systems |
| `data/conflicts.json` | App / theme patterns | 7 |
| `data/sources.json` | Forum / Sidekick / AI evaluation | — |

Each playbook entry: `id`, `match_phrases`, `cause`, `steps`, `arrow`, optional `flow_id`, `docs`, `severity`, `error_kind`.

Extra coverage: Pinterest channel vs profile link, Google & YouTube, Shop Collective, Customize vs Edit code, Custom Liquid, `theme.liquid` head.

Do **not** commit real merchant screenshots.

---

## 9. Privacy

- No Storescope backend. No screenshot upload.
- OCR runs in-page (vendored Tesseract).
- IndexedDB on this device only (`storescope` DB, version 3: sessions, community, recordings, ranks).
- Export scrubs emails, keys, phones, cards, order numbers.
- Optional cloud: `ss_gemini_key` / `ss_grok_key` / `ss_cloud_optin` in `localStorage`. Never committed.
- Treat the tool like someone looking over your shoulder.

**Revoke any GitHub token you paste into chat.** Rotate at https://github.com/settings/tokens

---

## 10. Audit log

### 2026-08-20, v3.5.0

How-tos from Shopify Help `/en/manual/` (2,524 unique articles — real admin paths, not a modulo grid). Find-on-shop box: paste `https://yourstore.com` + the words, get numbered clicks to change that text. Hand-written: checkout text, refund line on all products, cart text. Main Search stays global (topic filter is only inside a hub). Miss → Help-style steps (cloud opt-in only if a key is saved).

### 2026-08-20, v3.4.0

65 Medium issues now have unique admin click-paths (abandoned cart, discounts, Printful, Algolia, Loop, gift cards, mega-menu, etc.). Theme Medium rows still duplicate the theme first. `paintStepProgress` restored so **Step X of N** and **Next:** no longer crash. Offline zip includes `data/issues.json`. Not a 1,500-row modulo grid.

### 2026-08-20, v3.1.0

CSV titles, severity, and context folded into `data/issues.json`. 52 Critical/High rows have unique click-paths (Klarna, SSL, 100 variants, Risk lock, duplicate-theme first). Hub tiles (`data-hub`) open the topic list. Trailing `app.js` parse junk removed.

### 2026-08-19, v3.0.0

Fixed in this release:

| Bug | Fix |
|---|---|
| **Use this** chip / search could accept a pasted `ghp_` key | Secrets are blocked; never shown or searched |
| Screenshot / tab OCR crashed (`detectColorBands` was never imported in `ocr.js`) | Import from `banners.js` |
| Montserrat / Raleway loaded from Google but never applied (`--display` undefined; `--font` was system) | Local `@font-face` + CSS variables |
| Corrupt CSS rule `#si0%` | Removed |
| Offline navigate to `?v=…` missed the SW cache | HTML fallback to `./index.html` / `./` |
| Playbook fetch used `force-cache` | Default cache; SW version bump clears old files |
| Typed “pinterest” opened theme social links, not the channel | Phrase split |
| Typed “payouts on hold” / “no shipping rates” / “domain not connected” / “theme has errors” missed the exact banner row | Phrases added on error entries |
| Diagnostic export still said `2.0.0` | `3.0.0` |
| History / flow HTML could render raw objects | Escaped + string steps |
| Shopify app docs still said `?v=2.6.0` | `?v=3.0.0` |
| Offline zip pointed at the v2.1.0 release | v3.0.0 release |
| Tap targets 44–50px | 54px |

Still needs a real Shopify admin (cannot be fully tested here):

- OCR on 12px Polaris validation and vanishing toasts
- Arrow calibration on new vs old admin nav / zoom
- Bookmarklet selectors vs current Polaris class names
- `getDisplayMedia` picker labels per browser

---

## 11. Keyboard

| Key | Action |
|---|---|
| S | Scan |
| N / B | Next / previous step |
| Space | Mark step done |
| R | Re-scan step |
| ? | Stuck? |
| D | Diff |
| V | Voice |
| K | Copy Sidekick prompt |
| / | Focus Ask |
| Esc | Close drawer |

---

## 12. Shopify app + charging

Storescope is a **standalone** static site (`embedded = false`). Embedding it in admin **breaks tab share**.

A **public** Shopify app must use **Shopify App Pricing** (not Gumroad) after install. A **custom** app cannot use the Billing API. Until Partner OAuth + GDPR webhook stubs exist on the Worker, the honest first charge path is a separate SaaS / Gumroad license — not an App Store listing.

See [SHOPIFY_APP.md](./SHOPIFY_APP.md). Do not paste Client secret into chat.

---

## 13. Version map

| Piece | Value |
|---|---|
| App | `3.5.0` (`js/version.js`) |
| Service worker | `storescope-v3.5.0` |
| Public query | `?v=3.5.0` on HTML, CSS, JS, manifest, shortcuts |
| IndexedDB | `storescope` v3 |
