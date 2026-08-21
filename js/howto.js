/** How-to miss fill: local templates, then opt-in AI, always as numbered admin steps. */

import { cloudOptIn, getGeminiKey, getGrokKey, askGemini, askGrok } from "./cloud.js";

export function looksHowTo(q) {
  const s = String(q || "").toLowerCase();
  return /how (do i|to|can i|do you)|add |change |edit |modify |upload |replace |where (is|do)|show |create |put |insert /.test(s);
}

export function helpSearch(q) {
  return `https://help.shopify.com/search?q=${encodeURIComponent(q)}`;
}

export function googleSearch(q) {
  return `https://www.google.com/search?q=${encodeURIComponent(`Shopify admin ${q}`)}`;
}

export function howToPrompt(query) {
  return [
    "You write Shopify admin how-tos for complete beginners.",
    "Output EXACTLY this shape, nothing else:",
    "CAUSE: one short sentence.",
    "1. First click.",
    "2. Next click.",
    "3. …",
    "Rules:",
    "- Max 6 numbered steps.",
    "- Use real paths: Settings → … or Online Store → Themes → Customize.",
    "- If the theme or Liquid is involved, step 1 must be: Duplicate the live theme. Do not Edit code on the published theme.",
    "- Never paste code into the live shop.",
    "- Never invent menus. If unsure, send them to Shopify admin search.",
    "- No headings, no bullets, no essays.",
    "",
    `Question: ${String(query || "").slice(0, 400)}`
  ].join("\n");
}

export function parseHowTo(text) {
  const raw = String(text || "").replace(/\r/g, "");
  const cause = (raw.match(/CAUSE:\s*(.+)/i) || [])[1] || raw.split("\n").find((l) => l.trim() && !/^\d/.test(l.trim())) || "Follow these clicks in Shopify admin.";
  const steps = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*(?:\d+[.)]|[-*])\s+(.+)/);
    if (m) steps.push(m[1].trim());
  }
  const clean = steps.filter((s) => s.length > 8 && s.length < 280).slice(0, 6);
  return { cause: cause.replace(/^CAUSE:\s*/i, "").slice(0, 200), steps: clean };
}

function themeSafe(steps, query) {
  const blob = `${query} ${steps.join(" ")}`.toLowerCase();
  const touchesTheme = /theme|liquid|customize|image|logo|text|color|section|announcement/.test(blob);
  if (!touchesTheme) return steps;
  if (steps.some((s) => /duplicate/i.test(s))) return steps;
  return ["Online Store → Themes → ⋯ → Duplicate the live theme. Do not Edit code on the published theme.", ...steps].slice(0, 6);
}

export function howToEntry(query, { cause, steps }, source) {
  const s = themeSafe(steps, query);
  if (s.length < 2) return null;
  return {
    id: `howto-${source}-${Date.now().toString(36)}`,
    hub: "themes",
    category: "general",
    match_phrases: [String(query).toLowerCase()],
    tags: ["howto", source],
    synonyms: [query],
    cause: cause || "How-to in Shopify admin.",
    explanation: cause,
    steps: s,
    target_ui_hint: "How to: next clicks",
    arrow: { x: 0.5, y: 0.16 },
    source_category_db: source === "gemini" || source === "grok" ? "cloud-howto" : "howto"
  };
}

export async function fillHowTo(query) {
  const q = String(query || "").trim();
  if (!q) return null;
  if (cloudOptIn()) {
    try {
      if (getGeminiKey()) {
        const out = await askGemini(howToPrompt(q), { raw: true });
        const parsed = parseHowTo(out.text);
        const entry = howToEntry(q, parsed, "gemini");
        if (entry) return entry;
      }
    } catch { /* try grok */ }
    try {
      if (getGrokKey()) {
        const out = await askGrok(howToPrompt(q), { raw: true });
        const parsed = parseHowTo(out.text);
        const entry = howToEntry(q, parsed, "grok");
        if (entry) return entry;
      }
    } catch { /* local fallback */ }
  }
  return howToEntry(q, {
    cause: "Not in the local playbook. These are the safest next clicks; then use Help if needed.",
    steps: [
      "In Shopify admin search (top bar), type the same words you used here.",
      "If this is text, images, logo, or layout: Online Store → Themes → ⋯ → Duplicate, then Customize — not Edit code.",
      "Products / images: Products → the product → Media. Click an image to replace it. Save.",
      `Open Shopify Help for this: ${helpSearch(q)}`,
      `If Help misses it, search Google for: Shopify admin ${q}`
    ]
  }, "help");
}
