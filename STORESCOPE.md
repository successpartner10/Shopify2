# Storescope — complete product guide

Privacy-first Shopify admin live scanner.

| | |
|---|---|
| **GitHub Pages** | https://successpartner10.github.io/Shopify2/?v=2.7.0 |
| **Cloudflare Worker** | https://shopify2.panchgani2025.workers.dev/?v=2.7.0 |
| **Cloudflare Pages** | https://storescope-cwl.pages.dev/?v=2.7.0 |
| **Source** | https://github.com/successpartner10/Shopify2 |
| **Offline package** | [GitHub Release zip](https://github.com/successpartner10/Shopify2/releases/download/v2.1.0/storescope-offline.zip) |
| **License** | MIT |

Pixels stay in the browser. History stores tip text only. No Storescope server receives screenshots.

---

## 1. What it does

Share a Shopify admin tab (or drop a screenshot). Storescope:

1. Reads banners, toasts, and validation text (OCR + optional DOM-lite).
2. Matches a local playbook built from official Help, Community forums, and known Sidekick / ChatGPT / Gemini / Grok / Kimi gaps.
3. Shows the **cause**, **next clicks**, and an **arrow** on the capture.
4. Walks a checklist. Re-scan after each step. **Stuck?** offers another path.

It does **not** log into Shopify, click for you, or lift a Risk/Payments hold.

---

## 2. Live URLs

- GitHub Pages: https://successpartner10.github.io/Shopify2/?v=2.7.0
- Worker: https://shopify2.panchgani2025.workers.dev/?v=2.7.0
- Pages: https://storescope-cwl.pages.dev/?v=2.7.0
- Repo: https://github.com/successpartner10/Shopify2
- Shared playbook: `https://successpartner10.github.io/Shopify2/?v=2.7.0&fix=error-payout-hold-banner`
- Search: `https://successpartner10.github.io/Shopify2/?v=2.7.0&q=payouts%20on%20hold`

---

## 3. Why “Share denied” happens

Browsers block **tab share** (`getDisplayMedia`) when the app is inside an **iframe** (Arena preview, many embeds). That is a browser security rule, not a broken scanner.

| Situation | What to do |
|---|---|
| Embedded preview | Click **Open in a new tab**, then **Start scanning** |
| You dismissed the picker | Run it again → Allow → pick the **Shopify admin** tab (not Storescope) |
| iPhone / in-app browser | **Upload screenshot** or type the banner |
| `http://` (not localhost) | Use https or localhost |
| Just want to try the UI | Tap a **sample screen** |

Upload, samples, and typed Ask work without tab share.

---

## 4. Features (all 10)

### 1. Error-banner & toast recognition

- Zone OCR: top ~22% (Polaris banner) and bottom ~22% (toast).
- Color bands: red / amber / blue regions outlined on the capture.
- Dedicated `data/errors.json` for exact Shopify copy: payouts on hold, unable to accept payments, test mode, card declined toast, bank validation, no shipping rates, theme errors, permission toast, inventory, billing, domain, app conflict, admin 500.
- Arrow targets the banner or CTA.

### 2. Multi-step guided flows

`data/flows.json` — checklist, progress %, **I did this**, **Re-scan step** (auto-advance when `done_if` phrases appear), **Stuck?** alternate playbooks.

### 3. “Why am I seeing this?”

Cause + Shopify system (`data/systems.json`) + official doc chips + Help Center search + notes on what forums / Sidekick / generic AIs miss.

### 4. Diff / before-after

**Before** → change in admin → **After**. Line-level added/removed, mapped back to the playbook. Tiny thumbs stay on-device.

### 5. Screenshot + DOM-lite hybrid

OCR word boxes + color bands. Optional bookmarklet copies `STORESCOPE_DOM:` (Polaris banners/toasts/alerts) from the Shopify tab — paste into Ask. No cross-tab DOM access (impossible in the browser).

### 6. App & theme conflict detector

`data/conflicts.json` — checkout extensions, shipping apps, embeds, fraud apps, currency converters, subscriptions, outdated apps. Suggests a disable/test sequence.

### 7. Session recording + diagnostic package

Optional event log (not raw video). **Export** downloads JSON scrubbed of emails, API keys, phones, cards, order numbers.

### 8. Community known issues

Local IndexedDB. Save banner + steps that worked. Ranked by “This worked”. Import/export JSON. Nothing is uploaded.

### 9. Offline-first + history

Service worker caches playbooks, UI, and vendored Tesseract. After the first load on https, typed search, samples, and history work offline. History reopens a past playbook.

### 10. Voice + keyboard + Sidekick hand-off

Narrates the current tip. Shortcuts: `S` scan, `N`/`B` step, `Space` done, `R` re-scan, `?` stuck, `D` diff, `V` voice, `K` Sidekick, `/` ask, `Esc` close.

**Ask Sidekick** copies a prompt (detected banner, cause, current step). Paste into the purple glasses in Shopify admin. Sidekick cannot see this screenshot and cannot lift a Risk hold.

---

## 5. How to use

1. Open https://successpartner10.github.io/Shopify2/?v=2.7.0 as a **top-level tab**.
2. Open Shopify admin in another tab.
3. **Start scanning** → pick the Shopify tab.
4. **What's wrong?**
5. Follow the numbered steps. Re-scan after each change.
6. **Pause** before customer lists or API keys.

Or: upload a PNG/JPEG, drag a screenshot onto the stage, tap a sample, or type the banner.

---

## 6. Offline zip

1. Download [storescope-offline.zip](./storescope-offline.zip).
2. Unzip.
3. Run `python3 server.py` and open http://localhost:4173  
   (Opening `index.html` as `file://` breaks ES modules and OCR workers in most browsers.)

The zip includes playbooks, samples, icons, and vendored Tesseract (English). No network is required after unzip **if** you use samples, typed Ask, or a screenshot. Tab share still needs a modern desktop browser.

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

| File | Role |
|---|---|
| `data/errors.json` | Exact banners / toasts / validation |
| `data/payments.json` | Payments & payouts |
| `data/shipping.json` | Rates, zones, carriers |
| `data/general.json` | Themes, domains, inventory, staff |
| `data/flows.json` | Guided checklists |
| `data/systems.json` | “Why am I seeing this?” |
| `data/conflicts.json` | App / theme patterns |
| `data/sources.json` | Forum / Sidekick / AI evaluation |

Each playbook entry: `id`, `match_phrases`, `cause`, `steps`, `arrow`, optional `flow_id`, `docs`, `severity`, `error_kind`.

Do **not** commit real merchant screenshots.

---

## 9. Privacy

- No Storescope backend. No screenshot upload.
- OCR runs in-page (vendored Tesseract).
- IndexedDB on this device only.
- Export scrubs PII-shaped strings.
- Treat the tool like someone looking over your shoulder.

**Revoke any GitHub token you paste into chat.** Tokens in tickets or chat logs should be rotated at https://github.com/settings/tokens

---

## 10. Audit log (2026-08-19)

Fixed in this release:

- Iframe **Share denied** no longer looks like a crash — recovery card + Open in new tab.
- Missing **Open in new tab** CTA restored.
- Community / history / step HTML escaped (XSS).
- Tesseract vendored so GitHub Pages and the zip work offline after first cache.
- Default share / canonical URLs point at github.io, not the old Pages.dev host.
- Drag-and-drop screenshots on the stage.
- Share-denied panel hides when a sample or upload succeeds.
- Service worker cache bumped to `v2.1.0` and includes OCR assets.

Still needs a real Shopify admin (cannot be fully tested here):

- OCR on 12px Polaris validation and vanishing toasts.
- Arrow calibration on new vs old admin nav / zoom.
- Bookmarklet selectors vs current Polaris class names.
- `getDisplayMedia` picker labels per browser.

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
