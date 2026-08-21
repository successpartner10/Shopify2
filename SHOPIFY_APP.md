# Add Storescope as a Shopify app

Storescope today is a **static site**. Shopify will not list a bookmark. It must be a **Partner app** with an App URL, OAuth (even with **zero scopes**), and HTTPS.

## The constraint that decides the architecture

Shopify **embedded** apps load **inside an iframe** in admin.

Browsers **block tab share** (`getDisplayMedia`) in iframes. That is the same reason Arena preview cannot share a tab.

| Mode | Where it opens | Tab share | Screenshot / type / paste URL | App Store typical |
|---|---|---|---|---|
| **Standalone** (recommended) | New tab / full page | Works on desktop | Works | Allowed if UX is clear |
| **Embedded** | Iframe in admin | **Broken** | Works | Default for most apps |

**Do not embed Storescope** if you want “Share Shopify tab”. Use screenshot + search on phones either way.

We do **not** need Admin API scopes. Diagnosis is local playbook + OCR. That matches the privacy story: no store data leaves Shopify for us.

## Three distribution levels

| Level | Who can install | Review | What you do |
|---|---|---|---|
| **1. Custom distribution** | One store (or one Plus org) | No App Store review | Partner Dashboard → Custom distribution → paste `store.myshopify.com` |
| **2. Public, unlisted** | Any store with the install link | **Yes**, full review | Submit, keep listing hidden |
| **3. Public, listed** | App Store search | **Yes** + listing assets | After unlisted works |

You cannot skip review and still let *any* production store install. Custom = one store. Many stores = public (listed or unlisted).

## What you must create (only you can)

1. [partners.shopify.com](https://partners.shopify.com) → **Apps → Create app**.
2. App name: **Storescope**.
3. **App URL** (standalone):  
   `https://successpartner10.github.io/Shopify2/?v=3.3.2`  
   or the Worker once it is on this build:  
   `https://shopify2.panchgani2025.workers.dev/?v=3.3.2`
4. **Allowed redirection URL(s)** — required even with zero scopes. You need a tiny HTTPS callback (see Worker below). Example:  
   `https://shopify2.panchgani2025.workers.dev/auth/callback`
5. **Embedded app: Off**.
6. **Scopes:** empty / none. Do not request products, orders, or customers.
7. Mandatory **compliance webhooks** for a public app (even if you store nothing):
   - `customers/data_request`
   - `customers/redact`
   - `shop/redact`  
   Respond `200` with `{ "ok": true }`.
8. Privacy policy page (public URL): https://successpartner10.github.io/Shopify2/privacy.html
9. For public listing: support email, app icon 1200×1200, screenshots, demo store video.

**Never paste Client secret or tokens into chat.** Put them in Cloudflare Worker secrets.

## Minimal backend (why GitHub Pages alone is not enough)

GitHub Pages cannot do OAuth or webhooks. The existing **Cloudflare Worker** can:

| Route | Job |
|---|---|
| `GET /` | Serve the static Storescope site (already possible with `[assets]`) |
| `GET /auth` | Start Shopify managed install / OAuth |
| `GET /auth/callback` | Exchange code, then redirect to `/?v=3.3.2&shop=…` |
| `POST /webhooks/customers-data-request` | 200 |
| `POST /webhooks/customers-redact` | 200 |
| `POST /webhooks/shop-redact` | 200 |

Storescope still does not upload screenshots. The Worker only proves install and answers GDPR pings.

## Recommended product shape after install

Merchant clicks **Apps → Storescope** → Shopify opens the **standalone** URL.

Home stays:

1. Upload a screenshot  
2. Type the problem / paste admin link  
3. Desktop only: Share Shopify tab  

No “connect your store” wall. No API keys. Optional later: read-only `read_online_store_pages` if you ever want live admin context — not needed for v1.

## App Store review risks (fix before submit)

| Risk | Fix |
|---|---|
| Tab share fails in review (they test inside admin) | Embedded **off**; copy says “opens in a new tab” |
| Reviewer on iPhone | Screenshot path is the default on phones |
| Asking for unused scopes | Request **none** |
| No GDPR webhooks | Stub 200s on the Worker |
| “This is just a website” | Install completes, app appears under Apps, branding + privacy page |
| Tokens in the frontend | Client ID public only; secret only in Worker |

## What I cannot do from here

- Create your Partner app  
- Click “Submit for review”  
- Hold your Client secret  

What I *can* build next if you say go: Worker OAuth + webhook stubs + a `/privacy` page + App Bridge **not** used (standalone).

## Official docs

- [Create apps](https://shopify.dev/docs/apps/launch/app-requirements-checklist)
- [Authentication](https://shopify.dev/docs/apps/build/authentication-authorization)
- [shopify.app.toml](https://shopify.dev/docs/apps/tools/cli/configuration)
