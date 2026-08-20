#!/usr/bin/env python3
"""Build data/issues.json from the 150-row CSV + real admin click paths.

Not a 1500-row modulo spinner. One playbook per ranked issue.
Critical/High get unique walkthroughs. Medium/Low get unique path + context.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "categories.csv"
OUT = ROOT / "data" / "issues.json"

HUB = {
    "Payments": "payments",
    "Checkout": "payments",
    "Theme": "themes",
    "Catalog": "products",
    "Integrations": "apps",
    "Admin": "admin",
}

BRANDS = [
    "paypal", "klarna", "affirm", "shop pay", "apple pay", "google pay",
    "avalara", "taxjar", "klaviyo", "mailchimp", "printful", "printify",
    "dsers", "zendrop", "cj dropshipping", "yotpo", "loox", "judge.me",
    "gorgias", "zendesk", "hubspot", "salesforce", "netsuite", "sap",
    "quickbooks", "algolia", "klevu", "loop returns", "returnly", "smile.io",
    "recharge", "shopify payments", "shopify pos", "shopify capital",
    "instagram", "tiktok", "facebook", "pinterest", "google merchant",
    "godaddy", "cloudflare", "google maps", "youtube", "vimeo",
    "zapier", "amazon", "ebay", "multipass", "bogus gateway",
]

STOP = {
    "the", "and", "or", "of", "a", "an", "to", "for", "in", "on", "with",
    "from", "into", "at", "by", "is", "are", "be", "as", "&", "vs",
}

PATH = {
    1: "Settings > Payments",
    2: "Settings > Checkout",
    3: "Settings > Markets",
    4: "Settings > Payments",
    5: "Settings > Checkout",
    6: "Discounts",
    7: "Settings > Payments",
    8: "Settings > Shipping and delivery",
    9: "Settings > Shipping and delivery",
    10: "Settings > Taxes and duties",
    11: "Customers > Companies",
    12: "Products > [product] > Digital",
    13: "Products > Gift cards",
    14: "Point of Sale",
    15: "Settings > Checkout",
    16: "Settings > Payments",
    17: "status.shopify.com",
    18: "Settings > Payments",
    19: "Settings > Checkout",
    20: "Settings > Domains",
    21: "Online Store > Themes > Customize",
    22: "Orders > [order] > Refund",
    23: "Settings > Checkout",
    24: "Settings > Taxes and duties",
    25: "Orders > [order]",
    26: "Settings > Customer accounts",
    27: "Settings > Payments",
    28: "Discounts",
    29: "Settings > Languages",
    30: "Settings > Customer privacy",
    31: "Online Store > Themes",
    32: "Online Store > Themes > Customize",
    33: "Online Store > Themes > Customize",
    34: "Online Store > Themes > Customize",
    35: "Online Store > Themes > Customize",
    36: "Online Store > Themes > Customize",
    37: "Online Store > Navigation",
    38: "Online Store > Themes",
    39: "Online Store > Navigation > Search & Discovery",
    40: "Online Store > Themes",
    41: "Online Store > Themes > Customize",
    42: "Online Store > Themes > Customize",
    43: "Products > [product] > Variants",
    44: "Online Store > Themes > Customize",
    45: "Online Store > Themes > Customize",
    46: "Online Store > Themes > Customize",
    47: "Online Store > Themes",
    48: "Online Store > Themes > Customize",
    49: "Online Store > Navigation",
    50: "Online Store > Themes > Customize",
    51: "Online Store > Themes > Customize",
    52: "Online Store > Themes > Customize",
    53: "Online Store > Themes > Customize",
    54: "Settings > Search & Discovery",
    55: "Online Store > Themes > Customize",
    56: "Online Store > Themes > Customize",
    57: "Online Store > Themes > Customize",
    58: "Online Store > Themes > Customize",
    59: "Online Store > Themes > Customize",
    60: "Online Store > Themes > Customize",
    61: "Products > [product] > Variants",
    62: "Products > Import",
    63: "Settings > Custom data",
    64: "Settings > Locations",
    65: "Products > [product]",
    66: "Products > Collections",
    67: "Products > [collection] > Bulk editor",
    68: "Products > [product] > Inventory",
    69: "Products > [product]",
    70: "Products",
    71: "Settings > Custom data",
    72: "Products > [product]",
    73: "Products > [product] > Variants",
    74: "Products > [product] > Variants",
    75: "Products > [product]",
    76: "Products > [product]",
    77: "Products > [product] > Media",
    78: "Products > [bundle]",
    79: "Products > Archived",
    80: "Products > [product]",
    81: "Products > [product] > Shipping",
    82: "Products > [product]",
    83: "Products > [product] > Variants",
    84: "Products > [product] > Search engine listing",
    85: "Products > Collections",
    86: "Discounts",
    87: "Products > [product]",
    88: "Settings > Checkout",
    89: "Products > Inventory > Transfers",
    90: "Products > [product]",
    91: "Online Store > Themes > Customize > App embeds",
    92: "Settings > Customer events",
    93: "Settings > Apps and sales channels",
    94: "Settings > Apps and sales channels",
    95: "Settings > Notifications",
    96: "Settings > Notifications",
    97: "Settings > Apps and sales channels",
    98: "Online Store > Themes > Customize > App embeds",
    99: "Settings > Apps and sales channels",
    100: "Settings > Apps and sales channels",
    101: "Settings > Apps and sales channels",
    102: "Online Store > Themes > Customize > App embeds",
    103: "Settings > Apps and sales channels",
    104: "Settings > Apps and sales channels",
    105: "Settings > Customer privacy",
    106: "Settings > Apps and sales channels",
    107: "Online Store > Pages",
    108: "Settings > Apps and sales channels",
    109: "Online Store > Themes > Customize > App embeds",
    110: "Settings > Apps and sales channels",
    111: "Settings > Apps and sales channels",
    112: "Online Store > Themes > Customize",
    113: "Online Store > Themes > Customize > App embeds",
    114: "Customers > Companies",
    115: "Settings > Search & Discovery",
    116: "Orders > [order] > Edit",
    117: "Settings > Taxes and duties",
    118: "Settings > Apps and sales channels",
    119: "Online Store > Themes > Customize > App embeds",
    120: "Point of Sale > Settings",
    121: "Settings > Domains",
    122: "Online Store > Navigation > URL redirects",
    123: "Online Store > Preferences",
    124: "Settings > Users and permissions",
    125: "Online Store > Preferences",
    126: "Settings > Users and permissions",
    127: "Settings > Markets",
    128: "Settings > Customer privacy",
    129: "Settings > Users and permissions",
    130: "Settings > Billing",
    131: "Online Store > Preferences",
    132: "Settings > Languages",
    133: "Settings > Customer privacy",
    134: "Settings > Users and permissions",
    135: "Settings > Domains",
    136: "Settings > Billing",
    137: "Settings > Plan",
    138: "Online Store > Preferences",
    139: "Settings > Policies",
    140: "Settings > Apps and sales channels",
    141: "Analytics > Reports",
    142: "Settings > Payments",
    143: "Customers",
    144: "Settings > Taxes and duties",
    145: "Online Store > Themes",
    146: "Settings > Users and permissions",
    147: "Settings > Apps and sales channels > Develop apps",
    148: "Settings > Payments",
    149: "Settings > Markets",
    150: "status.shopify.com",
}

# Unique next-click walkthroughs. Critical/High are fully specific.
# Theme rows always duplicate first. Some rows STOP instead of fake a fix.
STEPS = {
    1: [
        "Go to Settings → Payments. Read the banner — it names the provider that failed to connect.",
        "Open Shopify Payments (or PayPal / the third-party provider) and finish any identity or bank step it asks for.",
        "Turn Test mode off if this is a live shop. Confirm a credit-card provider is Active — PayPal alone is not enough.",
        "Retry as the store owner in an incognito window so a staff permission is not blocking Payments.",
        "Place a $1 test order, then refund it. Copy these steps to a friend if they are stuck.",
    ],
    2: [
        "Stop. Checkout.liquid upgrades break live checkout if you paste old code. Do not Edit code on the published theme.",
        "Go to Settings → Checkout. If Shopify offers Checkout extensibility / additional scripts, use that — not checkout.liquid.",
        "Online Store → Themes → Duplicate the live theme. Work only on the copy.",
        "On the copy, remove leftover checkout.liquid apps. Preview a test checkout before you publish.",
        "If checkout is already down, unpublish the last theme and roll back to the duplicate. Then ask the app vendor — not Liquid paste.",
    ],
    3: [
        "Go to Settings → Markets. Open the market whose currency looks wrong.",
        "Prices and rounding live here, not in the theme. Check the market currency, included/excluded tax, and price rounding.",
        "Products → [product]: confirm it is included in that market and has a price in that currency (or conversion is on).",
        "Do not Edit code to force a currency symbol. That fights Markets.",
        "Preview the storefront with that market (or a VPN/incognito to that country), then a $1 test checkout.",
    ],
    4: [
        "Go to Settings → Payments and open the subscription / recurring app (or Shopify Subscriptions).",
        "Failed renewals are usually a stored card or a paused contract — not the theme.",
        "Orders → find a failed renewal. Read the Timeline for the gateway message (expired card, 3-D Secure, test mode).",
        "Customers → [customer] → payment methods. Ask them to update the card, or retry the billing attempt in the subscription app.",
        "Turn Test mode off. Place a $1 subscription test, then cancel/refund it.",
    ],
    7: [
        "Go to Settings → Payments. Open Fraud analysis / Shopify Protect settings.",
        "Open the blocked order → Timeline. Note whether Shopify, the gateway, or a fraud app declined it.",
        "If the customer is real, you can capture or mark it as safe — do not turn all fraud filters off.",
        "If a fraud app is extra-strict, disable that app embed first and retest one order.",
        "Never whitelist the world. Copy the Timeline message if you ask a friend for help.",
    ],
    8: [
        "Go to Settings → Shipping and delivery → Manage rates.",
        "The customer's country must sit in exactly one zone that has a rate. Overlaps hide carrier rates.",
        "If you use a carrier (UPS, FedEx, Shopify Shipping), test with the same city and postal code in a draft order.",
        "Add a fallback flat rate so a carrier API blip cannot zero out checkout.",
        "Temporarily disable shipping apps and retry. Missing product weight also drops rates — check the product.",
    ],
    10: [
        "Go to Settings → Taxes and duties. Read any banner about registrations or Avalara.",
        "Collecting in a region requires a tax registration there. Wrong region = wrong checkout total.",
        "If Avalara or TaxJar is installed, open that app. A disconnected tax app overrides Shopify's math.",
        "Do not Edit code to change tax. Use tax settings or the tax app.",
        "Preview checkout with that country/postal code using a draft order, then a $1 test.",
    ],
    11: [
        "Go to Customers → Companies. Open the company whose draft order failed.",
        "B2B prices and net terms live on the catalog / payment terms — not in the theme.",
        "Draft orders → create one for that company. Confirm the location, catalog, and payment terms.",
        "Checkout as that company contact in incognito. Staff accounts cannot always complete B2B checkout.",
        "If net terms are missing, set them on the company, not on the product.",
    ],
    14: [
        "Open the Shopify POS app on the device, not only admin in a browser.",
        "Point of Sale → Settings on that location. Confirm the location and the card reader are assigned.",
        "Reconnect the reader (Bluetooth / USB). A payment that 'drops' is often the hardware handshake, not Payments settings.",
        "Settings → Payments: POS must be allowed for that location.",
        "Run a $1 POS sale, then refund it. If it still fails, swap the reader cable before changing checkout.",
    ],
    16: [
        "Go to Settings → Payments. Open Klarna, Affirm, or Shop Pay Installments — whichever hangs.",
        "Check that provider's own status page as well as Shopify. A spinning confirmation is often the BNPL, not your theme.",
        "Turn Test mode off. BNPL test credentials on a live shop hang forever.",
        "Customize → App embeds: disable other checkout apps, then retry one BNPL order.",
        "Place a small test, then refund. If the provider is down, wait — do not paste checkout Liquid.",
    ],
    17: [
        "Stop editing the theme. Flash-sale 'no checkout' is often Shopify under load, not your code.",
        "Open status.shopify.com and the payment provider status page first.",
        "Settings → Checkout: do not add queue-buster apps or scripts during a spike.",
        "If checkout.liquid or extra scripts were added today, Duplicate the theme and roll back the copy.",
        "Wait out the spike. Then a $1 test. Copy these steps — do not 'fix' it with Edit code.",
    ],
    20: [
        "Go to Settings → Domains. The checkout host must show Connected with a padlock — not 'pending'.",
        "If SSL is pending, wait. Adding extra CNAME/CAA 'fixes' in GoDaddy or Cloudflare often delays it more.",
        "Checkout on the custom domain in incognito. A browser warning is the cert, not a button style.",
        "Do not force HTTPS in the theme. Shopify issues the checkout certificate.",
        "If it has been more than 48 hours, Shopify Support — not Edit code.",
    ],
    22: [
        "Open the order → Refund. Read the Timeline for a gateway timeout.",
        "Partial refunds fail when the original capture is still pending — wait, then retry once.",
        "Restock is a checkbox on the refund. If stock did not return, the location on the refund was wrong.",
        "Do not refund twice. If the gateway timed out, check the order Timeline and the provider dashboard before a second refund.",
        "Settings → Locations: refund restock must hit the location that fulfilled it.",
    ],
    24: [
        "Go to Settings → Taxes and duties. Turn on duties / import taxes if you sell DDP.",
        "Products need a country of origin and an HS code or duties cannot calculate.",
        "Markets: the destination country must be in a market that charges duties.",
        "Carrier and duty apps can override Shopify — disable one and retest a draft order to that country.",
        "Preview landed cost at checkout with that country before changing the theme.",
    ],
    25: [
        "Open the order. If payment is Authorized but not Paid, the capture window can expire.",
        "Capture the payment from the order before you fulfill — or turn on auto-capture in Settings → Payments.",
        "Manual capture shops must capture before the card authorization expires (often 7 days).",
        "Do not fulfill an expired authorization and hope. You will need a new payment from the customer.",
        "Settings → Payments → capture method: Automatic is safer if the warehouse is slow.",
    ],
    28: [
        "Go to Discounts (or B2B catalogs / quantity breaks app).",
        "Quantity breaks do not live in theme Liquid. If prices do not drop at 10+, the discount or catalog is wrong.",
        "Check stacking: another automatic discount may block the volume break.",
        "Draft order or incognito checkout with 10 units. Watch the line price, not only the cart drawer.",
        "If an app draws the table, disable other discount apps and retest.",
    ],
    30: [
        "Go to Settings → Customer privacy. A cookie banner that blocks scripts can kill checkout tracking — and some pay buttons.",
        "Set marketing cookies to load after consent, not to block Shopify checkout scripts.",
        "Customize → App embeds: disable extra cookie apps if two banners are fighting.",
        "Test checkout in incognito with cookies blocked, then with cookies allowed.",
        "Do not paste a third cookie snippet into theme.liquid.",
    ],
    31: [
        "Online Store → Themes. Duplicate the live theme. Do not Edit code on the published theme.",
        "If the admin says “Theme has errors”, open the duplicate → Edit code only there, or roll back to the last good theme.",
        "Missing {% endif %} / {% endfor %} blanks the storefront. Fix on the copy, then Preview.",
        "Apps that inject Liquid are a common cause — disable the newest app embed and Preview again.",
        "Publish the copy only when Preview is clean. Never paste a 'quick fix' into the live shop.",
    ],
    32: [
        "Online Store → Themes → Customize on a duplicate, not the live theme.",
        "If a section will not save, the JSON template is corrupted. Duplicate first.",
        "Remove the last section you added. Save. If Customize loads, that section's app or preset is the culprit.",
        "Do not paste JSON from a forum into the live templates folder.",
        "Preview, then publish the copy only.",
    ],
    34: [
        "Online Store → Themes → Customize → App embeds. Cart drawers freeze when two cart apps run.",
        "Disable the newest cart / upsell embed. Preview add-to-cart on mobile.",
        "Duplicate the theme before any Edit code. Most drawer bugs are an app, not Liquid.",
        "Test in incognito so an old service worker is not holding a broken cart.js.",
        "If it still spins, roll back the theme. Do not stack a third cart app.",
    ],
    40: [
        "Online Store → Themes. Duplicate the live theme before you tap Update.",
        "OS 2.0 updates overwrite customized sections if you update the live theme in place.",
        "Update the duplicate, Preview, then publish. Keep the old theme unpublished as a rollback.",
        "Custom apps that relied on old section IDs may vanish — turn their embeds back on in Customize.",
        "Never update production and Edit code in the same hour.",
    ],
    61: [
        "Open the product. Shopify allows 3 options and 100 variants — not more.",
        "Do not install an app that 'unlocks' a 4th option and expect checkout to stay stable.",
        "Split the product (e.g. by fabric) so each listing stays under 100 variants.",
        "Delete unused variant combinations rather than hiding them in the theme.",
        "Save, then add to cart in incognito. Copy these steps if a friend hits the 100 cap.",
    ],
    62: [
        "Products → Export a fresh CSV first. Do not re-upload yesterday's file.",
        "Open it in Google Sheets (not Word). UTF-8. Handle, Title, Variant SKU, Variant Inventory Qty as columns.",
        "Quantities must be numbers — never blank, never 'n/a'. Trailing commas break the import.",
        "Products → Import → upload → Review. Fix the row numbers Shopify flags before you confirm.",
        "Import a 2-row test file first. Then the full sheet.",
    ],
    63: [
        "Go to Settings → Custom data → Metaobjects. Find the broken reference.",
        "If a product points at a deleted metaobject, the storefront field goes blank — that is data, not CSS.",
        "Re-link the reference on the product, or restore the metaobject entry.",
        "Do not Edit code to hard-code the missing text.",
        "Preview the product. Copy the metaobject name if you ask a friend.",
    ],
    64: [
        "Go to Settings → Locations. Note Available vs On hand at the fulfilling location.",
        "Checkout uses the location that will fulfill — not the sum of every warehouse.",
        "Products → Inventory: set the right location. Incoming transfers are not Available until received.",
        "POS and online can share a location and steal stock from each other — that is expected.",
        "Save, then a draft order from that location.",
    ],
    68: [
        "Open the product → Inventory. If “Continue selling when out of stock” is on, Shopify will oversell.",
        "Turn it off unless you truly backorder. Save.",
        "Check every variant — the setting is per variant.",
        "Apps that hide “sold out” on the storefront do not stop checkout. Inventory policy does.",
        "Test add-to-cart at quantity 0 in incognito.",
    ],
    73: [
        "Open the product → variant barcode. Shopify blocks save when two variants share a UPC/EAN.",
        "Search products for that barcode. Change one of them. Empty is OK; duplicates are not.",
        "CSV imports often copy the same UPC down a column — fix the sheet, then re-import those rows.",
        "Do not Edit code. This is catalog data.",
        "Save. The red toast should clear.",
    ],
    78: [
        "Open the bundle product. Bundles must consume inventory of the child SKUs.",
        "If the bundle app is disconnected, Shopify sells the parent forever and children never decrement.",
        "Settings → Apps: open the bundle app and re-sync. Confirm each child is tracked.",
        "Do not duplicate the parent as a fake bundle in Liquid.",
        "Place a test order for the bundle and check child On hand.",
    ],
    81: [
        "Open the product → Shipping. Add a country of origin and an HS code for cross-border.",
        "Missing HS codes block duties and some carriers — not the theme.",
        "Use the same HS code family on similar products so Markets can calculate.",
        "Save, then a draft order to a duty-charging country.",
        "Do not paste HS codes into theme.liquid.",
    ],
    91: [
        "Online Store → Themes → Customize → App embeds. Two apps injecting the same script freeze the storefront.",
        "Turn off the newest embed. Preview. Repeat one at a time — last installed is the usual culprit.",
        "After uninstalling an app, check embeds again for leftovers.",
        "Duplicate the theme before any Edit code. Do not delete random lines from theme.liquid to 'clean' scripts.",
        "When Preview is stable, publish the copy.",
    ],
    92: [
        "Go to Settings → Customer events (and the Meta / Google pixels).",
        "Purchase events need the Thank-you page / checkout pixel, not only a theme snippet.",
        "If a privacy banner blocks marketing cookies, Meta will not see the order — fix consent, do not double-install the pixel.",
        "Remove duplicate pixels (theme snippet + app + customer events).",
        "Run a $1 order, refund it, and check the pixel helper. Copy these steps to a friend.",
    ],
    93: [
        "This is the ERP/CRM app hitting Shopify's API limit — not a button you tap in the theme.",
        "Settings → Apps and sales channels: open the sync app. Pause extra jobs (full catalog every 5 minutes).",
        "Ask the app to use GraphQL bulk operations, or sync at night.",
        "Do not create a second custom app with the same jobs — that doubles the throttle.",
        "Wait 15 minutes after pausing, then retry one product sync.",
    ],
    94: [
        "Settings → Apps → open DSers, Zendrop, or CJ. Tracking lives in that app, not in Shopify Shipping.",
        "Re-connect the supplier account. Failed auth drops tracking numbers.",
        "Map variants: a SKU mismatch imports the order and never returns a tracking code.",
        "Do not paste tracking into theme code.",
        "Fulfill one test order end-to-end, then copy the tracking into the Shopify order if the app missed it.",
    ],
    95: [
        "Open Klaviyo or Mailchimp — not the theme. Flows miss orders when the Shopify integration disconnects.",
        "In the email app: reconnect Shopify, enable Placed Order / Checkout Started.",
        "Settings → Customer events: do not also fire a second competing pixel that the flow depends on unless the vendor says so.",
        "Send yourself a test flow. Check that the profile has the Shopify email.",
        "Do not paste Klaviyo snippets into checkout.liquid.",
    ],
    97: [
        "Open NetSuite / SAP / QuickBooks / the ERP app in Settings → Apps.",
        "Paused connectors queue orders and then time out. Reconnect and replay the failed batch.",
        "Check API rate (issue 93) if the ERP pulls too often.",
        "Do not re-key orders by hand until you know the batch did not already post.",
        "Sync one order, confirm it in the ERP, then resume the queue.",
    ],
    104: [
        "Open your Google Merchant / feed app. Disapprovals are feed values, not theme CSS.",
        "Fix the flagged field (price, availability, image, identifier) on the Shopify product, then re-sync the feed.",
        "GTIN/MPN mismatches and 'out of stock' while Shopify says available are the usual two.",
        "Do not hide the error with a different product URL in the theme.",
        "Resubmit in Merchant Center. Copy the disapproval code to a friend.",
    ],
    105: [
        "Go to Settings → Customer privacy. A consent app that blocks all third-party tags will look like 'pixels died in Europe'.",
        "Allow essential + checkout scripts. Marketing tags should wait for consent — not be stripped from checkout.",
        "Disable a second privacy app if two are installed.",
        "Test with a EU VPN or the consent banner 'deny' vs 'accept'.",
        "Do not paste a GDPR snippet into theme.liquid on the live shop.",
    ],
    106: [
        "Settings → Apps → Amazon / eBay / marketplace app. Reconnect the channel.",
        "Variant SKUs must match. A missing option drops the marketplace order line.",
        "Inventory locations: the marketplace location must have stock.",
        "Do not edit marketplace titles in the theme and expect the channel to follow.",
        "Pull one order, confirm the variant, then re-enable sync.",
    ],
    108: [
        "Settings → Apps and sales channels → Instagram / TikTok / Facebook.",
        "Reconnect the catalog. Stock and price sync from Shopify — not from a theme collection page.",
        "Products must be available to that channel (product → Publishing).",
        "Fix availability and images on the product, then sync the catalog.",
        "Do not paste a Shop tab snippet into theme.liquid to 'force' Instagram.",
    ],
    116: [
        "Open the order → Edit. Adding items after paid can require a new card authorization.",
        "If the gateway refuses, cancel the edit and send a new invoice / draft order instead of stacking edits.",
        "Do not capture twice. Read Timeline before you retry.",
        "Some edit apps fight Shopify's native editor — use one or the other.",
        "Tell the customer if they must re-enter a card. Copy Timeline to a friend.",
    ],
    117: [
        "Go to Settings → Taxes and duties. If TaxJar / Avalara is down, checkout totals can fail at peak.",
        "Check the tax app's status page. Temporarily fall back to Shopify tax if the vendor allows it.",
        "Do not leave two tax engines on.",
        "Test a draft order to that state/country.",
        "After the spike, turn the tax app back on and compare one order.",
    ],
    121: [
        "Go to Settings → Domains. If SSL says pending, wait — Shopify issues the certificate.",
        "Do not add a second A record, do not 'fix' CAA at GoDaddy, do not paste HTTPS redirects in Liquid.",
        "The domain should show one Shopify target (A/CNAME as Shopify shows).",
        "Checkout and admin on that domain in incognito after it flips to Connected.",
        "If pending more than 48 hours, Shopify Support. This is not a theme issue.",
    ],
    122: [
        "Online Store → Navigation → URL redirects. Export the list.",
        "A redirect that points at another redirect is a loop. Point each old URL at the final product/collection URL.",
        "Delete circular pairs. Save.",
        "Test the old URL in incognito (not while logged into admin).",
        "Do not add the same redirect in the theme and in this list.",
    ],
    124: [
        "Settings → Users and permissions. Open the staff account.",
        "They need the permission for that screen (products, settings, themes). Store owner can always get in.",
        "Have them log out, incognito, retry. Saved passwords often belong to a different staff login.",
        "Do not share the owner login. Grant the one checkbox they need.",
        "If 2FA is locking them out, use the 2FA playbook instead.",
    ],
    126: [
        "Stop resetting random passwords. 2FA lockout needs the backup codes or a Shopify account recovery.",
        "Settings → Users (from a different owner/staff device that still works) to disable 2FA for that user if you still have access.",
        "If you are the only owner and the authenticator is gone: Shopify account recovery / Support. This cannot be fixed in the theme.",
        "Do not create a second store. Do not paste codes in chat.",
        "When you are back in, save new backup codes offline.",
    ],
    127: [
        "Go to Settings → Markets. A market redirect loop is two markets claiming the same country, or a domain pointing at both.",
        "Each country should belong to one market. Turn off auto-redirect while you test.",
        "Settings → Domains: a market domain should not also be the primary that redirects to itself.",
        "Test in incognito. Browser cache makes loops look 'still broken'.",
        "Do not add Liquid geo-redirects on top of Markets.",
    ],
    129: [
        "Settings → Users and permissions. Transfers need the right owner / collaborator account — not a staff editor.",
        "Partner-to-merchant transfer is done in the Partner Dashboard / store transfer screen, not in the theme.",
        "Billing must be in good standing. A past-due store will not transfer.",
        "Do not rebuild the catalog in a second store while a transfer is pending.",
        "If the button is missing, the logged-in user is not the owner. Copy these steps to the owner.",
    ],
    135: [
        "Go to Settings → Domains. Copy the exact A / CNAME Shopify shows.",
        "In GoDaddy or Cloudflare, replace old records. Cloudflare: DNS only (grey cloud) for the record Shopify names if they say so.",
        "Remove leftover A records pointing at a previous host. Two A records = intermittent site.",
        "Wait for DNS. Do not also add a redirect in the theme.",
        "When Shopify says Connected, test in incognito.",
    ],
    140: [
        "Settings → Apps and sales channels → Facebook / Pinterest / Google.",
        "Reconnect the account. Expired tokens drop the channel even if the theme still shows buttons.",
        "Re-grant permissions on the business account that owns the catalog.",
        "Products → Publishing: the product must be available to that channel.",
        "Do not paste a new pixel to 'replace' a dead channel connection.",
    ],
    142: [
        "Go to Settings → Payments → Shopify Payments → payout / bank account.",
        "A stuck bank verification holds payouts. Finish the micro-deposit or document request in that screen.",
        "Use the store-owner email. Staff often cannot complete payout verification.",
        "Do not keep re-adding the same bank. Wait for the verification email.",
        "If the account is under review, that is Risk — see merchant terms. Theme changes will not move money.",
    ],
    144: [
        "Go to Settings → Taxes and duties → tax registrations. Enter the VAT/GST/HST number as the government issued it.",
        "Spaces and missing country prefix are the usual fail. Do not invent a number to 'just save'.",
        "The number must match the legal business name on the Shopify account.",
        "If Shopify still says invalid, the tax authority lookup is down or the number is not live yet — wait, then retry.",
        "This is not a theme field.",
    ],
    148: [
        "Stop. A payments / terms lock is a Shopify Risk review. You cannot clear it in the theme or by retrying payouts.",
        "Read the email to the store owner and the banner on Settings → Payments. That is the real instruction.",
        "Reply with the documents they asked for. Do not open a second store or rotate credit cards to bypass it.",
        "Do not Edit code, do not install a new gateway hoping to skip the hold.",
        "Copy the banner text to a friend or lawyer. Only Shopify Risk can lift this.",
    ],
}

THEME_SAFE = [
    "Online Store → Themes → Duplicate the live theme first. Do not Edit code on the published theme.",
    "Use Customize on the copy, then Preview. Publish only if Preview looks right.",
]


def slugify(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", title.lower())
    return s.strip("-")[:52]


def phrases(title: str, context: str) -> list[str]:
    blob = f"{title} {context}".lower()
    out: list[str] = []
    seen: set[str] = set()

    def add(p: str) -> None:
        p = re.sub(r"\s+", " ", p.lower()).strip(" .,:;\"'")
        if len(p) < 4 or p in seen or p in STOP:
            return
        if p in {"shopify", "error", "issue", "admin", "store"}:
            return
        seen.add(p)
        out.append(p)

    add(title)
    for brand in BRANDS:
        if brand in blob:
            add(brand)
    words = re.findall(r"[a-z0-9][a-z0-9+.-]*", title.lower())
    for i, w in enumerate(words):
        if w not in STOP and len(w) >= 5:
            add(w)
        if i + 1 < len(words):
            pair = f"{w} {words[i + 1]}"
            if words[i] not in STOP or words[i + 1] not in STOP:
                add(pair)
    # distinctive 4–8 word slices from context
    cwords = re.findall(r"[a-z0-9][a-z0-9+.-]*", context.lower())
    for i in range(len(cwords) - 2):
        chunk = " ".join(cwords[i : i + 3])
        if any(len(x) >= 5 for x in cwords[i : i + 3]):
            add(chunk)
    return out[:18]


def fallback_steps(hub: str, path: str, context: str) -> list[str]:
    ctx = context.rstrip(".")
    steps = [
        f"Go to {path}. Read any red or yellow banner before you change anything.",
        f"You are checking: {ctx}.",
    ]
    if hub == "themes":
        steps.extend(THEME_SAFE)
    elif hub == "payments":
        steps.append("Retry as the store owner in an incognito window to rule out staff permissions.")
        steps.append("If an app touches checkout or payments, disable it in Customize → App embeds and retest.")
    elif hub == "products":
        steps.append("Do not Edit code to “fix” catalog data. Change the product, variant, or CSV — then Save.")
        steps.append("View the product on the storefront in an incognito window.")
    elif hub == "apps":
        steps.append("Settings → Apps and sales channels. Open the named app, or disable its embed in Customize → App embeds.")
        steps.append("Toggle one app at a time. Last installed is the usual culprit.")
    else:
        steps.append("Retry as the store owner in an incognito window to rule out staff permissions.")
        steps.append("Stay in Settings for domain, staff, SEO, or billing. Do not paste Liquid.")
    steps.append("Save, then retest. Copy these steps to a friend if they are stuck.")
    return steps


def beginner_line(title: str, path: str, hub: str) -> str:
    if hub == "themes":
        return f"{title}: start at {path}. Duplicate the theme first — do not Edit code on the live shop."
    if hub == "payments":
        return f"{title}: start at {path}. Read the banner before you change a gateway or the theme."
    return f"{title}: start at {path}. Beginner path is admin settings — not Edit code."


def load_csv() -> list[dict]:
    rows = []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    if len(rows) != 150:
        raise SystemExit(f"expected 150 CSV rows, got {len(rows)}")
    return rows


def build() -> list[dict]:
    out = []
    for row in load_csv():
        rank = int(row["Rank"])
        title = row["Category Name"].strip()
        core = row["Core Area"].strip()
        sev = row["Severity Level"].strip().lower()
        context = row["Troubleshooting Context"].strip()
        hub = HUB[core]
        path = PATH[rank]
        slug = slugify(title)
        steps = STEPS.get(rank) or fallback_steps(hub, path, context)
        item = {
            "id": f"issue-{rank:03d}-{slug}",
            "hub": hub,
            "category": hub,
            "core_area": core.lower(),
            "rank": rank,
            "severity": sev,
            "match_phrases": phrases(title, context),
            "tags": [hub, "issue", sev],
            "synonyms": [title],
            "cause": context if context.endswith(".") else context + ".",
            "explanation": beginner_line(title, path, hub),
            "steps": steps,
            "target_ui_hint": path,
            "arrow": {"x": 0.5, "y": 0.16},
            "source_category_db": "issues",
        }
        out.append(item)
    return out


def validate(items: list[dict]) -> None:
    ids = [i["id"] for i in items]
    assert len(ids) == 150, len(ids)
    assert len(set(ids)) == 150
    crit_high = [i for i in items if i["severity"] in {"critical", "high"}]
    unique_high = {tuple(i["steps"]) for i in crit_high}
    if len(unique_high) != len(crit_high):
        raise SystemExit(f"Critical/High steps not unique: {len(unique_high)}/{len(crit_high)}")
    # every issue has unique first two steps (path + context or unique walkthrough)
    first2 = [tuple(i["steps"][:2]) for i in items]
    if len(set(first2)) != 150:
        dup = len(first2) - len(set(first2))
        raise SystemExit(f"duplicate openings: {dup}")
    banned = ("execute_unsafe", "production environment", "padStart", "shopify_module_asset")
    blob = json.dumps(items)
    for b in banned:
        if b in blob:
            raise SystemExit(f"banned text: {b}")
    liquid_warn = [i for i in items if i["hub"] == "themes" and i["severity"] in {"critical", "high"}]
    for i in liquid_warn:
        text = " ".join(i["steps"]).lower()
        if "duplicate" not in text:
            raise SystemExit(f"{i['id']} missing duplicate-theme warning")
    stop = next(i for i in items if i["rank"] == 148)
    if "risk" not in " ".join(stop["steps"]).lower():
        raise SystemExit("issue 148 must stop at Risk")
    kl = [i for i in items if any("klarna" in p for p in i["match_phrases"])]
    if not kl:
        raise SystemExit("klarna should match BNPL")
    print(f"OK {len(items)} issues · {len(crit_high)} critical/high unique · {len(set(tuple(i['steps']) for i in items))} unique step-sets")


def main() -> None:
    items = build()
    validate(items)
    OUT.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
