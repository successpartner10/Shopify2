const CATEGORY_ORDER = ["errors", "payments", "shipping", "general"];

const SCREEN_HINTS = {
  payments: [
    "payout", "payment", "shopify payments", "paypal", "shop pay", "chargeback",
    "dispute", "bank account", "capture payment", "credit card", "gateway", "3d secure", "test mode"
  ],
  shipping: [
    "shipping", "delivery", "carrier", "fulfill", "zone", "shipping rate",
    "local pickup", "package", "label", "usps", "ups", "fedex"
  ],
  general: [
    "domain", "theme", "liquid", "tax", "markets", "pixel", "gift card",
    "password", "notification", "inventory", "staff", "app embed",
    "pinterest", "google", "social", "instagram", "youtube",
    "collective", "liquid", "theme.liquid", "edit code", "head tag",
    "privacy", "policy", "footer menu", "terms of service",
    "speed", "apps", "seo", "variant", "inventory", "markets", "currency"
  ],
  errors: ["error", "failed", "unable", "declined", "on hold", "couldn't"]
};

export function detectScreen(text) {
  const hay = (text || "").toLowerCase();
  let best = { category: "general", score: 0 };
  for (const [category, words] of Object.entries(SCREEN_HINTS)) {
    let score = 0;
    for (const w of words) if (hay.includes(w)) score += w.length > 8 ? 2 : 1;
    if (score > best.score) best = { category, score };
  }
  return best;
}

export async function loadDictionaries() {
  const files = ["errors", "payments", "shipping", "general", "issues"];
  const extras = ["systems", "flows", "conflicts", "sources"];
  const entries = [];
  const errors = [];
  const pack = { systems: {}, flows: [], conflicts: [], sources: null };

  await Promise.all([
    ...files.map(async (name) => {
      try {
        const res = await fetch(`./data/${name}.json`);
        if (!res.ok) throw new Error(`${name} ${res.status}`);
        const data = await res.json();
        for (const row of data) entries.push(enrich(row, name));
      } catch (err) {
        errors.push(String(err));
      }
    }),
    ...extras.map(async (name) => {
      try {
        const res = await fetch(`./data/${name}.json`);
        if (!res.ok) throw new Error(`${name} ${res.status}`);
        const data = await res.json();
        if (name === "systems") pack.systems = data;
        else if (name === "flows") pack.flows = data;
        else if (name === "conflicts") pack.conflicts = data;
        else pack.sources = data;
      } catch (err) {
        errors.push(String(err));
      }
    })
  ]);
  return { entries, errors, pack };
}

function inferSeverity(entry) {
  if (entry.severity) return entry.severity;
  const hay = `${(entry.match_phrases || []).join(" ")} ${entry.explanation || ""}`.toLowerCase();
  if (/unable to accept|frozen|declined|syntax error|no shipping/.test(hay)) return "critical";
  if (/hold|test mode|needs attention|permission|outdated/.test(hay)) return "warning";
  return "info";
}

