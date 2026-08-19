import { loadDictionaries, buildIndex, searchDictionary, fallbackAnswer, detectScreen, findById } from "./dictionary.js";
import { saveSession, listSessions, clearSessions, newRecording, recordEvent, saveRecording, diagnosticPackage, downloadJson, listCommunity, upsertCommunity, communityAsEntries, importCommunity, bumpCommunity } from "./session.js";
import { canCapture, startTabCapture, stopStream, isEmbedded, captureBlockReason, captureHelp, isMobile } from "./capture.js";
import { ocrAvailable, recognize, frameToCanvas } from "./ocr.js";
import { SAMPLES } from "./samples.js";
import {
  APP_URL, APP_TITLE, APP_BLURB, fixUrl, playbookMarkdown, playbookText,
  copyText, nativeShare, canNativeShare, parseInbound, socialLinks, downloadText
} from "./share.js";
import { detectColorBands, pickArrowFromVision, annotateVision, toneMeta } from "./banners.js";
import { BOOKMARKLET, parseDomLite, mergeSignals } from "./hybrid.js";
import { whyBlock, sidekickPrompt, helpSearchUrl } from "./explain.js";
import { flowFor, initProgress, markStep, autoAdvance, stuckOptions, percent } from "./guide.js";
import { snapshotFrom, diffSnapshots, mapDiffToPlaybook } from "./diff.js";
import { detectConflicts } from "./conflicts.js";
import { speak, hush, canSpeak, SHORTCUTS, shortcutFromEvent } from "./voice.js";
import { scrubText, thumbnailDataUrl } from "./privacy.js";
import { normalizeStep, handoffPrompt, handoffLinks, localReply } from "./chat.js";
import { getGeminiKey, getGrokKey, cloudOptIn, saveCloudSettings, askGemini, askGrok } from "./cloud.js";

const $ = (id) => document.getElementById(id);
const on = (id, event, fn) => { const el = $(id); if (el) el.addEventListener(event, fn); };
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function hideDenied() {
  if ($("shareDenied")) $("shareDenied").hidden = true;
}

const state = {
  entries: [],
  fuse: null,
  pack: { systems: {}, flows: [], conflicts: [], sources: null },
  stream: null,
  paused: false,
  current: null,
  stepIndex: 0,
  lastText: "",
  lastSource: null,
  lastCanvas: null,
  lastVision: null,
  lastDom: null,
  ready: false,
  lastMeta: null,
  deferredInstall: null,
  shareMode: "app",
  historyRows: [],
  progress: null,
  voice: localStorage.getItem("ss_voice") === "1",
  recordingOn: false,
  recording: null,
  before: null,
  after: null,
  lastDiff: null,
  lastSessionId: null,
  community: [],
  lastChatFound: null
};

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3400);
}

function setOnlineUi() {
  $("offlineBanner").hidden = navigator.onLine;
  $("netPill").textContent = navigator.onLine ? "Online" : "Offline";
  $("netPill").classList.toggle("warn", !navigator.onLine);
}

function hasSeenOnboarding() { return localStorage.getItem("ss_onboarded") === "1"; }
function markOnboarded() { localStorage.setItem("ss_onboarded", "1"); }

function showLanding(full) {
  $("landing").hidden = false;
  $("scanner").hidden = true;
  $("onboardingFull").hidden = !full;
  $("onboardingMini").hidden = full;
}

function showScanner() {
  $("landing").hidden = true;
  $("scanner").hidden = false;
}

function setLiveStatus(label, active = false) {
  $("livePill").textContent = label;
  $("livePill").classList.toggle("on", active);
  $("livePill").classList.toggle("warn", /pause|error|denied/i.test(label));
}

function setStill(src) {
  const img = $("stillImage");
  const video = $("liveVideo");
  video.hidden = true;
  img.hidden = false;
  img.src = src;
  state.lastSource = img;
}

function bindVideo(stream) {
  const video = $("liveVideo");
  const img = $("stillImage");
  img.hidden = true;
  video.hidden = false;
  video.srcObject = stream;
  video.play().catch(() => {});
  state.lastSource = video;
}

function clearArrow() { $("arrowLayer").innerHTML = ""; }

function drawArrow(target, extras = {}) {
  const svg = $("arrowLayer");
  const wrap = $("frameWrap");
  const media = !$("liveVideo").hidden ? $("liveVideo") : $("stillImage");
  if (!target || !media) { svg.innerHTML = ""; return; }

  const wr = wrap.getBoundingClientRect();
  const mr = media.getBoundingClientRect();
  const x = (mr.left - wr.left) + mr.width * target.x;
  const y = (mr.top - wr.top) + mr.height * target.y;
  const cardX = Math.min(wr.width - 36, Math.max(36, x + (target.x > 0.55 ? -120 : 120)));
  const cardY = Math.min(wr.height - 24, Math.max(24, y + (target.y > 0.45 ? -70 : 70)));
  const label = target.label || extras.label || "";
  const bands = extras.bands || [];

  svg.setAttribute("viewBox", `0 0 ${wr.width} ${wr.height}`);
  const bandRects = bands.map((b) => {
    const by = (mr.top - wr.top) + mr.height * b.y0;
    const bh = Math.max(10, mr.height * (b.y1 - b.y0));
    const color = b.tone === "critical" ? "rgba(255,107,107,0.22)" : b.tone === "warning" ? "rgba(240,180,41,0.2)" : "rgba(122,162,255,0.18)";
    const stroke = b.tone === "critical" ? "#ff6b6b" : b.tone === "warning" ? "#f0b429" : "#7aa2ff";
    return `<rect x="${mr.left - wr.left + 8}" y="${by}" width="${Math.max(40, mr.width - 16)}" height="${bh}" rx="8" fill="${color}" stroke="${stroke}" stroke-dasharray="5 4" opacity="0.95"/>`;
  }).join("");

  svg.innerHTML = `
    <defs>
      <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3ee0b0"/>
      </marker>
      <filter id="ag" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#3ee0b0" flood-opacity="0.55"/>
      </filter>
    </defs>
    ${bandRects}
    <circle cx="${x}" cy="${y}" r="16" fill="none" stroke="#3ee0b0" stroke-width="3" opacity="0.9"/>
    <circle cx="${x}" cy="${y}" r="6" fill="#3ee0b0"/>
    <path d="M ${cardX} ${cardY} Q ${(cardX + x) / 2} ${(cardY + y) / 2 - 20} ${x} ${y}"
      fill="none" stroke="#3ee0b0" stroke-width="3.2" marker-end="url(#ah)" filter="url(#ag)"/>
    ${label ? `<g>
      <rect x="${cardX - 8}" y="${cardY - 22}" rx="8" width="${Math.min(220, 18 + label.length * 7.2)}" height="24" fill="#111820" stroke="#273241"/>
      <text x="${cardX}" y="${cardY - 6}" fill="#3ee0b0" font-size="11" font-family="ui-sans-serif,system-ui">${label}</text>
    </g>` : ""}
  `;
}

