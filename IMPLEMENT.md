# Storescope — implement on GitHub, Cloudflare, and Shopify

Do this in order. **Do not paste Client secret, API keys, or tokens into chat.**

**Sources:** Official Shopify Help is linked as the last step. Community / AI / Google answers you paste are **rewritten as our numbered steps** — no Stack Overflow or forum citation. We do not scrape Google or Sidekick.

Today’s app version in the repo: **v3.6.4**.

---

## 0. What is already done vs what only you can click

| Piece | Status |
|---|---|
| App code on GitHub `main` | Done (`successpartner10/Shopify2`) |
| GitHub Pages site | Done — https://successpartner10.github.io/Shopify2/?v=3.6.4 |
| Worker code (`worker.js` OAuth + GDPR) | In `main`. Cloudflare may still be serving the **old static-only** build until you retry |
| Cloudflare Pages `storescope-cwl.pages.dev` | Still **old 1.x** until you reconnect Git |
| Partner app + secrets | **You** — cannot be done from this chat |
| App Store review | **You** — after a custom install works |

---

## 1. Copy these URLs into a note

Keep this note open while you click.

| What | Exact URL |
|---|---|
| Source | https://github.com/successpartner10/Shopify2 |
| Use this site (GitHub.io) | https://successpartner10.github.io/Shopify2/?v=3.6.4 |
| Worker (Shopify App URL host) | https://shopify2.panchgani2025.workers.dev/ |
| Worker app (after install) | https://shopify2.panchgani2025.workers.dev/?v=3.6.4 |
| **App URL** (paste in Shopify) | https://shopify2.panchgani2025.workers.dev/auth |
| **Redirect** (paste in Shopify) | https://shopify2.panchgani2025.workers.dev/auth/callback |
| Privacy | https://shopify2.panchgani2025.workers.dev/privacy.html |
| Health check | https://shopify2.panchgani2025.workers.dev/healthz |
| GDPR: customers/data_request | https://shopify2.panchgani2025.workers.dev/webhooks/customers-data-request |
| GDPR: customers/redact | https://shopify2.panchgani2025.workers.dev/webhooks/customers-redact |
| GDPR: shop/redact | https://shopify2.panchgani2025.workers.dev/webhooks/shop-redact |
| Old Pages (do not use until reconnected) | https://storescope-cwl.pages.dev/ |
| Listing icon in repo | `icons/app-store-1200.png` |
| Listing words | [APP_STORE.md](./APP_STORE.md) |

---

## 2. GitHub (usually nothing to do)

The app already deploys from `main`.

1. Open https://github.com/successpartner10/Shopify2
2. Confirm the latest commit on **main** mentions **v3.6.4** (or later).
3. **Settings → Pages**
   - Source: **GitHub Actions** (workflow `.github/workflows/pages.yml`)
   - Not “Deploy from a branch” unless you already know that works
4. Open https://successpartner10.github.io/Shopify2/?v=3.6.4  
   Under the logo you should see **v3.6.4**.  
   If you see an older version: hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) or delete the home-screen icon.

You do **not** need to make the repo private.  
If you ever make it private: GitHub Pages on a Free plan usually **stops**. Cloudflare Pages can still publish a public site from a private repo.

**Do not** put `SHOPIFY_API_SECRET` in the repo, in `wrangler.toml`, or in `shopify.app.toml`.

---

## 3. Cloudflare Worker `shopify2` (required for Shopify)

This hostname is what Shopify will open:

`https://shopify2.panchgani2025.workers.dev`

A push to `main` *should* rebuild it. After we added `worker.js`, the first build can stick on the old **assets-only** site. `/healthz` then shows the homepage instead of JSON. Fix that first.

### 3.1 Confirm whether the new Worker is live

1. Open a **private/incognito** window.
2. Go to https://shopify2.panchgani2025.workers.dev/healthz
3. Read what you get:

| You see | Meaning | Next |
|---|---|---|
| JSON like `{ "ok": true, "app": "storescope", "version": "3.6.4", "shopify_key": false, ... }` | Worker code is live | Go to **3.3** and add secrets |
| The Storescope homepage (“What’s wrong in Shopify?”) | Old static-only deploy | Do **3.2** Retry build |
| 404 HTML | Build failed or wrong project | Do **3.2**, then check Workers Builds logs |

### 3.2 Retry the Worker build

