export function canCapture() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

export function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Why getDisplayMedia will fail before we even prompt. */
export function captureBlockReason() {
  if (!window.isSecureContext) return "insecure";
  if (!canCapture()) return "unsupported";
  if (isEmbedded()) return "iframe";
  return null;
}

export function captureHelp(reason) {
  const map = {
    iframe: {
      title: "Open Storescope in its own tab",
      body: "Browsers block “Share tab” inside an embedded preview. Open this page as a top-level tab, then pick your Shopify admin tab. Until then, upload a screenshot or try a sample — those work here."
    },
    insecure: {
      title: "Needs HTTPS",
      body: "Screen share only works on a secure origin (https or localhost). Upload a screenshot or use a sample instead."
    },
    unsupported: {
      title: "This browser cannot share tabs",
      body: "Safari on iOS and some in-app browsers have no tab-share API. Upload an OS screenshot, or type the banner text."
    },
    denied: {
      title: "Share was dismissed or blocked",
      body: "You cancelled the picker, or the browser blocked display-capture. Click Allow and choose the Shopify admin tab — not this Storescope tab. Or upload a screenshot."
    }
  };
  return map[reason] || map.denied;
}

export async function startTabCapture() {
  const blocked = captureBlockReason();
  if (blocked) {
    const err = new Error(captureHelp(blocked).body);
    err.code = blocked.toUpperCase();
    err.name = blocked === "iframe" ? "NotAllowedError" : "NotSupportedError";
    throw err;
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: "browser",
      frameRate: 8,
      width: { ideal: 1440 },
      height: { ideal: 900 }
    },
    audio: false,
    preferCurrentTab: false,
    surfaceSwitching: "include",
    selfBrowserSurface: "exclude",
    systemAudio: "exclude"
  });
  return stream;
}

export function stopStream(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}
