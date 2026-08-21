# Put this build on the original live URLs

| Host | Status at v3.3.2 |
|---|---|
| **GitHub Pages** | Live: https://successpartner10.github.io/Shopify2/?v=3.3.2 |
| **Cloudflare Worker** `shopify2` | Should follow `main` via Workers Builds: https://shopify2.panchgani2025.workers.dev/?v=3.3.2 |
| **Cloudflare Pages** `storescope-cwl` | Still the **old 1.x** site until you reconnect Git. Hard-refresh will not fix it. |

A push to `successpartner10/Shopify2` `main` updates GitHub Pages (workflow) and, if connected, the Worker. It does **not** update `storescope-cwl.pages.dev` until that Pages project points at this repo.

## Reconnect Cloudflare Pages (`storescope-cwl.pages.dev`)

Do this once in the dashboard. No token in chat.

1. Open [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. Open the existing project **`storescope-cwl`** (the one that owns `storescope-cwl.pages.dev`).
3. **Settings → Builds & deployments**.
4. **Connect to Git** → GitHub → repo **`successpartner10/Shopify2`**.
5. Fill exactly:
   - Production branch: `main`
   - Build command: *(leave empty)* or `npm run build`
   - Build output directory: `/`
6. Save. Trigger **Retry deployment** / **Deploy**.

When it finishes, https://storescope-cwl.pages.dev/?v=3.3.2 should show **v3.3.2** under the logo and the home line “What’s wrong in Shopify?”.

## Worker vs Pages

The check named **Workers Builds: shopify2** is the Worker at `shopify2.panchgani2025.workers.dev`. That is not the Pages URL.

- Keep the Worker if you want that hostname.
- Pages project **`storescope-cwl`** is the original marketing URL. It must be a **Pages** project (empty build, output `/`), not a Worker.

## If you cannot find `storescope-cwl`

Create a **Pages** project (not a Worker):

1. Workers & Pages → **Create → Pages → Connect to Git**.
2. Repo `successpartner10/Shopify2`, branch `main`, empty build, output `/`.
3. After first deploy, **Custom domains** → add `storescope-cwl.pages.dev` only if Cloudflare offers to transfer it, or keep the new `*.pages.dev` name.

## Private repo

Cloudflare Pages **can** build a **private** GitHub repo. The **website stays public**.
GitHub Pages on a **Free** plan usually **stops** if the repo is private.

## CLI (optional)

```bash
npx wrangler login
npx wrangler pages deploy . --project-name=storescope-cwl
```

Do not paste Cloudflare tokens into chat.

## Shopify app URL

Partner Dashboard → App URL (standalone, **not** embedded):

`https://successpartner10.github.io/Shopify2/?v=3.3.2`

or, once the Worker is on this build:

`https://shopify2.panchgani2025.workers.dev/?v=3.3.2`

See [SHOPIFY_APP.md](./SHOPIFY_APP.md).
