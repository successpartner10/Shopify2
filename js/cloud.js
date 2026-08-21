/** Opt-in Gemini + Grok. Keys live in localStorage only. Text only, never images. */

const LS_GEMINI = "ss_gemini_key";
const LS_GROK = "ss_grok_key";
const LS_OPTIN = "ss_cloud_optin";

export function getGeminiKey() {
  return (localStorage.getItem(LS_GEMINI) || "").trim();
}
export function getGrokKey() {
  return (localStorage.getItem(LS_GROK) || "").trim();
}
export function cloudOptIn() {
  return localStorage.getItem(LS_OPTIN) === "1";
}
export function saveCloudSettings({ gemini, grok, optin }) {
  if (gemini != null) localStorage.setItem(LS_GEMINI, String(gemini).trim());
  if (grok != null) localStorage.setItem(LS_GROK, String(grok).trim());
  localStorage.setItem(LS_OPTIN, optin ? "1" : "0");
}

export function cloudPrompt(query) {
  return [
    "You are helping a Shopify merchant fix the admin UI they are looking at.",
    "Give the exact next clicks. Do not invent Settings paths.",
    "If this is a Payments/Risk hold, say a toggle cannot lift it — owner email + banner CTA.",
    "Keep it under 180 words. Numbered steps only after one-line cause.",
    "",
    String(query || "").slice(0, 1200)
  ].join("\n");
}

export async function askGemini(query, { raw = false } = {}) {
  const key = getGeminiKey();
  if (!key) throw new Error("Add a Gemini API key in Cloud settings (aistudio.google.com/apikey).");
  const prompt = raw ? String(query) : cloudPrompt(query);
  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  let last = "Gemini failed";
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.2 }
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      last = data?.error?.message || `Gemini ${res.status}`;
      continue;
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";
    if (text.trim()) return { text: text.trim(), model, provider: "gemini" };
    last = "Gemini returned empty text";
  }
  throw new Error(last);
}

export async function askGrok(query, { raw = false } = {}) {
  const key = getGrokKey();
  if (!key) throw new Error("Add a Grok (xAI) API key in Cloud settings (console.x.ai).");
  const prompt = raw ? String(query) : cloudPrompt(query);
  const models = ["grok-3-mini", "grok-2-latest", "grok-2", "grok-3"];
  let last = "Grok failed";
  for (const model of models) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: "system", content: "Shopify admin fixer. Next clicks only. No invented menus. No hold-lifting toggles." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      last = data?.error?.message || data?.error || `Grok ${res.status}`;
      continue;
    }
    const text = data?.choices?.[0]?.message?.content || "";
    if (text.trim()) return { text: text.trim(), model, provider: "grok" };
    last = "Grok returned empty text";
  }
  throw new Error(String(last));
}
