# Put this build on Cloudflare (`storescope-cwl.pages.dev`)

GitHub Pages is already live: https://successpartner10.github.io/Shopify2/?v=2.7.0

Same build, versioned:

- https://shopify2.panchgani2025.workers.dev/?v=2.7.0
- https://storescope-cwl.pages.dev/?v=2.7.0 (needs Git reconnect — see below)

The red **Workers Builds: shopify2** check is Cloudflare treating the repo as a **Worker**. The site is static HTML. Use **Pages**, not Workers.

## Do this once (dashboard)

1. Open [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. Open the existing project **`storescope-cwl`** (the one that owns `storescope-cwl.pages.dev`).
3. **Settings → Builds & deployments**.
4. **Connect to Git** → GitHub → repo **`successpartner10/Shopify2`**.
5. Fill exactly:
   - Production branch: `main`
   - Build command: *(leave empty)* or `npm run build`
   - Build output directory: `/`
6. Save. Trigger **Retry deployment** / **Deploy**.

When it finishes, https://storescope-cwl.pages.dev/?v=2.7.0 should show **v2.6.0** under the logo.

## Stop the failing Worker check

The Worker named **`shopify2`** is a second, extra project. It is not your Pages URL.

1. Workers & Pages → **`shopify2`** (Worker, not Pages).
2. **Settings → Build** → disconnect Git, **or** delete the Worker if you do not need it.

That removes the red X on GitHub commits. It does not affect `pages.dev`.

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
