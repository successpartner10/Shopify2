# Get Storescope on Shopify

Click-by-click for Cloudflare + Partner Dashboard: **[IMPLEMENT.md](./IMPLEMENT.md)**.

The app is **standalone** (new tab). Do **not** embed it — tab share dies in an iframe.

Worker routes are live on:

`https://shopify2.panchgani2025.workers.dev/`

| Path | Job |
|---|---|
| `/` | The Storescope site (static) |
| `/auth` | App URL — Shopify opens this |
| `/auth/callback` | OAuth return |
| `/webhooks/customers-data-request` | GDPR 200 |
| `/webhooks/customers-redact` | GDPR 200 |
| `/webhooks/shop-redact` | GDPR 200 |
| `/healthz` | `{ ok, version, shopify_key }` |
| `/privacy.html` | Privacy policy |

Zero Admin API scopes. No screenshot upload. No token stored.

## What only you can click (5 minutes)

**Do not paste Client secret in chat.**

1. [partners.shopify.com](https://partners.shopify.com) → **Apps → Create app** → name **Storescope**.
2. **App URL:** `https://shopify2.panchgani2025.workers.dev/auth`
3. **Allowed redirection URL:** `https://shopify2.panchgani2025.workers.dev/auth/callback`
4. **Embedded app: Off.**
5. **Scopes:** none / empty.
6. Compliance webhooks — same three URLs as in `shopify.app.toml`.
7. Privacy URL: `https://shopify2.panchgani2025.workers.dev/privacy.html`
8. Cloudflare → Worker **shopify2** → **Settings → Variables and Secrets**:
   - `SHOPIFY_API_KEY` = Client ID
   - `SHOPIFY_API_SECRET` = Client secret
9. Open `/healthz`. `shopify_key` and `shopify_secret` should be `true`.
10. **Custom distribution** first: paste one `store.myshopify.com`. Install. Confirm it opens a **new tab**.
11. Public listing later: listing copy in [APP_STORE.md](./APP_STORE.md), icon `icons/app-store-1200.png`.

## Charge later (not required to install)

A **public** app must use **Shopify App Pricing** (Partner Dashboard → Pricing). Not Gumroad.

A **custom** app (one shop) cannot use the Billing API — invoice them yourself.

Suggested first public plan: **$9.99/mo** or **$99/yr**, 7-day trial. Set it in the dashboard (managed pricing). No extra code.

## Review risks

| Risk | Fix already in this repo |
|---|---|
| Tab share fails in admin iframe | Embedded **off**; App URL is `/auth` → full tab |
| Reviewer on iPhone | Screenshot path is the default on phones |
| Unused scopes | `scopes = ""` |
| No GDPR webhooks | Worker stubs, HMAC checked |
| “Just a website” | Install via `/auth`, app appears under Apps |
| Secret in the frontend | Secret only in Worker |

## What I cannot do

- Create the Partner app
- Put your Client secret in Cloudflare
- Click Submit for review

## Files

- `worker.js` — OAuth + GDPR
- `wrangler.toml` — `main` + assets; Worker-first only on `/auth` and `/webhooks`
- `shopify.app.toml` — Partner config (no secret)
- `icons/app-store-1200.png` — listing icon
