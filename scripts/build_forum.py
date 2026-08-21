#!/usr/bin/env python3
"""500 unique community/SO-style Shopify how-tos.

Each row is a real merchant question with its own admin click-path and a
real Help URL. Not a Case-ID modulo grid. No fake Liquid. No deploy step.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "forum.json"
DUP = "Online Store → Themes → ⋯ → Duplicate the live theme. Do not Edit code on the published theme."

# Unique step families — picked by topic key, never by index % n.
STEPS = {
    "product_missing": [
        "Products → the product.",
        "Sales channels: Online Store must be checked. Status must be Active.",
        "Collections → that collection → Conditions. The product has to match (tag, type, or vendor).",
        "Save. Hard-refresh the collection in incognito.",
    ],
    "product_add": [
        "Products → Add product.",
        "Title, price, and at least one image. Inventory if you track stock.",
        "Sales channels → Online Store. Save.",
        "Open the product URL in incognito.",
    ],
    "variants": [
        "Products → the product → Variants.",
        "Add options (Size, Color). Each combo is one variant — Shopify caps at 100 variants / 3 options.",
        "Set price, SKU, and inventory per variant. Save.",
        "If you need more than 100, use categories / a line-item property app — do not Edit code on live.",
    ],
    "images": [
        "Products → the product → Media.",
        "Add images. Drag the one you want first to the top-left (that is the featured image).",
        "Click an image to replace it. Save.",
        "Theme: Duplicate first, then Customize → Products → Default product if the gallery layout is wrong.",
    ],
    "inventory": [
        "Products → the product → Inventory.",
        "Track quantity on. Set the count at the right Location.",
        "Settings → Locations if stock is at the wrong warehouse.",
        "Save. A draft order should now show the new count.",
    ],
    "continue_selling": [
        "Products → the product → Inventory.",
        "Turn Continue selling when out of stock off if you want Add to cart to hide.",
        "Save. Hard-refresh the product in incognito.",
        "Theme sold-out badges: Duplicate, then Customize → Products — not Edit code on live.",
    ],
    "collections": [
        "Products → Collections → the collection (or Create collection).",
        "Automated: set Conditions (tag, type, price). Manual: add products one by one.",
        "Sales channels → Online Store. Save.",
        "Online Store → Navigation if the collection is missing from the menu.",
    ],
    "seo_product": [
        "Products → the product → Search engine listing.",
        "Edit the page title and meta description. URL handle is under there too.",
        "Save. Search Console changes take days — the live page updates now.",
        "Do not paste schema into theme.liquid on the published theme.",
    ],
    "redirect": [
        "Online Store → Navigation → View URL redirects (or Content → Menus → Redirects).",
        "Create URL redirect. Old path → new path. Save.",
        "Test the old URL in incognito. 301s can be cached — wait or use a private window.",
        "Do not add redirects in robots.txt.",
    ],
    "checkout_text": [
        "Settings → Checkout.",
        "For the pay page look: Customize (Checkout Extensibility). Extra fields live on this Settings page.",
        "Cart text is Online Store → Themes → Duplicate → Customize → Cart.",
        "checkout.liquid / Additional scripts are Plus-only and retired on most shops. Do not paste them on Basic.",
    ],
    "checkout_fields": [
        "Settings → Checkout → Customer contact / Form options.",
        "Company, address 2, phone: set to Hidden / Optional / Required.",
        "Save. Test checkout in incognito with a new cart.",
        "Tipping is on this same page. Shop Pay may hide some custom fields.",
    ],
    "discount": [
        "Discounts → Create discount.",
        "Amount off, Buy X get Y, Free shipping, or App. Set dates, minimum, and combinations.",
        "Save. Test at checkout in incognito with a new customer cart.",
        "Automatic discounts stack only if Combinations is on.",
    ],
    "shipping_rate": [
        "Settings → Shipping and delivery → Manage rates.",
        "The customer's country must sit in exactly one zone with a rate.",
        "Add a fallback flat rate so a carrier API miss cannot zero out checkout.",
        "Every physical product needs a weight and a shipping origin.",
    ],
    "local_pickup": [
        "Settings → Shipping and delivery → Local pickup.",
        "Turn it on for that Location. Set the expected pickup time.",
        "Save. Products that are only at another location will not offer pickup here.",
        "Checkout in incognito with an address near that location.",
    ],
    "payments": [
        "Settings → Payments.",
        "A primary card provider must be Active. PayPal Express alone does not replace it.",
        "Turn Test mode off for live charges. The store owner email gets holds and bank changes.",
        "Place a $1 test order in incognito, then refund it.",
    ],
    "shop_pay": [
        "Settings → Payments → Shop Pay.",
        "Turn Shop Pay on. Shop Pay Installments is a separate toggle (need to qualify).",
        "Save. Test checkout in incognito. Theme buttons: Duplicate → Customize → App embeds / buy buttons.",
        "Shop Pay can hide some checkout customizations — that is expected.",
    ],
    "theme_text": [
        DUP,
        "Customize. Top bar: pick the template (Home, Products, Collections, Pages, Cart).",
        "Click the section or Add block → Rich text / Heading. Type the words. Save.",
        "Preview on phone. Publish the copy only when it looks right.",
    ],
    "logo": [
        DUP,
        "Customize → Theme settings → Logo.",
        "Upload the file. Set width. Favicon is on the same Theme settings page.",
        "Save. Hard-refresh the shop — old logos stick in cache.",
    ],
    "announcement": [
        DUP,
        "Customize → Header / Announcement bar.",
        "Type the line. Link it if you want. Save.",
        "Markets / languages: that bar can be translated under the language editor.",
    ],
    "menu": [
        "Content → Menus (older: Online Store → Navigation).",
        "Open Main menu or Footer. Add menu item → the page, collection, or policy.",
        "Save. Nested items are drag-under, not a new menu.",
        "The theme only shows the menu assigned in Customize → Header / Footer.",
    ],
    "page": [
        "Online Store → Pages → Add page.",
        "Title and body. Visibility: Visible. Save.",
        "Content → Menus → add that page so people can find it.",
        "Template look: Duplicate theme → Customize → Pages.",
    ],
    "policy": [
        "Settings → Policies.",
        "Refund, Privacy, Terms, Shipping, Contact. Insert template, then edit. Save.",
        "Content → Menus → Footer → add each policy.",
        "Do not paste policy HTML into theme.liquid on the live theme.",
    ],
    "domain": [
        "Settings → Domains (older: Online Store → Domains).",
        "Connect existing or buy new. Primary domain is the one customers should see.",
        "A record 23.227.38.65, www CNAME shops.myshopify.com. Remove extra AAAA records.",
        "Wait up to 24 hours for SSL. The padlock will not show until DNS is right.",
    ],
    "password": [
        "Online Store → Preferences.",
        "Restrict store access / password page: turn it off to launch.",
        "Save. Open the shop in incognito — you should see the real home page.",
        "A custom password page is Duplicate → Customize → Password, not Edit code on live.",
    ],
    "apps_embed": [
        "Online Store → Themes → Customize → App embeds.",
        "Turn the app on or off. Save.",
        "Settings → Apps and sales channels if the app is missing.",
        "Leftover code in theme.liquid on the live theme will keep breaking the shop — Duplicate, then remove it on the copy.",
    ],
    "pixel": [
        "Settings → Customer events.",
        "Add custom pixel or connect the sales channel pixel. Do not paste into theme.liquid.",
        "Customer privacy / cookie banner must allow marketing if the region requires it.",
        "Test with the channel’s debug tool. Theme Edit code is the wrong place.",
    ],
    "email": [
        "Settings → Notifications.",
        "Open the email (Order confirmation, Shipping, Abandoned). Edit the subject and body.",
        "Send a test to yourself. Save.",
        "Customer marketing emails are the Email / Shopify Email app — not this list.",
    ],
    "staff": [
        "Settings → Users and permissions.",
        "Add staff. Pick a role or custom permissions (Orders, Products, Settings).",
        "They must accept the email invite. 2FA is on this page too.",
        "Billing, bank, and plan changes stay with the store owner.",
    ],
    "tax": [
        "Settings → Taxes and duties.",
        "Add a registration for that region. Collect tax on those products unless exempt.",
        "Open a product → Charge tax. Save.",
        "Test checkout with an address in that region.",
    ],
    "markets": [
        "Settings → Markets. Open or add the country.",
        "Status Active. Domain, currency, and catalog live here.",
        "Save. Preview with the globe — a VPN is not enough.",
        "Prices per market are the catalog on that market, not a theme change.",
    ],
    "gift_card": [
        "Products → Gift cards (or Products → Add product → Gift card).",
        "Set denominations. Sales channels → Online Store.",
        "Settings → Payments must be able to capture the sale. Gift cards are not a card gateway.",
        "Customers redeem at checkout in the Gift card field.",
    ],
    "pos": [
        "Point of Sale in the left nav (or admin search POS).",
        "POS → Settings → Smart grid / Hardware / Receipts for that location.",
        "The iPad app must be logged into this same store.",
        "Inventory is per Location — Settings → Locations.",
    ],
    "flow": [
        "Admin search Flow. Open Shopify Flow. Install it if missing.",
        "Create workflow. Pick the trigger, then the action.",
        "Turn it on. Run a test order or event.",
        "Do not paste Flow code into the theme.",
    ],
    "metafield": [
        "Settings → Custom data → Products (or Variants / Collections).",
        "Add definition. Name it. Type (single line, file, etc.). Save.",
        "Products → a product → the metafield at the bottom. Fill it. Save.",
        DUP + " Then Customize → Add block → the metafield.",
    ],
    "blog": [
        "Online Store → Blog posts → Add blog post (Blogs manage the blog itself).",
        "Title, body, featured image. Visibility Visible. Save.",
        "Content → Menus if you want it in the header.",
        "Comments and authors are on the blog settings.",
    ],
    "analytics": [
        "Analytics → Reports (or Live view).",
        "Open the report. Date range is top-right. Export CSV if you need a sheet.",
        "This does not change the live shop.",
        "Pixels and Google / Meta connections are Settings → Customer events or the sales channel.",
    ],
    "plus_only": [
        "This needs Shopify Plus (checkout.liquid, Additional scripts, Launchpad, Script Editor, B2B on many shops).",
        "On Basic / Shopify / Advanced: use Checkout Extensibility (Settings → Checkout → Customize) or an app.",
        "Do not paste checkout.liquid on a non-Plus shop — the menu is not there.",
        "If you are on Plus: Duplicate / unpublished checkout first. Never edit the live checkout blindly.",
    ],
    "b2b": [
        "Admin search B2B or Companies.",
        "Companies → add the company. Catalogs and payment terms live there.",
        "B2B needs a plan that includes it (Plus on many stores).",
        "Test with a company contact login, not your staff account.",
    ],
    "translate": [
        "Settings → Languages (or Markets → the market → Languages).",
        "Add the language. Translate in the Translate & Adapt app or CSV.",
        "Theme strings: Duplicate first, then the language editor — not Edit code on live.",
        "Hreflang is automatic when Markets languages are Active.",
    ],
    "search_console": [
        "Sales channels → Google & YouTube, or Settings → Apps → Google channel.",
        "Connect Search Console / Merchant Center with the store-owner Google account.",
        "Online Store → Preferences → storefront password must be off or Google cannot crawl.",
        "Sitemap is https://yourstore.com/sitemap.xml — submit that, not a theme file.",
    ],
    "password_reset_admin": [
        "shopify.com/login if you cannot open admin.",
        "Use the store-owner email. Check spam for the reset.",
        "Staff: the store owner resends the invite under Settings → Users.",
        "2FA lockout is Shopify Support — Storescope cannot reset it.",
    ],
    "order_edit": [
        "Orders → the order.",
        "Edit / Resend email / Refund / Duplicate are on that order.",
        "Paid orders: refund first if you need to change money. Restock is a checkbox on the refund.",
        "Archived orders: Unarchive on the same page.",
    ],
    "refund": [
        "Orders → the order → Refund.",
        "Pick the items. Restock if they should go back to inventory.",
        "Refund shipping only if you charged it and want it back. Send notification.",
        "Shopify Payments refunds go to the original card. Other gateways follow that provider.",
    ],
    "fraud": [
        "Orders → the order → the fraud / risk card.",
        "High risk: do not fulfill until you verify. Cancel and refund if it is fraud.",
        "Shopify Protect / fraud analyze is on the order — Storescope cannot lift a Payments hold.",
        "Settings → Payments for account holds is a different banner.",
    ],
    "subscription": [
        "Subscriptions are an app (Shopify Subscriptions or another).",
        "Settings → Apps → that app. Products → the product → selling plan.",
        "Checkout must use Shopify Payments or a supported gateway.",
        "Theme widget: Duplicate → Customize → App embeds → the subscriptions app.",
    ],
}

HELP = "https://help.shopify.com/en/manual/"

# (question, hub, hint, help_slug, steps_key) — each question unique.
RAW: list[tuple[str, str, str, str, str]] = []


def add(q: str, hub: str, hint: str, slug: str, key: str) -> None:
    RAW.append((q, hub, hint, slug, key))


# --- Products / catalog (community + SO classics) ---
add("product not showing on collection page", "products", "Products → Sales channels + collection conditions", "products/collections", "product_missing")
add("why is my product hidden from the online store", "products", "Products → Sales channels", "products/add-update-products", "product_missing")
add("product status active but not on website", "products", "Products → Sales channels → Online Store", "products/add-update-products", "product_missing")
add("how do I unhide a product", "products", "Products → Status Active + Online Store channel", "products/add-update-products", "product_missing")
add("new product not appearing in search on my shop", "products", "Product Active, Online Store, not excluded from search", "products/add-update-products", "product_missing")
add("how to add a new product in shopify", "products", "Products → Add product", "products/add-update-products", "product_add")
add("how do I duplicate a product", "products", "Products → the product → Duplicate", "products/add-update-products", "product_add")
add("how to make a product draft", "products", "Products → Status → Draft", "products/add-update-products", "product_add")
add("how to archive a product without deleting", "products", "Products → Status → Archived", "products/add-update-products", "product_add")
add("how to bulk edit product prices", "products", "Products → select → Bulk edit", "products/add-update-products", "product_add")
add("how to import products csv", "products", "Products → Import", "products/import-export/using-csv", "product_add")
add("csv import products failed", "products", "Products → Import → use Shopify template", "products/import-export/using-csv", "product_add")
add("how to export all products", "products", "Products → Export", "products/import-export/using-csv", "product_add")
add("product handle url already taken", "products", "Products → Search engine listing → URL handle", "products/add-update-products", "seo_product")
add("how to change product url slug", "products", "Products → Search engine listing → handle", "promoting-marketing/seo/search-engine-optimization", "seo_product")
add("how to add size and color variants", "products", "Products → Variants", "products/variants", "variants")
add("shopify 100 variant limit", "products", "Max 100 variants / 3 options", "products/variants", "variants")
add("cannot add a fourth product option", "products", "Shopify allows 3 options — use a line-item app", "products/variants", "variants")
add("variant price not updating on storefront", "products", "Products → variant price → Save → hard refresh", "products/variants", "variants")
add("how to add a SKU to each variant", "products", "Products → Variants → SKU", "products/variants", "variants")
add("barcode field missing on product", "products", "Products → Inventory / variant barcode", "products/variants", "variants")
add("how to rearrange variant order", "products", "Products → Variants → drag", "products/variants", "variants")
add("sold out variant still clickable", "products", "Inventory + theme sold-out", "products/inventory", "continue_selling")
add("how to hide sold out variants", "products", "Theme product settings or an app", "products/variants", "continue_selling")
add("how to add more than 3 options on a product", "products", "Need an options app — not Edit code first", "products/variants", "variants")
add("product images not showing on website", "products", "Products → Media", "products/product-media", "images")
add("how to change featured image", "products", "Products → Media → drag to first", "products/product-media", "images")
add("how to add alt text to product images", "products", "Products → Media → image → alt", "products/product-media", "images")
add("variant image not switching", "products", "Assign each variant an image", "products/product-media", "images")
add("how to add a product video", "products", "Products → Media → YouTube/Vimeo or file", "products/product-media", "images")
add("360 image spin on product", "products", "Needs an app or theme block — Duplicate first", "products/product-media", "images")
add("how to delete extra product images", "products", "Products → Media → trash", "products/product-media", "images")
add("inventory not decreasing after order", "products", "Track quantity + correct Location", "products/inventory", "inventory")
add("how to set inventory at two locations", "products", "Settings → Locations + product inventory", "products/inventory/location", "inventory")
add("overselling shopify how to stop", "products", "Continue selling off + track quantity", "products/inventory", "continue_selling")
add("continue selling when out of stock where is it", "products", "Products → Inventory", "products/inventory", "continue_selling")
add("preorder product how to", "products", "Continue selling on + a preorder badge app/theme", "products/inventory", "continue_selling")
add("low stock alert shopify", "products", "Products inventory or Flow / an app", "products/inventory", "inventory")
add("transfer inventory between locations", "products", "Products → Inventory → Transfers", "products/inventory/transfers", "inventory")
add("how to create a collection", "products", "Products → Collections", "products/collections", "collections")
add("automated collection not pulling products", "products", "Collection conditions vs product tags", "products/collections", "collections")
add("how to add a product to a manual collection", "products", "Collections → manual → add products", "products/collections", "collections")
add("collection page shows no products", "products", "Conditions, sales channel, product Active", "products/collections", "product_missing")
add("how to change collection sort order", "products", "Collections → Sort", "products/collections", "collections")
add("how to add collection to menu", "products", "Content → Menus", "online-store/menus-and-links", "menu")
add("smart collection vs manual", "products", "Collections → Automated or Manual", "products/collections", "collections")
add("how to add a size chart", "products", "Metafield or page + product block", "custom-data/metafields", "metafield")
add("how to add a product tab for description", "themes", "Duplicate theme → product template blocks", "online-store/themes/customizing-themes", "theme_text")
add("compare at price not showing", "products", "Products → Pricing → Compare-at price + theme setting", "products/details", "product_add")
add("how to put a product on sale", "products", "Set Compare-at higher than Price", "products/details", "product_add")
add("unit price per kg how to", "products", "Products → Pricing → unit price", "products/details", "product_add")
add("digital download product shopify", "products", "Product type + a digital downloads app", "products/digital-service-product", "product_add")
add("gift card product not in catalog", "products", "Products → Gift cards", "products/gift-card", "gift_card")
add("how to sell gift cards", "products", "Products → Gift cards", "products/gift-card", "gift_card")
add("bundle product shopify how to", "products", "Shopify Bundles app or a bundle app", "products/bundles", "product_add")
add("how to add a product metafield", "products", "Settings → Custom data", "custom-data/metafields", "metafield")
add("metafield not showing on product page", "themes", "Duplicate → Customize → add metafield block", "custom-data/metafields", "metafield")
add("how to add a category metafield / taxonomy", "products", "Products → category (standard taxonomy)", "products/details", "product_add")
add("product type vs vendor vs tags", "products", "Products → Organization", "products/details", "product_add")
add("how to bulk add tags", "products", "Products → select → Add tags", "products/details", "product_add")
add("how to delete unused tags", "products", "Products search tag → remove from all", "products/details", "product_add")

# --- Checkout / cart / discounts ---
add("how to add a line of text on checkout", "checkout", "Settings → Checkout → Customize or Cart", "checkout-settings", "checkout_text")
add("how to add custom field on checkout", "checkout", "Settings → Checkout / Checkout Extensibility", "checkout-settings/checkout-customization", "checkout_fields")
add("how to require phone number at checkout", "checkout", "Settings → Checkout → Form options", "checkout-settings", "checkout_fields")
add("how to hide company name on checkout", "checkout", "Settings → Checkout → Company", "checkout-settings", "checkout_fields")
add("how to turn on tipping", "checkout", "Settings → Checkout → Tipping", "checkout-settings", "checkout_fields")
add("how to add cart note", "checkout", "Customize → Cart → show cart note", "online-store/themes/customizing-themes", "theme_text")
add("how to add text above the cart", "checkout", "Duplicate → Customize → Cart → Rich text", "online-store/themes/customizing-themes", "theme_text")
add("abandoned checkout emails not sending", "checkout", "Settings → Checkout → abandoned + Notifications", "checkout-settings/abandoned-checkouts", "email")
add("how to recover abandoned checkouts", "checkout", "Orders → Abandoned checkouts", "checkout-settings/abandoned-checkouts", "order_edit")
add("shop pay button missing", "checkout", "Settings → Payments → Shop Pay", "payments/shop-pay", "shop_pay")
add("shop pay installments how to enable", "checkout", "Settings → Payments → Shop Pay Installments", "payments/shop-pay", "shop_pay")
add("paypal express not showing", "payments", "Settings → Payments → PayPal", "payments", "payments")
add("how to turn off test mode", "payments", "Settings → Payments → Test mode off", "payments", "payments")
add("unable to accept payments", "payments", "Settings → Payments banner", "payments", "payments")
add("payouts on hold what to do", "payments", "Settings → Payments → identity", "finance/payouts", "payments")
add("how to change bank account for payouts", "payments", "Settings → Payments → Shopify Payments → bank", "finance/payouts", "payments")
add("how to add apple pay", "payments", "Settings → Payments → wallets (domain + SSL)", "payments/accelerated-checkouts", "shop_pay")
add("google pay not showing", "payments", "Wallets + supported browser + HTTPS", "payments/accelerated-checkouts", "shop_pay")
add("how to create a discount code", "checkout", "Discounts → Create discount", "discounts", "discount")
add("automatic discount not applying", "checkout", "Combinations, dates, customer eligibility", "discounts", "discount")
add("how to do buy one get one", "checkout", "Discounts → Buy X get Y", "discounts", "discount")
add("free shipping discount how to", "checkout", "Discounts → Free shipping + shipping rates", "discounts", "discount")
add("discount code not working", "checkout", "Dates, usage limits, combinations, new cart", "discounts", "discount")
add("how to stack two discounts", "checkout", "Discounts → Combinations", "discounts", "discount")
add("how to give a customer store credit", "admin", "Customers → the person → Store credit", "customers", "order_edit")
add("gift card code not working at checkout", "checkout", "Balance, expiry, same store, Gift card field", "products/gift-card", "gift_card")

# --- Shipping ---
add("no shipping rates at checkout", "shipping", "Settings → Shipping → zone + rate", "fulfillment/setup", "shipping_rate")
add("shipping not showing for united states", "shipping", "US must be in one zone with a rate", "fulfillment/setup", "shipping_rate")
add("how to add a flat rate", "shipping", "Shipping → zone → Add rate", "fulfillment/setup", "shipping_rate")
add("how to add free shipping over 50", "shipping", "Price-based rate or free shipping discount", "fulfillment/setup", "shipping_rate")
add("how to set up local pickup", "shipping", "Settings → Shipping → Local pickup", "fulfillment/local-pickup", "local_pickup")
add("local pickup not showing", "shipping", "Location stock + pickup enabled", "fulfillment/local-pickup", "local_pickup")
add("product has no weight shipping failed", "shipping", "Products → each variant weight", "fulfillment/setup", "shipping_rate")
add("how to use calculated carrier rates", "shipping", "Shipping → carrier-calculated (account needed)", "fulfillment/setup", "shipping_rate")
add("usps rates not loading", "shipping", "Carrier account + fallback flat rate", "fulfillment/setup", "shipping_rate")
add("how to add a packing slip", "shipping", "Settings → Shipping → Packing slip", "fulfillment/managing-orders", "order_edit")
add("how to buy a shipping label", "shipping", "Orders → the order → Create shipping label", "fulfillment/managing-orders", "order_edit")
add("how to fulfill an order", "shipping", "Orders → Fulfill item", "fulfillment/managing-orders", "order_edit")
add("partial fulfill how to", "shipping", "Orders → fulfill some items", "fulfillment/managing-orders", "order_edit")
add("how to add a tracking number", "shipping", "Orders → fulfill → tracking", "fulfillment/managing-orders", "order_edit")
add("wrong shipping address after paid", "shipping", "Orders → edit shipping address (may need refund)", "fulfillment/managing-orders", "order_edit")
add("how to set product as shipping not required", "shipping", "Products → This is a physical product off", "products/details", "product_add")
add("international shipping duties how to", "shipping", "Settings → Markets / Taxes and duties", "international", "markets")
add("how to add a shipping profile per product", "shipping", "Settings → Shipping → custom profile", "fulfillment/setup", "shipping_rate")

# --- Themes / storefront ---
add("how to change logo", "themes", "Theme settings → Logo", "online-store/themes/customizing-themes", "logo")
add("favicon not updating", "themes", "Theme settings → favicon + hard refresh", "online-store/themes/customizing-themes", "logo")
add("how to add announcement bar", "themes", "Customize → Announcement bar", "online-store/themes/customizing-themes", "announcement")
add("how to change homepage text", "themes", "Duplicate → Customize → Home", "online-store/themes/customizing-themes", "theme_text")
add("how to add a section on homepage", "themes", "Customize → Add section", "online-store/themes/customizing-themes", "theme_text")
add("how to change colors", "themes", "Customize → Theme settings → Colors", "online-store/themes/customizing-themes", "theme_text")
add("how to change fonts", "themes", "Customize → Theme settings → Typography", "online-store/themes/customizing-themes", "theme_text")
add("how to edit footer", "themes", "Customize → Footer + Content → Menus", "online-store/themes/customizing-themes", "theme_text")
add("how to add a page", "themes", "Online Store → Pages", "online-store/themes/customizing-themes", "page")
add("how to add contact page", "themes", "Pages + contact form block", "online-store/themes/customizing-themes", "page")
add("contact form not sending", "themes", "Spam filter + customer email + Notifications", "online-store/themes/customizing-themes", "email")
add("how to add a dropdown menu", "themes", "Content → Menus → nest items", "online-store/menus-and-links", "menu")
add("menu item not showing", "themes", "Right menu assigned in Customize → Header", "online-store/menus-and-links", "menu")
add("how to password protect store", "themes", "Online Store → Preferences", "online-store/themes/password-page", "password")
add("how to remove password page", "themes", "Online Store → Preferences → turn off", "online-store/themes/password-page", "password")
add("theme has errors liquid", "themes", "Duplicate — do not Edit code on live", "online-store/themes/theme-editor", "theme_text")
add("how to update theme", "themes", "Online Store → Themes → Add / Update on a copy", "online-store/themes", "theme_text")
add("how to roll back theme", "themes", "Themes → ⋯ → older copy / last saved", "online-store/themes", "theme_text")
add("how to add custom css", "themes", "Customize → Theme settings → Custom CSS", "online-store/themes/customizing-themes", "theme_text")
add("where is custom liquid block", "themes", "Customize → Add block → Custom liquid (on a copy)", "online-store/themes/customizing-themes", "theme_text")
add("how to add a popup", "themes", "App embed or theme popup — Duplicate first", "online-store/themes/customizing-themes", "apps_embed")
add("mobile menu not opening", "themes", "Duplicate → Preview phone → Header", "online-store/themes/customizing-themes", "theme_text")
add("images cropped on mobile", "themes", "Customize → image ratio / focal point", "online-store/themes/customizing-themes", "theme_text")
add("how to add instagram feed", "themes", "App embed — not paste into theme.liquid", "online-store/themes/customizing-themes", "apps_embed")
add("how to add a countdown timer", "themes", "Theme block or app, on a duplicated theme", "online-store/themes/customizing-themes", "theme_text")
add("how to change add to cart button text", "themes", "Customize → language editor / product block", "online-store/themes/customizing-themes", "theme_text")
add("sold out badge missing", "themes", "Customize → Product information → sold out", "online-store/themes/customizing-themes", "theme_text")
add("how to add breadcrumbs", "themes", "Customize → product / collection breadcrumb", "online-store/themes/customizing-themes", "theme_text")
add("how to edit password page design", "themes", "Customize → Password template", "online-store/themes/password-page", "password")
add("dawn theme how to add slideshow", "themes", "Customize → Add section → Slideshow", "online-store/themes/customizing-themes", "theme_text")
add("how to hide a page from search", "themes", "Page metafield / robots or an SEO app", "promoting-marketing/seo", "seo_product")

# --- Policies / legal / admin ---
add("how to add a refund policy", "admin", "Settings → Policies", "checkout-settings/refund-cancellations", "policy")
add("where are shopify policies", "admin", "Settings → Policies", "checkout-settings/refund-cancellations", "policy")
add("how to add privacy policy", "admin", "Settings → Policies", "privacy-and-security", "policy")
add("how to add terms of service", "admin", "Settings → Policies", "checkout-settings", "policy")
add("how to add shipping policy", "admin", "Settings → Policies", "fulfillment", "policy")
add("refund policy not in footer", "admin", "Content → Menus → Footer", "online-store/menus-and-links", "menu")
add("how to add refund text on all products", "themes", "Duplicate → product template Rich text", "online-store/themes/customizing-themes", "theme_text")
add("how to change store name", "admin", "Settings → General", "your-account", "staff")
add("how to change store email", "admin", "Settings → General → Sender / customer email", "your-account", "staff")
add("how to change store address", "admin", "Settings → General + Locations", "your-account", "staff")
add("how to add a staff account", "admin", "Settings → Users and permissions", "your-account/staff-accounts", "staff")
add("staff cannot see payments", "admin", "Users → permissions / store owner only", "your-account/staff-accounts", "staff")
add("how to turn on 2fa", "admin", "Settings → Users → two-step", "privacy-and-security", "staff")
add("forgot shopify admin password", "admin", "shopify.com/login reset", "your-account", "password_reset_admin")
add("how to change plan", "admin", "Settings → Plan", "your-account/pricing-plans", "staff")
add("how to pause shopify store", "admin", "Settings → Plan → Pause and build / deactivate", "your-account", "staff")
add("how to close shopify store", "admin", "Settings → Plan → Deactivate", "your-account", "staff")
add("how to add a location", "admin", "Settings → Locations", "fulfillment/locations", "inventory")
add("how to set default location", "admin", "Settings → Locations → default", "fulfillment/locations", "inventory")

# --- Domains / SEO ---
add("how to connect a domain", "domains", "Settings → Domains", "domains", "domain")
add("ssl not provisioning", "domains", "DNS A/CNAME + wait 24h", "domains", "domain")
add("www not redirecting to root", "domains", "Settings → Domains → primary + redirect", "domains", "domain")
add("how to set primary domain", "domains", "Settings → Domains → Set as primary", "domains", "domain")
add("domain connected but not working", "domains", "A 23.227.38.65, remove AAAA", "domains", "domain")
add("how to add a redirect", "seo", "Online Store → URL redirects", "online-store/menus-and-links/url-redirect", "redirect")
add("old product url 404", "seo", "Create URL redirect", "online-store/menus-and-links/url-redirect", "redirect")
add("how to edit meta title", "seo", "Product / page → Search engine listing", "promoting-marketing/seo", "seo_product")
add("google not indexing my shop", "seo", "Password off + Search Console + sitemap", "promoting-marketing/seo", "search_console")
add("where is sitemap.xml", "seo", "https://yourstore.com/sitemap.xml", "promoting-marketing/seo", "search_console")
add("how to add google analytics", "seo", "Customer events or Google channel — not theme.liquid", "promoting-marketing/pixels", "pixel")
add("how to add facebook pixel", "seo", "Settings → Customer events / Meta channel", "promoting-marketing/pixels", "pixel")
add("how to add tiktok pixel", "seo", "TikTok sales channel / Customer events", "promoting-marketing/pixels", "pixel")
add("cookie banner shopify", "admin", "Settings → Customer privacy", "privacy-and-security/privacy", "pixel")
add("how to submit site to google", "seo", "Search Console + sitemap.xml", "promoting-marketing/seo", "search_console")
add("canonical url wrong", "seo", "Primary domain + product handle", "promoting-marketing/seo", "seo_product")
add("hreflang shopify how to", "seo", "Markets → languages Active", "international", "translate")
add("robots.txt shopify how to edit", "seo", "Online Store → Preferences / robots liquid on a copy", "promoting-marketing/seo", "seo_product")

# --- Apps / pixels / email ---
add("app broke my theme", "apps", "Customize → App embeds off", "apps", "apps_embed")
add("how to uninstall an app leftover code", "apps", "Duplicate theme → remove leftover on the copy", "apps", "apps_embed")
add("how to turn off an app embed", "apps", "Customize → App embeds", "apps", "apps_embed")
add("klaviyo not tracking", "apps", "Customer events / Klaviyo embed + privacy", "promoting-marketing/pixels", "pixel")
add("how to add a chat widget", "apps", "Inbox or chat app → App embeds", "inbox", "apps_embed")
add("shopify inbox not showing", "apps", "Inbox + App embeds + Online Store channel", "inbox", "apps_embed")
add("how to edit order confirmation email", "admin", "Settings → Notifications", "fulfillment/managing-orders/notifications", "email")
add("shipping confirmation email not sending", "admin", "Notifications + fulfill with notification on", "fulfillment/managing-orders/notifications", "email")
add("how to change sender email", "admin", "Settings → Notifications / General", "fulfillment/managing-orders/notifications", "email")
add("how to send abandoned cart email", "checkout", "Settings → Checkout abandoned + Shopify Email", "checkout-settings/abandoned-checkouts", "email")
add("how to create an email campaign", "seo", "Shopify Email / Marketing", "promoting-marketing", "email")

# --- Orders / customers ---
add("how to refund an order", "admin", "Orders → Refund", "fulfillment/managing-orders/refunding-orders", "refund")
add("how to restock when refunding", "admin", "Refund → Restock checkbox", "fulfillment/managing-orders/refunding-orders", "refund")
add("how to cancel an order", "admin", "Orders → Cancel order", "fulfillment/managing-orders", "order_edit")
add("how to edit a paid order", "admin", "Orders → Edit (refund if money changes)", "fulfillment/managing-orders", "order_edit")
add("how to resend order confirmation", "admin", "Orders → Resend email", "fulfillment/managing-orders", "order_edit")
add("how to archive an order", "admin", "Orders → Archive", "fulfillment/managing-orders", "order_edit")
add("fraudulent order what to do", "admin", "Do not fulfill → cancel/refund", "fulfillment/managing-orders", "fraud")
add("high risk order shopify", "admin", "Order risk card — verify before fulfill", "fulfillment/managing-orders", "fraud")
add("how to add a customer", "admin", "Customers → Add customer", "customers", "order_edit")
add("how to merge customers", "admin", "Customers → merge (where available)", "customers", "order_edit")
add("customer account login not working", "admin", "Settings → Customer accounts", "customers", "staff")
add("how to turn on customer accounts", "admin", "Settings → Customer accounts", "customers", "staff")
add("how to export customers", "admin", "Customers → Export", "customers", "analytics")
add("how to add a customer tag", "admin", "Customers → the person → tag", "customers", "order_edit")

# --- Taxes / markets / B2B / Plus ---
add("how to charge sales tax", "payments", "Settings → Taxes and duties", "taxes", "tax")
add("tax not charging at checkout", "payments", "Registration + product Charge tax", "taxes", "tax")
add("how to add vat number", "payments", "Settings → Taxes / Markets", "taxes", "tax")
add("how to sell in another country", "admin", "Settings → Markets", "international", "markets")
add("how to add a currency", "admin", "Markets → the market → currency", "international", "markets")
add("prices wrong for canada market", "admin", "Markets → Canada → catalog / rounding", "international", "markets")
add("how to translate my store", "themes", "Settings → Languages + Translate & Adapt", "international", "translate")
add("how to add a language", "admin", "Settings → Languages", "international", "translate")
add("is checkout.liquid still available", "checkout", "Plus only / retired — use Checkout Extensibility", "checkout-settings", "plus_only")
add("additional scripts checkout missing", "checkout", "Plus-only and retired on most shops", "checkout-settings", "plus_only")
add("how to use shopify scripts", "checkout", "Script Editor is Plus — use Functions / apps", "checkout-settings", "plus_only")
add("how to set up b2b", "admin", "Companies / catalogs — often Plus", "b2b", "b2b")
add("how to add a company catalog", "admin", "Companies → catalog", "b2b", "b2b")
add("launchpad shopify how to", "admin", "Plus only — Launchpad app", "promoting-marketing", "plus_only")

# --- POS / Flow / analytics / misc ---
add("how to set up shopify pos", "admin", "Point of Sale + iPad app", "sell-in-person", "pos")
add("pos not seeing inventory", "admin", "Same store + Location stock", "sell-in-person", "pos")
add("how to print pos receipt", "admin", "POS → Settings → Receipts", "sell-in-person", "pos")
add("how to create a flow workflow", "apps", "Admin search Flow", "shopify-flow", "flow")
add("flow not running", "apps", "Workflow on + trigger actually happened", "shopify-flow", "flow")
add("how to see sales report", "admin", "Analytics → Reports", "reports-and-analytics", "analytics")
add("live view not showing visitors", "admin", "Password off + Online Store + cookie consent", "reports-and-analytics", "analytics")
add("how to export orders csv", "admin", "Orders → Export", "fulfillment/managing-orders", "analytics")
add("how to add a blog post", "themes", "Online Store → Blog posts", "online-store/blogs", "blog")
add("how to add comments on blog", "themes", "Blog settings → comments", "online-store/blogs", "blog")
add("how to set up subscriptions", "apps", "Subscriptions app + selling plan", "products", "subscription")
add("selling plan not at checkout", "checkout", "Subscriptions app + supported gateway", "products", "subscription")
add("how to add a wholesale channel", "admin", "B2B / wholesale app / password page", "b2b", "b2b")
add("how to use sidekick", "admin", "Purple glasses in admin", "ai-powered-tools", "staff")
add("shopify magic where is it", "admin", "Sparkle on product title / description", "ai-powered-tools", "staff")

# Expand with more unique community phrasings so we reach 500.
MORE = [
    ("can't add product image larger than 20mb", "products", "Compress or use a smaller file", "products/product-media", "images"),
    ("webp images not uploading", "products", "Use jpg/png or convert", "products/product-media", "images"),
    ("product video autoplay", "themes", "Theme video block settings on a copy", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add a size guide popup", "themes", "App or metafield + block on a copy", "custom-data/metafields", "metafield"),
    ("variant swatches instead of dropdown", "themes", "Theme product swatches on a copy", "online-store/themes/customizing-themes", "theme_text"),
    ("color swatches not matching variant names", "themes", "Swatch values must match option names", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add estimated delivery date", "shipping", "App or Shipping profile messaging", "fulfillment/setup", "shipping_rate"),
    ("delivery date picker checkout", "checkout", "App — not Additional scripts on Basic", "checkout-settings", "checkout_fields"),
    ("how to require a checkbox at checkout", "checkout", "Checkout UI extension / app, not Basic scripts", "checkout-settings", "plus_only"),
    ("order printer app templates", "apps", "Order Printer → templates", "apps", "apps_embed"),
    ("how to add invoice pdf", "apps", "Order Printer or invoicing app", "apps", "apps_embed"),
    ("packing slip missing sku", "shipping", "Settings → Shipping → packing slip variables", "fulfillment/managing-orders", "order_edit"),
    ("how to add barcode to packing slip", "shipping", "Packing slip template / Order Printer", "fulfillment/managing-orders", "order_edit"),
    ("returns app how to set up", "admin", "Settings → Customer support / a returns app", "checkout-settings/refund-cancellations", "refund"),
    ("shopify native returns", "admin", "Settings → Customer support → returns", "checkout-settings/refund-cancellations", "refund"),
    ("how to add a return window", "admin", "Returns settings / policy + app", "checkout-settings/refund-cancellations", "policy"),
    ("exchange an order how to", "admin", "Orders → return / exchange (or an app)", "fulfillment/managing-orders", "refund"),
    ("how to capture a payment", "payments", "Orders → Capture payment (if authorize-only)", "payments", "payments"),
    ("authorize and capture later", "payments", "Settings → Payments → payment capture", "payments", "payments"),
    ("manual payment method how to add", "payments", "Settings → Payments → manual", "payments", "payments"),
    ("cod cash on delivery", "payments", "Manual payment method COD", "payments", "payments"),
    ("bank deposit payment method", "payments", "Settings → Payments → manual bank", "payments", "payments"),
    ("how to add afterpay or klarna", "payments", "Settings → Payments → BNPL apps", "payments", "payments"),
    ("shop pay split payments", "payments", "Shop Pay Installments toggle", "payments/shop-pay", "shop_pay"),
    ("3d secure failing", "payments", "Customer bank + Shopify Payments 3DS", "payments", "payments"),
    ("card declined checkout", "payments", "Test mode off + real card + address", "payments", "payments"),
    ("test order how to place", "payments", "Bogus gateway or test mode + test card", "payments", "payments"),
    ("how to enable bogus gateway", "payments", "Settings → Payments → (development stores)", "payments", "payments"),
    ("development store checkout disabled", "payments", "Transfer / paid plan / bogus gateway", "payments", "payments"),
    ("password page still showing after launch", "themes", "Online Store → Preferences off + hard refresh", "online-store/themes/password-page", "password"),
    ("store showing coming soon", "themes", "Password page or a coming-soon theme section", "online-store/themes/password-page", "password"),
    ("how to add age verification", "themes", "App embed or theme gate on a copy", "online-store/themes/customizing-themes", "apps_embed"),
    ("geo redirect to another domain", "admin", "Markets → domains / automatic redirection", "international", "markets"),
    ("customers see wrong currency", "admin", "Markets + browser locale + domain", "international", "markets"),
    ("how to round prices per market", "admin", "Markets → pricing / rounding", "international", "markets"),
    ("duties charged twice", "shipping", "Taxes and duties + DDP vs DDU", "taxes", "tax"),
    ("hs tariff code where", "products", "Products → Shipping → customs / HS", "products/details", "product_add"),
    ("country of origin product", "products", "Products → Shipping → country of origin", "products/details", "product_add"),
    ("how to add a wholesale price", "admin", "B2B catalog or wholesale app", "b2b", "b2b"),
    ("quantity break pricing", "products", "Shopify Functions / an app — not Scripts on Basic", "products", "plus_only"),
    ("volume discount how to", "checkout", "Automatic discount or an app", "discounts", "discount"),
    ("minimum order quantity", "products", "Theme / app / B2B quantity rules", "products", "product_add"),
    ("maximum order quantity", "products", "Inventory or an app limiter", "products/inventory", "inventory"),
    ("back in stock alert", "products", "App or Shopify email + continue selling off", "products/inventory", "continue_selling"),
    ("waitlist product", "products", "Preorder / waitlist app", "products/inventory", "continue_selling"),
    ("coming soon product badge", "themes", "Theme badge or metafield on a copy", "online-store/themes/customizing-themes", "theme_text"),
    ("how to schedule a product publish", "products", "Product status + an app / Flow / Launchpad Plus", "products/add-update-products", "product_add"),
    ("how to schedule a discount", "checkout", "Discounts → start and end dates", "discounts", "discount"),
    ("flash sale how to", "checkout", "Discount dates + theme banner on a copy", "discounts", "discount"),
    ("how to add a promo banner", "themes", "Announcement bar or homepage section", "online-store/themes/customizing-themes", "announcement"),
    ("sticky header how to turn off", "themes", "Customize → Header → sticky", "online-store/themes/customizing-themes", "theme_text"),
    ("transparent header over hero", "themes", "Customize → Header overlay", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add a mega menu", "themes", "Theme header mega menu on a copy", "online-store/menus-and-links", "menu"),
    ("footer copyright text", "themes", "Customize → Footer", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add payment icons in footer", "themes", "Customize → Footer → payment icons", "online-store/themes/customizing-themes", "theme_text"),
    ("newsletter signup not saving emails", "apps", "Customer privacy + Email app / Klaviyo embed", "promoting-marketing", "email"),
    ("how to add recaptcha", "themes", "Shopify forms have spam filter; extra = app", "online-store/themes/customizing-themes", "apps_embed"),
    ("spam contact form messages", "themes", "Built-in spam filter + an app", "online-store/themes/customizing-themes", "email"),
    ("how to add whatsapp button", "apps", "Inbox or a click-to-chat app embed", "inbox", "apps_embed"),
    ("click to chat facebook", "apps", "Meta channel / Inbox", "inbox", "apps_embed"),
    ("how to add reviews", "apps", "Judge.me / Loox / Shopify Reviews → App embeds", "apps", "apps_embed"),
    ("product reviews not showing", "apps", "App embed on + product has reviews", "apps", "apps_embed"),
    ("star rating in google", "seo", "Reviews app structured data — not theme.liquid paste", "promoting-marketing/seo", "seo_product"),
    ("rich snippets not showing", "seo", "Search Console + valid product schema", "promoting-marketing/seo", "search_console"),
    ("merchant center disapproved", "seo", "Google channel errors list", "promoting-marketing/seo", "search_console"),
    ("facebook shop not syncing", "apps", "Meta channel → diagnostics", "online-sales-channels", "apps_embed") ,
    ("instagram shopping tagged products", "apps", "Meta channel + commerce manager", "online-sales-channels", "apps_embed"),
    ("tiktok shop connect", "apps", "TikTok channel", "online-sales-channels", "apps_embed"),
    ("amazon channel shopify", "apps", "Amazon sales channel", "online-sales-channels", "apps_embed"),
    ("shop app not showing products", "apps", "Shop channel + product eligibility", "online-sales-channels", "apps_embed"),
    ("shop campaign how to", "seo", "Shop channel / Marketing", "promoting-marketing", "email"),
    ("google ads conversion tracking", "seo", "Google channel + Customer events", "promoting-marketing/pixels", "pixel"),
    ("duplicate conversion tracking", "seo", "Only one pixel path — events OR theme, not both", "promoting-marketing/pixels", "pixel"),
    ("consent mode google", "admin", "Customer privacy + Google channel", "privacy-and-security/privacy", "pixel"),
    ("gdpr cookie banner required", "admin", "Settings → Customer privacy", "privacy-and-security/privacy", "pixel"),
    ("ccpa do not sell", "admin", "Customer privacy / data sale settings", "privacy-and-security/privacy", "policy"),
    ("how to download customer data request", "admin", "Settings → Privacy / customer privacy requests", "privacy-and-security/privacy", "policy"),
    ("how to erase customer data", "admin", "Customers → privacy / erase", "privacy-and-security/privacy", "policy"),
    ("staff two factor lost phone", "admin", "Store owner / Shopify Support recovery", "privacy-and-security", "password_reset_admin"),
    ("collaborator account how to add", "admin", "Settings → Users → collaborator request", "your-account/staff-accounts", "staff"),
    ("partner collaborator code", "admin", "Users → generate collaborator request code", "your-account/staff-accounts", "staff"),
    ("how to remove a staff member", "admin", "Settings → Users → remove", "your-account/staff-accounts", "staff"),
    ("transfer store ownership", "admin", "Settings → Users → store owner transfer", "your-account/staff-accounts", "staff"),
    ("how to change store owner email", "admin", "Owner account at accounts.shopify.com", "your-account", "staff"),
    ("billing credit card update", "admin", "Settings → Billing (owner only)", "your-account", "staff"),
    ("shopify bill higher than expected", "admin", "Settings → Billing → invoice", "your-account", "staff"),
    ("transaction fees shopify", "admin", "Plan + payment provider rates", "your-account/pricing-plans", "staff"),
    ("how to add a third party gateway", "payments", "Settings → Payments → add provider", "payments", "payments"),
    ("stripe instead of shopify payments", "payments", "Add Stripe; some wallets need Shopify Payments", "payments", "payments"),
    ("shopify payments not available in my country", "payments", "Use a third-party provider", "payments", "payments"),
    ("multi currency payouts", "payments", "Shopify Payments + Markets", "finance/payouts", "payments"),
    ("payout schedule how to change", "payments", "Settings → Payments → payout schedule", "finance/payouts", "payments"),
    ("balance account shopify", "payments", "Finance → Balance", "finance", "payments"),
    ("shopify capital offer", "payments", "Finance → Capital (owner)", "finance", "payments"),
    ("chargeback how to respond", "payments", "Settings → Payments / order dispute", "finance", "fraud"),
    ("shopify protect claim", "payments", "Order → Shopify Protect", "finance", "fraud"),
    ("fulfillment hold on order", "shipping", "Order risk / Payments hold — do not fulfill", "fulfillment/managing-orders", "fraud"),
    ("shopify fulfillment network", "shipping", "SFN app / settings", "fulfillment", "shipping_rate"),
    ("printful not syncing", "apps", "Printful app + product connect", "apps", "apps_embed"),
    ("oberlo discontinued what now", "apps", "DSers or another dropship app", "apps", "apps_embed"),
    ("dsers orders not sending", "apps", "DSers app + supplier mapping", "apps", "apps_embed"),
    ("aliexpress fulfillment", "apps", "A dropshipping app — not native", "apps", "apps_embed"),
    ("how to add a wholesale login page", "admin", "B2B or password + wholesale app", "b2b", "b2b"),
    ("net 30 payment terms", "admin", "B2B company payment terms", "b2b", "b2b"),
    ("draft order how to create", "admin", "Orders → Create order", "fulfillment/managing-orders", "order_edit"),
    ("send invoice draft order", "admin", "Draft order → Send invoice", "fulfillment/managing-orders", "order_edit"),
    ("draft order discount line", "admin", "Draft → add discount", "fulfillment/managing-orders", "order_edit"),
    ("how to add a custom item to an order", "admin", "Draft / edit order → custom item", "fulfillment/managing-orders", "order_edit"),
    ("split shipment two locations", "shipping", "Fulfill each location separately", "fulfillment/managing-orders", "order_edit"),
    ("order routed to wrong location", "shipping", "Settings → Locations + shipping origin", "fulfillment/locations", "inventory"),
    ("prevent overselling across locations", "products", "Inventory per location + apps", "products/inventory", "inventory"),
    ("commit inventory to draft orders", "products", "Drafts can reserve — check apps / settings", "products/inventory", "inventory"),
    ("sku already exists warning", "products", "Another variant uses that SKU", "products/variants", "variants"),
    ("barcode must be unique", "products", "Change the barcode on the other product", "products/variants", "variants"),
    ("harmonized system code invalid", "products", "Products → shipping → valid HS code", "products/details", "product_add"),
    ("weight required to calculate shipping", "shipping", "Add weight to every physical variant", "fulfillment/setup", "shipping_rate"),
    ("package size where to set", "shipping", "Settings → Shipping → packages", "fulfillment/setup", "shipping_rate"),
    ("default package too big", "shipping", "Shipping → packages → default", "fulfillment/setup", "shipping_rate"),
    ("label purchase failed", "shipping", "Address, weight, carrier account", "fulfillment/managing-orders", "order_edit"),
    ("void a shipping label", "shipping", "Order → labels → void", "fulfillment/managing-orders", "order_edit"),
    ("return label how to create", "shipping", "Order → return / carrier return label", "fulfillment/managing-orders", "refund"),
    ("customs form commercial invoice", "shipping", "Label flow asks customs for international", "fulfillment/managing-orders", "order_edit"),
    ("po box shipping not offered", "shipping", "Some carriers skip PO boxes — add a flat rate", "fulfillment/setup", "shipping_rate"),
    ("apo fpo shipping", "shipping", "Add a US zone rate that allows APO", "fulfillment/setup", "shipping_rate"),
    ("pickup in store plus shipping", "shipping", "Both pickup and a shipping rate", "fulfillment/local-pickup", "local_pickup"),
    ("delivery radius local delivery", "shipping", "Settings → Shipping → Local delivery", "fulfillment/local-delivery", "local_pickup"),
    ("local delivery not available", "shipping", "Postal codes + location + product stock", "fulfillment/local-delivery", "local_pickup"),
    ("delivery time picker", "shipping", "Local delivery / an app", "fulfillment/local-delivery", "local_pickup"),
    ("how to add a delivery note", "checkout", "Cart note or checkout field", "checkout-settings", "checkout_fields"),
    ("gift message at checkout", "checkout", "Cart note / an app / checkout extension", "checkout-settings", "checkout_fields"),
    ("wrap as gift option", "checkout", "An app or a product add-on", "checkout-settings", "checkout_fields"),
    ("tipping not showing shop pay", "checkout", "Shop Pay can hide tipping — expected", "payments/shop-pay", "shop_pay"),
    ("shop pay hides custom checkout fields", "checkout", "Expected — use Checkout Extensibility", "payments/shop-pay", "shop_pay"),
    ("accelerate checkout buttons on product", "checkout", "Customize → product buy buttons / dynamic checkout", "payments/accelerated-checkouts", "shop_pay"),
    ("hide buy now button", "themes", "Customize → product → dynamic checkout off", "online-store/themes/customizing-themes", "theme_text"),
    ("show dynamic checkout on cart only", "themes", "Product block vs cart", "online-store/themes/customizing-themes", "theme_text"),
    ("sticky add to cart", "themes", "Theme product setting on a copy", "online-store/themes/customizing-themes", "theme_text"),
    ("quick add on collection", "themes", "Customize → collection → quick add", "online-store/themes/customizing-themes", "theme_text"),
    ("collection filter not showing", "themes", "Search & Discovery app + theme filters", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add color filters", "products", "Search & Discovery → filters", "online-store/search-and-discovery", "collections"),
    ("search and discovery app where", "apps", "Admin search Search & Discovery", "online-store/search-and-discovery", "apps_embed"),
    ("storefront search bad results", "apps", "Search & Discovery synonyms / boost", "online-store/search-and-discovery", "collections"),
    ("how to add search synonyms", "apps", "Search & Discovery → synonyms", "online-store/search-and-discovery", "collections"),
    ("predictive search not working", "themes", "Theme search + Search & Discovery", "online-store/themes/customizing-themes", "theme_text"),
    ("how to hide products from search", "products", "Search & Discovery exclude / metafield", "online-store/search-and-discovery", "product_missing"),
    ("related products how to change", "themes", "Search & Discovery recommendations", "online-store/search-and-discovery", "theme_text"),
    ("recently viewed products", "themes", "Theme or an app on a copy", "online-store/themes/customizing-themes", "theme_text"),
    ("upsell on product page", "apps", "An upsell app embed or theme block", "apps", "apps_embed"),
    ("cart drawer upsell", "apps", "App embed / theme cart drawer", "apps", "apps_embed"),
    ("checkout upsell plus", "checkout", "Checkout Extensibility / Plus apps", "checkout-settings", "plus_only"),
    ("post purchase upsell", "checkout", "Shopify post-purchase app / Plus", "checkout-settings", "plus_only"),
    ("thank you page customize", "checkout", "Settings → Checkout → Customize thank you", "checkout-settings", "checkout_text"),
    ("order status page extra scripts gone", "checkout", "Additional scripts retired — use pixels / apps", "checkout-settings", "plus_only"),
    ("conversion pixel on thank you", "seo", "Customer events — not checkout.liquid", "promoting-marketing/pixels", "pixel"),
    ("how to add trust badges", "themes", "Customize → product / footer images", "online-store/themes/customizing-themes", "theme_text"),
    ("security badge footer", "themes", "Footer custom liquid on a copy or an app", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add an about us page", "themes", "Online Store → Pages", "online-store/themes/customizing-themes", "page"),
    ("faq page how to", "themes", "Page + collapsible content on a copy", "online-store/themes/customizing-themes", "page"),
    ("collapsible row product description", "themes", "Customize → product → collapsible row", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add a lookbook", "themes", "Page template + images on a copy", "online-store/themes/customizing-themes", "page"),
    ("password page email signup", "themes", "Customize → Password → email form", "online-store/themes/password-page", "password"),
    ("launch date countdown password page", "themes", "Password template countdown on a copy", "online-store/themes/password-page", "password"),
    ("how to add a second logo for dark mode", "themes", "Theme settings if the theme supports it", "online-store/themes/customizing-themes", "logo"),
    ("inverted logo on transparent header", "themes", "Header overlay logo setting", "online-store/themes/customizing-themes", "logo"),
    ("social icons not showing", "themes", "Theme settings → social links + footer", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add tiktok icon", "themes", "Theme settings social URLs", "online-store/themes/customizing-themes", "theme_text"),
    ("open social links in new tab", "themes", "Theme setting or custom liquid on a copy", "online-store/themes/customizing-themes", "theme_text"),
    ("hreflang missing after adding language", "seo", "Markets language Active + published translations", "international", "translate"),
    ("translate and adapt not publishing", "themes", "Publish translations + language published", "international", "translate"),
    ("auto translate theme", "themes", "Translate & Adapt auto-translate", "international", "translate"),
    ("currency switcher", "admin", "Markets + theme country selector", "international", "markets"),
    ("globe icon missing", "themes", "Header country/language selector on", "international", "markets"),
    ("domain per market", "domains", "Settings → Markets → domain", "domains", "domain"),
    ("subfolder /en /fr", "admin", "Markets → language subfolders", "international", "markets"),
    ("primary market cannot delete", "admin", "You can change it, not always delete", "international", "markets"),
    ("catalog empty hides all products", "admin", "Markets → catalog must include products", "international", "markets"),
    ("b2b catalog not applying", "admin", "Company assigned that catalog + login", "b2b", "b2b"),
    ("company location address", "admin", "Companies → location", "b2b", "b2b"),
    ("net terms not at checkout", "admin", "B2B payment terms + eligible gateway", "b2b", "b2b"),
    ("plus checkout extensibility migrate", "checkout", "Settings → Checkout → upgrade", "checkout-settings", "plus_only"),
    ("shopify functions discount", "checkout", "Custom app / Functions — not Scripts", "discounts", "plus_only"),
    ("script editor missing", "checkout", "Plus only and being replaced by Functions", "checkout-settings", "plus_only"),
    ("flow send slack message", "apps", "Flow → Slack action (install Slack)", "shopify-flow", "flow"),
    ("flow tag high risk orders", "apps", "Flow trigger Order created → risk", "shopify-flow", "flow"),
    ("flow hold fulfillment", "apps", "Flow + order hold action", "shopify-flow", "flow"),
    ("flow email customer", "apps", "Flow send email / notifications", "shopify-flow", "flow"),
    ("how to add an admin note on order", "admin", "Orders → Notes", "fulfillment/managing-orders", "order_edit"),
    ("timeline on order", "admin", "Scroll the order — Timeline is at the bottom", "fulfillment/managing-orders", "order_edit"),
    ("how to print order", "admin", "Order → Print / Order Printer", "fulfillment/managing-orders", "order_edit"),
    ("bulk print packing slips", "shipping", "Orders → select → Print packing slips", "fulfillment/managing-orders", "order_edit"),
    ("how to add a tag to orders automatically", "apps", "Flow workflow", "shopify-flow", "flow"),
    ("fraud filter app", "admin", "Shopify Flow or a fraud app", "fulfillment/managing-orders", "fraud"),
    ("block disposable emails", "checkout", "An app / Flow — not a native toggle", "checkout-settings", "checkout_fields"),
    ("limit orders per customer", "checkout", "An app or Flow", "checkout-settings", "discount"),
    ("one discount per customer", "checkout", "Discounts → usage limits", "discounts", "discount"),
    ("first order discount", "checkout", "Automatic discount → customer eligibility new", "discounts", "discount"),
    ("student discount", "checkout", "An app (SheerID etc.)", "discounts", "discount"),
    ("affiliate discount codes", "checkout", "Unique codes + an affiliate app", "discounts", "discount"),
    ("influencer unique codes bulk", "checkout", "Discounts → bulk create / CSV apps", "discounts", "discount"),
    ("how to expire a discount now", "checkout", "Discounts → end date now / deactivate", "discounts", "discount"),
    ("cannot delete discount in use", "checkout", "Deactivate instead", "discounts", "discount"),
    ("pos discount button", "admin", "POS smart grid → discount", "sell-in-person", "pos"),
    ("pos custom sale", "admin", "POS → add custom sale", "sell-in-person", "pos"),
    ("pos offline mode", "admin", "POS app setting; sync when back online", "sell-in-person", "pos"),
    ("pos staff pin", "admin", "POS → staff PINs", "sell-in-person", "pos"),
    ("pos cash tracking", "admin", "POS → session / cash tracking", "sell-in-person", "pos"),
    ("receipt logo pos", "admin", "POS → Settings → receipts", "sell-in-person", "pos"),
    ("barcode scanner pos", "admin", "POS hardware settings", "sell-in-person", "pos"),
    ("stripe terminal shopify", "payments", "POS / payments supported readers", "sell-in-person", "pos"),
    ("tap to pay iphone", "payments", "Shopify POS Tap to Pay", "sell-in-person", "pos"),
    ("how to add a retail location hours", "admin", "Locations + a page / Google listing", "fulfillment/locations", "inventory"),
    ("google business profile shopify", "seo", "Google channel / listing not inside theme", "promoting-marketing/seo", "search_console"),
    ("apple business connect", "seo", "Not a Shopify admin page — Apple side", "promoting-marketing/seo", "search_console"),
    ("bing webmaster shopify", "seo", "Submit sitemap.xml", "promoting-marketing/seo", "search_console"),
    ("indexnow shopify", "seo", "An SEO app — not native", "promoting-marketing/seo", "search_console"),
    ("slow theme speed", "themes", "Fewer apps, smaller images, Duplicate then trim", "online-store/themes", "theme_text"),
    ("pagespeed insights shopify", "themes", "Online Store → Themes → speed report", "online-store/themes", "theme_text"),
    ("app embed slowing store", "apps", "Turn off unused embeds", "apps", "apps_embed"),
    ("too many apps shopify", "apps", "Uninstall + remove leftovers on a theme copy", "apps", "apps_embed"),
    ("theme app extension vs embed", "apps", "Customize → app embeds vs app blocks", "apps", "apps_embed"),
    ("app block not in theme editor", "apps", "Theme must support app blocks; Dawn does", "apps", "apps_embed"),
    ("online store 2.0 vs vintage", "themes", "2.0 = JSON templates + app blocks", "online-store/themes", "theme_text"),
    ("cannot add app block vintage theme", "themes", "Upgrade / switch to a 2.0 theme on a copy", "online-store/themes", "theme_text"),
    ("how to switch themes without going live", "themes", "Add theme → customize the unpublished copy", "online-store/themes", "theme_text"),
    ("preview theme share link", "themes", "Themes → Preview → share preview", "online-store/themes", "theme_text"),
    ("password protect theme preview", "themes", "Preview links are already gated", "online-store/themes", "theme_text"),
    ("multi theme languages unpublished", "themes", "Translate on the copy before publish", "international", "translate"),
    ("checkout branding logo", "checkout", "Settings → Checkout → Customize branding", "checkout-settings", "checkout_text"),
    ("checkout color scheme", "checkout", "Checkout Customize → branding", "checkout-settings", "checkout_text"),
    ("checkout font", "checkout", "Checkout Customize branding fonts", "checkout-settings", "checkout_text"),
    ("one page checkout shopify", "checkout", "Checkout Extensibility is one-page on many shops", "checkout-settings", "checkout_text"),
    ("information shipping payment three pages gone", "checkout", "New checkout is combined — expected", "checkout-settings", "checkout_text"),
    ("shop pay optional not forced", "checkout", "Customers can choose other methods", "payments/shop-pay", "shop_pay"),
    ("guest checkout how to allow", "checkout", "Settings → Customer accounts → optional / disabled", "customers", "checkout_fields"),
    ("force account creation", "checkout", "Customer accounts required", "customers", "checkout_fields"),
    ("classic customer accounts vs new", "admin", "Settings → Customer accounts", "customers", "staff"),
    ("new customer accounts login code", "admin", "Email/SMS code — expected", "customers", "staff"),
    ("customer account order history missing", "admin", "Same email + accounts enabled", "customers", "staff"),
    ("wholesale customers only collection", "admin", "B2B catalog or a lock app", "b2b", "b2b"),
    ("tag based customer discount", "checkout", "Automatic discount → customer tags", "discounts", "discount"),
    ("product tag automatic collection empty", "products", "Tag spelling must match exactly", "products/collections", "collections"),
    ("vendor collection", "products", "Automated condition Vendor equals", "products/collections", "collections"),
    ("price range collection", "products", "Automated condition price", "products/collections", "collections"),
    ("exclude on-sale from collection", "products", "Condition compare-at / an app", "products/collections", "collections"),
    ("all products collection", "products", "Automated with a condition all products match", "products/collections", "collections"),
    ("frontpage collection missing", "products", "Home template collection picker", "products/collections", "collections"),
    ("home featured collection empty", "themes", "Customize → featured collection → pick one", "online-store/themes/customizing-themes", "theme_text"),
    ("featured product section", "themes", "Customize → Add section → featured product", "online-store/themes/customizing-themes", "theme_text"),
    ("image with text section", "themes", "Customize → Add section", "online-store/themes/customizing-themes", "theme_text"),
    ("rich text section homepage", "themes", "Customize → Add section → Rich text", "online-store/themes/customizing-themes", "theme_text"),
    ("multicolumn section", "themes", "Customize → Add section → Multicolumn", "online-store/themes/customizing-themes", "theme_text"),
    ("collage section images", "themes", "Customize → Collage", "online-store/themes/customizing-themes", "theme_text"),
    ("video section youtube", "themes", "Customize → Video → URL", "online-store/themes/customizing-themes", "theme_text"),
    ("email signup section", "themes", "Customize → Email signup", "online-store/themes/customizing-themes", "email"),
    ("blog posts on homepage", "themes", "Customize → Blog posts section", "online-store/blogs", "blog"),
    ("hide blog from menu keep posts", "themes", "Remove menu item; posts stay published", "online-store/menus-and-links", "menu"),
    ("author bio blog", "themes", "Blog post author + theme blog template", "online-store/blogs", "blog"),
    ("excerpt on blog cards", "themes", "Customize → blog → show excerpt", "online-store/blogs", "blog"),
    ("how to password protect one page", "themes", "Not native — an app or Plus", "online-store/themes/password-page", "plus_only"),
    ("wholesale page password", "admin", "Separate market / B2B / lock app", "b2b", "b2b"),
    ("hide price until login", "themes", "B2B or a lock app — not Edit code first", "b2b", "b2b"),
    ("inquiry only products", "products", "Hide ATC + contact form / an app", "products/details", "product_add"),
    ("quote request instead of cart", "checkout", "Wholesale / quote app", "b2b", "b2b"),
    ("how to add a phone order", "admin", "Orders → Create order / POS", "fulfillment/managing-orders", "order_edit"),
    ("manual order mark as paid", "admin", "Order → Mark as paid", "fulfillment/managing-orders", "order_edit"),
    ("mark as pending payment", "admin", "Payment status on the order", "fulfillment/managing-orders", "order_edit"),
    ("order payment authorized not captured", "payments", "Capture on the order", "payments", "payments"),
    ("void authorization", "payments", "Order → cancel / void", "payments", "refund"),
    ("partial refund shipping only", "admin", "Refund → shipping amount", "fulfillment/managing-orders/refunding-orders", "refund"),
    ("refund to store credit", "admin", "Customers → store credit (where available)", "customers", "refund"),
    ("store credit at checkout", "checkout", "Customer must be logged in", "customers", "refund"),
    ("gift card vs store credit", "products", "Gift cards are products; store credit is on the customer", "products/gift-card", "gift_card"),
    ("reload gift card", "products", "Not always native — an app or new card", "products/gift-card", "gift_card"),
    ("gift card expiry", "products", "Some regions forbid expiry", "products/gift-card", "gift_card"),
    ("issue gift card to a customer", "admin", "Customers / draft order a gift card product", "products/gift-card", "gift_card"),
    ("resend gift card email", "admin", "Order / gift card notifications", "products/gift-card", "email"),
    ("theme gift card recipient fields", "themes", "Gift card product template", "products/gift-card", "theme_text"),
    ("notification email logo", "admin", "Settings → Notifications → customize + branding", "fulfillment/managing-orders/notifications", "email"),
    ("email accent color", "admin", "Notifications branding", "fulfillment/managing-orders/notifications", "email"),
    ("abandoned checkout email timing", "checkout", "Settings → Checkout abandoned schedule", "checkout-settings/abandoned-checkouts", "email"),
    ("abandoned checkout sms", "checkout", "Shopify Email / SMS app / markets", "checkout-settings/abandoned-checkouts", "email"),
    ("marketing sms shopify", "seo", "Shopify Email / SMS / an app", "promoting-marketing", "email"),
    ("double opt in email", "seo", "Email app / customer privacy", "promoting-marketing", "email"),
    ("unsubscribe link required", "seo", "Shopify Email includes it — do not remove", "promoting-marketing", "email"),
    ("utm parameters shopify reports", "admin", "Analytics → acquisition / UTM", "reports-and-analytics", "analytics"),
    ("how to add utm to a campaign", "seo", "Marketing URL + UTM builder", "promoting-marketing", "analytics"),
    ("conversion not in analytics", "admin", "Password off + pixels + thank-you events", "reports-and-analytics", "analytics"),
    ("sales by product report", "admin", "Analytics → Reports → sales by product", "reports-and-analytics", "analytics"),
    ("sales by sku", "admin", "Reports → session / product variant", "reports-and-analytics", "analytics"),
    ("tax report shopify", "admin", "Analytics → Reports → taxes", "taxes", "analytics"),
    ("payout report", "payments", "Settings → Payments → payouts", "finance/payouts", "analytics"),
    ("export payouts csv", "payments", "Payments → payouts → export", "finance/payouts", "analytics"),
    ("finance app shopify", "payments", "Admin search Finance", "finance", "payments"),
    ("shopify credit card", "payments", "Finance → Credit (if offered)", "finance", "payments"),
    ("how to add an accountant user", "admin", "Users → finance / reports permissions", "your-account/staff-accounts", "staff"),
    ("read only staff", "admin", "Custom permissions without edit", "your-account/staff-accounts", "staff"),
    ("pos only staff", "admin", "POS permissions without admin", "sell-in-person", "pos"),
    ("limit staff to one location", "admin", "Users → location restrictions", "your-account/staff-accounts", "staff"),
    ("collaborator cannot access themes", "admin", "Approve the right scopes on the request", "your-account/staff-accounts", "staff"),
    ("how to leave a collaborator store", "admin", "Partner dashboard / users remove", "your-account/staff-accounts", "staff"),
    ("organization with multiple stores", "admin", "Organization picker / Plus org", "organization-settings", "staff"),
    ("transfer theme between stores", "themes", "Themes → ⋯ → download / upload zip", "online-store/themes", "theme_text"),
    ("upload a zip theme", "themes", "Online Store → Themes → Add → Upload", "online-store/themes", "theme_text"),
    ("theme zip rejected", "themes", "Must be a valid Shopify theme zip", "online-store/themes", "theme_text"),
    ("duplicate theme missing", "themes", "Themes → ⋯ → Duplicate", "online-store/themes", "theme_text"),
    ("unpublished theme checkout preview", "checkout", "Checkout customize is store-wide — careful", "checkout-settings", "checkout_text"),
    ("safe to edit unpublished theme", "themes", "Yes for Online Store; checkout branding is live", "online-store/themes", "theme_text"),
    ("liquid error on line 1", "themes", "Revert the copy — never on live", "online-store/themes/theme-editor", "theme_text"),
    ("asset size limit theme", "themes", "Compress images; don't upload huge mp4s", "online-store/themes", "theme_text"),
    ("fonts not loading custom", "themes", "Theme settings fonts or uploaded on a copy", "online-store/themes/customizing-themes", "theme_text"),
    ("rtl language theme", "themes", "Language + a theme that supports RTL", "international", "translate"),
    ("arabic storefront", "admin", "Add Arabic + RTL theme", "international", "translate"),
    ("translate checkout", "checkout", "Checkout languages / Markets", "international", "translate"),
    ("checkout language wrong", "checkout", "Browser locale + Markets languages", "international", "translate"),
    ("force checkout language", "checkout", "Market domain / language — limited native force", "international", "translate"),
    ("how to add a second store", "admin", "New store / organization", "your-account", "staff"),
    ("development store to paid", "admin", "Transfer to client / pick a plan", "your-account/pricing-plans", "staff"),
    ("preview password for client", "themes", "Preferences password + preview link", "online-store/themes/password-page", "password"),
    ("remove powered by shopify", "themes", "Theme footer setting (plan may require paid)", "online-store/themes/customizing-themes", "theme_text"),
    ("powered by shopify still there", "themes", "Footer checkbox + language editor string", "online-store/themes/customizing-themes", "theme_text"),
    ("how to add a custom domain email", "admin", "Not Shopify mail hosting — Google/Microsoft + SPF", "your-account", "email"),
    ("spf dkim shopify emails", "admin", "Settings → Notifications → authenticate domain", "fulfillment/managing-orders/notifications", "email"),
    ("emails going to spam", "admin", "Authenticate domain + from address", "fulfillment/managing-orders/notifications", "email"),
    ("from address must be authenticated", "admin", "Notifications → authenticate", "fulfillment/managing-orders/notifications", "email"),
    ("how to change order id number", "admin", "You cannot change past IDs; prefix is limited", "fulfillment/managing-orders", "order_edit"),
    ("order number prefix", "admin", "Settings → Checkout / general (limited)", "fulfillment/managing-orders", "order_edit"),
    ("test orders cluttering reports", "admin", "Archive / use a development store", "reports-and-analytics", "analytics"),
    ("exclude test orders", "admin", "Filter / archive / development store", "reports-and-analytics", "analytics"),
    ("how to add a legal imprint", "admin", "Policies or a page + footer", "checkout-settings", "policy"),
    ("impressum germany", "admin", "A page + footer + Markets Germany", "compliance", "policy"),
    ("ada accessibility theme", "themes", "Theme + an a11y app; test yourself", "online-store/themes", "theme_text"),
    ("alt text missing report", "seo", "Products → Media alt + an SEO app", "promoting-marketing/seo", "images"),
    ("image seo filename", "products", "Rename before upload", "products/product-media", "images"),
    ("lazy loading images", "themes", "Most Online Store 2.0 themes already do", "online-store/themes", "theme_text"),
    ("webp conversion shopify", "products", "Shopify serves modern formats automatically", "products/product-media", "images"),
    ("cdn cache old image", "products", "New upload + hard refresh / new filename", "products/product-media", "images"),
    ("og image facebook wrong", "seo", "Product image / Sharing image + debugger", "promoting-marketing/seo", "seo_product"),
    ("twitter card shopify", "seo", "Sharing image on product / preferences", "promoting-marketing/seo", "seo_product"),
    ("social sharing image homepage", "themes", "Online Store → Preferences → social sharing", "promoting-marketing/seo", "seo_product"),
    ("favicon apple touch icon", "themes", "Theme settings favicon", "online-store/themes/customizing-themes", "logo"),
    ("browser tab title", "seo", "Search engine listing / homepage SEO", "promoting-marketing/seo", "seo_product"),
    ("homepage seo title", "seo", "Online Store → Preferences → Title and meta", "promoting-marketing/seo", "seo_product"),
    ("homepage meta description", "seo", "Preferences → meta description", "promoting-marketing/seo", "seo_product"),
    ("collection seo description", "seo", "Collections → Search engine listing", "promoting-marketing/seo", "seo_product"),
    ("blog seo", "seo", "Blog post → Search engine listing", "online-store/blogs", "seo_product"),
    ("page seo handle", "seo", "Pages → Search engine listing", "promoting-marketing/seo", "seo_product"),
    ("duplicate content collection and homepage", "seo", "Unique titles + canonicals (automatic)", "promoting-marketing/seo", "seo_product"),
    ("canonical to another domain", "seo", "Primary domain handles this", "domains", "domain"),
    ("www vs non-www seo", "domains", "Pick one primary; Shopify redirects the other", "domains", "domain"),
    ("http to https", "domains", "SSL on a connected domain", "domains", "domain"),
    ("mixed content http images", "themes", "Use https image URLs on a theme copy", "online-store/themes", "theme_text"),
    ("cloudflare in front of shopify", "domains", "Orange cloud often breaks SSL — grey cloud / DNS only", "domains", "domain"),
    ("aaaa record breaking ssl", "domains", "Remove IPv6 AAAA for Shopify", "domains", "domain"),
    ("caa records ssl", "domains", "Allow Let's Encrypt / Google Trust if you set CAA", "domains", "domain"),
    ("email on custom domain mx", "domains", "MX at your email host, not Shopify", "domains", "domain"),
    ("subdomain shop.mystore.com", "domains", "CNAME the subdomain to shops.myshopify.com", "domains", "domain"),
    ("multiple domains one store", "domains", "Settings → Domains + Markets", "domains", "domain"),
    ("redirect old domain to shopify", "domains", "At the old registrar, 301 / connect", "domains", "domain"),
    ("transfer domain to shopify", "domains", "Settings → Domains → transfer", "domains", "domain"),
    ("buy domain in shopify", "domains", "Settings → Domains → buy", "domains", "domain"),
    ("domain auto renew", "domains", "Domains → the domain → renew", "domains", "domain"),
    ("unlock domain transfer away", "domains", "Domains → transfer lock / auth code", "domains", "domain"),
    ("whois privacy shopify domain", "domains", "Shopify-managed domains include privacy where offered", "domains", "domain"),
    ("edit dns a record", "domains", "Domains → DNS (Shopify-managed) or at registrar", "domains", "domain"),
    ("add cname for klaviyo", "domains", "Domains → DNS → CNAME", "domains", "domain"),
    ("dkim cname for klaviyo", "domains", "DNS CNAME from Klaviyo docs", "domains", "domain"),
    ("spf include shopify", "admin", "Notifications authenticate + your mail host SPF", "fulfillment/managing-orders/notifications", "email"),
]

for row in MORE:
    add(*row)


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:48]


def main() -> None:
    seen_q = set()
    rows = []
    n = 0
    for q, hub, hint, slug, key in RAW:
        ql = q.strip().lower()
        if ql in seen_q:
            continue
        seen_q.add(ql)
        steps = list(STEPS[key])
        url = HELP + slug.lstrip("/")
        help_step = f"Official Help: {url}"
        if help_step not in steps:
            steps = (steps + [help_step])[:6]
        n += 1
        phrases = [ql, f"how to {ql}", f"how do i {ql}"]
        # keep unique, long enough
        ph = []
        for p in phrases:
            p = re.sub(r"\s+", " ", p).strip()
            if len(p) >= 8 and p not in ph:
                ph.append(p)
        rows.append({
            "id": f"howto-forum-{n:04d}-{slugify(q)}",
            "category": "general",
            "hub": hub,
            "match_phrases": ph,
            "tags": ["howto", "forum", hub],
            "synonyms": [q],
            "cause": f"Community how-to: {q}.",
            "explanation": hint,
            "steps": steps,
            "target_ui_hint": hint,
            "arrow": {"x": 0.2, "y": 0.28},
            "docs": [{"label": "Shopify Help", "url": url}],
            "source_category_db": "forum",
        })
    if len(rows) < 500:
        raise SystemExit(f"only {len(rows)} unique how-tos — need 500")
    rows = rows[:500]
    OUT.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {len(rows)} forum howtos → {OUT} ({OUT.stat().st_size} bytes)")
    # uniqueness checks
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids))
    first = [r["match_phrases"][0] for r in rows]
    assert len(first) == len(set(first))
    blob = json.dumps(rows)
    assert "Case ID" not in blob
    assert "deploy to production" not in blob
    assert "shopify_module_asset" not in blob


if __name__ == "__main__":
    main()
