import { looksLikeAdminUrl } from "./routes.js";
import { looksLikeSecret } from "./privacy.js";

const SHARE_CACHE = "ss-share";

export async function takeSharedInbound() {
  if (!("caches" in window)) return { file: null, text: "" };
  try {
    const cache = await caches.open(SHARE_CACHE);
    const fileRes = await cache.match("pending-file");
    const textRes = await cache.match("pending-text");
    await cache.delete("pending-file");
    await cache.delete("pending-text");
    let file = null;
    let text = "";
    if (fileRes) {
      const blob = await fileRes.blob();
      const name = fileRes.headers.get("X-Name") || "shared.png";
      file = new File([blob], name, { type: blob.type || "image/png" });
    }
    if (textRes) text = (await textRes.text()).trim();
    return { file, text };
  } catch {
    return { file: null, text: "" };
  }
}

export function looksUsefulClip(text) {
  const t = String(text || "").trim();
  if (t.length < 6 || t.length > 500) return false;
  if (looksLikeSecret(t)) return false;
  if (looksLikeAdminUrl(t)) return true;
  return /payout|on hold|shipping|theme|collective|liquid|shopify|declined|test mode|password|domain/i.test(t);
}

export async function readUsefulClipboard() {
  if (!navigator.clipboard?.readText) return "";
  if (sessionStorage.getItem("ss_clip_asked") === "1") return "";
  try {
    const t = (await navigator.clipboard.readText()).trim();
    return looksUsefulClip(t) ? t : "";
  } catch {
    return "";
  }
}

export function markClipAsked() {
  sessionStorage.setItem("ss_clip_asked", "1");
}

let wakeLock = null;

export async function holdWake() {
  if (!navigator.wakeLock?.request) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
}

export async function releaseWake() {
  try { await wakeLock?.release(); } catch { /* ok */ }
  wakeLock = null;
}

export function persistResume(payload) {
  try {
    if (!payload?.id) {
      sessionStorage.removeItem("ss_resume");
      return;
    }
    sessionStorage.setItem("ss_resume", JSON.stringify({
      id: payload.id,
      step: payload.step || 0,
      query: payload.query || "",
      at: Date.now()
    }));
  } catch { /* private mode */ }
}

export function loadResume() {
  try {
    const raw = sessionStorage.getItem("ss_resume");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.id || Date.now() - (data.at || 0) > 6 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearResume() {
  try { sessionStorage.removeItem("ss_resume"); } catch { /* ok */ }
}

export function listenLaunchQueue(onFiles, onUrl) {
  if (!("launchQueue" in window)) return;
  window.launchQueue.setConsumer(async (params) => {
    try {
      const files = [];
      if (params.files) {
        for (const handle of params.files) {
          const f = await handle.getFile();
          if (f) files.push(f);
        }
      }
      if (files.length) onFiles(files[0]);
      else if (params.targetURL) onUrl(params.targetURL);
    } catch { /* ignore */ }
  });
}
