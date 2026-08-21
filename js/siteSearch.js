/** Find text on the merchant’s public shop, then numbered admin steps to change it. */

import { rememberShop, getShopOrigin, matchKnownPublic, fetchSitemapUrls, matchSitemap, shopOriginFrom } from "./publicPages.js";

function pathOf(url) {
  try { return new URL(url).pathname || "/"; } catch { return "/"; }
}

export function kindFromPath(path) {
  const p = String(path || "/").toLowerCase();
  if (p.startsWith("/policies/refund")) return "policy-refund";
  if (p.startsWith("/policies/privacy")) return "policy-privacy";
  if (p.startsWith("/policies/terms")) return "policy-tos";
  if (p.startsWith("/policies/shipping")) return "policy-shipping";
  if (p.startsWith("/policies/")) return "policy";
  if (p.startsWith("/products/")) return "product";
  if (p.startsWith("/collections/")) return "collection";
  if (p.startsWith("/pages/")) return "page";
  if (p.startsWith("/blogs/")) return "blog";
  if (p === "/cart" || p.startsWith("/cart")) return "cart";
  if (p.startsWith("/search")) return "search";
  if (p === "/" || p === "") return "home";
  return "unknown";
}

export function kindFromQuery(q) {
  const s = String(q || "").toLowerCase();
  if (/refund.{0,40}(product|all products|every product)|return.{0,20}(all products|every product)/.test(s)) return "product-template";
  if (/refund policy|return policy/.test(s)) return "policy-refund";
  if (/privacy policy/.test(s)) return "policy-privacy";
  if (/terms of service|terms and conditions/.test(s)) return "policy-tos";
  if (/shipping policy/.test(s)) return "policy-shipping";
  if (/check\s*out/.test(s)) return "checkout";
  if (/\bcart\b/.test(s)) return "cart";
  if (/announcement|top bar|sitewide|every page of the shop/.test(s)) return "announcement";
  if (/\blogo\b/.test(s)) return "logo";
  if (/footer|menu item|navigation/.test(s)) return "menu";
  if (/home\s*page|hero banner/.test(s)) return "home";
  if (/collection/.test(s)) return "collection";
  if (/about|new page|add a page/.test(s)) return "page";
  if (/\bblog\b/.test(s)) return "blog";
  if (/product/.test(s)) return "product-template";
  return "unknown";
}

