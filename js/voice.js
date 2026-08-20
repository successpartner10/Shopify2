export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function canListen() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

let currentUtterance = null;

export function speak(text, { rate = 0.94, interrupt = true, onEnd } = {}) {
  if (!canSpeak() || !text) return false;
  if (interrupt) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
  const u = new SpeechSynthesisUtterance(String(text).slice(0, 600));
  currentUtterance = u;
  u.rate = rate;
  u.pitch = 1;
  u.lang = "en-US";
  const done = () => {
    if (currentUtterance === u) currentUtterance = null;
    onEnd?.();
  };
  u.onend = done;
  u.onerror = done;
  window.speechSynthesis.speak(u);
  return true;
}

export function hush() {
  currentUtterance = null;
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function isSpeaking() {
  return !!(canSpeak() && (window.speechSynthesis.speaking || window.speechSynthesis.pending));
}

/** Short voice commands while a walkthrough is playing. */
export function parseWalkCommand(raw) {
  const t = String(raw || "")
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length > 28) return null;
  if (/\b(pause|stop|wait|hold on|quiet)\b/.test(t)) return "pause";
  if (/\b(continue|next|resume|keep going|go on|go ahead)\b/.test(t)) return "continue";
  if (/\b(repeat|again)\b/.test(t)) return "repeat";
  return null;
}

let rec = null;
let recWanted = false;

export function startCommandListen(onCommand) {
  stopCommandListen();
  if (!canListen()) return false;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  recWanted = true;
  rec.onresult = (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0]?.transcript || "";
      const cmd = parseWalkCommand(t);
      if (cmd) onCommand(cmd, t);
    }
  };
  rec.onend = () => {
    if (!recWanted || !rec) return;
    try { rec.start(); } catch { /* Chrome restart */ }
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") recWanted = false;
  };
  try {
    rec.start();
    return true;
  } catch {
    recWanted = false;
    return false;
  }
}

export function stopCommandListen() {
  recWanted = false;
  try { rec?.abort(); } catch { /* ok */ }
  try { rec?.stop(); } catch { /* ok */ }
  rec = null;
}

export const SHORTCUTS = [
  { keys: "S", action: "scan", label: "Scan / What’s wrong?" },
  { keys: "N", action: "next", label: "Next step" },
  { keys: "B", action: "back", label: "Previous step" },
  { keys: "Space", action: "done", label: "Mark current step done" },
  { keys: "R", action: "rescan", label: "Re-scan this step" },
  { keys: "?", action: "stuck", label: "Stuck? alternatives" },
  { keys: "D", action: "diff", label: "Capture / compare diff" },
  { keys: "V", action: "voice", label: "Toggle voice" },
  { keys: "K", action: "sidekick", label: "Copy Sidekick prompt" },
  { keys: "/", action: "ask", label: "Focus ask box" },
  { keys: "Esc", action: "close", label: "Close drawer" }
];

export function shortcutFromEvent(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const tag = (e.target && e.target.tagName) || "";
  const typing = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
  if (e.key === "Escape") return "close";
  if (typing) return null;
  const k = e.key.toLowerCase();
  if (k === "s") return "scan";
  if (k === "n") return "next";
  if (k === "b") return "back";
  if (k === " ") return "done";
  if (k === "r") return "rescan";
  if (k === "?") return "stuck";
  if (k === "d") return "diff";
  if (k === "v") return "voice";
  if (k === "k") return "sidekick";
  if (k === "/") return "ask";
  if (k === "h") return "history";
  return null;
}