function currentArrow() {
  const entry = state.current;
  if (!entry) return null;
  const stepArrow = entry.step_arrows?.[state.stepIndex];
  const base = stepArrow || entry.arrow || { x: 0.5, y: 0.16 };
  return pickArrowFromVision({ ...entry, arrow: base }, {
    bands: state.lastVision?.bands || [],
    words: state.lastVision?.words || [],
    bannerText: state.lastVision?.bannerText || "",
    toastText: state.lastVision?.toastText || ""
  });
}

function allEntries() {
  return [...state.entries, ...communityAsEntries(state.community)];
}

function runSearch(query, extras = {}) {
  const entries = allEntries();
  if (!state.fuse || !entries.length) return { match: null, alternatives: [], source: "empty", confidence: 0 };
  return searchDictionary(entries, state.fuse, query, extras);
}

function sharePayload(mode = state.shareMode) {
  if (mode === "fix" && state.current) {
    return { title: `Storescope: ${state.current.target_ui_hint}`, text: playbookText(state.current), url: fixUrl(state.current.id) };
  }
  return { title: APP_TITLE, text: APP_BLURB, url: APP_URL };
}

function paintShareDrawer(mode = "app") {
  state.shareMode = mode;
  const payload = sharePayload(mode);
  const links = socialLinks(payload.url, payload.title);
  $("shareTitle").textContent = mode === "fix" ? "Share this fix" : mode === "history" ? "Share playbook" : "Share Storescope";
  $("shareIntro").textContent = mode === "fix"
    ? "Sends the numbered steps plus a link that opens this same playbook."
    : mode === "history"
      ? "Full text of every saved fix on this device. No screenshots included."
      : "Send the live app. Recipients can install it or open it in any browser.";
  $("shareLink").value = payload.url;
  const map = {
    shareWhatsapp: links.whatsapp, shareSms: links.sms, shareEmail: links.email,
    shareX: links.x, shareLinkedin: links.linkedin, shareTelegram: links.telegram, shareFacebook: links.facebook
  };
  for (const [id, href] of Object.entries(map)) { const el = $(id); if (el) el.href = href; }
  $("nativeShareBtn").hidden = !canNativeShare();
  $("downloadFixBtn").hidden = mode === "app";
  $("shareDrawer").hidden = false;
}

function renderFlow() {
  const box = $("flowBox");
  if (!box) return;
  const p = state.progress;
  if (!p || !p.steps.length) { box.hidden = true; return; }
  box.hidden = false;
  const pct = percent(p);
  box.innerHTML = `
    <div class="flow-head">
      <strong>${p.title}</strong>
      <span class="tag">${pct}%</span>
    </div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <ol class="flow-ol">
      ${p.steps.map((s, i) => `
        <li class="${i === p.index ? "current" : ""} ${p.checked[i] ? "done" : ""}" data-flow="${i}">
          <button class="check" data-check="${i}" aria-label="Toggle step">${p.checked[i] ? "✓" : i + 1}</button>
          <div>
            <b>${s.label}</b>
            <p>${s.detail || ""}</p>
          </div>
        </li>`).join("")}
    </ol>
    <div class="card-actions">
      <button class="solid" id="didBtn" type="button">I did this</button>
      <button class="ghost" id="rescanStepBtn" type="button">Re-scan step</button>
      <button class="amber" id="stuckBtn" type="button">Stuck?</button>
    </div>
    <div id="stuckList" class="samples" hidden></div>
  `;
  box.querySelector("#didBtn")?.addEventListener("click", () => onDidStep());
  box.querySelector("#rescanStepBtn")?.addEventListener("click", () => runScan({ reason: "verify-step" }));
  box.querySelector("#stuckBtn")?.addEventListener("click", () => toggleStuck());
  box.querySelectorAll("[data-check]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.check);
      state.progress = markStep(state.progress, i, !state.progress.checked[i]);
      state.stepIndex = state.progress.index;
      renderFlow();
      highlightStep();
    });
  });
}

function highlightStep() {
  if (!state.current) return;
  [...$("tipSteps").children].forEach((li, i) => li.classList.toggle("current", i === state.stepIndex));
  drawArrow(currentArrow(), { bands: state.lastVision?.bands || [] });
  maybeSpeak();
}

function onDidStep() {
  if (!state.progress) return;
  state.progress = markStep(state.progress, state.progress.index, true);
  state.stepIndex = state.progress.index;
  logRec("step-done", { index: state.stepIndex });
  renderFlow();
  highlightStep();
  toast("Marked done. Re-scan if you want Storescope to verify the next screen.");
}

function toggleStuck() {
  const list = $("stuckList");
  if (!list) return;
  if (!list.hidden) { list.hidden = true; return; }
  const opts = stuckOptions(state.progress, allEntries());
  if (!opts.length) {
    list.hidden = false;
    list.innerHTML = `<p class="empty">No alternate path encoded. Try a related playbook below, or Ask Sidekick.</p>`;
    return;
  }
  list.hidden = false;
  list.innerHTML = opts.map((o) =>
    `<button class="sample" data-alt="${o.entry?.id || ""}"><b>${o.label}</b><span>${o.entry?.cause || "Alternate path"}</span></button>`
  ).join("");
}

