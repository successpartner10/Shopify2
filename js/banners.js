/** Color-band + phrase detector for Polaris banners, toasts, and validation. */

const TONES = {
  critical: { label: "Critical", cls: "tone-crit" },
  high: { label: "High", cls: "tone-warn" },
  warning: { label: "Warning", cls: "tone-warn" },
  medium: { label: "Medium", cls: "tone-info" },
  low: { label: "Low", cls: "tone-info" },
  info: { label: "Info", cls: "tone-info" }
};

export function toneMeta(tone) {
  return TONES[tone] || TONES.info;
}

function isRed(r, g, b) {
  return r > 140 && g < 110 && b < 110 && r - g > 30;
}
function isAmber(r, g, b) {
  return r > 170 && g > 130 && b < 110 && r - b > 50;
}
function isBlue(r, g, b) {
  return b > 140 && g < 170 && r < 120 && b - r > 30;
}

export function detectColorBands(canvas) {
  if (!canvas) return [];
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  if (!width || !height) return [];
  const stepY = Math.max(2, Math.floor(height / 90));
  const stepX = Math.max(4, Math.floor(width / 80));
  const rows = [];
  for (let y = 0; y < height; y += stepY) {
    let red = 0, amber = 0, blue = 0, n = 0;
    const slice = ctx.getImageData(0, y, width, 1);
    for (let x = 0; x < width; x += stepX) {
      const i = x * 4;
      const r = slice.data[i], g = slice.data[i + 1], b = slice.data[i + 2];
      if (isRed(r, g, b)) red++;
      else if (isAmber(r, g, b)) amber++;
      else if (isBlue(r, g, b)) blue++;
      n++;
    }
    const tone = red / n > 0.08 ? "critical" : amber / n > 0.1 ? "warning" : blue / n > 0.1 ? "info" : null;
    rows.push({ y: y / height, tone, red: red / n, amber: amber / n });
  }

  const bands = [];
  let cur = null;
  for (const row of rows) {
    if (!row.tone) {
      if (cur) { bands.push(cur); cur = null; }
      continue;
    }
    if (cur && cur.tone === row.tone) {
      cur.y1 = row.y + stepY / height;
    } else {
      if (cur) bands.push(cur);
      cur = { tone: row.tone, y0: row.y, y1: row.y + stepY / height };
    }
  }
  if (cur) bands.push(cur);

  return bands
    .filter((b) => b.y1 - b.y0 >= 0.02)
    .map((b) => ({
      ...b,
      y: (b.y0 + b.y1) / 2,
      kind: b.y0 > 0.72 ? "toast" : b.y1 - b.y0 < 0.08 && b.y0 > 0.25 && b.y0 < 0.75 ? "validation" : "banner",
      arrow: { x: 0.58, y: Math.min(0.92, Math.max(0.08, (b.y0 + b.y1) / 2)) }
    }));
}

const KIND_HINTS = [
  { kind: "toast", re: /couldn't save|card declined|don't have permission|try again|insufficient inventory|network error/i },
  { kind: "validation", re: /this field is required|enter a valid|is invalid|must be|already (exists|taken)/i },
  { kind: "banner", re: /on hold|unable to accept|theme has|no shipping|password protected|past due|test mode/i }
];

export function classifyKind(text, bands = []) {
  const hay = text || "";
  for (const h of KIND_HINTS) if (h.re.test(hay)) return h.kind;
  if (bands.some((b) => b.kind === "toast" && b.tone === "critical")) return "toast";
  if (bands.some((b) => b.kind === "banner")) return "banner";
  return "screen";
}

export function pickArrowFromVision(entry, { bands = [], words = [], bannerText = "", toastText = "" } = {}) {
  const phrase = (entry?.match_phrases || [])[0] || "";
  if (phrase && words.length) {
    const needle = phrase.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 4);
    const hits = words.filter((w) => needle.some((n) => (w.text || "").toLowerCase().includes(n)));
    if (hits.length) {
      const x = hits.reduce((s, w) => s + w.x, 0) / hits.length;
      const y = hits.reduce((s, w) => s + w.y, 0) / hits.length;
      return { x, y, label: entry.target_ui_hint || "Match", source: "ocr-box" };
    }
  }
  const kind = entry?.error_kind;
  const band = bands.find((b) => b.kind === kind) || bands[0];
  if (band) return { ...band.arrow, label: band.kind, source: "color-band" };
  if (toastText && kind === "toast") return { x: 0.5, y: 0.88, label: "Toast", source: "zone" };
  if (bannerText) return { x: 0.58, y: 0.16, label: "Banner", source: "zone" };
  return entry?.arrow || { x: 0.5, y: 0.16, label: "Banner" };
}

export function annotateVision(text, vision) {
  const bands = vision?.bands || [];
  const kind = classifyKind(text, bands);
  const tone = bands[0]?.tone || (kind === "toast" || /unable|declined|error|failed/i.test(text) ? "critical" : /hold|test mode|needs attention/i.test(text) ? "warning" : "info");
  return { kind, tone, bands, bannerText: vision?.bannerText || "", toastText: vision?.toastText || "" };
}
