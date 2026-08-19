const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?){2}\d{4}/g;
const CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const ACCOUNT = /\b(?:acct|account|transit|routing|iban)[:\s#]*[A-Z0-9-]{4,}\b/gi;
const APIKEY = /\b(?:sk_live|sk_test|rk_live|shpat_|shpss_|shpua_|shpca_|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|xox[baprs]-|AIza)[A-Za-z0-9_-]+\b/g;
const ORDER = /\b#\d{4,}\b/g;
const MONEY = /(?:CAD|USD|GBP|EUR|\$|£|€)\s?[\d,]+\.?\d*/g;

/** True if the string looks like a pasted secret (never show / search it). */
export function looksLikeSecret(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (/^(ghp|gho|ghu|ghs|ghr|github_pat|shpat|shpss|shpua|shpca|sk_live|sk_test|rk_live)_/i.test(t)) return true;
  if (/\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|shpat_|shpss_|xox[baprs]-)[A-Za-z0-9_-]{8,}/.test(t)) return true;
  return false;
}

export function scrubText(text, { keepMoney = true } = {}) {
  if (!text) return "";
  let out = String(text);
  out = out.replace(APIKEY, "[api-key]");
  out = out.replace(EMAIL, "[email]");
  out = out.replace(ACCOUNT, "[account]");
  out = out.replace(CARD, "[card]");
  out = out.replace(PHONE, "[phone]");
  out = out.replace(ORDER, "[order]");
  if (!keepMoney) out = out.replace(MONEY, "[amount]");
  return out;
}

export function scrubObject(value, depth = 0) {
  if (depth > 8 || value == null) return value;
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((v) => scrubObject(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/image|frame|dataUrl|pixels/i.test(k)) continue;
      out[k] = scrubObject(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function thumbnailDataUrl(source, maxW = 480, quality = 0.62) {
  const canvas = document.createElement("canvas");
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  if (!w || !h) return "";
  const scale = Math.min(1, maxW / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  // Soft-blur a strip of the far left (often customer list names) — light privacy assist, not a guarantee.
  try {
    const band = Math.round(canvas.width * 0.08);
    const img = ctx.getImageData(0, 0, band, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const g = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
    }
    ctx.putImageData(img, 0, 0);
  } catch {
    /* ignore */
  }
  return canvas.toDataURL("image/jpeg", quality);
}