function renderWhy() {
  const box = $("whyBox");
  if (!box || !state.current) return;
  const w = whyBlock(state.current, state.pack.systems, state.pack.sources);
  const tone = toneMeta(state.current.severity);
  box.innerHTML = `
    <button class="why-toggle" id="whyToggle" type="button">Why am I seeing this?</button>
    <div id="whyBody" hidden>
      <p class="expl"><b>${w.cause || w.systemTitle}</b> ${w.body}</p>
      <p class="empty">${w.systemSummary}</p>
      ${w.docs.length ? `<div class="docs">${w.docs.map((d) => `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.label)}</a>`).join("")}<a href="${esc(helpSearchUrl(state.current))}" target="_blank" rel="noopener">Search Help Center</a></div>` : `<div class="docs"><a href="${esc(helpSearchUrl(state.current))}" target="_blank" rel="noopener">Search Help Center</a></div>`}
      ${w.sourcesNote ? `<p class="note">${w.sourcesNote}</p>` : ""}
      <p class="note">${w.recommendation}</p>
    </div>
  `;
  box.querySelector("#whyToggle")?.addEventListener("click", () => {
    const b = $("whyBody");
    if (b) b.hidden = !b.hidden;
  });
  $("tipMeta").innerHTML = `
    <span class="tag hit">${state.current.category}</span>
    <span class="tag ${tone.cls}">${tone.label} · ${state.current.error_kind}</span>
    <span class="tag">${state.lastMeta?.source || ""}</span>
    <span class="tag">${Math.round((state.lastMeta?.confidence || 0) * 100)}% match</span>
  `;
}

function renderConflicts(text) {
  const box = $("conflictBox");
  if (!box) return;
  const hits = detectConflicts(text, state.pack.conflicts || []);
  if (!hits.length) { box.hidden = true; box.innerHTML = ""; return; }
  const top = hits[0];
  box.hidden = false;
  box.innerHTML = `
    <div class="conflict-card">
      <div class="kicker">Likely conflict</div>
      <strong>${top.title}</strong>
      <p>${top.likely}</p>
      <ol>${(top.test_sequence || []).map((s) => `<li>${s}</li>`).join("")}</ol>
      ${top.apps_often?.length ? `<p class="empty">Often: ${top.apps_often.join(", ")}</p>` : ""}
    </div>
  `;
}

function renderResult(entry, meta) {
  state.current = entry;
  state.lastMeta = meta;
  state.stepIndex = 0;
  const flow = flowFor(entry, state.pack.flows);
  state.progress = initProgress(flow, entry);
  hideDenied();
  $("emptyTip").hidden = true;
  $("tipBody").hidden = false;
  $("tipTitle").textContent = entry.target_ui_hint || "Next fix";
  $("tipExpl").textContent = entry.cause || entry.explanation;
  $("tipSteps").innerHTML = (entry.steps || []).map((s, i) => `
    <li class="${i === 0 ? "current" : ""}" data-i="${i}">
      <span class="n">${i + 1}</span>
      <p>${esc(s)}</p>
    </li>
  `).join("");
  $("related").innerHTML = (meta.alternatives || []).map((a) =>
    `<button class="sample" data-alt="${esc(a.id)}"><b>${esc(a.target_ui_hint)}</b><span>${esc(a.cause || a.explanation)}</span></button>`
  ).join("");
  $("ocrText").textContent = state.lastText || "";
  renderWhy();
  renderFlow();
  renderConflicts(meta.query || state.lastText);
  drawArrow(currentArrow(), { bands: state.lastVision?.bands || [] });
  maybeSpeak();
  logRec("match", { id: entry.id, source: meta.source, confidence: meta.confidence });
  saveSession({
    query: meta.query,
    title: entry.target_ui_hint,
    explanation: entry.explanation,
    cause: entry.cause,
    steps: entry.steps,
    category: entry.category,
    source: meta.source,
    target: entry.target_ui_hint,
    confidence: meta.confidence,
    severity: entry.severity,
    error_kind: entry.error_kind,
    entryId: entry.id
  }).then((id) => { state.lastSessionId = id; }).catch(() => {});
}

function applyQuery(query, extras = {}) {
  const screen = detectScreen(query);
  const found = runSearch(query, {
    preferredCategory: extras.category || screen.category,
    bannerText: state.lastVision?.bannerText,
    toastText: state.lastVision?.toastText,
    kind: state.lastVision?.kind,
    preferErrors: true
  });
  if (found.match) {
    renderResult(found.match, { ...found, query });
    return found.match;
  }
  const fb = fallbackAnswer(query, found.alternatives, screen);
  renderResult(fb, {
    source: "local-fallback",
    confidence: Math.max(found.confidence, 0.3),
    alternatives: found.alternatives,
    query
  });
  return fb;
}

function maybeSpeak() {
  if (!state.voice || !state.current) return;
  const raw = state.current.steps?.[state.stepIndex] || state.current.cause;
  const step = typeof raw === "string" ? raw : normalizeStep(raw).text;
  speak(`${state.current.target_ui_hint}. ${step}`);
}

function logRec(type, payload) {
  if (!state.recordingOn || !state.recording) return;
  recordEvent(state.recording, type, payload);
}

async function runScan({ textOverride, reason } = {}) {
  if (!state.ready) return toast("Dictionary is still loading.");
  $("scanBtn").disabled = true;
  $("scanBtn").textContent = "Reading screen…";
  try {
    let text = textOverride || "";
    let canvas = null;
    if (!text) {
      const src = state.lastSource;
      if (!src) throw new Error("Share a Shopify tab, upload a screenshot, or pick a sample first.");
      if (src.tagName === "VIDEO" && !src.videoWidth) {
        throw new Error("Waiting for the first frame. Try again in a second.");
      }
      if (ocrAvailable()) {
        $("ocrStatus").textContent = "OCR running…";
        const result = await recognize(src, (m) => {
          if (m.progress) $("ocrStatus").textContent = `OCR ${Math.round(m.progress * 100)}%`;
        });
        text = result.text;
        canvas = result.canvas;
        const bands = detectColorBands(canvas);
        state.lastVision = annotateVision(text, {
          bands,
          bannerText: result.bannerText,
          toastText: result.toastText,
          words: result.words
        });
        state.lastVision.words = result.words;
        state.lastVision.bands = bands;
        state.lastCanvas = canvas;
      } else if (!navigator.onLine) {
        throw new Error("Live OCR needs a network connection the first time. Type the banner text below, or use a sample.");
      } else {
        throw new Error("OCR library is not available. Type the banner text, or retry online.");
      }
    }
    const typedDom = parseDomLite(text);
    if (typedDom) state.lastDom = typedDom;
    const merged = mergeSignals({
      ocrText: text,
      bannerText: state.lastVision?.bannerText,
      toastText: state.lastVision?.toastText,
      dom: state.lastDom,
      typed: typedDom ? "" : (textOverride && textOverride.startsWith("STORESCOPE") ? "" : "")
    });
    state.lastText = scrubText(merged || text);
    $("ocrStatus").textContent = state.lastText ? `${state.lastText.split(/\s+/).length} words read` : "No text found";
    if (!state.lastText || state.lastText.replace(/\s+/g, "").length < 6) {
      toast("Could not read enough text. Type the error banner instead.");
      return;
    }
    if (reason === "verify-step" && state.progress) {
      state.progress = autoAdvance(state.progress, state.lastText);
      state.stepIndex = state.progress.index;
      renderFlow();
    }
    applyQuery(reason ? `${reason}\n${state.lastText}` : state.lastText);
    toast("Fix ready — follow the numbered steps.");
  } catch (err) {
    toast(err.message || "Scan failed");
    $("ocrStatus").textContent = err.message || "Scan failed";
  } finally {
    $("scanBtn").disabled = false;
    $("scanBtn").textContent = "What's wrong?";
  }
}