1. Open [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages**
3. Open the Worker named **`shopify2`** (not the Pages project `storescope-cwl`)
4. Open **Deployments** / **Builds** / the check named **Workers Builds: shopify2**
5. Confirm it tracks GitHub **`successpartner10/Shopify2`** branch **`main`**
6. Click **Retry deployment** / **Retry build**
7. Wait until it is **Success**
8. Open `/healthz` again in incognito

If there is no Git connection:

1. Worker `shopify2` → **Settings → Build**
2. Connect GitHub → repo **`successpartner10/Shopify2`**
3. Production branch: **`main`**
4. Root directory: `/` (empty / repo root)
5. Do **not** set a build command (the site is already static)
6. Save → Retry

If the build log errors on `main = "worker.js"`:

- File `worker.js` must be at the **repo root** (it is)
- `wrangler.toml` must stay:

```toml
name = "shopify2"
main = "worker.js"

[assets]
directory = "."
binding = "ASSETS"
run_worker_first = ["/auth", "/auth/*", "/install", "/webhooks/*", "/healthz"]
```

Do **not** delete `[assets]`. That is the website.

### 3.3 Add Shopify secrets (after you have Client ID / secret from §5)

Come back here after §5. Do **not** type the secret into Slack, email, or chat.

1. dash.cloudflare.com → **Workers & Pages** → **`shopify2`**
2. **Settings → Variables and Secrets** (sometimes **Settings → Environment variables**)
3. Add two **Secrets** (encrypted), Production environment:

| Name | Value | Type |
|---|---|---|
| `SHOPIFY_API_KEY` | Partner app **Client ID** | Secret |
| `SHOPIFY_API_SECRET` | Partner app **Client secret** | Secret |

4. Names must match **exactly** (uppercase, underscores).
5. Save. Cloudflare will redeploy. Wait for Success.
6. Incognito → https://shopify2.panchgani2025.workers.dev/healthz

You want:

```json
{
  "ok": true,
  "app": "storescope",
  "version": "3.6.4",
  "embedded": false,
  "scopes": "",
  "shopify_key": true,
  "shopify_secret": true
}
```

`shopify_key: false` means the Client ID secret is missing or mistyped.  
`shopify_secret: false` means the Client secret is missing.

### 3.4 Quick path checks

| Open | Expect |
|---|---|
| `/healthz` | JSON, not the homepage |
| `/auth` (no `?shop=`) | “Install Storescope” or “not linked yet” **HTML**, not the home app |
| `/` or `/?v=3.6.4` | Normal Storescope app, logo **v3.6.4** |
| `/privacy.html` | Privacy page |

If `/auth` still loads the big home page, the Worker-first routes are not active. Retry §3.2.

---

## 4. Cloudflare Pages `storescope-cwl` (optional, original marketing URL)

A Worker deploy **never** updates `https://storescope-cwl.pages.dev/`. That is a **different** product (Pages vs Worker).

Do this only if you still want that hostname.

1. dash.cloudflare.com → **Workers & Pages**
2. Open **`storescope-cwl`** (the Pages project that owns `storescope-cwl.pages.dev`)
3. **Settings → Builds & deployments**
4. **Connect to Git** → GitHub → **`successpartner10/Shopify2`**
5. Fill **exactly**:
   - Production branch: `main`
   - Build command: **leave empty** (or `npm run build`)
   - Build output directory: `/`
6. Save → **Retry deployment**
7. When finished, open https://storescope-cwl.pages.dev/?v=3.6.4  
   You should see **v3.6.4** and “What’s wrong in Shopify?”

If you cannot find `storescope-cwl`:

1. **Create → Pages → Connect to Git**
2. Same repo / `main` / empty build / output `/`
3. Use the new `*.pages.dev` name, or attach `storescope-cwl.pages.dev` if Cloudflare offers a transfer

**Do not** turn this Pages project into a Worker.  
**Do not** paste a Cloudflare API token in chat.

---

## 5. Shopify Partner app (required)

You need a free [Partner account](https://partners.shopify.com) and a **development store** (Partners → Stores → Add store → Development).

### 5.1 Create the app

1. Open https://partners.shopify.com
2. **Apps → Create app**
3. Choose **Create app manually** (not “Use Shopify CLI”) if asked
4. App name: **Storescope**
5. Create

### 5.2 URLs (standalone)

Find **App setup** / **Configuration** / **URLs**.

| Field | Paste this, nothing else |
|---|---|
| **App URL** | `https://shopify2.panchgani2025.workers.dev/auth` |
| **Allowed redirection URL(s)** | `https://shopify2.panchgani2025.workers.dev/auth/callback` |

Add the redirect, then **Save**.

### 5.3 Embedded = Off (critical)

1. Find **Embedded app** / **App embedding**
2. Set **Off** / disabled
3. Save

If this stays On, Shopify opens Storescope **inside an iframe**. Browsers **block tab share**. Reviewers on desktop will think share is broken.

### 5.4 Scopes = none

1. Find **Admin API access scopes** / **API scopes**
2. Leave **every box unchecked**
3. Do **not** request products, orders, customers, themes, or anything else
4. Save

Storescope reads pixels in the browser. It does not need store data.

### 5.5 Copy Client ID — then secret into Cloudflare only

1. App → **Settings** / **Client credentials**
2. Copy **Client ID**
3. Reveal **Client secret** once
4. Go to **§3.3** and put them in Cloudflare as `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
5. Close the secret. Never commit it. Never paste it in chat.

### 5.6 Privacy URL

If the form asks for a privacy policy URL:

`https://shopify2.panchgani2025.workers.dev/privacy.html`

Also fine: `https://successpartner10.github.io/Shopify2/privacy.html`

### 5.7 Compliance webhooks (public / unlisted apps)

For a **custom** one-shop app Shopify may not force these. Add them anyway so public review does not bounce you later.

**Webhook API version:** `2026-07` (same as `shopify.app.toml`)

| Topic | URL |
|---|---|
| `customers/data_request` | `https://shopify2.panchgani2025.workers.dev/webhooks/customers-data-request` |
| `customers/redact` | `https://shopify2.panchgani2025.workers.dev/webhooks/customers-redact` |
| `shop/redact` | `https://shopify2.panchgani2025.workers.dev/webhooks/shop-redact` |

Format: **HTTPS**. The Worker only accepts **POST**. HMAC is checked with `SHOPIFY_API_SECRET`. We store no customer data; the stub returns `{ "ok": true }`.

If the dashboard wants you to “subscribe” in **Versions → Webhooks** or **shopify.app.toml**, the file in the repo already lists these three.

---

## 6. Install on one shop first (custom distribution)

Do **not** submit for App Store review until this works.

1. Partner app → **Distribution** / **Choose distribution**
2. Select **Custom distribution** (one store, or one Plus org)
3. Paste the shop: `your-dev-store.myshopify.com`  
   (Partners → Stores → the development store → the `*.myshopify.com` name)
4. Generate the install link
5. Open that link while logged into **that** shop as the store owner
6. Click **Install**

### What “good” looks like

1. Browser leaves Shopify admin and opens a **full tab**
2. Address bar starts with `https://shopify2.panchgani2025.workers.dev/`
3. You see Storescope home, version **v3.6.4**
4. Query string may include `shop=your-dev-store.myshopify.com` and `installed=1`
5. A toast: “Installed. This tab is Storescope — share the Shopify tab, not this one.”

### What “bad” looks like

| Symptom | Fix |
|---|---|
| App opens **inside** admin (iframe) | Embedded is still On → §5.3 |
| Homepage instead of install | `/healthz` is not JSON → §3.2 |
| “Storescope is not linked to Shopify yet” | Secrets missing → §3.3 |
| “Could not verify this Shopify open” | Secret does not match this app, or old secret |
| “Install expired” / shop mismatch | Start the install link again; do not reuse a stale tab |
| Share picker never appears | You shared the **Storescope** tab. Share the **Shopify admin** tab. On a phone: screenshot → Upload |

### Merchant test on that shop (5 minutes)

1. Keep Storescope in tab A
2. Open **Shopify admin** in tab B
3. In Storescope tap **Share Shopify tab** → pick **tab B**, not A
4. Or type `payouts on hold` / `refund policy` / `how to change my logo` → Search
5. Confirm numbered steps appear
6. Phone: screenshot admin → Upload from Photos

---

## 7. Pricing

| How you distribute | How you charge |
|---|---|
| **Custom** (one shop) | Invoice / e-transfer. **No** Billing API. **No** App Store pricing |
| **Public** (unlisted or listed) | **Shopify App Pricing** in the Partner Dashboard only. Not Gumroad, not Stripe inside the app |

Suggested first public plan (set in **Partner app → Pricing**, managed):

| Plan | Price |
|---|---|
| Trial | 7 days |
| Monthly | $9.99 |
| Yearly | $99 |

No usage fee. No per-order fee.

You can leave pricing off until custom install works.

---

## 8. Public unlisted, then listed (later)

Only after §6 works on a development store.

1. Distribution → **Public**
2. First submit **unlisted** (install link only, no store search)
3. Fill listing from [APP_STORE.md](./APP_STORE.md)
4. Upload `icons/app-store-1200.png` (do not put a price on the icon)
5. Take **real** screenshots (no browser chrome, no fake reviews):
   1. Home + Search + How to
   2. A playbook, Step 1 of N
   3. How to + Save how-to
   4. Phone upload / Help line about Photos
   5. Privacy page
6. Support email: a real inbox you read
7. Submit. Review is days to weeks. Fix what they send back; resubmit.

Shopify may charge a one-time listing fee when you go public. Pay that only at submit.

---

## 9. Copy-paste for the listing (and for a pitch)

**Name:** Storescope

**One line:** See the Shopify banner. Get the next click.

**Summary:**  
Point Storescope at Shopify admin. Share the tab or upload a screenshot. It matches a local playbook and shows numbered next clicks for payouts, shipping, themes, and checkout. Opens in a new tab. Nothing is uploaded. No Admin API scopes.

**Short description:**  
Point Storescope at your Shopify admin. It reads the banner on your device and shows numbered next clicks — payouts, shipping, themes, checkout. Nothing is uploaded.

**Full description:**  
Storescope is a live scanner for Shopify admin. Share the admin tab on a computer, or upload a screenshot on a phone. It matches a local playbook and tells you the next tap.

- Opens in a **new tab** so you can share the Shopify tab. It cannot run inside the admin iframe.
- Screenshots stay in the browser. We do not request Admin API scopes.
- How-tos for checkout text, refund policy, logo, plus 3,000+ Help and community topics.
- Save a how-to you found on AI or Google. It stays on this device.
- Phone: screenshot Shopify → Upload from Photos.

Storescope does not log into your store, click for you, or lift a Payments / Risk hold.

**How it works:**  
1. Install. Shopify opens Storescope in a new tab.  
2. Open Shopify admin in another tab (or screenshot on a phone).  
3. Share that Shopify tab, or upload the screenshot, or type the banner.  
4. Follow the numbered steps. Play this fix reads the step aloud.

---

## 10. After every future code push

1. Push to `successpartner10/Shopify2` `main`
2. GitHub Actions deploys GitHub.io (1–2 minutes)
3. Workers Builds deploys `shopify2` (1–5 minutes)
4. Open `/?v=THE_NEW_VERSION` and `/healthz`
5. Pages `storescope-cwl` updates **only** if you did §4

Bump `?v=` in your head when the logo version changes so old service workers die.

---

## 11. Troubleshooting

| Problem | Check |
|---|---|
| `/healthz` is the homepage | §3.2 Retry Worker. `main = "worker.js"` must be in the deployed `wrangler.toml` |
| Secrets true in `/healthz` but install fails | App URL must be **`/auth`**, not `/` |
| Reviewer says share does nothing | Embedded Off. Copy says “new tab”. Phone path is screenshot |
| GDPR webhook delivery failed | Secret must match **this** app. URL must be HTTPS POST |
| `storescope-cwl.pages.dev` still 1.x | §4 — Worker deploy never updates Pages |
| Old 5-topic home | Old PWA cache. Open `?v=3.6.4`, delete home-screen icon, add again |
| “This is just a website” from review | Install must complete via `/auth` and the app must appear under **Apps** |
| You pasted a secret in chat | Rotate it in Partner Dashboard + Cloudflare. Treat the old one as leaked |

---

## 12. What not to do

- Do not embed the app
- Do not request Admin API scopes
- Do not put Gumroad/Stripe checkout inside a **public** Shopify app
- Do not commit `.env`, Client secret, or a GitHub PAT
- Do not paste secrets or tokens into chat
- Do not point Shopify App URL at `storescope-cwl.pages.dev` until that host shows v3.6.4
- Do not run the 1,500-row fake how-to generator
- Do not upload merchant screenshots to a server

---

## 13. Done when

- [ ] GitHub.io shows **v3.6.4**
- [ ] `/healthz` is JSON, `shopify_key` and `shopify_secret` are **true**
- [ ] `/auth` is a short install page, not the big home page
- [ ] Partner app: App URL `/auth`, redirect `/auth/callback`, Embedded **Off**, scopes empty
- [ ] Custom install on one development store opens a **new tab**
- [ ] Share Shopify tab **or** upload screenshot produces numbered steps
- [ ] (Optional) `storescope-cwl.pages.dev` shows v3.6.4
- [ ] (Later) Public listing + Shopify App Pricing
