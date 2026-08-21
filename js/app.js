import { loadDictionaries, buildIndex, searchDictionary, fallbackAnswer, detectScreen, findById } from "./dictionary.js";
import { saveSession, listSessions, clearSessions, newRecording, recordEvent, saveRecording, diagnosticPackage, downloadJson, listCommunity, upsertCommunity, communityAsEntries, importCommunity, bumpCommunity, getRanks, bumpRank, rankBoost } from "./session.js";
import { canCapture, startTabCapture, stopStream, isEmbedded, captureBlockReason, captureHelp, isMobile } from "./capture.js";
import { ocrAvailable, recognize, frameToCanvas } from "./ocr.js";
import { SAMPLES } from "./samples.js";
import {
  APP_URL, APP_TITLE, APP_BLURB, APP_VERSION, fixUrl, playbookMarkdown, playbookText,
  copyText, nativeShare, canNativeShare, parseInbound, socialLinks, downloadText
} from "./share.js";
import { detectColorBands, pickArrowFromVision, annotateVision, toneMeta } from "./banners.js";
import { BOOKMARKLET, parseDomLite, mergeSignals } from "./hybrid.js";
import { whyBlock, sidekickPrompt, helpSearchUrl } from "./explain.js";
import { flowFor, initProgress, markStep, autoAdvance, stuckOptions, percent } from "./guide.js";
import { snapshotFrom, diffSnapshots, mapDiffToPlaybook } from "./diff.js";
import { detectConflicts } from "./conflicts.js";
import { speak, hush, canSpeak, canListen, startCommandListen, stopCommandListen, SHORTCUTS, shortcutFromEvent } from "./voice.js";
import { scrubText, thumbnailDataUrl, looksLikeSecret } from "./privacy.js";
import { normalizeStep, handoffPrompt, handoffLinks, localReply } from "./chat.js";
import { getGeminiKey, getGrokKey, cloudOptIn, saveCloudSettings, askGemini, askGrok } from "./cloud.js";
import { looksHowTo, fillHowTo } from "./howto.js";
import { looksLikeAdminUrl, queryFromAdminUrl } from "./routes.js";
import { rememberShop, getShopOrigin, matchKnownPublic, fetchSitemapUrls, matchSitemap, listShops, pickShop, shopLabel } from "./publicPages.js";
import { searchShopContent, fillShopBox } from "./siteSearch.js";
import { polaroidFor } from "./polaroids.js";
import {
  takeSharedInbound, readUsefulClipboard, markClipAsked,
  holdWake, releaseWake, persistResume, loadResume, clearResume, listenLaunchQueue
} from "./pwa.js";
import { canPopOut, openPip, updatePip, setPipHandlers } from "./pip.js";

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
function closeMore() {
  if ($("moreDrawer")) $("moreDrawer").hidden = true;
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
  lastChatFound: null,
  ranks: {},
  walkOn: false,
  walkPaused: false,
  stepsExpanded: false,
  hub: null
};

function applyTheme(mode) {
  const next = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ss_theme", next);
  const meta = $("themeColor");
  if (meta) meta.setAttribute("content", next === "dark" ? "#000000" : "#f5f5f7");
  const btn = $("themeBtn");
  if (btn) btn.textContent = next === "dark" ? "☼" : "☾";
  try { syncPip(); } catch { /* pip not ready */ }
}