function showShareDenied(reason) {
  const help = captureHelp(reason);
  const box = $("shareDenied");
  if (box) {
    box.hidden = false;
    $("deniedTitle").textContent = help.title;
    $("deniedBody").textContent = help.body;
  }
  if ($("emptyTip")) $("emptyTip").hidden = true;
  setLiveStatus("Share denied");
  toast(help.title);
}

function applyEmbedUi() {
  const embedded = isEmbedded();
  const mobile = isMobile();
  const blocked = captureBlockReason();
  if ($("iframeBanner")) $("iframeBanner").hidden = !embedded;
  if ($("openTabBtn")) $("openTabBtn").hidden = !embedded;
  const href = location.href;
  ["openTabLink", "openTabBtn", "deniedOpenTab"].forEach((id) => {
    const el = $(id);
    if (el) el.href = href;
  });
  const start = $("startBtn");
  const upload = $("uploadBtn");
  if (mobile || blocked === "unsupported") {
    if (start) start.textContent = "Upload screenshot";
    if (upload) {
      upload.textContent = canCapture() && !mobile ? "Share a tab instead" : "Upload another";
      if (!canCapture() || mobile) upload.hidden = true;
    }
    $("capNote").textContent = "On a phone: screenshot Shopify admin, then upload that image from Photos. Do not take a camera photo of the screen.";
    const s2 = $("stepTwoCopy");
    if (s2) s2.textContent = "Screenshot the Shopify banner, then tap Upload screenshot and pick it from Photos.";
    const s2h = $("stepTwoTitle");
    if (s2h) s2h.textContent = "Upload the screenshot";
  } else if (blocked === "iframe") {
    $("capNote").textContent = "This preview cannot share tabs. Open in a new tab, or upload / use a sample here.";
    if (start) start.textContent = "Upload screenshot";
  } else if (blocked === "insecure") {
    $("capNote").textContent = "Screen share needs https or localhost. Upload a screenshot instead.";
    if (start) start.textContent = "Upload screenshot";
  } else {
    if (start) start.textContent = "Share a tab";
    if (upload) {
      upload.hidden = false;
      upload.textContent = "Upload screenshot";
    }
    $("capNote").textContent = "Desktop: Share a tab, or upload / drop / paste (Ctrl+V) a screenshot. Same OCR either way.";
  }
}

async function beginCapture() {
  markOnboarded();
  showScanner();
  const blocked = captureBlockReason();
  // Phones and blocked browsers skip the tab picker entirely.
  if (blocked === "mobile" || blocked === "unsupported" || blocked === "insecure") {
    showShareDenied(blocked);
    $("fileInput")?.click();
    return;
  }
  if (blocked === "iframe") {
    showShareDenied(blocked);
    return;
  }
  if ($("shareDenied")) $("shareDenied").hidden = true;
  if ($("emptyTip")) $("emptyTip").hidden = false;
  try {
    stopStream(state.stream);
    const stream = await startTabCapture();
    state.stream = stream;
    state.paused = false;
    bindVideo(stream);
    setLiveStatus("Watching tab", true);
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      setLiveStatus("Share ended");
      state.stream = null;
    });
    toast("Pick your Shopify admin tab — not this Storescope tab.");
  } catch (err) {
    const reason = err.name === "NotAllowedError" ? "denied" : (err.code || "denied").toLowerCase();
    showShareDenied(reason === "iframe" || reason === "unsupported" || reason === "insecure" || reason === "mobile" ? reason : "denied");
    if (isMobile()) $("fileInput")?.click();
  }
}

function pauseCapture() {
  if (!state.stream) return toast("Nothing is being shared.");
  if (!state.paused) {
    try {
      const canvas = frameToCanvas($("liveVideo"));
      setStill(canvas.toDataURL("image/jpeg", 0.85));
    } catch { /* keep video */ }
    state.stream.getTracks().forEach((t) => { t.enabled = false; });
    state.paused = true;
    setLiveStatus("Paused", false);
    $("pauseBtn").textContent = "Resume";
  } else {
    state.stream.getTracks().forEach((t) => { t.enabled = true; });
    bindVideo(state.stream);
    state.paused = false;
    setLiveStatus("Watching tab", true);
    $("pauseBtn").textContent = "Pause";
  }
}

function stopCapture() {
  stopStream(state.stream);
  state.stream = null;
  state.paused = false;
  $("liveVideo").srcObject = null;
  $("liveVideo").hidden = true;
  $("pauseBtn").textContent = "Pause";
  setLiveStatus("Stopped");
}

function loadSample(sample) {
  markOnboarded();
  showScanner();
  stopCapture();
  hideDenied();
  setStill(sample.image);
  setLiveStatus("Sample");
  state.lastText = sample.text;
  state.lastVision = annotateVision(sample.text, { bands: [], bannerText: sample.text, toastText: "" });
  $("ocrStatus").textContent = "Sample text (no OCR needed)";
  applyQuery(sample.text);
}

async function onFile(file) {
  const name = (file && file.name) || "";
  const typed = file && (file.type || "");
  const looksImage = typed.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(name);
  if (!file || !looksImage) return toast("Choose a PNG or JPEG screenshot.");
  markOnboarded();
  showScanner();
  stopCapture();
  hideDenied();
  const url = URL.createObjectURL(file);
  setStill(url);
  setLiveStatus("Screenshot");
  toast("Screenshot loaded — reading the banner…");
  await runScan();
}

