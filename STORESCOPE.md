# Storescope — complete product guide

Privacy-first Shopify admin live scanner. **v3.6.5** · 21 August 2026.

| | |
|---|---|
| **GitHub Pages** | https://successpartner10.github.io/Shopify2/?v=3.6.5 |
| **Cloudflare Worker** | https://shopify2.panchgani2025.workers.dev/?v=3.6.5 |
| **Cloudflare Pages** | https://storescope-cwl.pages.dev/?v=3.6.5 (still old 1.x until Git reconnect — [DEPLOY.md](./DEPLOY.md)) |
| **Source** | https://github.com/successpartner10/Shopify2 |
| **Offline package** | [storescope-offline.zip](https://github.com/successpartner10/Shopify2/releases/download/v3.6.5/storescope-offline.zip) |
| **Privacy page** | https://successpartner10.github.io/Shopify2/privacy.html |
| **License** | MIT |

Pixels stay in the browser. History stores tip text only. No Storescope server receives screenshots.

---

## 1. What it does

Share a Shopify admin tab (or drop a screenshot). Storescope:

1. Reads banners, toasts, and validation text (band-first OCR + optional DOM-lite).
2. Matches a local playbook (banner rows + **150 hub issues** + **2,524 Help how-tos** + **500 community how-tos** + your saved how-tos).
3. Shows the **cause**, **next clicks**, **Step X of N**.
4. Walks numbered steps. **This worked** ranks that playbook higher next time on this device.

It does **not** log into Shopify, click for you, or lift a Risk/Payments hold.

Merchant path (nothing to set up):

1. Upload a screenshot, type the problem, or paste an `admin.shopify.com` link.
2. On a computer you can also **Share Shopify tab**.
3. To change words on the live shop: paste `https://yourstore.com` + the text → **Find**.
4. Follow the numbered steps.

---

## 2. Live URLs

| Purpose | URL |
|---|---|
| Open the app | https://successpartner10.github.io/Shopify2/?v=3.6.5 |
| Worker mirror | https://shopify2.panchgani2025.workers.dev/?v=3.6.5 |
| Original Pages host | https://storescope-cwl.pages.dev/?v=3.6.5 |
| Shared playbook | `https://successpartner10.github.io/Shopify2/?v=3.6.5&fix=error-payout-hold-banner` |
| Typed search | `https://successpartner10.github.io/Shopify2/?v=3.6.5&q=klarna` |
| Home-screen shortcut (upload) | `https://successpartner10.github.io/Shopify2/?v=3.6.5&action=upload` |
| Privacy | https://successpartner10.github.io/Shopify2/privacy.html |

`?v=3.6.5` cache-busts CSS/JS and the service worker (`storescope-v3.6.5`). Hard-refresh if an old build is stuck.

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

Upload, samples, typed search, Find on shop, and pasted admin URLs work without tab share.

---

## 4. Features

### Merchant path (always visible)

| Feature | What you see |
|---|---|
| Home search | Type a problem or how-to (`add text to checkout`, `refund policy`) |
| Find on shop | Shop URL + words on the live site → admin clicks to change that text |
| Upload / drop / paste | Screenshot from Photos or clipboard image |
| Share Shopify tab | Desktop only; phones open Photos instead |
| Numbered steps | **Step X of N**, **Next step**, **Copy steps**, **This worked** |
| 11 topics | Payments … Admin, plus **How to** (save your own) |
| Polaroids | Tiny “tap here” crop on common paths |
| Help | Stuck-cases + Privacy. Power tools stay hidden |
| Play this fix | One button; becomes Pause. **Next step** continues |
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

1. Open https://successpartner10.github.io/Shopify2/?v=3.6.5 as a **top-level tab**.
2. Open Shopify admin in another tab (computer) or take a screenshot (phone).
3. Share the Shopify tab, upload the screenshot, or type the banner / how-to.
4. Follow the numbered steps. Re-scan after each change.
5. Pause before customer lists or API keys.

### Find text on the live shop

1. First box: `https://yourstore.com` (saved once).
2. Second box: the words you see on the site.
3. Tap **Find**. Storescope names the admin screen (Policies, product template, Cart, Checkout, announcement bar, Home, Pages).
4. Browsers usually **block reading** another origin (CORS). You still get the right clicks plus **Open page** links. If a page is readable, it says Found on …

| Kind of text | Where you edit |
|---|---|
| Refund / privacy / terms / shipping policy | Settings → Policies |
| Same line on every product | Duplicate theme → Customize → Products → Default product → Rich text |
| One product title/description | Products → that product |
| Checkout pay page | Settings → Checkout → Customize (or Cart, if no banner) |
| Cart | Customize → Cart |
| Top bar | Customize → Announcement bar |
| Homepage | Customize → Home |
| Menu / footer link | Content → Menus |
| Logo | Theme settings → Logo |

Do **not** Edit code on the published theme.

### Save a how-to you found (AI / Google)

1. Open **How to**.
2. Paste the question you asked, then the steps (one per line).
3. Tap **Save how-to**. Search will find it on this device.
4. Or open any playbook → **Save this how-to**.
5. **Download mine** if you want those rows in the GitHub playbook later. Nothing is uploaded.

### Example searches

| Type this | Playbook |
|---|---|
| `add text to checkout` | Settings → Checkout → Customize, or Cart Rich text |
| `refund related text line across all products pages at once` | Product template Rich text — not Settings → Policies |
| `refund policy` | Settings → Policies, then footer menu |
| `how to change my logo` | Theme settings → Logo |

---

## 6. Offline zip

1. Download [storescope-offline.zip](https://github.com/successpartner10/Shopify2/releases/download/v3.6.5/storescope-offline.zip).
2. Unzip.
3. Run `python3 server.py` and open http://localhost:4173  
   (Opening `index.html` as `file://` breaks ES modules and OCR workers in most browsers.)

The zip includes playbooks (**including `data/howto.json`**), samples, icons, **local Montserrat + Raleway**, and vendored Tesseract (English). No network is required after unzip **if** you use samples, typed search, or a screenshot. Tab share still needs a modern desktop browser. Find-on-shop needs the network to try the public shop (CORS often blocks the read; steps still show).

Rebuild: `python3 scripts/make_offline_zip.py` (zip is gitignored; attach to the GitHub Release).

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

Searchable playbooks: banner rows, **150 hub issues**, **2,524 Shopify Help how-tos**, **500 community/SO how-tos**, plus hand-written and your saved how-tos. No duplicate ids. Not a 1,500-row generated grid.

| File | Role | Count |
|---|---|---|
| `data/issues.json` | 150 ranked issues in **10 topics** (not 5) | 150 |
| `data/howto.json` | Shopify Help `/en/manual/` → unique admin paths + Help URL | 2524 |
| `data/forum.json` | Community/SO questions → unique admin clicks + Help URL | 500 |
| `data/errors.json` | Exact banners / toasts / validation | 16 |
| `data/payments.json` | Payments & payouts | 18 |
| `data/shipping.json` | Rates, zones, carriers | 18 |
| `data/general.json` | Themes, domains, Collective, Liquid, social, policies, how-tos | 47 |
| `data/flows.json` | Guided checklists | 6 |
| `data/systems.json` | “Why am I seeing this?” | 10 systems |
| `data/conflicts.json` | App / theme patterns | 7 |
| `data/sources.json` | Forum / Sidekick / AI evaluation | — |

Each playbook entry: `id`, `match_phrases`, `cause`, `steps`, `arrow`, optional `flow_id`, `docs`, `severity`, `error_kind`.

Hand-written how-tos (035–047) include: refund policy location, text on all products, product images, logo, announcement bar, pages, menus, colors, homepage, **refund line on all products**, **checkout text**, **cart text**, find-on-shop.

Rebuild Help how-tos: `python3 scripts/build_howto.py` (reads https://help.shopify.com/sitemap-en.xml).

Do **not** commit real merchant screenshots.

---

## 9. Privacy

- No Storescope backend. No screenshot upload.
- OCR runs in-page (vendored Tesseract).
- IndexedDB on this device only (`storescope` DB, version 3: sessions, community, recordings, ranks).
- Export scrubs emails, keys, phones, cards, order numbers.
- Optional cloud: `ss_gemini_key` / `ss_grok_key` / `ss_cloud_optin` in `localStorage`. Never committed. Used only on a local miss, text only.
- Find-on-shop fetches **public** shop URLs from the browser (CORS usually blocks). Shop origin is stored as `ss_shop_origin`.
- Treat the tool like someone looking over your shoulder.

**Revoke any GitHub token you paste into chat.** Rotate at https://github.com/settings/tokens

---

## 10. Audit log

### 2026-08-21, v3.6.5

Standalone Shopify Partner app on the Worker: `/auth`, `/auth/callback`, GDPR webhook stubs (HMAC). Embedded off. Zero scopes. Icon `icons/app-store-1200.png`. You still add Client ID/secret in Cloudflare — not in chat.

### 2026-08-21, v3.6.3

How to: paste an AI/Google fix (question + steps) — saved on this device. Search finds it. **Save this how-to** on any playbook. **Download mine** to put it in GitHub later. Plus **500** unique community/SO how-tos (`data/forum.json`) with real Help URLs. Not a modulo grid.

### 2026-08-21, v3.6.2

Shipped the real ExtraLight Raleway file (not the Medium variable cut). Headline, buttons, topics, and steps are all ExtraLight 200. Montserrat Bold is no longer used.

### 2026-08-21, v3.6.1

CSS unlocked weight 200 but titles stayed Montserrat 750, so the page still looked bold.

### 2026-08-21, v3.6.0

Saved shop links (up to 5). How to topic. Capture overlay skipped.

### 2026-08-20, v3.5.0

How-tos from Shopify Help `/en/manual/` (2,524 unique articles — real admin paths, not a modulo grid). Find-on-shop box: paste `https://yourstore.com` + the words, get numbered clicks to change that text. Hand-written: checkout text, refund line on all products, cart text. Main Search stays global (topic filter is only inside a hub). Miss → Help-style steps (cloud opt-in only if a key is saved). Help how-tos are phrase-matched, not fuzzy-indexed, so they do not steal banner searches. `howto.json` is not service-worker precached (fetched on demand).

### 2026-08-20, v3.4.0

Search finds refund policy; shop URL optional once. Public page overlay + sitemap try. Bidirectional phraseHits.

### 2026-08-20, v3.3.2

Refund policy location + text on all products. GENERIC_WORD rebuild.

### 2026-08-20, v3.3.1

SW `updateViaCache: "none"` so 10 topics replace cached 5.

### 2026-08-20, v3.3.0

10 home topics, not 5.

### 2026-08-20, v3.2.0

65 Medium issues now have unique admin click-paths. `paintStepProgress` restored so **Step X of N** and **Next:** no longer crash. Offline zip includes `data/issues.json`. Not a 1,500-row modulo grid.

### 2026-08-20, v3.1.0

CSV titles, severity, and context folded into `data/issues.json`. 52 Critical/High rows have unique click-paths. Hub tiles (`data-hub`) open the topic list.

### 2026-08-19, v3.0.0

Fixed in this release:

| Bug | Fix |
|---|---|
| **Use this** chip / search could accept a pasted `ghp_` key | Secrets are blocked; never shown or searched |
| Screenshot / tab OCR crashed (`detectColorBands` was never imported in `ocr.js`) | Import from `banners.js` |
| Montserrat / Raleway loaded from Google but never applied | Local `@font-face` + CSS variables |
| Offline navigate to `?v=…` missed the SW cache | HTML fallback to `./index.html` / `./` |
| Typed “pinterest” opened theme social links, not the channel | Phrase split |

Still needs a real Shopify admin (cannot be fully tested here):

- OCR on 12px Polaris validation and vanishing toasts
- Arrow calibration on new vs old admin nav / zoom
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
| App | `3.6.5` (`js/version.js`) |
| Service worker | `storescope-v3.6.5` |
| Public query | `?v=3.6.5` on HTML, CSS, JS, manifest, shortcuts |
| IndexedDB | `storescope` v3 |
| Help how-tos | 2524 (`data/howto.json`) |
| Hand-written how-tos | general 035–047 |

---

## 14. Functionality checklist (v3.6.5)

| Area | Status |
|---|---|
| 11 topic tiles (`data-hub`, includes How to) | Wired |
| Main Search global (not trapped in a topic) | Fixed |
| Hub box search stays in-topic | Yes (`#hubSearch`) |
| Screenshot / upload / paste / tab share | Yes |
| Play this fix / Pause / Next step | Yes |
| Copy steps for a friend | Yes |
| Find on shop | Yes |
| Refund policy + public `/policies/*` | Yes |
| Checkout text / all-products refund line / cart text | Yes |
| 2524 Help how-tos | Phrase match; not Fuse |
| 500 community how-tos | Phrase match (`data/forum.json`) |
| Save a how-to on this device | How to topic + **Save this how-to** |
| Miss → numbered Help/Google steps | Yes; AI only if opt-in + key |
| Raleway ExtraLight body / steps | Yes (`--fw-body: 200`, 20px) |
| Coach overlay | CSS `display: none !important` |
| Secrets in search | Blocked |
| GitHub Pages deploy on `main` | `.github/workflows/pages.yml` |
| Offline zip includes issues + howto | `scripts/make_offline_zip.py` |