function inferKind(entry) {
  if (entry.error_kind) return entry.error_kind;
  const hay = (entry.match_phrases || []).join(" ").toLowerCase();
  if (/toast|declined|couldn't save|permission/.test(hay)) return "toast";
  if (/invalid|required|enter a valid/.test(hay)) return "validation";
  return "banner";
}

function inferHub(row, file) {
  if (row.hub) return row.hub;
  if (file === "payments" || file === "shipping") return "payments";
  const id = String(row.id || "");
  if (/theme|liquid|head-tag|custom-liquid|edit-theme|page-speed|speed/.test(id)) return "themes";
  if (/app-conflict|app-leftover|too-many-apps|pixel|pinterest|google-youtube|collective/.test(id)) return "apps";
  if (/inventory|product|variant|gift|overselling|line-items/.test(id)) return "products";
  if (/payout|payment|checkout|discount|shipping|tax|card|bank|test-mode/.test(id)) return "payments";
  if (/domain|password|staff|billing|privacy|markets|seo|admin/.test(id)) return "admin";
  if (file === "errors") {
    if (/shipping|payout|payment|card|bank|test-mode/.test(id)) return "payments";
    if (/theme/.test(id)) return "themes";
    if (/inventory/.test(id)) return "products";
    if (/app/.test(id)) return "apps";
    return "admin";
  }
  return "admin";
}

function enrich(row, file) {
  return {
    ...row,
    category: row.category || (file === "errors" ? "general" : file),
    hub: inferHub(row, file),
    severity: inferSeverity(row),
    error_kind: inferKind(row),
    cause: row.cause || (row.explanation || "").split(". ")[0] + ".",
    system: row.system || row.category || file,
    docs: row.docs || [],
    alternatives: row.alternatives || [],
    step_arrows: row.step_arrows || [],
    expected: row.expected || [],
    done_if: row.done_if || [],
    still_if: row.still_if || [],
    sources_note: row.sources_note || "",
    flow_id: row.flow_id || null,
    source_category_db: row.source_category_db || file
  };
}

export function buildIndex(entries) {
  if (!window.Fuse) throw new Error("Fuse.js failed to load");
  return new window.Fuse(entries, {
    includeScore: true,
    threshold: 0.52,
    ignoreLocation: true,
    minMatchCharLength: 3,
    keys: [
      { name: "match_phrases", weight: 0.48 },
      { name: "synonyms", weight: 0.22 },
      { name: "tags", weight: 0.12 },
      { name: "cause", weight: 0.08 },
      { name: "explanation", weight: 0.07 },
      { name: "target_ui_hint", weight: 0.03 }
    ]
  });
}

function phraseHits(entry, hay) {
  const fields = [...(entry.match_phrases || []), ...(entry.synonyms || [])];
  let hits = 0;
  let longest = 0;
  let matched = "";
  for (const phrase of fields) {
    const p = String(phrase).toLowerCase();
    if (p.length >= 4 && hay.includes(p)) {
      hits += p.length >= 18 ? 1.6 : 1;
      if (p.length > longest) {
        longest = p.length;
        matched = p;
      }
    }
  }
  for (const tag of entry.tags || []) {
    if (hay.includes(String(tag).toLowerCase())) hits += 0.35;
  }
  return { hits, longest, matched };
}

export function searchDictionary(entries, fuse, query, opts = {}) {
  const q = (query || "").trim();
  if (!q) return { match: null, alternatives: [], source: "empty", confidence: 0 };

  const hay = q.toLowerCase();
  const preferred = opts.preferredCategory || detectScreen(q).category;
  const zoneBoostFor = (entry) => {
    let extra = 0;
    if (opts.bannerText && (entry.error_kind === "banner" || entry.zone === "top")) extra += 0.08;
    if (opts.toastText && entry.error_kind === "toast") extra += 0.1;
    if (opts.kind && entry.error_kind === opts.kind) extra += 0.06;
    if (opts.preferErrors && entry.source_category_db === "errors") extra += 0.08;
    return extra;
  };

  const exact = [];
  for (const entry of entries) {
    const { hits, longest, matched } = phraseHits(entry, hay);
    if (hits > 0) {
      const catBoost = entry.category === preferred || entry.system === preferred ? 0.12 : 0;
      const priBoost = (4 - Math.max(0, CATEGORY_ORDER.indexOf(entry.source_category_db || "general"))) * 0.02;
      const rank = typeof opts.rankBoost === "function" ? opts.rankBoost(entry) : 0;
      exact.push({
        entry,
        matched,
        score: Math.min(0.99, 0.34 + hits * 0.11 + longest / 90 + catBoost + priBoost + zoneBoostFor(entry) + rank)
      });
    }
  }
  exact.sort((a, b) => b.score - a.score);

  let fuzzy = [];
  try {
    fuzzy = fuse.search(q, { limit: 10 }).map((r) => ({
      entry: r.item,
      score: 1 - (r.score || 0.5) + zoneBoostFor(r.item) * 0.5 + (typeof opts.rankBoost === "function" ? opts.rankBoost(r.item) : 0)
    }));
  } catch {
    fuzzy = [];
  }

  const merged = new Map();
  for (const row of [...exact, ...fuzzy]) {
    const prev = merged.get(row.entry.id);
    if (!prev || row.score > prev.score) merged.set(row.entry.id, row);
  }
  const ranked = [...merged.values()].sort((a, b) => b.score - a.score);
  const top = ranked[0];

  if (top && top.score >= 0.38) {
    return {
      match: top.entry,
      alternatives: ranked.slice(1, 5).map((r) => r.entry),
      source: exact.length ? "dictionary" : "fuzzy",
      confidence: Number(top.score.toFixed(2)),
      matchedPhrase: top.matched || ""
    };
  }

  return {
    match: null,
    alternatives: ranked.slice(0, 4).map((r) => r.entry),
    source: "none",
    confidence: top ? Number(top.score.toFixed(2)) : 0
  };
}

export function fallbackAnswer(query, alternatives, screen) {
  const cat = screen?.category || detectScreen(query).category;
  const alt = alternatives[0];
  const generic = {
    payments: [
      "Read the red or yellow banner on Settings → Payments first — it names the hold or setup gap.",
      "Confirm a primary card provider is Active. PayPal alone does not replace it.",
      "Turn Test mode off and make sure live API keys are saved.",
      "Check the store-owner email for a verification request.",
      "Place a $1 test order in an incognito window, then refund it."
    ],
    shipping: [
      "Reproduce checkout with the customer's city, country, and postal code using a draft order.",
      "Settings → Shipping and delivery → Manage rates. The country must sit in exactly one zone with a rate.",
      "Add a fallback flat rate so a carrier API failure cannot zero out methods.",
      "Confirm every physical product has a weight and a shipping origin.",
      "Temporarily disable shipping apps and retest."
    ],
    general: [
      "Read the banner at the top of the admin — it is usually more specific than the page title.",
      "Note the exact page path (Settings → … or Online Store → …).",
      "Undo the last theme, app, or domain change if the issue started today.",
      "Retry in an incognito window as the store owner to rule out staff permissions.",
      "If the banner names an error, type that exact phrase into Storescope search."
    ]
  };

  return {
    id: "fallback-local-001",
    category: cat,
    system: cat,
    severity: "info",
    error_kind: "screen",
    match_phrases: [],
    tags: [cat, "fallback"],
    synonyms: [],
    cause: "No exact playbook hit for this screen.",
    explanation: alt
      ? `No exact dictionary hit. Closest playbook is “${(alt.explanation || alt.cause || "").slice(0, 90)}…” — use the steps below, or tap that related issue.`
      : "No exact dictionary hit for this screen. These are the safest next checks for the area Shopify appears to be showing.",
    steps: generic[cat] || generic.general,
    target_ui_hint: alt?.target_ui_hint || "Admin home banner",
    arrow: alt?.arrow || { x: 0.5, y: 0.12 },
    docs: [],
    alternatives: [],
    source_category_db: "fallback"
  };
}

export function findById(entries, id) {
  return (entries || []).find((e) => e.id === id) || null;
}
