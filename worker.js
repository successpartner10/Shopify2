/**
 * Storescope Partner app Worker.
 * Serves OAuth + GDPR stubs. Static files stay on the assets binding.
 * Secrets: SHOPIFY_API_KEY, SHOPIFY_API_SECRET (wrangler secret / dashboard).
 * Never log the secret. Zero Admin API scopes. No screenshot upload.
 */
const APP_VERSION = "3.6.5";
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/healthz") return health(env);
    if (path === "/help-sitemap") return helpSitemap(request);
    if (path === "/install" || path === "/auth") return handleAuth(request, env, url);
    if (path === "/auth/callback") return handleCallback(request, env, url);
    if (path.startsWith("/webhooks/")) return handleWebhook(request, env, path);

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Storescope assets missing", { status: 500 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function html(body, status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Storescope</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1.2rem;line-height:1.5;color:#1c1c1e">${body}</body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

function homeUrl(env, shop) {
  const ver = env.APP_VERSION || APP_VERSION;
  const u = new URL("/", "https://shopify2.panchgani2025.workers.dev/");
  u.searchParams.set("v", ver);
  if (shop) u.searchParams.set("shop", shop);
  return u.pathname + u.search;
}

async function helpSitemap(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "GET") return json({ ok: false }, 405);
  try {
    const res = await fetch("https://help.shopify.com/sitemap-en.xml", {
      headers: { "User-Agent": "Storescope/3.6.5 (official Help sitemap only)" }
    });
    if (!res.ok) return json({ ok: false, status: res.status }, 502);
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600"
      }
    });
  } catch {
    return json({ ok: false, error: "help sitemap failed" }, 502);
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type"
  };
}

function health(env) {
  return json({
    ok: true,
    app: "storescope",
    version: env.APP_VERSION || APP_VERSION,
    embedded: false,
    scopes: "",
    shopify_key: Boolean(env.SHOPIFY_API_KEY),
    shopify_secret: Boolean(env.SHOPIFY_API_SECRET)
  });
}

function normalizeShop(raw) {
  const s = String(raw || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  return SHOP_RE.test(s) ? s : "";
}

function timingEqual(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (x.length !== y.length) return false;
  let out = 0;
  for (let i = 0; i < x.length; i++) out |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return out === 0;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

async function hmacB64(secret, bytes) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, bytes);
  let bin = "";
  for (const n of new Uint8Array(sig)) bin += String.fromCharCode(n);
  return btoa(bin);
}

function messageFromParams(params) {
  const keys = [...params.keys()].filter((k) => k !== "hmac" && k !== "signature").sort();
  return keys.map((k) => `${k}=${params.get(k) || ""}`).join("&");
}

async function validAppHmac(env, params) {
  const secret = env.SHOPIFY_API_SECRET;
  const hmac = params.get("hmac") || "";
  if (!secret || !hmac) return false;
  const digest = await hmacHex(secret, messageFromParams(params));
  return timingEqual(digest, hmac.toLowerCase());
}

function missingSecretsPage() {
  return html(`<h1>Storescope is not linked to Shopify yet</h1>
<p>The site works. Install needs two Worker secrets — do not paste them in chat.</p>
<ol>
<li>partners.shopify.com → Apps → Create app → <b>Storescope</b></li>
<li>App URL: <code>https://shopify2.panchgani2025.workers.dev/auth</code></li>
<li>Allowed redirection URL: <code>https://shopify2.panchgani2025.workers.dev/auth/callback</code></li>
<li>Embedded: <b>Off</b>. Scopes: none.</li>
<li>In Cloudflare → Worker <code>shopify2</code> → Settings → Variables:
  <code>SHOPIFY_API_KEY</code> (Client ID) and <code>SHOPIFY_API_SECRET</code> (Client secret).</li>
</ol>
<p><a href="/?v=${APP_VERSION}">Open Storescope</a></p>`);
}

async function handleAuth(request, env, url) {
  const shop = normalizeShop(url.searchParams.get("shop"));
  const hmac = url.searchParams.get("hmac");
  const key = env.SHOPIFY_API_KEY || "";

  if (hmac && shop) {
    if (env.SHOPIFY_API_SECRET && !(await validAppHmac(env, url.searchParams))) {
      return html("<h1>Could not verify this Shopify open</h1><p>Reload from Apps → Storescope.</p>", 401);
    }
    return Response.redirect(new URL(homeUrl(env, shop), url.origin), 302);
  }

  if (!key || !env.SHOPIFY_API_SECRET) return missingSecretsPage();
  if (!shop) {
    return html(`<h1>Install Storescope</h1>
<p>Open this app from Shopify admin → Apps, or add it as a custom app on one shop.</p>
<p>Standalone — it opens in a new tab so you can share the Shopify tab.</p>
<p><a href="/?v=${env.APP_VERSION || APP_VERSION}">Open without installing</a></p>`);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/auth/callback`;
  const auth = new URL(`https://${shop}/admin/oauth/authorize`);
  auth.searchParams.set("client_id", key);
  auth.searchParams.set("scope", "");
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);

  const res = Response.redirect(auth.toString(), 302);
  res.headers.append("Set-Cookie", `ss_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
  res.headers.append("Set-Cookie", `ss_oauth_shop=${shop}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
  return res;
}

function cookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

async function handleCallback(request, env, url) {
  const shop = normalizeShop(url.searchParams.get("shop"));
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const expect = cookie(request, "ss_oauth_state");
  const expectShop = cookie(request, "ss_oauth_shop");

  if (!shop) return html("<h1>Missing shop</h1><p>Start again from Shopify admin → Apps.</p>", 400);
  if (expect && state && !timingEqual(state, expect)) {
    return html("<h1>Install expired</h1><p>Open Apps → Storescope again.</p>", 400);
  }
  if (expectShop && expectShop !== shop) {
    return html("<h1>Shop mismatch</h1><p>Open Apps → Storescope again.</p>", 400);
  }

  if (code && env.SHOPIFY_API_KEY && env.SHOPIFY_API_SECRET) {
    try {
      const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: env.SHOPIFY_API_KEY,
          client_secret: env.SHOPIFY_API_SECRET,
          code
        })
      });
      if (!tokenRes.ok) {
        return html("<h1>Shopify did not finish install</h1><p>Try Apps → Storescope again.</p>", 502);
      }
      // Zero scopes: we do not keep the token. Proof of install is enough.
    } catch {
      return html("<h1>Could not reach Shopify</h1><p>Try again in a minute.</p>", 502);
    }
  }

  const dest = new URL(homeUrl(env, shop), url.origin);
  dest.searchParams.set("installed", "1");
  const res = Response.redirect(dest.toString(), 302);
  res.headers.append("Set-Cookie", "ss_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  res.headers.append("Set-Cookie", "ss_oauth_shop=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  return res;
}

async function handleWebhook(request, env, path) {
  const known = new Set([
    "/webhooks/customers-data-request",
    "/webhooks/customers-redact",
    "/webhooks/shop-redact"
  ]);
  if (!known.has(path)) return json({ ok: false }, 404);
  if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const secret = env.SHOPIFY_API_SECRET;
  if (!secret) return json({ ok: false, error: "secret not configured" }, 503);

  const header = request.headers.get("X-Shopify-Hmac-Sha256") || "";
  const raw = await request.arrayBuffer();
  const digest = await hmacB64(secret, raw);
  if (!timingEqual(digest, header)) return json({ ok: false }, 401);

  // We store no customer or shop data. Acknowledge GDPR pings.
  return json({ ok: true });
}
