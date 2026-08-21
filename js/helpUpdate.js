/** Opt-in: new official Shopify Help URLs → Storescope numbered steps. No Google scrape. */

const DUP = "Online Store → Themes → ⋯ → Duplicate the live theme. Do not Edit code on the published theme.";

const HUB = {
  products: "products",
  "online-store": "themes",
  payments: "payments",
  "checkout-settings": "checkout",
  discounts: "checkout",
  domains: "domains",
  apps: "apps",
  fulfillment: "shipping",
  international: "shipping",
  taxes: "payments",
  finance: "payments",
  markets: "admin",
  customers: "admin",
  "privacy-and-security": "admin",
  "shopify-admin": "admin",
  "your-account": "admin",
  "shopify-flow": "apps",
  inbox: "apps",
  "online-sales-channels": "apps",
  "promoting-marketing": "seo",
  "reports-and-analytics": "admin",
  "sell-in-person": "admin",
  "ai-powered-tools": "admin",
  b2b: "admin",
  "custom-data": "products"
};

const ADMIN = {
  products: ["Products. Use admin search if you need a specific item.", "Open the product (or Add product). Look for {action}.", "Change it. Save.", "View it on the storefront in incognito. Do not Edit code to change product content."],
  "online-store": [DUP, "Customize. Top bar: pick the template (Home, Products, Collections, Pages, Cart).", "Look for {action}. Add block / section if it is missing. Save.", "Preview on phone. Publish the copy only when it looks right."],
  payments: ["Settings → Payments.", "Open Shopify Payments / the provider. Look for {action}.", "The store owner email is required for payouts and bank changes.", "Save. A $1 test order in incognito, then refund it."],
  "checkout-settings": ["Settings → Checkout.", "For look-and-feel: Customize. For form fields stay on this page.", "Look for {action}.", "Save. Test checkout in incognito. Do not paste checkout.liquid on Basic."],
  discounts: ["Discounts → Create discount (or open the code).", "Set {action}. Check dates, minimum, and combinations.", "Save. Test at checkout in incognito."],
  domains: ["Settings → Domains.", "Open the domain. Look for {action}.", "A record 23.227.38.65, www CNAME shops.myshopify.com.", "Verify connection. Wait up to 24 hours for SSL."],
  apps: ["Settings → Apps and sales channels.", "Open the app. Look for {action}.", "If the shop broke: Customize → App embeds → turn that app off. Save."],
  fulfillment: ["Orders → the order, or Settings → Shipping and delivery.", "Look for {action}.", "Fulfill, buy a label, or fix the address. Save."],
  default: ["In Shopify admin search (top bar), type {action}.", "Open the first Settings / Online Store / Products result.", "If this touches the theme: Duplicate first. Do not Edit code on the published theme.", "Save. Recheck the live shop in incognito."]
};

function humanize(slug) {
  return String(slug || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function sitemapLocs(xml) {
  const out = [];
  const re = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const u = m[1].trim();
    if (u.includes("/en/manual/")) out.push(u.split("#")[0].replace(/\/+$/, ""));
  }
  return [...new Set(out)];
}

export function entryFromHelpUrl(url, n) {
  const path = url.replace("https://help.shopify.com/en/manual/", "").replace(/\/+$/, "");
  if (!path) return null;
  const parts = path.split("/").filter(Boolean);
  const top = parts[0] || "shopify-admin";
  const title = humanize(parts[parts.length - 1] || top);
  if (title.length < 4) return null;
  const hub = HUB[top] || "admin";
  const tmpl = ADMIN[top] || ADMIN.default;
  const steps = tmpl.map((s) => s.replace(/\{action\}/g, title));
  const help = `Official Help: ${url}`;
  if (!steps.includes(help)) steps.push(help);
  const phrases = [`how to ${title}`, `how do i ${title}`, title].map((p) => p.toLowerCase());
  const ph = [...new Set(phrases.filter((p) => p.length >= 8))];
  if (!ph.length) return null;
  const slug = path.replace(/\//g, "-").slice(0, 48);
  return {
    id: `howto-live-${n}-${slug}`,
    category: "general",
    hub,
    match_phrases: ph,
    tags: ["howto", "help-live"],
    synonyms: [title],
    cause: `${title} is a Shopify admin how-to.`,
    explanation: `Help article: ${path}`,
    steps: steps.slice(0, 6),
    target_ui_hint: title,
    arrow: { x: 0.2, y: 0.28 },
    docs: [{ label: "Shopify Help", url }],
    source_category_db: "howto",
    local: true
  };
}

export function knownHelpUrls(entries) {
  const set = new Set();
  for (const e of entries || []) {
    for (const d of e.docs || []) {
      const u = String(d.url || "").split("#")[0].replace(/\/+$/, "");
      if (u.includes("help.shopify.com")) set.add(u);
    }
    for (const s of e.steps || []) {
      const m = String(s).match(/https:\/\/help\.shopify\.com\/en\/manual\/[^\s)]+/i);
      if (m) set.add(m[0].replace(/[.,]$/, "").replace(/\/+$/, ""));
    }
  }
  return set;
}

function sitemapEndpoints() {
  const here = typeof location !== "undefined" ? location.origin : "";
  const worker = "https://shopify2.panchgani2025.workers.dev/help-sitemap";
  const list = [worker];
  if (here && !here.includes("panchgani2025")) list.unshift(`${here.replace(/\/$/, "")}/help-sitemap`);
  list.push("https://help.shopify.com/sitemap-en.xml");
  return list;
}

export async function fetchHelpSitemap() {
  let lastErr = "Could not reach Shopify Help.";
  for (const url of sitemapEndpoints()) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) { lastErr = `Help sitemap ${res.status}`; continue; }
      const text = await res.text();
      if (!/<loc>/i.test(text)) { lastErr = "Sitemap was empty."; continue; }
      return text;
    } catch (err) {
      lastErr = err?.name === "AbortError" ? "Help timed out." : "Could not reach Shopify Help.";
    }
  }
  throw new Error(lastErr);
}

export function newHelpEntries(xml, existing) {
  const known = knownHelpUrls(existing);
  const locs = sitemapLocs(xml);
  const rows = [];
  let n = Date.now();
  for (const url of locs) {
    if (known.has(url)) continue;
    const e = entryFromHelpUrl(url, n++);
    if (!e) continue;
    rows.push(e);
    known.add(url);
    if (rows.length >= 200) break;
  }
  return { added: rows, scanned: locs.length };
}