function initTheme() {
  const saved = localStorage.getItem("ss_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3400);
}

function setOnlineUi() {
  $("offlineBanner").hidden = navigator.onLine;
  if ($("netPill")) {
    $("netPill").hidden = navigator.onLine;
    $("netPill").textContent = navigator.onLine ? "Online" : "Offline";
    $("netPill").classList.toggle("warn", !navigator.onLine);
  }
}

function hasSeenOnboarding() { return localStorage.getItem("ss_onboarded") === "1"; }
function markOnboarded() { localStorage.setItem("ss_onboarded", "1"); }

function showLanding() {
  $("landing").hidden = false;
  $("scanner").hidden = true;
  if ($("onboardingFull")) $("onboardingFull").hidden = true;
  if ($("onboardingMini")) $("onboardingMini").hidden = true;
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

function shortStepLabel() {
  const t = currentStepText() || "";
  const cut = t.split(/[.→]/)[0].trim();
  return cut.slice(0, 42);
}

function drawArrow() {
  const svg = $("arrowLayer");
  if (svg) svg.innerHTML = "";
}

function currentArrow() {
  const entry = state.current;
  if (!entry) return null;
  const stepArrow = entry.step_arrows?.[state.stepIndex];
  const base = stepArrow || entry.arrow || { x: 0.5, y: 0.16 };
  const picked = pickArrowFromVision({ ...entry, arrow: base }, {
    bands: state.lastVision?.bands || [],
    words: state.lastVision?.words || [],
    bannerText: state.lastVision?.bannerText || "",
    toastText: state.lastVision?.toastText || ""
  });
  return {
    ...picked,
    n: state.stepIndex + 1,
    label: stepArrow?.label || picked.label || shortStepLabel()
  };
}

function allEntries() {
  return [...state.entries, ...communityAsEntries(state.community)];
}

function runSearch(query, extras = {}) {
  const entries = allEntries();
  if (!state.fuse || !entries.length) return { match: null, alternatives: [], source: "empty", confidence: 0 };
  return searchDictionary(entries, state.fuse, query, {
    ...extras,
    rankBoost: (entry) => rankBoost(entry, state.ranks)
  });
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
  ["tipSteps", "homeSteps"].forEach((id) => {
    const host = $(id);
    if (!host) return;
    host.classList.toggle("compact", !state.stepsExpanded);
    [...host.children].forEach((li, i) => {
      const wasCurrent = li.classList.contains("current");
      li.classList.toggle("current", i === state.stepIndex);
      li.classList.toggle("done", i < state.stepIndex);
      li.classList.toggle("upcoming", i > state.stepIndex);
      li.classList.toggle("done-fresh", wasCurrent && i < state.stepIndex);
    });
  });
  try { drawArrow(currentArrow(), { n: state.stepIndex + 1, label: shortStepLabel() }); } catch { /* optional */ }
  paintPolaroid(state.current);
  paintWalkHints();
  paintStepProgress();
  if (state.current) persistResume({ id: state.current.id, step: state.stepIndex, query: state.lastText });
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
  if ($("tipMeta")) $("tipMeta").innerHTML = `
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

function stepLines(entry) {
  return (entry?.steps || []).map((s) => (typeof s === "string" ? s : normalizeStep(s).text)).filter(Boolean);
}

function paintPolaroid(entry) {
  const shot = polaroidFor(entry);
  const tag = `${state.stepIndex + 1} · ${shortStepLabel()}`;
  ["homePolaroid", "tipPolaroid"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    if (!shot) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = `<img src="${esc(shot.image)}" alt="">
      <span class="spot-tag">${esc(tag)}</span>
      <span>${esc(shot.caption)}</span>`;
  });
}

function paintStepList(hostId, entry, current) {
  const host = $(hostId);
  if (!host) return;
  const steps = stepLines(entry);
  host.classList.toggle("compact", !state.stepsExpanded);
  host.innerHTML = steps.length
    ? steps.map((step, i) => `
    <li class="${i === current ? "current" : i < current ? "done" : "upcoming"}" data-i="${i}">
      <span class="n">${i + 1}</span>
      <p>${esc(step)}</p>
    </li>`).join("")
    : `<li class="current"><span class="n">1</span><p>Open Shopify admin search and type the problem in your own words.</p></li>`;
}

function renderResult(entry, meta) {
  state.current = entry;
  state.lastMeta = meta || {};
  state.stepIndex = 0;
  try {
    const flow = flowFor(entry, state.pack.flows);
    state.progress = initProgress(flow, entry);
  } catch {
    state.progress = null;
  }
  state.stepsExpanded = false;
  walkHalt();
  hideDenied();
  if ($("emptyTip")) $("emptyTip").hidden = true;
  if ($("tipBody")) $("tipBody").hidden = false;
  const title = entry.target_ui_hint || "What to do";
  const expl = digestLine(entry);
  if ($("tipTitle")) $("tipTitle").textContent = title;
  if ($("tipExpl")) $("tipExpl").textContent = expl;
  paintStepList("tipSteps", entry, 0);
  paintRelated(meta.alternatives || []);
  if ($("ocrText")) $("ocrText").textContent = state.lastText || "";
  if ($("homeResult")) $("homeResult").hidden = false;
  if ($("homeTitle")) $("homeTitle").textContent = title;
  if ($("homeExpl")) $("homeExpl").textContent = expl;
  paintStepList("homeSteps", entry, 0);
  paintPolaroid(entry);
  paintWalkHints();
  paintStepProgress();
  persistResume({ id: entry.id, step: 0, query: meta.query || state.lastText });
  try { renderWhy(); } catch { /* keep steps */ }
  try { renderFlow(); } catch { /* keep steps */ }
  try { renderConflicts(meta.query || state.lastText); } catch { /* optional */ }
  try { drawArrow(currentArrow(), { bands: state.lastVision?.bands || [] }); } catch { /* optional */ }
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

function findPlaybook(id) {
  return allEntries().find((x) => x.id === id)
    || (state.lastMeta?.alternatives || []).find((x) => x.id === id)
    || null;
}

function paintRelated(alts) {
  const html = (alts || []).map((a) => {
    const href = a.public_url || a.live_url || "";
    const extra = href && /^https?:/i.test(href)
      ? `<a class="linkish" href="${esc(href)}" target="_blank" rel="noopener">Open page</a>`
      : "";
    return `<button class="sample" type="button" data-alt="${esc(a.id)}"><b>${esc(a.target_ui_hint || hubTitle(a))}</b><span>${esc(a.cause || a.explanation || "")}</span>${extra}</button>`;
  }).join("");
  ["related", "homeRelated"].forEach((id) => {
    const host = $(id);
    if (host) host.innerHTML = html;
  });
}

function applyQuery(query, extras = {}) {
  const raw = String(query || "").trim();
  const origin = rememberShop(raw);
  let q = raw;
  const routed = queryFromAdminUrl(q);
  if (routed) q = routed;
  const onlyUrl = origin && /^https?:\/\//i.test(raw) && raw.split(/\s+/).length === 1;
    if (onlyUrl) {
    toast(`Shop saved: ${origin}. Type refund policy — no need to paste the URL every time.`);
    try { paintSavedShops(); } catch { /* ui */ }
    q = extras.keepUrlQuery ? q : "refund policy";
  }
  const screen = detectScreen(q);
  let found = { match: null, alternatives: [], source: "empty", confidence: 0 };
  try {
    found = runSearch(q, {
      preferredCategory: extras.category || screen.category,
      bannerText: state.lastVision?.bannerText,
      toastText: state.lastVision?.toastText,
      kind: state.lastVision?.kind,
      preferErrors: extras.preferErrors !== false
    });
  } catch {
    found = { match: null, alternatives: [], source: "error", confidence: 0 };
  }
  const publicHits = matchKnownPublic(q, origin);
  const alts = [...publicHits, ...(found.alternatives || [])]
    .filter((a, i, arr) => a.id !== found.match?.id && arr.findIndex((x) => x.id === a.id) === i)
    .slice(0, 8);
  const localHit = found.match || publicHits[0];
  const entry = localHit || fallbackAnswer(q, alts, screen);
  renderResult(entry, {
    ...found,
    alternatives: alts.filter((a) => a.id !== entry.id).slice(0, 6),
    source: found.match ? found.source : (publicHits[0] ? "public-page" : "local-fallback"),
    confidence: found.match ? found.confidence : (publicHits[0] ? 0.86 : Math.max(found.confidence, 0.3)),
    query: q
  });
  paintRelated(state.lastMeta?.alternatives || []);
  if (!localHit && looksHowTo(q)) {
    toast("Not in the local playbook — turning that into steps.");
    fillHowTo(q).then((howto) => {
      if (!howto || state.lastMeta?.query !== q) return;
      renderResult(howto, {
        match: howto,
        alternatives: alts.filter((a) => a.id !== howto.id).slice(0, 6),
        source: howto.source_category_db || "howto",
        confidence: 0.72,
        query: q
      });
      paintRelated(state.lastMeta?.alternatives || []);
    }).catch(() => {});
  }
  if (origin) {
    fetchSitemapUrls(origin).then((urls) => {
      const extra = matchSitemap(q, origin, urls);
      if (!extra.length || !state.current) return;
      const more = extra.filter((e) => e.id !== state.current.id);
      const merged = [...more, ...(state.lastMeta.alternatives || [])]
        .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
        .slice(0, 8);
      state.lastMeta.alternatives = merged;
      paintRelated(merged);
    }).catch(() => {});
  }
  return entry;
}

function digestLine(entry) {
  const raw = String(entry?.cause || entry?.explanation || "").trim();
  const first = raw.split(/[.!?]/)[0].trim();
  return (first || raw).slice(0, 160);
}

function maybeSpeak() {
  if (state.walkOn) return;
  if (!state.voice || !state.current) return;
  walkSpeakCurrent();
}

function currentStepText() {
  if (!state.current) return "";
  const raw = state.current.steps?.[state.stepIndex] || state.current.cause;
  return typeof raw === "string" ? raw : normalizeStep(raw).text;
}

function walkSpeakCurrent() {
  if (!state.current) return;
  const steps = state.current.steps || [];
  const n = Math.max(1, steps.length);
  const i = state.stepIndex + 1;
  const line = `Step ${i} of ${n}. ${currentStepText()}`;
  speak(line, { rate: 0.94 });
}

function paintStepProgress() {
  const steps = state.current?.steps || [];
  const n = Math.max(1, steps.length);
  const i = Math.min((state.stepIndex || 0) + 1, n);
  const label = `Step ${i} of ${n}`;
  ["homeStepProgress", "tipStepProgress"].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = label;
  });
  const nxt = steps[state.stepIndex + 1];
  ["homeThenNext", "tipThenNext"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    if (nxt) {
      el.hidden = false;
      el.textContent = `Next: ${String(nxt).split(/[.→]/)[0].trim().slice(0, 80)}`;
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  });
}

function paintWalkHints() {
  const playing = state.walkOn && !state.walkPaused;
  document.querySelectorAll("[data-walk='play']").forEach((btn) => {
    btn.textContent = playing ? "Pause" : "Play this fix";
    btn.classList.toggle("is-pause", playing);
  });
  const msg = !state.current
    ? ""
    : !canSpeak()
      ? "This browser cannot read steps aloud. Use Next step."
      : playing
        ? "Playing. Tap Pause, or Next step when you’re done."
        : state.walkOn
          ? "Paused. Tap Play this fix, or Next step."
          : "Tap Play this fix, then do that tap in Shopify.";
  document.querySelectorAll("[data-walk-hint]").forEach((el) => { el.textContent = msg; });
  syncPip();
}

function pipPayload() {
  const steps = state.current?.steps || [];
  return {
    digest: digestLine(state.current || {}),
    n: state.stepIndex + 1,
    total: Math.max(1, steps.length),
    step: currentStepText(),
    playing: !!(state.walkOn && !state.walkPaused)
  };
}

function syncPip() {
  try { updatePip(pipPayload()); } catch { /* no pip */ }
}

function showPipButtons() {
  const on = canPopOut() && !isMobile();
  ["homePip", "tipPip"].forEach((id) => {
    const el = $(id);
    if (el) el.hidden = !on;
  });
}

async function popOutStep() {
  if (!state.current) return toast("Search or upload first.");
  if (!canPopOut()) return toast("Pop out needs Chrome or Edge.");
  try {
    await openPip(pipPayload());
    toast("Drag the corner to resize. Keep Shopify underneath.");
  } catch (err) {
    toast(err.message || "Could not pop out.");
  }
}

let walkCmdAt = 0;
function onWalkHeard(cmd) {
  const now = Date.now();
  if (now - walkCmdAt < 900) return;
  walkCmdAt = now;
  if (cmd === "pause") walkPause();
  else if (cmd === "continue") walkContinue();
  else if (cmd === "repeat") walkPlay({ resume: true });
}

function walkToggle() {
  if (state.walkOn && !state.walkPaused) walkPause();
  else walkPlay();
}

function walkPlay({ resume = false } = {}) {
  if (!state.current) return toast("Search or upload first.");
  if (!canSpeak()) return toast("This browser cannot read steps aloud.");
  state.walkOn = true;
  state.walkPaused = false;
  walkSpeakCurrent();
  paintWalkHints();
  if (!resume) toast("Playing this step.");
}

function walkPause() {
  hush();
  if (!state.walkOn) return;
  state.walkPaused = true;
  paintWalkHints();
  toast("Paused.");
}

function walkContinue() {
  if (!state.current) return;
  const steps = state.current.steps || [];
  if (!state.walkOn) {
    walkPlay();
    return;
  }
  if (state.stepIndex >= steps.length - 1) {
    hush();
    state.walkPaused = true;
    paintWalkHints();
    toast("That was the last step.");
    return;
  }
  state.stepIndex += 1;
  if (state.progress) state.progress.index = state.stepIndex;
  highlightStep();
  renderFlow();
  state.walkOn = true;
  state.walkPaused = false;
  if (canListen()) startCommandListen((c) => onWalkHeard(c));
  walkSpeakCurrent();
  paintWalkHints();
}

function walkHalt() {
  hush();
  stopCommandListen();
  state.walkOn = false;
  state.walkPaused = false;
  paintWalkHints();
}

const HUBS = {
  payments: { label: "Payments", blurb: "Payouts, gateways, gift cards, BNPL, tax." },
  checkout: { label: "Checkout", blurb: "Cart, discounts, Shop Pay buttons, accounts." },
  shipping: { label: "Shipping", blurb: "Rates, pickup, weight, carriers." },
  themes: { label: "Themes", blurb: "Layout, mobile, menus. Duplicate first — not Edit code." },
  products: { label: "Products", blurb: "CSV, variants, collections, metafields." },
  inventory: { label: "Inventory", blurb: "Locations, overselling, transfers, bundles." },
  apps: { label: "Apps", blurb: "Embeds, pixels, Klaviyo, Printful, leftovers." },
  seo: { label: "SEO", blurb: "Redirects, sitemap, schema, Search Console." },
  domains: { label: "Domains", blurb: "SSL, DNS, Markets domains." },
  admin: { label: "Admin", blurb: "Staff, billing, policies, 2FA." },
  howto: { label: "How to", blurb: "Add text, logo, pages, checkout line. Save a how-to you found. You tap — we never change the shop." }
};

function hubTitle(entry) {
  return (entry.synonyms && entry.synonyms[0]) || entry.target_ui_hint || entry.id;
}

function openHub(hub) {
  if (!HUBS[hub]) return;
  state.hub = hub;
  markOnboarded();
  if ($("catGrid")) $("catGrid").hidden = true;
  if ($("hubPanel")) $("hubPanel").hidden = false;
  if ($("hubTitle")) $("hubTitle").textContent = HUBS[hub].label;
  if ($("hubBlurb")) $("hubBlurb").textContent = HUBS[hub].blurb;
  if ($("hubSearch")) $("hubSearch").value = "";
  if ($("mineHowTo")) $("mineHowTo").hidden = hub !== "howto";
  if (hub === "howto" && $("mineAsk") && !$("mineAsk").value && state.lastText) {
    $("mineAsk").value = state.lastText;
  }
  paintHubList("");
  $("hubSearch")?.focus();
}

function closeHub() {
  state.hub = null;
  if ($("hubPanel")) $("hubPanel").hidden = true;
  if ($("catGrid")) $("catGrid").hidden = false;
}

function paintSavedShops() {
  const host = $("savedShops");
  const originInput = $("siteOrigin");
  if (!host) return;
  const shops = listShops();
  const cur = getShopOrigin();
  host.hidden = !shops.length;
  host.innerHTML = shops.map((o) =>
    `<button type="button" class="shop-chip${o === cur ? " on" : ""}" data-shop="${esc(o)}">${esc(shopLabel(o))}</button>`
  ).join("") + `<button type="button" class="shop-chip add" id="shopAdd" data-shop="">+ add</button>`;
  if (originInput) {
    originInput.hidden = !!shops.length && originInput.dataset.force !== "1";
    if (cur) originInput.value = cur;
  }
}

function paintHubList(q) {
  const host = $("hubList");
  if (!host || !state.hub) return;
  const hay = String(q || "").toLowerCase().trim();
  const isHowTo = (e) => (e.tags || []).includes("howto") || e.source_category_db === "howto" || /howto/i.test(e.id || "");
  let rows = state.hub === "howto"
    ? allEntries().filter(isHowTo)
    : allEntries().filter((e) => e.hub === state.hub);
  if (hay) {
    rows = rows.filter((e) => {
      const blob = [hubTitle(e), e.target_ui_hint, e.cause, ...(e.match_phrases || []), ...(e.synonyms || [])].join(" ").toLowerCase();
      return blob.includes(hay);
    });
  }
  rows.sort((a, b) => (a.rank || 999) - (b.rank || 999) || String(hubTitle(a)).localeCompare(hubTitle(b)));
  host.innerHTML = rows.length
    ? rows.slice(0, 80).map((e) =>
      `<button class="sample" type="button" data-open="${esc(e.id)}"><b>${esc(hubTitle(e))}</b><span>${esc(e.target_ui_hint || "")}</span></button>`
    ).join("")
    : `<p class="empty">Nothing in ${HUBS[state.hub].label} matches. Try another word.</p>`;
}

async function saveMineHowTo({ question, steps, hint }) {
  const q = String(question || "").trim();
  const lines = (steps || []).map((s) => String(s || "").trim()).filter(Boolean);
  if (looksLikeSecret(q) || lines.some((s) => looksLikeSecret(s))) {
    return toast("That looks like a secret key. Paste the steps only.");
  }
  if (q.length < 4) return toast("Type the question you asked.");
  if (lines.length < 2) return toast("Need at least two steps.");
  const rec = await upsertCommunity({
    banner: q,
    steps: lines.slice(0, 8),
    category: "general",
    target_ui_hint: hint || q.slice(0, 80),
    explanation: "Saved on this device from a how-to you found.",
    cause: "Your saved how-to."
  });
  state.community = await listCommunity();
  try { state.fuse = buildIndex(allEntries()); } catch { /* still searchable by phrase */ }
  if (state.hub === "howto") paintHubList($("hubSearch")?.value || "");
  toast("Saved on this device. Search will find it.");
  return rec;
}

async function saveCurrentHowTo() {
  if (!state.current) return toast("Find or paste a how-to first.");
  const q = state.lastMeta?.query || state.lastText || state.current.match_phrases?.[0] || hubTitle(state.current);
  await saveMineHowTo({
    question: q,
    steps: stepLines(state.current),
    hint: state.current.target_ui_hint || q
  });
}

async function copyStepsForFriend() {
  if (!state.current) return toast("Find a fix first.");
  const text = playbookText(state.current);
  const ok = await copyText(text);
  if (ok) {
    toast("Steps copied. Paste them in a message to a friend.");
    return;
  }
  if (canNativeShare()) {
    try {
      await nativeShare({ title: `Storescope: ${state.current.target_ui_hint}`, text, url: fixUrl(state.current.id) });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  }
  toast("Copy failed. Long-press the steps and copy.");
}

function logRec(type, payload) {
  if (!state.recordingOn || !state.recording) return;
  recordEvent(state.recording, type, payload);
}

async function runScan({ textOverride, reason } = {}) {
  if (!state.ready) return toast("Just a moment — still starting up.");
  $("scanBtn").disabled = true;
  $("scanBtn").textContent = "Reading…";
  await holdWake();
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
        $("ocrStatus").textContent = "Reading the screen…";
        const result = await recognize(src, (m) => {
          if (m.progress) $("ocrStatus").textContent = `Reading… ${Math.round(m.progress * 100)}%`;
        });
        text = result.text;
        canvas = result.canvas;
        const bands = result.bands?.length ? result.bands : detectColorBands(canvas);
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
        throw new Error("Need a connection the first time we read a screen. Try again online, or upload after you reconnect.");
      } else {
        throw new Error("Could not read the screen. Upload a clearer screenshot.");
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
    toast("Follow the numbered steps.");
    if (isMobile()) {
      ($("tipBody") || $("homeResult"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    toast(err.message || "Could not read the screen");
    $("ocrStatus").textContent = err.message || "Could not read the screen";
  } finally {
    $("scanBtn").disabled = false;
    $("scanBtn").textContent = "Find the problem";
    releaseWake();
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
  document.body.classList.toggle("is-phone", mobile);
  if (mobile || blocked === "unsupported") {
    if (start) start.textContent = "Upload a screenshot";
    if (upload) upload.hidden = true;
    if ($("shotDrop")) $("shotDrop").hidden = true;
    $("capNote").textContent = "On a phone: screenshot Shopify, then tap Upload and pick it from Photos." ;
    const s2 = $("stepTwoCopy");
    if (s2) s2.textContent = "Screenshot the Shopify banner, then upload it from Photos.";
    const s2h = $("stepTwoTitle");
    if (s2h) s2h.textContent = "Upload the screenshot";
  } else if (blocked === "iframe") {
    $("capNote").textContent = "This preview cannot share tabs. Open in a new tab, or upload a screenshot here.";
    if (start) start.textContent = "Upload a screenshot";
  } else if (blocked === "insecure") {
    $("capNote").textContent = "Upload a screenshot instead.";
    if (start) start.textContent = "Upload a screenshot";
  } else {
    if (start) start.textContent = "Share Shopify tab";
    if (upload) {
      upload.hidden = false;
      upload.textContent = "Upload a screenshot";
    }
    $("capNote").textContent = "On a computer: share the Shopify tab, or drop / paste a screenshot.";
  }
}

async function beginCapture() {
  markOnboarded();
  const blocked = captureBlockReason();
  // Phones: stay on home and open Photos. Do not dump them into an empty scanner.
  if (blocked === "mobile" || blocked === "unsupported" || blocked === "insecure") {
    $("fileInput")?.click();
    return;
  }
  showScanner();
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
    setLiveStatus("Watching Shopify", true);
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      setLiveStatus("Share ended");
      state.stream = null;
    });
    toast("Choose the Shopify admin tab — not this one.");
    setTimeout(() => {
      if (state.stream && state.lastSource) runScan();
    }, 900);
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
  $("ocrStatus").textContent = "Demo";
  applyQuery(sample.text);
}

async function onFile(file) {
  const name = (file && file.name) || "";
  const typed = file && (file.type || "");
  const looksImage = !typed || typed.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(name);
  if (!file || !looksImage) return toast("Pick a screenshot from Photos.");
  markOnboarded();
  showScanner();
  stopCapture();
  hideDenied();
  const url = URL.createObjectURL(file);
  setStill(url);
  setLiveStatus("Screenshot");
  toast("Reading your screenshot…");
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
        <ol>${(r.steps || []).map((s) => `<li>${esc(typeof s === "string" ? s : (s?.text || s))}</li>`).join("")}</ol>
      </article>
    `).join("")
    : `<p class="empty">No scans yet. Run “What's wrong?” and the playbook will land here — text only, no images.</p>`;
  state.historyRows = rows;
}

function applyInbound() {
  const inbound = parseInbound();
  if (inbound.action === "upload") {
    $("fileInput")?.click();
    return;
  }
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
    if ($("homeAskInput")) $("homeAskInput").value = inbound.q || q;
    applyQuery(q);
    $("homeResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Opened from a shortcut.");
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
  on("shareBtn", "click", () => { closeMore(); paintShareDrawer(state.current ? "fix" : "app"); });
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

function openChat(prefill) {
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
    <span class="note">No key needed — copy and paste into any chat:</span>
    <button class="ghost" type="button" id="copyHandoff">Copy prompt</button>
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
  on("stopBtn", "click", () => { walkHalt(); stopCapture(); showLanding(!hasSeenOnboarding()); });
  on("moreBtn", "click", () => {
    $("moreDrawer").hidden = false;
  });
  on("privBtn", "click", () => {
    closeMore();
    $("privDrawer").hidden = false;
  });
  on("moreClose", "click", () => { $("moreDrawer").hidden = true; });
  on("moreDrawer", "click", (e) => { if (e.target.id === "moreDrawer") e.target.hidden = true; });
  on("howBtn", "click", () => { closeMore(); $("howDrawer").hidden = false; });
  on("howClose", "click", () => { $("howDrawer").hidden = true; });
  on("histBtn", "click", async () => { closeMore(); await refreshHistory(); $("histDrawer").hidden = false; });
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
    const last = Math.max(0, (state.current.steps || []).length - 1);
    if (state.stepIndex >= last) {
      toast("That was the last step.");
      walkPause();
      return;
    }
    state.stepIndex += 1;
    if (state.progress) state.progress.index = state.stepIndex;
    highlightStep();
    renderFlow();
    if (state.walkOn) {
      state.walkPaused = false;
      walkSpeakCurrent();
      paintWalkHints();
    }
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
  const openRelated = (e) => {
    if (e.target.closest("a")) return;
    const btn = e.target.closest("[data-alt]");
    if (!btn) return;
    const entry = findPlaybook(btn.dataset.alt);
    if (entry) renderResult(entry, { source: "related", confidence: 0.7, alternatives: (state.lastMeta?.alternatives || []).filter((a) => a.id !== entry.id), query: entry.match_phrases?.[0] || "" });
  };
  on("related", "click", openRelated);
  on("homeRelated", "click", openRelated);
  on("flowBox", "click", (e) => {
    const btn = e.target.closest("[data-alt]");
    if (!btn) return;
    const entry = allEntries().find((x) => x.id === btn.dataset.alt);
    if (entry) renderResult(entry, { source: "stuck", confidence: 0.65, alternatives: [], query: entry.match_phrases?.[0] || "" });
  });
  if ($("sampleList")) {
    $("sampleList").innerHTML = SAMPLES.map((s) =>
      `<button class="sample" data-sample="${s.id}"><b>${s.title}</b><span>${s.blurb}</span></button>`
    ).join("");
  }
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
  on("keysBtn", "click", () => { closeMore(); paintShortcuts(); $("keysDrawer").hidden = false; });
  on("keysClose", "click", () => { $("keysDrawer").hidden = true; });
  on("sidekickBtn", "click", copySidekick);
  on("sidekickClose", "click", () => { $("sidekickDrawer").hidden = true; });
  on("copySidekickBtn", "click", async () => {
    const ok = await copyText($("sidekickText").value);
    toast(ok ? "Copied." : "Select and copy.");
  });
  on("exportBtn", "click", exportPackage);
  on("srcBtn", "click", () => { closeMore(); paintSources(); $("srcDrawer").hidden = false; });
  on("srcClose", "click", () => { $("srcDrawer").hidden = true; });
  on("commBtn", "click", async () => { closeMore(); await refreshCommunity(); $("commDrawer").hidden = false; });
  on("commClose", "click", () => { $("commDrawer").hidden = true; });
  on("workedBtn", "click", async () => {
    if (!state.current) return;
    try {
      const rec = await bumpRank(state.current.id, true);
      if (rec) state.ranks[state.current.id] = rec;
    } catch { /* local only */ }
    clearResume();
    toast("Saved. We’ll show this one first next time.");
    logRec("worked", { id: state.current.id });
    if (state.current.local) await bumpCommunity(state.current.id, true);
  });
  on("nopeBtn", "click", async () => {
    if (state.current) {
      try {
        const rec = await bumpRank(state.current.id, false);
        if (rec) state.ranks[state.current.id] = rec;
      } catch { /* local only */ }
    }
    toast("Try one of the other suggestions below.");
    logRec("nope", { id: state.current?.id });
    const alts = state.lastMeta?.alternatives || [];
    if (alts[0]) renderResult(alts[0], { source: "nope", confidence: 0.6, alternatives: alts.slice(1), query: state.lastText });
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
  on("demoBtn", "click", () => {
    const first = SAMPLES[0];
    if (first) loadSample(first);
  });
  on("clipUse", "click", () => {
    const q = $("clipChip")?.dataset.query || "";
    if ($("clipChip")) $("clipChip").hidden = true;
    markClipAsked();
    if (!q) return;
    if ($("homeAskInput")) $("homeAskInput").value = q;
    markOnboarded();
    state.lastText = q;
    applyQuery(q);
    $("homeResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  on("clipSkip", "click", () => {
    if ($("clipChip")) $("clipChip").hidden = true;
    markClipAsked();
  });
  on("homeAsk", "submit", (e) => {
    e.preventDefault();
    const q = ($("homeAskInput")?.value || "").trim();
    if (!q) return toast("Type a few words from the problem.");
    if (looksLikeSecret(q)) return toast("That looks like a secret key. Type the Shopify banner instead.");
    markOnboarded();
    state.lastText = q;
    const go = () => {
      applyQuery(q);
      $("homeAskInput")?.blur();
      $("homeResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast(looksLikeAdminUrl(q) ? "Matched that admin page. Follow the steps." : "Follow the numbered steps.");
    };
    if (state.ready) return go();
    toast("Looking that up…");
    const started = Date.now();
    const wait = setInterval(() => {
      if (state.ready || Date.now() - started > 4000) {
        clearInterval(wait);
        go();
      }
    }, 80);
  });
  on("savedShops", "click", (e) => {
    const btn = e.target.closest("[data-shop]");
    if (!btn) return;
    const o = btn.getAttribute("data-shop") || "";
    if (!o) {
      if ($("siteOrigin")) {
        $("siteOrigin").hidden = false;
        $("siteOrigin").dataset.force = "1";
        $("siteOrigin").focus();
      }
      return;
    }
    pickShop(o);
    if ($("siteOrigin")) {
      $("siteOrigin").value = o;
      $("siteOrigin").dataset.force = "";
    }
    paintSavedShops();
    $("siteFind")?.focus();
  });
  on("siteAsk", "submit", async (e) => {
    e.preventDefault();
    const originVal = ($("siteOrigin")?.value || "").trim();
    const q = ($("siteFind")?.value || "").trim();
    if (!originVal && !getShopOrigin()) return toast("Paste your shop URL first (https://yourstore.com).");
    if (!q) return toast("Type the words you want to find on the shop.");
    if (looksLikeSecret(q) || looksLikeSecret(originVal)) return toast("That looks like a secret key. Type the shop text instead.");
    markOnboarded();
    rememberShop(originVal);
    try { paintSavedShops(); } catch { /* ui */ }
    if ($("siteOrigin") && fillShopBox()) $("siteOrigin").value = fillShopBox();
    toast("Looking on the shop…");
    try {
      const out = await searchShopContent(originVal || fillShopBox(), q);
      state.lastText = q;
      renderResult(out.entry, {
        source: out.foundOn ? "shop-page" : "shop-map",
        confidence: out.foundOn ? 0.9 : 0.7,
        alternatives: out.alternatives,
        query: q
      });
      paintRelated(out.alternatives);
      $("homeResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast(out.foundOn ? "Found that text. Follow the steps to change it." : "Follow the steps to change that kind of text.");
    } catch (err) {
      toast(err.message || "Could not search the shop.");
    }
  });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-walk]");
    if (!btn) return;
    const act = btn.getAttribute("data-walk");
    if (act === "play" || act === "pause") walkToggle();
    if (act === "continue") $("nextBtn")?.click();
  });
  on("catGrid", "click", (e) => {
    const hubBtn = e.target.closest("[data-hub]");
    if (hubBtn) {
      openHub(hubBtn.getAttribute("data-hub"));
      return;
    }
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    const q = btn.getAttribute("data-cat") || "";
    if (q === "other") {
      $("homeAskInput")?.focus();
      toast("Type a few words from the problem.");
      return;
    }
    markOnboarded();
    if ($("homeAskInput")) $("homeAskInput").value = q;
    state.lastText = q;
    applyQuery(q);
    $("homeResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  on("hubBack", "click", closeHub);
  on("hubAsk", "submit", (e) => {
    e.preventDefault();
    paintHubList($("hubSearch")?.value || "");
  });
  on("hubSearch", "input", () => paintHubList($("hubSearch")?.value || ""));
  on("hubList", "click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const entry = allEntries().find((x) => x.id === btn.dataset.open);
    if (!entry) return;
    markOnboarded();
    state.lastText = hubTitle(entry);
    renderResult(entry, { source: "hub", confidence: 1, alternatives: [], query: hubTitle(entry) });
    $("homeResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const expandSteps = () => {
    state.stepsExpanded = !state.stepsExpanded;
    highlightStep();
    ["homeStepsAll", "tipStepsAll"].forEach((id) => {
      const el = $(id);
      if (el) el.textContent = state.stepsExpanded ? "Show this step only" : "Show all steps";
    });
  };
  on("homeStepsAll", "click", expandSteps);
  on("tipStepsAll", "click", expandSteps);
  on("coachOk", "click", () => {
    localStorage.setItem("ss_coach", "1");
    markOnboarded();
    if ($("coach")) $("coach").hidden = true;
  });
  on("homeNext", "click", () => $("nextBtn")?.click());
  on("homeCopySteps", "click", copyStepsForFriend);
  on("copyStepsBtn", "click", copyStepsForFriend);
  on("homePip", "click", popOutStep);
  on("tipPip", "click", popOutStep);
  on("homeWorked", "click", () => $("workedBtn")?.click());
  on("homeSteps", "click", (e) => {
    const li = e.target.closest("li");
    if (!li || !state.current) return;
    state.stepIndex = Number(li.dataset.i);
    if (state.progress) state.progress.index = state.stepIndex;
    highlightStep();
  });
  on("cloudBtn", "click", () => { closeMore(); paintCloudForm(); $("cloudDrawer").hidden = false; });
  on("chatBtn", "click", () => { closeMore(); openChat(state.lastText); });
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
  if ($("voiceBtn")) $("voiceBtn").hidden = true;
  setPipHandlers({
    play: () => walkToggle(),
    next: () => $("nextBtn")?.click()
  });
  showPipButtons();
}

async function boot() {
  initTheme();
  on("themeBtn", "click", () => {
    const now = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(now);
  });
  wireUi();
  setOnlineUi();
  applyEmbedUi();
  showLanding();
  if ($("coach")) $("coach").hidden = true;

  try {
    const { entries, errors, pack } = await loadDictionaries();
    state.pack = pack;
    state.community = await listCommunity().catch(() => []);
    state.ranks = await getRanks().catch(() => ({}));
    state.entries = entries;
    state.fuse = buildIndex(allEntries());
    state.ready = true;
    if ($("verPill")) $("verPill").textContent = `v${APP_VERSION}`;
    if ($("siteOrigin") && fillShopBox()) $("siteOrigin").value = fillShopBox();
    if ($("dictPill")) $("dictPill").textContent = "Ready";
    if (errors.length) console.warn("Some playbooks failed to load", errors);
    applyInbound();
    await consumeSharedLaunch();
    maybeShowClip();
    restoreIfNeeded();
  } catch (err) {
    toast("Could not start. Refresh the page.");
    console.error(err);
  }

  listenLaunchQueue((file) => { if (file) onFile(file); }, (href) => {
    try {
      const u = new URL(href, location.href);
      const q = u.searchParams.get("q");
      if (q) applyQuery(q);
    } catch { /* ignore */ }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (state.current) persistResume({ id: state.current.id, step: state.stepIndex, query: state.lastText });
      return;
    }
    holdWake();
    maybeShowClip();
  });

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      reg.update().catch(() => {});
    } catch { /* optional */ }
  }
}

async function consumeSharedLaunch() {
  const inbound = parseInbound();
  const shared = await takeSharedInbound();
  if (shared.file) {
    toast("Got the shared screenshot.");
    await onFile(shared.file);
    return;
  }
  if (shared.text) {
    if (looksLikeSecret(shared.text)) {
      toast("That looked like a secret key. It was not used.");
      return;
    }
    markOnboarded();
    if ($("homeAskInput")) $("homeAskInput").value = shared.text;
    applyQuery(shared.text);
    return;
  }
  if (inbound.shared && !shared.file && !shared.text) {
    toast("Share arrived with no picture. Upload a screenshot instead.");
  }
}

async function maybeShowClip() {
  const chip = $("clipChip");
  if (!chip || !chip.hidden) return;
  const t = await readUsefulClipboard();
  if (!t) return;
  chip.hidden = false;
  chip.dataset.query = t;
  if ($("clipPreview")) $("clipPreview").textContent = t.length > 72 ? `${t.slice(0, 72)}…` : t;
}

function restoreIfNeeded() {
  if (state.current) return;
  const rec = loadResume();
  if (!rec?.id) return;
  const entry = allEntries().find((e) => e.id === rec.id);
  if (!entry) return;
  renderResult(entry, { source: "resume", confidence: 1, alternatives: [], query: rec.query || rec.id });
  state.stepIndex = Math.min(rec.step || 0, (entry.steps || []).length - 1);
  if (state.progress) state.progress.index = state.stepIndex;
  highlightStep();
  toast("Picked up where you left off.");
}

boot();
reg = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      reg.update().catch(() => {});
    } catch { /* optional */ }
  }
}

async function consumeSharedLaunch() {
  const inbound = parseInbound();
  const shared = await takeSharedInbound();
  if (shared.file) {
    toast("Got the shared screenshot.");
    await onFile(shared.file);
    return;
  }
  if (shared.text) {
    if (looksLikeSecret(shared.text)) {
      toast("That looked like a secret key. It was not used.");
      return;
    }
    markOnboarded();
    if ($("homeAskInput")) $("homeAskInput").value = shared.text;
    applyQuery(shared.text);
    return;
  }
  if (inbound.shared && !shared.file && !shared.text) {
    toast("Share arrived with no picture. Upload a screenshot instead.");
  }
}

async function maybeShowClip() {
  const chip = $("clipChip");
  if (!chip || !chip.hidden) return;
  const t = await readUsefulClipboard();
  if (!t) return;
  chip.hidden = false;
  chip.dataset.query = t;
  if ($("clipPreview")) $("clipPreview").textContent = t.length > 72 ? `${t.slice(0, 72)}…` : t;
}

function restoreIfNeeded() {
  if (state.current) return;
  const rec = loadResume();
  if (!rec?.id) return;
  const entry = allEntries().find((e) => e.id === rec.id);
  if (!entry) return;
  renderResult(entry, { source: "resume", confidence: 1, alternatives: [], query: rec.query || rec.id });
  state.stepIndex = Math.min(rec.step || 0, (entry.steps || []).length - 1);
  if (state.progress) state.progress.index = state.stepIndex;
  highlightStep();
  toast("Picked up where you left off.");
}

boot();
lightStep();
  toast("Picked up where you left off.");
}

boot();
