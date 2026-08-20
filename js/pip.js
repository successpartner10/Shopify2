/** Floating step card (Document Picture-in-Picture). Chrome / Edge only. */

let pipWin = null;
let handlers = { play: () => {}, next: () => {} };

export function canPopOut() {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

export function pipIsOpen() {
  return !!(pipWin && !pipWin.closed);
}

export function setPipHandlers(h) {
  handlers = { ...handlers, ...h };
}

function pipMarkup() {
  return `<div class="pip-card">
    <p class="pip-kicker">Storescope</p>
    <p class="pip-digest" id="pipDigest"></p>
    <div class="pip-step" id="pipStep"></div>
    <div class="pip-actions">
      <button class="solid" id="pipPlay" type="button">Play this fix</button>
      <button class="ghost" id="pipNext" type="button">Next step</button>
    </div>
    <p class="pip-fine">Resize this window. Keep Shopify underneath.</p>
  </div>`;
}

function bindPip(doc) {
  doc.getElementById("pipPlay")?.addEventListener("click", () => handlers.play());
  doc.getElementById("pipNext")?.addEventListener("click", () => handlers.next());
}

export function updatePip({ digest, n, total, step, playing } = {}) {
  if (!pipIsOpen()) return;
  const doc = pipWin.document;
  const d = doc.getElementById("pipDigest");
  const s = doc.getElementById("pipStep");
  const p = doc.getElementById("pipPlay");
  if (d) d.textContent = digest || "";
  if (s) s.innerHTML = `<span class="n">${n || 1}</span><p>Step ${n || 1} of ${total || 1}. ${step || ""}</p>`;
  if (p) {
    p.textContent = playing ? "Pause" : "Play this fix";
    p.classList.toggle("is-pause", !!playing);
  }
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  doc.documentElement.setAttribute("data-theme", theme);
}

export async function openPip(state) {
  if (!canPopOut()) throw new Error("Pop out needs Chrome or Edge.");
  if (pipIsOpen()) {
    updatePip(state);
    try { pipWin.focus(); } catch { /* ok */ }
    return pipWin;
  }
  pipWin = await documentPictureInPicture.requestWindow({
    width: 380,
    height: 340
  });
  const doc = pipWin.document;
  doc.documentElement.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") || "light");
  const css = doc.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("./css/app.css", location.href).href;
  doc.head.appendChild(css);
  doc.body.innerHTML = pipMarkup();
  bindPip(doc);
  updatePip(state);
  pipWin.addEventListener("pagehide", () => { pipWin = null; });
  return pipWin;
}

export function closePip() {
  try { pipWin?.close(); } catch { /* ok */ }
  pipWin = null;
}