const PLAY = {
  "policy-refund": {
    hint: "Settings > Policies > Refund policy",
    cause: "That line is the refund policy page, not a theme file.",
    steps: (q, origin) => [
      origin ? `Open ${origin}/policies/refund-policy to see the live text.` : "On the shop go to /policies/refund-policy.",
      "Settings → Policies → Refund policy. Edit the text. Save.",
      "Do not paste this into Edit code / theme.liquid.",
      "To show it in the footer: Content → Menus → Footer → Add menu item → search Policies → Refund policy."
    ]
  },
  "policy-privacy": {
    hint: "Settings > Policies > Privacy policy",
    cause: "Privacy text lives in Settings → Policies.",
    steps: (q, origin) => [
      origin ? `Open ${origin}/policies/privacy-policy.` : "On the shop go to /policies/privacy-policy.",
      "Settings → Policies → Privacy policy. Edit. Save.",
      "Footer link: Content → Menus → Footer → Add menu item → Privacy policy."
    ]
  },
  "policy-tos": {
    hint: "Settings > Policies > Terms of service",
    cause: "Terms live in Settings → Policies.",
    steps: (q, origin) => [
      origin ? `Open ${origin}/policies/terms-of-service.` : "On the shop go to /policies/terms-of-service.",
      "Settings → Policies → Terms of service. Edit. Save.",
      "Add the footer link under Content → Menus if shoppers cannot find it."
    ]
  },
  "policy-shipping": {
    hint: "Settings > Policies > Shipping policy",
    cause: "Shipping policy is Settings → Policies.",
    steps: (q, origin) => [
      origin ? `Open ${origin}/policies/shipping-policy.` : "On the shop go to /policies/shipping-policy.",
      "Settings → Policies → Shipping policy. Edit. Save.",
      "Product pages often already link this. Footer: Content → Menus."
    ]
  },
  policy: {
    hint: "Settings > Policies",
    cause: "Store policies are Settings → Policies, then a menu link.",
    steps: (q, origin) => [
      "Settings → Policies. Open the matching policy. Edit. Save.",
      "Content → Menus → Footer → Add menu item → search Policies.",
      "Do not paste the policy into the theme."
    ]
  },
  checkout: {
    hint: "Settings > Checkout > Customize",
    cause: "Checkout is not the theme. Theme Customize will not change it.",
    steps: (q, origin) => [
      "If this is a legal line (refund/privacy): Settings → Policies — checkout already links those.",
      "For extra checkout text: Settings → Checkout → Customize. Look for Banner or Add app.",
      "If your plan has no banner: put the line on Cart instead (Customize → Cart → Rich text). Shoppers see it before they pay.",
      "Save. Test in incognito. Do not paste checkout.liquid or Additional scripts on the live shop."
    ]
  },
  cart: {
    hint: "Online Store > Themes > Customize > Cart",
    cause: "Cart text is a theme block on the Cart template.",
    steps: (q, origin) => [
      "Online Store → Themes → ⋯ → Duplicate. Do not Edit code on live.",
      "Customize the copy. Top: Cart.",
      `Add block → Rich text. Type: ${String(q).slice(0, 80)}. Drag it above the checkout button. Save.`,
      "Preview cart. Publish the copy."
    ]
  },
  "product-template": {
    hint: "Customize > Products > Default product",
    cause: "One Rich text block on the product template shows on every product. Do not bulk-edit descriptions.",
    steps: (q, origin) => [
      "Online Store → Themes → ⋯ → Duplicate. Do not Edit code on live.",
      "Customize the copy. Top: Products → Default product.",
      `Add block → Rich text. Type the line (${String(q).slice(0, 70)}). Drag it under the title or price. Save.`,
      "If some products use another template, add the same block there too.",
      "Preview a few products. Publish the copy. Do not paste into hundreds of descriptions."
    ]
  },
  product: {
    hint: "Products > that product",
    cause: "This is one product’s title, description, or media — not the theme.",
    steps: (q, origin, url) => [
      url ? `Open the live product: ${url}` : "On the shop open that product.",
      "Products → search the product name → open it.",
      "Edit Title, Description, or Media. Save.",
      "If the same line should be on ALL products, that is the product template (search: text on all products)."
    ]
  },
  collection: {
    hint: "Products > Collections",
    cause: "Collection title/description is Products → Collections. The grid layout is the theme.",
    steps: (q, origin, url) => [
      url ? `Open ${url}` : "Open that collection on the shop.",
      "Products → Collections → the collection. Edit title / description. Save.",
      "To change the look: Duplicate theme → Customize → Collections → Default collection."
    ]
  },
  page: {
    hint: "Online Store > Pages",
    cause: "Pages are Online Store → Pages, then a menu link.",
    steps: (q, origin, url) => [
      url ? `Open ${url}` : "Open that page on the shop.",
      "Online Store → Pages → the page. Edit the body. Save.",
      "If it is missing from the menu: Content → Menus → add it."
    ]
  },
  blog: {
    hint: "Online Store > Blog posts",
    cause: "Blog posts are Online Store → Blog posts.",
    steps: (q, origin, url) => [
      url ? `Open ${url}` : "Open that post on the shop.",
      "Online Store → Blog posts → the post. Edit. Save.",
      "Theme layout: Duplicate → Customize → Blog posts."
    ]
  },
  home: {
    hint: "Customize > Home",
    cause: "Homepage sections are Customize on the Home template.",
    steps: (q, origin) => [
      origin ? `Open ${origin} and note which block has the text.` : "Open the homepage and note which block has the text.",
      "Online Store → Themes → ⋯ → Duplicate.",
      "Customize the copy. Top: Home. Click that section (image banner, rich text, featured collection). Edit. Save.",
      "Preview. Publish the copy."
    ]
  },
  announcement: {
    hint: "Customize > Announcement bar",
    cause: "A line on every page is the announcement bar.",
    steps: (q, origin) => [
      "Online Store → Themes → ⋯ → Duplicate.",
      "Customize the copy → Announcement bar (or Header). Type the line. Save.",
      "Preview home and a product. Publish the copy."
    ]
  },
  logo: {
    hint: "Theme settings > Logo",
    cause: "The logo is a theme setting.",
    steps: (q, origin) => [
      "Online Store → Themes → ⋯ → Duplicate.",
      "Customize the copy → Theme settings → Logo. Upload a PNG. Save.",
      "Check mobile preview. Publish the copy."
    ]
  },
  menu: {
    hint: "Content > Menus",
    cause: "Menu labels and links are Content → Menus.",
    steps: (q, origin) => [
      "Content → Menus (older admin: Online Store → Navigation).",
      "Open Main menu or Footer. Edit the item. Save.",
      "Customize → header/footer: confirm that menu is selected."
    ]
  },
  search: {
    hint: "Online Store > Preferences / search",
    cause: "Storefront search settings plus the Search template in the theme.",
    steps: (q, origin) => [
      origin ? `Shop search: ${origin}/search?q=${encodeURIComponent(q)}` : "Open /search on the shop.",
      "Online Store → Themes → Duplicate → Customize → Search template if the results page layout is wrong.",
      "Product titles/tags control what matches — edit those under Products."
    ]
  },
  unknown: {
    hint: "Find it, then edit in admin",
    cause: "Browsers often block reading another website. Open the shop page, then use these clicks.",
    steps: (q, origin) => [
      origin ? `Open your shop search: ${origin}/search?q=${encodeURIComponent(q)}` : "Paste https://yourstore.com in the shop box first.",
      "If it is a policy: Settings → Policies. If it is one product: Products → that product.",
      "If the same line is on every product: Duplicate theme → Customize → Products → Default product → Rich text.",
      "If it is the top bar: Customize → Announcement bar. Homepage: Customize → Home.",
      "Do not Edit code on the published theme."
    ]
  }
};

