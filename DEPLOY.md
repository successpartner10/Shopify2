# Update storescope-cwl.pages.dev + private-repo notes

## GitHub Actions: the red “failed” run

The first `Deploy GitHub Pages` run failed with:

`Get Pages site failed … repository has Pages enabled … Error: Not Found`

That was **only** the first push, before Pages existed. The next three runs **succeeded**. Live site: https://successpartner10.github.io/Shopify2/

The workflow now sets `enablement: true` so a fresh repo will create Pages instead of failing.

Ignore the old red X, or delete that run. **Do not** treat it as the current build.

---

## Two live URLs (today)

| URL | Host | Build |
|---|---|---|
| https://successpartner10.github.io/Shopify2/ | GitHub Pages | **New** Storescope 2.1 |
| https://storescope-cwl.pages.dev/ | Cloudflare Pages | **Old** 1.x scanner |

This workspace cannot log into Cloudflare. To point `storescope-cwl.pages.dev` at this repo, do **one** of the following.

### A. Connect the GitHub repo (recommended)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → project **`storescope-cwl`**.
2. **Settings → Builds & deployments → Connect to Git**.
3. Authorize GitHub and pick **`successpartner10/Shopify2`**.
4. Production branch: `main`.
5. Build command: *(empty)*.
6. Build output directory: `/` or `.`
7. Save. The next push to `main` republishes https://storescope-cwl.pages.dev/

If the project is not connected to Git, use **Create a project → Direct Upload** once, or reconnect it.

### B. CLI from this folder

```bash
npx wrangler pages deploy . --project-name=storescope-cwl
```

You must already be logged in (`npx wrangler login`) or set `CLOUDFLARE_API_TOKEN` with **Account.Cloudflare Pages:Edit**.

Do **not** paste that token into chat.

---

## Will it work if the GitHub repo is private?

**Two different things: source visibility vs the live website.**

| | Public repo (now) | Private repo |
|---|---|---|
| Anyone can read the code on GitHub | Yes | No |
| https://successpartner10.github.io/Shopify2/ | Works on **GitHub Free** | Needs **GitHub Pro** (personal) or **Team** (org). On Free, Pages usually **stops / 404s**. |
| Published github.io site is secret | No — Pages is a public website | Still **public** unless Enterprise Cloud + Pages access control |
| https://storescope-cwl.pages.dev/ via Cloudflare | Works | **Works.** Cloudflare Pages can build from a private GitHub repo on a free CF plan. The **site stays public**. |
| Offline zip | Still works | Still works |

### Practical recommendation

- Want **secret source**, public app: make `Shopify2` **private**, keep deploying with **Cloudflare Pages** to `storescope-cwl.pages.dev`. That is the reliable free path.
- Stay on **GitHub Pages only** and go private: upgrade to **GitHub Pro**, or the github.io URL will break on Free.
- Want the **website** itself private (login wall): neither GitHub Pages (non-Enterprise) nor a normal Pages.dev project does that. You would need Cloudflare Access or similar.

The live HTML/JS is always downloadable by anyone who has the site URL. Do not put tokens or merchant data in the repo or the built site.

---

## After you flip the repo to private

1. Confirm Cloudflare is still connected (Settings → Builds should still list the repo).
2. Push once; confirm https://storescope-cwl.pages.dev/ updates.
3. Open https://successpartner10.github.io/Shopify2/ in a private window:
   - **200** → your plan allows private-repo Pages (site is still public).
   - **404** → expected on GitHub Free; use the Cloudflare URL instead.
