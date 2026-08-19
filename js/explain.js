export function systemFor(entry, systems) {
  if (!entry) return systems?.general || null;
  return systems?.[entry.system] || systems?.[entry.category] || systems?.general || null;
}

export function whyBlock(entry, systems, sources) {
  const sys = systemFor(entry, systems);
  const why = entry?.sources_note || "";
  const rec = sources?.recommendation || "";
  return {
    title: "Why am I seeing this?",
    cause: entry?.cause || "",
    body: sys?.why_this_ui || sys?.summary || entry?.explanation || "",
    systemTitle: sys?.title || entry?.category || "Shopify admin",
    systemSummary: sys?.summary || "",
    docs: [...(entry?.docs || []), ...((sys?.docs || []).filter((d) => !(entry?.docs || []).some((e) => e.url === d.url)))],
    sourcesNote: why,
    recommendation: rec
  };
}

export function sidekickPrompt(entry, meta = {}) {
  const banner = (meta.query || "").split("\n").slice(0, 8).join(" ").slice(0, 500);
  const step = (entry?.steps || [])[meta.stepIndex || 0] || "";
  return [
    "I'm looking at this Shopify admin screen and need the next click, not a generic lecture.",
    "",
    `Detected UI: ${entry?.target_ui_hint || "unknown"}`,
    `Kind: ${entry?.error_kind || "screen"} · Severity: ${entry?.severity || "info"}`,
    `Cause: ${entry?.cause || entry?.explanation || ""}`,
    banner ? `On-screen text (scrubbed): ${banner}` : "",
    step ? `Storescope current step: ${step}` : "",
    "",
    "Please tell me the exact admin path and button to click next. If this is a Risk/Payments hold, say so and do not invent a settings toggle that lifts it."
  ].filter(Boolean).join("\n");
}

export function helpSearchUrl(entry) {
  const q = encodeURIComponent(entry?.target_ui_hint || entry?.match_phrases?.[0] || "Shopify admin error");
  return `https://help.shopify.com/en/search?q=${q}`;
}