function historyMarkdown(rows) {
  if (!rows.length) return `${APP_TITLE}\n${APP_URL}`;
  return [
    "# Storescope playbook",
    "",
    ...rows.map((r) => {
      const steps = (r.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
      return `## ${r.title || "Fix"}\n_${new Date(r.createdAt).toLocaleString()}_\n\n${r.explanation || ""}\n\n${steps}\n`;
    }),
    `App: ${APP_URL}`
  ].join("\n");
}

async function refreshHistory() {
  const rows = await listSessions();
  $("histList").innerHTML = rows.length
    ? rows.map((r) => `
      <article class="hist-item" data-reopen="${esc(r.entryId || "")}">
        <time>${esc(new Date(r.createdAt).toLocaleString())}</time>
        <h3>${esc(r.title || "Fix")}</h3>
        <p>${esc(r.cause || r.explanation || "")}</p>
        <ol>${(r.steps || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      </article>
    `).join("")
    : `<p class="empty">No scans yet. Run “What's wrong?” and the playbook will land here — text only, no images.</p>`;
  state.historyRows = rows;
}

function applyInbound() {
  const inbound = parseInbound();
  if (inbound.fix) {
    const entry = allEntries().find((e) => e.id === inbound.fix);
    if (entry) {
      markOnboarded();
      showScanner();
      setLiveStatus("Shared link");
      state.lastText = inbound.fix;
      renderResult(entry, { source: "shared-link", confidence: 1, alternatives: [], query: inbound.fix });
      toast("Opened a shared playbook.");
      return;
    }
  }
  const q = [inbound.q, inbound.sharedUrl].filter(Boolean).join(" ").trim();
  if (q) {
    markOnboarded();
    showScanner();
    $("askInput").value = inbound.q || "";
    applyQuery(q);
    toast("Opened from a shared search.");
  }
}

function captureDiffSide(which) {
  const src = state.lastSource;
  let thumb = "";
  try {
    if (src) thumb = thumbnailDataUrl(src instanceof HTMLCanvasElement ? src : src, 420);
  } catch { /* optional */ }
  const snap = snapshotFrom(state.lastText, {
    label: which === "before" ? "Before" : "After",
    thumb,
    matchId: state.current?.id,
    title: state.current?.target_ui_hint
  });
  if (which === "before") state.before = snap;
  else state.after = snap;
  logRec("diff-" + which, { lines: snap.lines.length });
  toast(which === "before" ? "Before snapshot saved (text + tiny thumb, on this device)." : "After snapshot saved.");
  if (state.before && state.after) showDiff();
}

function showDiff() {
  if (!state.before || !state.after) return toast("Capture Before, make a change, then After.");
  const diff = diffSnapshots(state.before, state.after);
  state.lastDiff = diff;
  const mapped = mapDiffToPlaybook(diff, (q) => runSearch(q, { preferErrors: true }));
  $("diffBody").innerHTML = `
    <p class="expl">${diff.summary}</p>
    <div class="diff-grid">
      <div>
        <h3>Removed</h3>
        ${diff.removed.length ? diff.removed.map((l) => `<pre class="gone">${l}</pre>`).join("") : `<p class="empty">None</p>`}
      </div>
      <div>
        <h3>Added</h3>
        ${diff.added.length ? diff.added.map((l) => `<pre class="add">${l}</pre>`).join("") : `<p class="empty">None</p>`}
      </div>
    </div>
    ${mapped?.match ? `<p>Closest playbook for the change: <button class="linkish" id="diffOpen" type="button">${mapped.match.target_ui_hint}</button></p>` : ""}
  `;
  $("diffDrawer").hidden = false;
  $("diffOpen")?.addEventListener("click", () => {
    $("diffDrawer").hidden = true;
    renderResult(mapped.match, { ...mapped, query: "diff" });
  });
}

function toggleVoice() {
  state.voice = !state.voice;
  localStorage.setItem("ss_voice", state.voice ? "1" : "0");
  $("voiceBtn")?.classList.toggle("on", state.voice);
  if (state.voice) maybeSpeak();
  else hush();
  toast(state.voice ? "Voice on — current tip will be read." : "Voice off.");
}

function toggleRecord() {
  state.recordingOn = !state.recordingOn;
  if (state.recordingOn) {
    state.recording = newRecording();
    logRec("start", { note: "Privacy-scrubbed event log. No raw video." });
    toast("Recording diagnostic events on this device.");
  } else {
    if (state.recording) saveRecording(state.recording).catch(() => {});
    toast("Recording stopped. Export from the package drawer.");
  }
  $("recBtn")?.classList.toggle("on", state.recordingOn);
  $("recDot").hidden = !state.recordingOn;
}

async function exportPackage() {
  const sessions = state.historyRows.length ? state.historyRows : await listSessions();
  const pack = diagnosticPackage({
    sessions,
    recording: state.recording,
    current: state.current,
    query: state.lastText,
    community: state.community
  });
  downloadJson(`storescope-diag-${Date.now()}.json`, pack);
  toast("Privacy-scrubbed package downloaded. No raw screenshots.");
}

async function copySidekick() {
  if (!state.current) return toast("Scan a screen first.");
  const prompt = sidekickPrompt(state.current, { query: state.lastText, stepIndex: state.stepIndex });
  const ok = await copyText(prompt);
  $("sidekickText").value = prompt;
  $("sidekickDrawer").hidden = false;
  toast(ok ? "Sidekick prompt copied. Paste it into the purple glasses in admin." : "Copy the prompt from the drawer.");
}

function wireShare() {
  on("shareBtn", "click", () => paintShareDrawer(state.current ? "fix" : "app"));
  on("shareBtn2", "click", () => paintShareDrawer("app"));
  on("shareFixBtn", "click", () => paintShareDrawer("fix"));
  on("shareClose", "click", () => { $("shareDrawer").hidden = true; });
  on("shareDrawer", "click", (e) => { if (e.target.id === "shareDrawer") e.target.hidden = true; });
  on("copyLinkBtn", "click", async () => {
    const ok = await copyText($("shareLink").value);
    toast(ok ? "Link copied." : "Could not copy — select the link instead.");
  });
  on("copyMsgBtn", "click", async () => {
    const text = state.shareMode === "history" ? historyMarkdown(state.historyRows || []) : sharePayload().text;
    const ok = await copyText(text);
    toast(ok ? "Message copied." : "Copy failed.");
  });
  on("nativeShareBtn", "click", async () => {
    try {
      const p = state.shareMode === "history"
        ? { title: "Storescope playbook", text: historyMarkdown(state.historyRows || []), url: APP_URL }
        : sharePayload();
      await nativeShare(p);
    } catch (err) {
      if (err?.name !== "AbortError") toast("Share was cancelled or blocked.");
    }
  });
  on("downloadFixBtn", "click", () => {
    if (state.shareMode === "history") downloadText("storescope-playbook.md", historyMarkdown(state.historyRows || []));
    else if (state.current) downloadText(`${(state.current.id || "fix").replace(/[^\w-]+/g, "-")}.md`, playbookMarkdown(state.current));
    else downloadText("storescope.md", playbookMarkdown(null));
    toast("Download started.");
  });
  on("histShare", "click", async () => {
    const rows = state.historyRows.length ? state.historyRows : await listSessions();
    state.historyRows = rows;
    paintShareDrawer("history");
  });
  on("installBtn", "click", async () => {
    if (state.deferredInstall) {
      state.deferredInstall.prompt();
      const choice = await state.deferredInstall.userChoice;
      state.deferredInstall = null;
      $("installBtn").hidden = true;
      toast(choice.outcome === "accepted" ? "Installing Storescope." : "Install dismissed.");
      return;
    }
    paintShareDrawer("app");
    toast("Use your browser menu → Add to Home Screen / Install.");
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredInstall = e;
    $("installBtn").hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    $("installBtn").hidden = true;
    toast("Storescope is installed.");
  });
}

function paintSources() {
  const host = $("sourcesList");
  if (!host || !state.pack.sources) return;
  host.innerHTML = state.pack.sources.evaluated.map((s) => `
    <article class="hist-item">
      <h3>${s.name}</h3>
      <p class="empty">${s.use_when}</p>
      <p><b>Good at</b> ${s.strengths[0]}</p>
      <p><b>Misses</b> ${s.weaknesses[0]}</p>
    </article>
  `).join("") + `<p class="note">${state.pack.sources.recommendation}</p>`;
}

function paintCloudForm() {
  const g = $("geminiKey");
  const k = $("grokKey");
  const o = $("cloudOptin");
  if (g) g.value = getGeminiKey();
  if (k) k.value = getGrokKey();
  if (o) o.checked = cloudOptIn();
}

function saveCloudForm() {
  saveCloudSettings({
    gemini: $("geminiKey")?.value || "",
    grok: $("grokKey")?.value || "",
    optin: !!$("cloudOptin")?.checked
  });
  toast("Saved on this device only. Keys are not uploaded to Storescope or GitHub.");
}

async function runCloud(provider) {
  const q = scrubText(state.lastChatQuery || state.lastText || $("chatInput")?.value || "");
  if (!q) return toast("Scan a screen or type the banner first.");
  if (!cloudOptIn()) {
    paintCloudForm();
    $("cloudDrawer").hidden = false;
    return toast("Turn on “Allow miss-only cloud” and save a key first.");
  }
  $("chatDrawer").hidden = false;
  appendChat("user", `<p>Ask ${provider} (text only, opt-in)</p>`);
  appendChat("bot", `<p class="empty">Calling ${provider}…</p>`);
  try {
    const out = provider === "grok" ? await askGrok(q) : await askGemini(q);
    const log = $("chatLog");
    if (log?.lastChild) log.lastChild.remove();
    appendChat("bot", `<pre>${esc(out.text)}</pre><p class="note">${esc(out.provider)} · ${esc(out.model)} · banner text only, no image</p>`);
  } catch (err) {
    const log = $("chatLog");
    if (log?.lastChild) log.lastChild.remove();
    appendChat("bot", `<p>${esc(err.message || "Cloud call failed")}</p>`);
  }
}
  $("chatDrawer").hidden = false;
  if (prefill) $("chatInput").value = prefill;
  $("chatInput").focus();
}

