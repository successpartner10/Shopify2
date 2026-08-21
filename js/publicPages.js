/** Public storefront pages (no admin login). Tab share cannot read the other tab’s URL. */

const SHOP_KEY = "ss_shop_origin";

export const KNOWN_PUBLIC = [
  { path: "/policies/refund-policy", keys: ["refund policy", "refund", "return policy"], title: "Refund policy", admin: "Settings > Policies > Refund policy" },
  { path: "/policies/privacy-policy", keys: ["privacy policy", "privacy"], title: "Privacy policy", admin: "Settings > Policies > Privacy policy" },
  { path: "/policies/terms-of-service", keys: ["terms of service", "terms and conditions", "tos"], title: "Terms of service", admin: "Settings > Policies > Terms of service" },
  { path: "/policies/shipping-policy", keys: ["shipping policy", "delivery policy"], title: "Shipping policy", admin: "Settings > Policies > Shipping policy" },
  { path: "/policies/contact-information", keys: ["contact information", "contact page"], title: "Contact information", admin: "Settings > Policies > Contact information" }
];

function badHost(host) {
  const h = host.toLowerCase();
  if (!h.includes(".")) return true;
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (h.includes("admin.shopify.com")) return true;
  return false;
}

export function shopOriginFrom(text) {
  const t = String(text || "").trim();
  const admin = t.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/i);
  if (admin) return `https://${admin[1]}.myshopify.com`;
  const my = t.match(/https?:\/\/([a-z0-9-]+)\.myshopify\.com/i);
  if (my) return `https://${my[1]}.myshopify.com`;
  const abs = t.match(/https?:\/\/[^\s/]+/i);
  if (abs) {
    try {
      const u = new URL(abs[0]);
      if (u.protocol !== "https:" && u.protocol !== "http:") return null;
      if (badHost(u.hostname)) return null;
      return `${u.protocol}//${u.host}`;
    } catch { return null; }
  }
  return null;
}

const LIST_KEY = "ss_shop_list";

export function rememberShop(text) {
  const origin = shopOriginFrom(text);
  if (origin) {
    try {
      localStorage.setItem(SHOP_KEY, origin);
      let list = [];
      try { list = JSON.parse(localStorage.getItem(LIST_KEY) || "[]"); } catch { list = []; }
      if (!Array.isArray(list)) list = [];
      localStorage.setItem(LIST_KEY, JSON.stringify([origin, ...list.filter((o) => o !== origin)].slice(0, 5)));
    } catch { /* ignore */ }
  }
  return getShopOrigin();
}

export function getShopOrigin() {
  try { return localStorage.getItem(SHOP_KEY) || ""; } catch { return ""; }
}

export function listShops() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(LIST_KEY) || "[]"); } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  const cur = getShopOrigin();
  if (cur && !list.includes(cur)) list.unshift(cur);
  return [...new Set(list.filter(Boolean))].slice(0, 5);
}

export function pickShop(origin) {
  if (!origin) return getShopOrigin();
  try { localStorage.setItem(SHOP_KEY, origin); } catch { /* ignore */ }
  return origin;
}

export function shopLabel(origin) {
  try { return new URL(origin).host.replace(/^www\./, ""); } catch { return String(origin || "").replace(/^https?:\/\//, ""); }
}

function slugLabel(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return decodeURIComponent((parts[parts.length - 1] || u.hostname).replace(/[-_]+/g, " "));
  } catch {
    return url;
  }
}

export function matchKnownPublic(query, origin) {
  const q = String(query || "").toLowerCase().trim();
  if (q.length < 4) return [];
  const base = origin || "";
  return KNOWN_PUBLIC.filter((p) => p.keys.some((k) => q.includes(k) || (q.length >= 8 && k.includes(q))))
    .map((p) => publicEntry({
      path: p.path,
      title: p.title,
      admin: p.admin,
      origin: base,
      url: base ? `${base}${p.path}` : p.path
    }));
}

export function publicEntry({ path, title, admin, origin, url }) {
  const live = origin ? url : `https://your-store.com${path}`;
  return {
    id: `public-${path.replace(/[^\w]+/g, "-")}`,
    hub: "admin",
    category: "general",
    public_url: origin ? url : "",
    match_phrases: [title.toLowerCase(), path],
    tags: ["public", "storefront"],
    synonyms: [title],
    cause: `${title} is a public page. Anyone can open it — no admin login.`,
    explanation: origin
      ? `On your website: ${url}`
      : `On the live shop this is ${path}. Paste your shop URL (https://yourstore.com) once so Search can open the real link.`,
    steps: [
      origin
        ? `Open ${url} in a new tab (public — no Shopify login).`
        : `On the live shop go to ${path}. Paste your shop URL into Search once to get a clickable link.`,
      `If that 404s: Settings → Policies → ${title}. Insert template, Save.`,
      `To show it on the site: Content → Menus → Footer → Add menu item → search Policies → ${title}.`,
      `Admin shortcut: ${admin}. Do not paste the policy into Edit code.`
    ],
    target_ui_hint: origin ? `On the website: ${title}` : `${title} on the website`,
    arrow: { x: 0.5, y: 0.16 },
    source_category_db: "public",
    live_url: live
  };
}

function parseSitemap(xml) {
  const locs = [];
  const re = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) && locs.length < 400) {
    const loc = m[1].trim();
    if (/^https?:\/\//i.test(loc)) locs.push(loc);
  }
  return locs;
}

export async function fetchSitemapUrls(origin) {
  if (!origin) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${origin}/sitemap.xml`, { signal: ctrl.signal, mode: "cors" });
    clearTimeout(t);
    if (!res.ok) return [];
    const xml = await res.text();
    let urls = parseSitemap(xml);
    const child = urls.filter((u) => /sitemap/i.test(u)).slice(0, 2);
    for (const c of child) {
      try {
        const r2 = await fetch(c, { mode: "cors" });
        if (r2.ok) urls = urls.concat(parseSitemap(await r2.text()));
      } catch { /* cors */ }
    }
    return [...new Set(urls.filter((u) => !/sitemap/i.test(u)))].slice(0, 250);
  } catch {
    return [];
  }
}

export function matchSitemap(query, origin, urls) {
  const q = String(query || "").toLowerCase().trim();
  if (!q || q.length < 4 || !urls?.length) return [];
  const words = q.split(/\s+/).filter((w) => w.length >= 4);
  const hits = [];
  for (const url of urls) {
    const blob = `${url} ${slugLabel(url)}`.toLowerCase();
    if (blob.includes(q) || words.every((w) => blob.includes(w))) {
      let path = "/";
      try { path = new URL(url).pathname; } catch { /* */ }
      const known = KNOWN_PUBLIC.find((p) => path.startsWith(p.path));
      hits.push(publicEntry({
        path,
        title: known?.title || slugLabel(url),
        admin: known?.admin || "Online Store > Pages (or Settings > Policies)",
        origin,
        url
      }));
    }
    if (hits.length >= 8) break;
  }
  return hits;
}
