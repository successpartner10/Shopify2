/** Local playbook chat. No APIs. Optional hand-off is a copied prompt or a public search URL. */

export function normalizeStep(step) {
  if (step == null) return { text: "" };
  if (typeof step === "string") return { text: step };
  return {
    text: step.text || "",
    image: step.image || "",
    audio: step.audio || "",
    hint: step.hint || ""
  };
}

export function handoffPrompt(query, found) {
  const entry = found?.match;
  const alts = (found?.alternatives || []).slice(0, 3);
  const lines = [
    "Shopify admin troubleshooting. Give the next click only. Do not invent Settings paths.",
    "",
    `Merchant question / on-screen text: ${String(query || "").slice(0, 800)}`,
  ];
  if (entry) {
    lines.push(
      "",
      `Local playbook already matched: ${entry.target_ui_hint}`,
      `Cause: ${entry.cause || entry.explanation || ""}`,
      "Steps:",
      ...(entry.steps || []).map((s, i) => `${i + 1}. ${normalizeStep(s).text}`)
    );
  } else {
    lines.push("", "No confident local playbook hit.");
    if (alts.length) {
      lines.push("Nearest local entries (may be wrong):");
      for (const a of alts) lines.push(`- ${a.target_ui_hint}: ${(a.cause || "").slice(0, 140)}`);
    }
  }
  lines.push("", "If this is a Payments Risk hold, say so. Do not claim a toggle lifts it.");
  return lines.join("\n");
}

export function handoffLinks(prompt) {
  const q = encodeURIComponent(prompt.slice(0, 1800));
  return {
    chatgpt: `https://chatgpt.com/?q=${q}`,
    gemini: `https://gemini.google.com/app?q=${q}`,
    perplexity: `https://www.perplexity.ai/search?q=${q}`,
    grok: `https://grok.com/?q=${q}`
  };
}

export function localReply(query, found) {
  const q = (query || "").trim();
  if (!q) return { kind: "empty", text: "Ask about a banner, toast, or page — e.g. “payouts on hold”." };
  if (found?.match && (found.confidence || 0) >= 0.46) {
    const e = found.match;
    const steps = (e.steps || []).map((s, i) => `${i + 1}. ${normalizeStep(s).text}`).join("\n");
    return {
      kind: "hit",
      entry: e,
      text: `${e.target_ui_hint}\n\n${e.cause || e.explanation || ""}\n\n${steps}`,
      confidence: found.confidence
    };
  }
  const alts = found?.alternatives || [];
  if (alts.length) {
    return {
      kind: "near",
      entry: null,
      alternatives: alts,
      text: `No exact playbook hit (${Math.round((found?.confidence || 0) * 100)}%). Closest:\n${alts.map((a) => `• ${a.target_ui_hint}`).join("\n")}\n\nOpen one, or copy a prompt into ChatGPT / Gemini / Perplexity / Sidekick. Nothing is sent unless you paste it.`
    };
  }
  return {
    kind: "miss",
    text: "Nothing in the local playbook matched. Copy a prompt and paste it into ChatGPT, Gemini, Perplexity, or Shopify Sidekick. No API is used."
  };
}
