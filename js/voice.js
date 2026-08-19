export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text, { rate = 1, interrupt = true } = {}) {
  if (!canSpeak() || !text) return false;
  if (interrupt) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).slice(0, 600));
  u.rate = rate;
  u.pitch = 1;
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
  return true;
}

export function hush() {
  if (canSpeak()) window.speechSynthesis.cancel();
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
  if (k === "?" || (e.shiftKey && k === "/")) return "stuck";
  if (k === "d") return "diff";
  if (k === "v") return "voice";
  if (k === "k") return "sidekick";
  if (k === "/") return "ask";
  if (k === "h") return "history";
  return null;
}
