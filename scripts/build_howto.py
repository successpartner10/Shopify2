#!/usr/bin/env python3
"""Build data/howto.json from Shopify Help /en/manual/ URLs.

Each article gets unique phrases + a real admin path for that Help section.
Not a modulo clone grid. No fake Liquid. No “deploy to production”.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITEMAP = Path("/tmp/sitemap-en.xml")
OUT = ROOT / "data" / "howto.json"

GENERIC = {
    "refund", "restock", "glitches", "policy", "errors", "failed", "issue",
    "product", "products", "order", "orders", "theme", "themes", "app", "apps",
    "checkout", "payment", "shipping", "inventory", "admin", "store", "shopify",
    "manual", "overview", "getting started", "faq", "reference", "manage",
}

HUB = {
    "products": "products",
    "online-store": "themes",
    "payments": "payments",
    "checkout-settings": "checkout",
    "discounts": "checkout",
    "domains": "domains",
    "apps": "apps",
    "fulfillment": "shipping",
    "international": "shipping",
    "taxes": "payments",
    "finance": "payments",
    "markets": "admin",
    "customers": "admin",
    "privacy-and-security": "admin",
    "shopify-admin": "admin",
    "your-account": "admin",
    "organization-settings": "admin",
    "intro-to-shopify": "admin",
    "compliance": "admin",
    "b2b": "admin",
    "custom-data": "products",
    "shopify-catalog": "products",
    "shopify-flow": "apps",
    "inbox": "apps",
    "online-sales-channels": "apps",
    "promoting-marketing": "seo",
    "reports-and-analytics": "admin",
    "sell-in-person": "admin",
    "ai-powered-tools": "admin",
    "migrating-to-shopify": "admin",
    "custom-storefronts": "themes",
    "community": "admin",
    "partner-directory": "admin",
}

DUP = "Online Store → Themes → ⋯ → Duplicate the live theme. Do not Edit code on the published theme."

# Real admin click-paths per Help section (unique per top-level, action filled in).
ADMIN = {
    "products": (
        "Products",
        [
            "Products. Use the search box at the top of admin if you need a specific item.",
            "Open the product (or Add product). Look for {action} — usually under {parent}.",
            "Change it. Save.",
            "View that product on the storefront in incognito. Do not Edit code to change product content.",
        ],
    ),
    "online-store": (
        "Online Store > Themes > Customize",
        [
            DUP,
            "Customize the copy. Top bar: pick the template (Home, Products, Collections, Pages, Blog, Cart).",
            "Look for {action} ({parent}). Add block / section if it is missing. Save.",
            "Preview on phone. Publish the copy only when it looks right.",
        ],
    ),
    "payments": (
        "Settings > Payments",
        [
            "Settings → Payments.",
            "Open Shopify Payments / the provider. Look for {action}.",
            "The store owner email is required for payouts, holds, and bank changes — staff often cannot see this.",
            "Save. A $1 test order in incognito, then refund it.",
        ],
    ),
    "checkout-settings": (
        "Settings > Checkout",
        [
            "Settings → Checkout.",
            "For look-and-feel: Customize. For form fields, tipping, accounts: stay on this page.",
            "Look for {action} ({parent}).",
            "Save. Test checkout in incognito. Do not paste checkout.liquid or Additional scripts on the live shop.",
        ],
    ),
    "discounts": (
        "Discounts",
        [
            "Discounts → Create discount (or open the code).",
            "Set {action}. Check dates, minimum purchase, and combinations.",
            "Save. Test at checkout in incognito with a new cart.",
        ],
    ),
    "domains": (
        "Settings > Domains",
        [
            "Settings → Domains (older admin: Online Store → Domains).",
            "Open the domain. Look for {action}.",
            "A record 23.227.38.65, www CNAME shops.myshopify.com. Remove extra AAAA records.",
            "Verify connection. Wait up to 24 hours for SSL.",
        ],
    ),
    "apps": (
        "Settings > Apps and sales channels",
        [
            "Settings → Apps and sales channels (or admin search for the app name).",
            "Install from Shopify App Store if it is missing. Open it. Look for {action}.",
            "If the storefront broke: Online Store → Themes → Customize → App embeds → turn that app off. Save.",
            "Do not paste leftover app code into theme.liquid on the live theme.",
        ],
    ),
    "fulfillment": (
        "Orders / Settings > Shipping",
        [
            "Orders → open the order (or Settings → Shipping and delivery for rates).",
            "Look for {action} ({parent}).",
            "Fulfill, buy a label, or fix the address. Save.",
            "Settings → Locations if stock is at the wrong warehouse.",
        ],
    ),
    "international": (
        "Settings > Markets",
        [
            "Settings → Markets. Open the country.",
            "Status must be Active. Look for {action} (duties, pricing, domains, languages).",
            "Save. Preview with the market globe — not only a VPN.",
        ],
    ),
    "taxes": (
        "Settings > Taxes and duties",
        [
            "Settings → Taxes and duties.",
            "Add a registration for that region. Look for {action}.",
            "Open a product and confirm Charge tax unless it is exempt.",
            "Test checkout with an address in that region.",
        ],
    ),
    "finance": (
        "Finance / Shopify Balance",
        [
            "In admin search type Finance (or Shopify Balance / Capital / Credit).",
            "Look for {action}. The store owner usually has to do this — staff are blocked.",
            "Follow the checklist on that page. Do not send bank details in chat.",
        ],
    ),
    "markets": (
        "Settings > Markets",
        [
            "Settings → Markets. Open or add the market.",
            "Look for {action} ({parent}). Catalog, domain, and currency live here.",
            "Set Active. Save. Preview with the globe icon.",
        ],
    ),
    "customers": (
        "Customers",
        [
            "Customers. Search the person, or Create customer.",
            "Look for {action} (tags, notes, store credit, accounts).",
            "Save. Accounts themselves are Settings → Customer accounts.",
        ],
    ),
    "privacy-and-security": (
        "Settings > Privacy / Users",
        [
            "Settings → Customer privacy (cookies / pixel) or Settings → Users and permissions (2FA).",
            "Look for {action}.",
            "Save. Cookie banners are not pasted into theme.liquid on the live theme.",
        ],
    ),
    "shopify-admin": (
        "Shopify admin home",
        [
            "Use the admin search bar at the top. Type {action}.",
            "Open the first settings / page result — not a random app.",
            "If a staff member cannot see it: Settings → Users and permissions.",
        ],
    ),
    "your-account": (
        "Settings > General / Plan / Users",
        [
            "Settings → General (store details), Plan (billing), or Users and permissions.",
            "Look for {action}. Billing and plan changes need the store owner.",
            "Save. Check the owner email for Shopify receipts.",
        ],
    ),
    "organization-settings": (
        "Settings > Users and permissions",
        [
            "Settings → Users and permissions (or the organization picker if you have several stores).",
            "Look for {action}.",
            "Only the org owner can add stores and change org-level billing.",
        ],
    ),
    "intro-to-shopify": (
        "Shopify admin home",
        [
            "In admin search type {action}.",
            "Finish the setup checklist on Home if it is still showing.",
            "Online Store → Preferences: turn off the password page when you are ready to launch.",
        ],
    ),
    "compliance": (
        "Settings > Policies / Taxes",
        [
            "Settings → Policies for legal text. Settings → Taxes and duties for tax IDs.",
            "Look for {action}. Insert template if Shopify offers one, then edit.",
            "Save. Link the policy in Content → Menus → Footer. Do not paste it into Edit code.",
        ],
    ),
    "b2b": (
        "Settings > B2B / Companies",
        [
            "In admin search type B2B or Companies.",
            "Open Companies / Catalogs. Look for {action}.",
            "B2B needs a plan that includes it (Plus on many stores). Save. Test with a company login.",
        ],
    ),
    "custom-data": (
        "Settings > Custom data",
        [
            "Settings → Custom data (metafields / metaobjects).",
            "Products / Variants / Collections / Company → Add definition. Name it for {action}.",
            "Then Products → a product → the metafield at the bottom. Save.",
            "To show it on the shop: Duplicate the theme → Customize → Add block → the metafield. Not Edit code first.",
        ],
    ),
    "shopify-catalog": (
        "Products / Catalogs",
        [
            "Products, or Settings → Markets → the market → Catalog.",
            "Look for {action}.",
            "Save. An empty catalog hides products in that market.",
        ],
    ),
    "shopify-flow": (
        "Flow app",
        [
            "In admin search type Flow. Open Shopify Flow. Install it if missing.",
            "Create workflow. Search the trigger/action named {action}.",
            "Turn it on. Run a test order / event. Do not paste Flow code into the theme.",
        ],
    ),
    "inbox": (
        "Inbox app",
        [
            "In admin search type Inbox. Open Shopify Inbox.",
            "Look for {action} (chat widget, automations, assigned staff).",
            "The chat bubble on the shop is Online Store → Themes → Customize → App embeds → Inbox.",
        ],
    ),
    "online-sales-channels": (
        "Sales channels",
        [
            "Settings → Apps and sales channels. Install the channel if it is missing.",
            "Open that channel. Look for {action} ({parent}).",
            "Connect the external account (Google, Meta, Shop, Amazon). The store owner may need to approve.",
            "Sync is not instant — wait, then check the channel’s error list.",
        ],
    ),
    "promoting-marketing": (
        "Marketing / Discounts",
        [
            "Marketing (or Discounts, or Settings → Notifications for emails).",
            "Look for {action} ({parent}).",
            "Pixels go in Settings → Customer events — not theme.liquid.",
            "Save. Send yourself a test.",
        ],
    ),
    "reports-and-analytics": (
        "Analytics",
        [
            "Analytics → Reports (or Live view).",
            "Open or create the report. Look for {action}.",
            "Date range top-right. Export if you need a CSV. This does not change the live shop.",
        ],
    ),
    "sell-in-person": (
        "Point of Sale",
        [
            "Point of Sale (POS) in the left nav, or admin search POS.",
            "Look for {action} ({parent}). Hardware is POS → Settings → Hardware.",
            "The POS app on the iPad must be logged into this same store.",
        ],
    ),
    "ai-powered-tools": (
        "Sidekick / Shopify Magic",
        [
            "In admin, open Sidekick (purple glasses) or the Magic sparkle on a product/title.",
            "Ask it about {action}. It can edit drafts — check before you Publish.",
            "Do not let it bulk-edit hundreds of descriptions when one theme block would do.",
            "Theme changes: Duplicate first, then Customize — not Edit code on live.",
        ],
    ),
    "migrating-to-shopify": (
        "Products > Import",
        [
            "Products → Import (CSV), or the migration app from the App Store.",
            "Look for {action}. Use Shopify’s CSV template, not an old export with blank inventory.",
            "Import a few rows first. Check a product, then import the rest.",
        ],
    ),
    "custom-storefronts": (
        "Hydrogen / Headless",
        [
            "This is a custom storefront (Hydrogen / headless), not the Online Store theme editor.",
            "Theme Customize will not change that storefront. Look for {action} in your repo or Hydrogen app.",
            "If you meant the regular Online Store: Online Store → Themes → Duplicate, then Customize.",
        ],
    ),
    "community": (
        "Shopify Help / community",
        [
            "This is a Help/community topic, not a hidden admin toggle.",
            "In Shopify admin search type {action}. Open the settings page that matches.",
            "If nothing matches, open the official Help link in step 4.",
        ],
    ),
    "partner-directory": (
        "Shopify admin home",
        [
            "You do not hire a partner from inside most merchant admin pages.",
            "In admin search type {action} if you meant a store setting.",
            "Otherwise open the Help link and follow Shopify’s partner directory there.",
        ],
    ),
}

DEFAULT = (
    "Shopify admin search",
    [
        "In Shopify admin search (top bar), type {action}.",
        "Open the first Settings / Online Store / Products result.",
        "If this touches the theme: Duplicate first. Do not Edit code on the published theme.",
        "Save. Recheck the live shop in incognito.",
    ],
)


def humanize(slug: str) -> str:
    s = slug.replace("_", "-")
    s = re.sub(r"-+", " ", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s


def phrases_for(path: str, title: str) -> list[str]:
    parts = [p for p in path.split("/") if p]
    last = humanize(parts[-1]) if parts else title
    parent = humanize(parts[-2]) if len(parts) > 1 else ""
    out = []
    for cand in (
        f"how to {last}",
        f"how do I {last}",
        title,
        f"{parent} {last}".strip(),
        last if len(last) >= 8 else "",
    ):
        c = cand.strip().lower()
        if len(c) < 8:
            continue
        if c in GENERIC:
            continue
        if c not in out:
            out.append(c)
    return out[:6]


def entry_for(url: str, n: int) -> dict | None:
    path = url.replace("https://help.shopify.com/en/manual/", "").strip("/")
    if not path:
        return None
    parts = path.split("/")
    top = parts[0]
    title = humanize(parts[-1])
    parent = humanize(parts[-2]) if len(parts) > 1 else top.replace("-", " ")
    hub = HUB.get(top, "admin")
    hint, tmpl = ADMIN.get(top, DEFAULT)
    action = title
    steps = [s.replace("{action}", action).replace("{parent}", parent) for s in tmpl]
    help_step = f"Official Help (this exact topic): {url}"
    if help_step not in steps:
        steps = (steps + [help_step])[:6]
    ph = phrases_for(path, title)
    if not ph:
        return None
    syns = []
    for s in (title, f"how to {title}"):
        sl = s.strip().lower()
        if sl in GENERIC or len(sl) < 8:
            continue
        if sl not in syns:
            syns.append(s)
    if not syns:
        syns = ph[:1]
    slug = path.replace("/", "-")[:80]
    return {
        "id": f"howto-help-{n:04d}-{slug[:40]}",
        "category": "general",
        "hub": hub,
        "match_phrases": ph,
        "tags": ["howto"] + ([top] if top.replace("-", " ") not in GENERIC and len(top) >= 8 else []),
        "synonyms": syns[:2],
        "cause": f"{title} is a Shopify admin how-to ({parent}).",
        "explanation": f"Help article: {path}",
        "steps": steps,
        "target_ui_hint": f"{hint} · {title}",
        "arrow": {"x": 0.2, "y": 0.28},
        "docs": [{"label": "Shopify Help", "url": url}],
        "source_category_db": "howto",
    }


def load_urls() -> list[str]:
    raw = SITEMAP.read_bytes() if SITEMAP.exists() else b""
    if not raw:
        import urllib.request
        req = urllib.request.Request(
            "https://help.shopify.com/sitemap-en.xml",
            headers={"User-Agent": "Storescope/3.5"},
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
        SITEMAP.write_bytes(raw)
    locs = [u.decode() for u in re.findall(rb"<loc>([^<]+)</loc>", raw)]
    seen = []
    for u in locs:
        if "/en/manual/" not in u:
            continue
        if u not in seen:
            seen.append(u)
    return seen


def main() -> None:
    urls = load_urls()
    rows = []
    for i, u in enumerate(urls, 1):
        e = entry_for(u, i)
        if e:
            rows.append(e)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {len(rows)} howtos → {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
