/** Map a pasted Shopify admin URL to a playbook query. */

const RULES = [
  { re: /collective|merchant-to-merchant|shopify-collective/i, q: "shopify collective" },
  { re: /\/payments|shopify_payments|payout/i, q: "payouts on hold" },
  { re: /\/shipping|delivery_profiles|carrier/i, q: "no shipping rates" },
  { re: /\/themes\/\d+\/editor|customize/i, q: "custom liquid" },
  { re: /\/themes\/\d+\/language|edit_code|\/themes/i, q: "edit code theme.liquid" },
  { re: /online_store\/preferences|password/i, q: "password page" },
  { re: /\/checkout/i, q: "customer accounts checkout" },
  { re: /google|youtube/i, q: "google and youtube" },
  { re: /pinterest/i, q: "pinterest" },
  { re: /\/apps|sales.channels/i, q: "app embed conflict" },
  { re: /\/domains/i, q: "domain not connected" },
  { re: /\/billing/i, q: "shopify bill past due" },
  { re: /\/markets/i, q: "markets unpublished" },
  { re: /\/legal|\/policies|privacy.policy|settings\/legal/i, q: "privacy policy" },
  { re: /content\/menus|\/menus/i, q: "privacy policy footer" },
  { re: /customer.events|pixels/i, q: "pixel customer events" },
  { re: /users|permissions|staff/i, q: "you don't have permission" },
  { re: /inventory|products/i, q: "insufficient inventory" },
  { re: /admin\.shopify\.com|shopify\.com\/admin/i, q: "shopify admin banner" }
];

export function looksLikeAdminUrl(text) {
  const t = String(text || "").trim();
  if (!/^https?:\/\//i.test(t) && !/admin\.shopify\.com/i.test(t)) return false;
  return /shopify\.com/i.test(t) || /myshopify\.com/i.test(t);
}

export function queryFromAdminUrl(text) {
  const t = String(text || "").trim();
  if (!looksLikeAdminUrl(t)) return null;
  for (const rule of RULES) {
    if (rule.re.test(t)) return rule.q;
  }
  return "shopify admin banner";
}