function appendChat(role, html) {
  const log = $("chatLog");
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.innerHTML = html;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function copyHandoff() {
  const q = state.lastChatQuery || state.lastText || "";
  const prompt = handoffPrompt(scrubText(q), state.lastChatFound);
  const ok = await copyText(prompt);
  toast(ok ? "Prompt copied. Paste it into ChatGPT, Gemini, Perplexity, or Sidekick." : "Copy failed.");
}

function runChat(q) {
  if (!q) return;
  if (!state.ready) return toast("Playbook still loading.");
  $("chatInput").value = "";
  appendChat("user", `<p>${esc(q)}</p>`);
  const found = runSearch(q, { preferErrors: true });
  state.lastChatFound = found;
  state.lastChatQuery = q;
  const reply = localReply(q, found);
  let extra = "";
  if (reply.kind === "hit" && reply.entry) {
    extra = `<button class="solid" type="button" data-open="${esc(reply.entry.id)}">Open this playbook</button>`;
  } else if (reply.alternatives) {
    extra = reply.alternatives.map((a) =>
      `<button class="sample" type="button" data-open="${esc(a.id)}"><b>${esc(a.target_ui_hint)}</b></button>`
    ).join("");
  }
  const links = handoffLinks(handoffPrompt(scrubText(q), found));
  extra += `<div class="chat-handoff">
    <span class="note">No key needed: copy/paste. Or opt-in miss-only API:</span>
    <button class="ghost" type="button" id="copyHandoff">Copy prompt</button>
    <button class="ghost" type="button" data-cloud="gemini">Ask Gemini</button>
    <button class="ghost" type="button" data-cloud="grok">Ask Grok</button>
    <a class="ghost" href="${esc(links.chatgpt)}" target="_blank" rel="noopener">ChatGPT tab</a>
    <a class="ghost" href="${esc(links.gemini)}" target="_blank" rel="noopener">Gemini tab</a>
    <a class="ghost" href="${esc(links.perplexity)}" target="_blank" rel="noopener">Perplexity</a>
  </div>`;
  appendChat("bot", `<pre>${esc(reply.text)}</pre>${extra}`);
}

function paintShortcuts() {
  $("shortcutList").innerHTML = SHORTCUTS.map((s) =>
    `<li><kbd>${s.keys}</kbd> ${s.label}</li>`
  ).join("");
}

async function refreshCommunity() {
  state.community = await listCommunity();
  const host = $("commList");
  if (!host) return;
  const rows = communityAsEntries(state.community);
  host.innerHTML = rows.length
    ? rows.map((r) => `
      <article class="hist-item">
        <h3>${esc(r.target_ui_hint)}</h3>
        <p>${esc(r.banner)}</p>
        <p class="empty">${esc(r.success)}/${esc(r.attempts)} marked successful on this device</p>
      </article>`).join("")
    : `<p class="empty">No local contributions yet. After a fix works, save the banner + steps. Nothing leaves this device unless you export.</p>`;
}

function wireUi() {
  on("startBtn", "click", beginCapture);
  on("uploadBtn", "click", () => $("fileInput").click());
  on("uploadBtn2", "click", () => $("fileInput").click());
  on("deniedUpload", "click", () => $("fileInput").click());
  on("deniedSample", "click", () => {
    const first = SAMPLES[0];
    if (first) loadSample(first);
  });
  on("fileInput", "change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFile(file);
  });
  const bindDrop = (el) => {
    if (!el) return;
    el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("drop"); });
    el.addEventListener("dragleave", () => el.classList.remove("drop"));
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.classList.remove("drop");
      const file = e.dataTransfer?.files?.[0];
      if (file) onFile(file);
    });
  };
  bindDrop($("frameWrap"));
  bindDrop($("shotDrop"));
  on("shotDrop", "click", () => $("fileInput").click());
  document.addEventListener("paste", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onFile(file);
          return;
        }
      }
    }
  });
  on("scanBtn", "click", () => runScan());
  on("pauseBtn", "click", pauseCapture);
  on("stopBtn", "click", () => { stopCapture(); showLanding(!hasSeenOnboarding()); });
  on("howBtn", "click", () => { $("howDrawer").hidden = false; });
  on("howClose", "click", () => { $("howDrawer").hidden = true; });
  on("histBtn", "click", async () => { await refreshHistory(); $("histDrawer").hidden = false; });
  on("histClose", "click", () => { $("histDrawer").hidden = true; });
  on("histClear", "click", async () => { await clearSessions(); await refreshHistory(); });
  on("privBtn", "click", () => { $("privDrawer").hidden = false; });
  on("privClose", "click", () => { $("privDrawer").hidden = true; localStorage.setItem("ss_privacy", "1"); });
  on("askForm", "submit", (e) => {
    e.preventDefault();
    const q = $("askInput").value.trim();
    if (!q) return;
    showScanner();
    markOnboarded();
    const dom = parseDomLite(q);
    if (dom) {
      state.lastDom = dom;
      $("hybridPill").textContent = "DOM-lite";
      $("hybridPill").classList.add("on");
    }
    state.lastText = [q, state.lastText].filter(Boolean).join("\n");
    applyQuery(state.lastText || q);
  });
  on("nextBtn", "click", () => {
    if (!state.current) return;
    state.stepIndex = Math.min(state.current.steps.length - 1, state.stepIndex + 1);
    if (state.progress) state.progress.index = state.stepIndex;
    highlightStep();
    renderFlow();
  });
  on("dismissBtn", "click", () => {
    $("tipBody").hidden = true;
    $("emptyTip").hidden = false;
    clearArrow();
  });
  on("tipSteps", "click", (e) => {
    const speakBtn = e.target.closest("[data-speak]");
    if (speakBtn && state.current) {
      e.stopPropagation();
      speak(normalizeStep(state.current.steps[Number(speakBtn.dataset.speak)]).text);
      return;
    }
    const li = e.target.closest("li");
    if (!li) return;
    state.stepIndex = Number(li.dataset.i);
    if (state.progress) state.progress.index = state.stepIndex;
    highlightStep();
    renderFlow();
  });
  on("related", "click", (e) => {
    const btn = e.target.closest("[data-alt]");
    if (!btn) return;
    const entry = allEntries().find((x) => x.id === btn.dataset.alt);
    if (entry) renderResult(entry, { source: "related", confidence: 0.7, alternatives: [], query: entry.match_phrases?.[0] || "" });
  });
  on("flowBox", "click", (e) => {
    const btn = e.target.closest("[data-alt]");
    if (!btn) return;
    const entry = allEntries().find((x) => x.id === btn.dataset.alt);
    if (entry) renderResult(entry, { source: "stuck", confidence: 0.65, alternatives: [], query: entry.match_phrases?.[0] || "" });
  });
  $("sampleList").innerHTML = SAMPLES.map((s) =>
    `<button class="sample" data-sample="${s.id}"><b>${s.title}</b><span>${s.blurb}</span></button>`
  ).join("");
  on("sampleList", "click", (e) => {
    const btn = e.target.closest("[data-sample]");
    if (!btn) return;
    const sample = SAMPLES.find((s) => s.id === btn.dataset.sample);
    if (sample) loadSample(sample);
  });
  on("howDrawer", "click", (e) => { if (e.target.id === "howDrawer") e.target.hidden = true; });
  on("histDrawer", "click", (e) => { if (e.target.id === "histDrawer") e.target.hidden = true; });
  on("privDrawer", "click", (e) => { if (e.target.id === "privDrawer") e.target.hidden = true; });
  on("diffDrawer", "click", (e) => { if (e.target.id === "diffDrawer") e.target.hidden = true; });
  on("keysDrawer", "click", (e) => { if (e.target.id === "keysDrawer") e.target.hidden = true; });
  on("commDrawer", "click", (e) => { if (e.target.id === "commDrawer") e.target.hidden = true; });
  on("sidekickDrawer", "click", (e) => { if (e.target.id === "sidekickDrawer") e.target.hidden = true; });
  on("srcDrawer", "click", (e) => { if (e.target.id === "srcDrawer") e.target.hidden = true; });

  on("voiceBtn", "click", toggleVoice);
  on("recBtn", "click", toggleRecord);
  on("beforeBtn", "click", () => captureDiffSide("before"));
  on("afterBtn", "click", () => captureDiffSide("after"));
  on("diffBtn", "click", showDiff);
  on("diffClose", "click", () => { $("diffDrawer").hidden = true; });
  on("keysBtn", "click", () => { paintShortcuts(); $("keysDrawer").hidden = false; });
  on("keysClose", "click", () => { $("keysDrawer").hidden = true; });
  on("sidekickBtn", "click", copySidekick);
  on("sidekickClose", "click", () => { $("sidekickDrawer").hidden = true; });
  on("copySidekickBtn", "click", async () => {
    const ok = await copyText($("sidekickText").value);
    toast(ok ? "Copied." : "Select and copy.");
  });
  on("exportBtn", "click", exportPackage);
  on("srcBtn", "click", () => { paintSources(); $("srcDrawer").hidden = false; });
  on("srcClose", "click", () => { $("srcDrawer").hidden = true; });
  on("commBtn", "click", async () => { await refreshCommunity(); $("commDrawer").hidden = false; });
  on("commClose", "click", () => { $("commDrawer").hidden = true; });
  on("workedBtn", "click", async () => {
    if (!state.current) return;
    toast("Marked as worked on this device. Thanks — ranking stays local.");
    logRec("worked", { id: state.current.id });
    if (state.current.local) await bumpCommunity(state.current.id, true);
  });
  on("nopeBtn", "click", () => {
    toast("Noted. Try a related playbook or Stuck? for an alternate path.");
    logRec("nope", { id: state.current?.id });
  });
  on("commForm", "submit", async (e) => {
    e.preventDefault();
    const banner = $("commBanner").value.trim();
    const steps = $("commSteps").value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!banner || steps.length < 2) return toast("Need the banner text and at least two steps.");
    await upsertCommunity({
      banner,
      steps,
      category: $("commCat").value,
      target_ui_hint: $("commHint").value.trim() || "Community fix",
      explanation: $("commWhy").value.trim(),
      cause: $("commWhy").value.trim()
    });
    $("commForm").reset();
    await refreshCommunity();
    state.fuse = buildIndex(allEntries());
    toast("Saved locally. Export to share with a teammate — nothing is uploaded.");
  });
  on("commExport", "click", () => {
    downloadJson("storescope-community.json", { version: 1, entries: state.community });
  });
  on("commImport", "change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      await importCommunity(json);
      await refreshCommunity();
      state.fuse = buildIndex(allEntries());
      toast("Imported local known issues.");
    } catch {
      toast("Could not read that JSON.");
    }
  });
  on("copyBmBtn", "click", async () => {
    const ok = await copyText(BOOKMARKLET);
    toast(ok ? "Bookmarklet copied. Bookmark it, open Shopify admin, click it, then paste here." : "Select the bookmarklet text.");
  });
  on("howBtnMini", "click", () => { $("howDrawer").hidden = false; });
  on("cloudBtn", "click", () => { paintCloudForm(); $("cloudDrawer").hidden = false; });
  on("cloudClose", "click", () => { $("cloudDrawer").hidden = true; });
  on("cloudDrawer", "click", (e) => { if (e.target.id === "cloudDrawer") e.target.hidden = true; });
  on("cloudSave", "click", saveCloudForm);
  on("chatClose", "click", () => { $("chatDrawer").hidden = true; });
  on("chatDrawer", "click", (e) => { if (e.target.id === "chatDrawer") e.target.hidden = true; });
  on("chatForm", "submit", (e) => {
    e.preventDefault();
    runChat(($("chatInput").value || "").trim());
  });
  on("chatLog", "click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) {
      const entry = allEntries().find((x) => x.id === open.dataset.open);
      if (entry) {
        $("chatDrawer").hidden = true;
        showScanner();
        renderResult(entry, { source: "chat", confidence: 0.8, alternatives: [], query: entry.match_phrases?.[0] || "" });
      }
      return;
    }
    const copy = e.target.closest("#copyHandoff");
    if (copy) copyHandoff();
  });
  on("histList", "click", (e) => {
    const art = e.target.closest("[data-reopen]");
    if (!art || !art.dataset.reopen) return;
    const entry = allEntries().find((x) => x.id === art.dataset.reopen);
    if (!entry) return;
    $("histDrawer").hidden = true;
    showScanner();
    renderResult(entry, { source: "history", confidence: 1, alternatives: [], query: entry.match_phrases?.[0] || "" });
  });

  document.addEventListener("keydown", (e) => {
    const act = shortcutFromEvent(e);
    if (!act) return;
    if (act !== "close" && act !== "ask") e.preventDefault();
    if (act === "scan") runScan();
    if (act === "next") $("nextBtn")?.click();
    if (act === "back" && state.current) {
      state.stepIndex = Math.max(0, state.stepIndex - 1);
      if (state.progress) state.progress.index = state.stepIndex;
      highlightStep();
      renderFlow();
    }
    if (act === "done") onDidStep();
    if (act === "rescan") runScan({ reason: "verify-step" });
    if (act === "stuck") toggleStuck();
    if (act === "diff") state.before && !state.after ? captureDiffSide("after") : state.before && state.after ? showDiff() : captureDiffSide("before");
    if (act === "voice") toggleVoice();
    if (act === "sidekick") copySidekick();
    if (act === "ask") { e.preventDefault(); $("askInput")?.focus(); }
    if (act === "history") $("histBtn")?.click();
    if (act === "close") {
      document.querySelectorAll(".drawer-back").forEach((d) => { d.hidden = true; });
    }
  });

  wireShare();
  window.addEventListener("online", setOnlineUi);
  window.addEventListener("offline", setOnlineUi);
  window.addEventListener("resize", () => { if (state.current) drawArrow(currentArrow(), { bands: state.lastVision?.bands || [] }); });
  if (state.voice) $("voiceBtn")?.classList.add("on");
  $("voiceBtn").hidden = !canSpeak();
}

async function boot() {
  wireUi();
  setOnlineUi();
  applyEmbedUi();
  showLanding(!hasSeenOnboarding());
  if (!localStorage.getItem("ss_privacy")) $("privDrawer").hidden = false;

  try {
    const { entries, errors, pack } = await loadDictionaries();
    state.pack = pack;
    state.community = await listCommunity().catch(() => []);
    state.entries = entries;
    state.fuse = buildIndex(allEntries());
    state.ready = true;
    $("dictPill").textContent = `${allEntries().length} playbooks`;
    if (errors.length) toast("Some dictionaries failed to load.");
    applyInbound();
  } catch (err) {
    toast("Could not load the local dictionary.");
    console.error(err);
  }

  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("./sw.js"); } catch { /* optional */ }
  }
}

boot();