export function modifyPlaybook(kind, query, origin, url) {
  const spec = PLAY[kind] || PLAY.unknown;
  const steps = spec.steps(query, origin, url);
  const live = url || "";
  return {
    id: `site-mod-${kind}`,
    hub: /policy/.test(kind) ? "admin" : (kind === "checkout" ? "checkout" : "themes"),
    category: "general",
    public_url: live,
    live_url: live,
    match_phrases: [String(query).toLowerCase()],
    tags: ["howto", "site-search", kind],
    synonyms: [query],
    cause: spec.cause,
    explanation: spec.cause,
    steps,
    target_ui_hint: spec.hint,
    arrow: { x: 0.22, y: 0.28 },
    source_category_db: "site-search"
  };
}

async function tryRead(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors" });
    clearTimeout(t);
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, 400000);
  } catch {
    return "";
  }
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchShopContent(originInput, query) {
  const q = String(query || "").trim();
  let origin = rememberShop(originInput) || getShopOrigin();
  if (!origin) origin = shopOriginFrom(originInput) || "";
  const pasted = shopOriginFrom(originInput);
  let pageUrl = "";
  try {
    const u = new URL(String(originInput || "").trim());
    if (u.pathname && u.pathname !== "/") pageUrl = `${u.protocol}//${u.host}${u.pathname}`;
  } catch { /* not a full page url */ }

  const kind = kindFromPath(pageUrl ? pathOf(pageUrl) : "/") === "unknown" || !pageUrl
    ? kindFromQuery(q)
    : kindFromPath(pathOf(pageUrl));

  const alts = [];
  if (origin) {
    for (const hit of matchKnownPublic(q, origin)) alts.push(hit);
  }

  const candidates = [];
  if (pageUrl) candidates.push(pageUrl);
  if (origin) {
    candidates.push(
      `${origin}/`,
      `${origin}/policies/refund-policy`,
      `${origin}/policies/privacy-policy`,
      `${origin}/policies/shipping-policy`,
      `${origin}/policies/terms-of-service`,
      `${origin}/search?q=${encodeURIComponent(q)}`
    );
  }

  let foundOn = "";
  let corsBlocked = true;
  const needle = q.toLowerCase();
  if (needle.length >= 3) {
    for (const u of [...new Set(candidates)].slice(0, 8)) {
      const html = await tryRead(u);
      if (!html) continue;
      corsBlocked = false;
      const blob = stripHtml(html).toLowerCase();
      if (blob.includes(needle)) {
        foundOn = u;
        alts.unshift({
          id: `site-found-${pathOf(u).replace(/[^\w]+/g, "-")}`,
          target_ui_hint: `Found on ${pathOf(u)}`,
          cause: `The words “${q.slice(0, 80)}” appear on this public page.`,
          public_url: u,
          live_url: u,
          steps: modifyPlaybook(kindFromPath(pathOf(u)), q, origin, u).steps
        });
        break;
      }
    }
  }

  if (origin) {
    try {
      const urls = await fetchSitemapUrls(origin);
      for (const hit of matchSitemap(q, origin, urls)) alts.push(hit);
    } catch { /* cors */ }
  }

  const url = foundOn || pageUrl || (origin && kind.startsWith("policy") ? `${origin}/policies/refund-policy` : "") || (origin ? `${origin}/search?q=${encodeURIComponent(q)}` : "");
  const entry = modifyPlaybook(kind, q, origin, url);
  if (foundOn) {
    entry.cause = `Found that text on ${foundOn}. Change it with the clicks below.`;
    entry.explanation = entry.cause;
    entry.public_url = foundOn;
    entry.live_url = foundOn;
  } else if (corsBlocked && origin) {
    entry.cause = `Browsers block reading ${origin} from this app. Open the shop page, then follow these clicks to change that kind of text.`;
  } else if (!origin) {
    entry.cause = "Paste your shop URL (https://yourstore.com) once, then the text to find.";
  }

  const uniq = [];
  const seen = new Set();
  for (const a of alts) {
    const id = a.id || a.public_url;
    if (!id || seen.has(id) || id === entry.id) continue;
    seen.add(id);
    uniq.push(a);
    if (uniq.length >= 8) break;
  }
  return { origin, entry, alternatives: uniq, foundOn, corsBlocked };
}

export function fillShopBox() {
  return getShopOrigin();
}
