import { scrubText, scrubObject } from "./privacy.js";

const DB_NAME = "storescope";
const VERSION = 3;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sessions")) {
        const os = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
        os.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("community")) {
        const os = db.createObjectStore("community", { keyPath: "id" });
        os.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("recordings")) {
        const os = db.createObjectStore("recordings", { keyPath: "id" });
        os.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("ranks")) {
        db.createObjectStore("ranks", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx, req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSession(entry) {
  const db = await openDb();
  const rec = {
    createdAt: Date.now(),
    query: scrubText(entry.query || ""),
    title: entry.title,
    explanation: entry.explanation,
    cause: entry.cause,
    steps: entry.steps,
    category: entry.category,
    source: entry.source,
    target: entry.target,
    confidence: entry.confidence,
    severity: entry.severity,
    error_kind: entry.error_kind,
    entryId: entry.entryId || "",
    worked: entry.worked ?? null
  };
  const tx = db.transaction("sessions", "readwrite");
  return txDone(tx, tx.objectStore("sessions").add(rec));
}

export async function listSessions(limit = 60) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readonly");
    const req = tx.objectStore("sessions").index("createdAt").openCursor(null, "prev");
    const out = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && out.length < limit) {
        out.push({ id: cursor.primaryKey, ...cursor.value });
        cursor.continue();
      } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearSessions() {
  const db = await openDb();
  const tx = db.transaction("sessions", "readwrite");
  return txDone(tx, tx.objectStore("sessions").clear());
}

export async function markSessionWorked(id, worked) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result;
      if (!rec) return resolve(false);
      rec.worked = worked;
      store.put(rec);
      resolve(true);
    };
    req.onerror = () => reject(req.error);
  });
}

export function newRecording() {
  return {
    id: `rec-${Date.now()}`,
    createdAt: Date.now(),
    events: []
  };
}

export function recordEvent(rec, type, payload) {
  if (!rec) return rec;
  rec.events.push({
    t: Date.now(),
    type,
    ...scrubObject(payload || {})
  });
  return rec;
}

export async function saveRecording(rec) {
  if (!rec) return;
  const db = await openDb();
  const tx = db.transaction("recordings", "readwrite");
  return txDone(tx, tx.objectStore("recordings").put(rec));
}

export async function listRecordings(limit = 20) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readonly");
    const req = tx.objectStore("recordings").index("createdAt").openCursor(null, "prev");
    const out = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && out.length < limit) {
        out.push(cursor.value);
        cursor.continue();
      } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

export function diagnosticPackage({ sessions, recording, current, query, community }) {
  return {
    app: "storescope",
    version: "3.3.2",
    exportedAt: new Date().toISOString(),
    privacy: "Images omitted. Text scrubbed for emails, keys, phones, cards, order numbers.",
    current: current ? scrubObject({
      id: current.id,
      title: current.target_ui_hint,
      cause: current.cause,
      steps: current.steps,
      category: current.category,
      severity: current.severity,
      kind: current.error_kind
    }) : null,
    query: scrubText(query || ""),
    sessions: (sessions || []).slice(0, 20).map((s) => scrubObject(s)),
    recording: recording ? scrubObject({ ...recording, thumbs: undefined }) : null,
    communityCount: (community || []).length
  };
}

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

export async function listCommunity() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("community", "readonly");
    const req = tx.objectStore("community").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function upsertCommunity(entry) {
  const rec = {
    id: entry.id || `comm-${Date.now()}`,
    createdAt: entry.createdAt || Date.now(),
    updatedAt: Date.now(),
    banner: scrubText(entry.banner || ""),
    steps: (entry.steps || []).map((s) => scrubText(s)).filter(Boolean),
    category: entry.category || "general",
    target_ui_hint: entry.target_ui_hint || "Community fix",
    explanation: scrubText(entry.explanation || ""),
    cause: scrubText(entry.cause || entry.explanation || ""),
    match_phrases: [scrubText(entry.banner || "")].filter(Boolean),
    synonyms: [],
    tags: ["community", entry.category || "general"],
    success: entry.success || 1,
    attempts: entry.attempts || 1,
    source_category_db: "community",
    error_kind: "banner",
    severity: "warning",
    local: true
  };
  const db = await openDb();
  const tx = db.transaction("community", "readwrite");
  await txDone(tx, tx.objectStore("community").put(rec));
  return rec;
}

export async function bumpCommunity(id, worked) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("community", "readwrite");
    const store = tx.objectStore("community");
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result;
      if (!rec) return resolve(null);
      rec.attempts = (rec.attempts || 1) + 1;
      if (worked) rec.success = (rec.success || 0) + 1;
      rec.updatedAt = Date.now();
      store.put(rec);
      resolve(rec);
    };
    req.onerror = () => reject(req.error);
  });
}

export function communityAsEntries(rows) {
  return (rows || [])
    .map((r) => ({
      ...r,
      arrow: { x: 0.55, y: 0.16 },
      docs: [],
      rate: r.attempts ? r.success / r.attempts : 0
    }))
    .sort((a, b) => (b.rate - a.rate) || (b.success - a.success));
}

export async function getRanks() {
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains("ranks")) return {};
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction("ranks", "readonly");
      const req = tx.objectStore("ranks").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    const map = {};
    for (const r of rows) map[r.id] = r;
    return map;
  } catch {
    return {};
  }
}

export async function bumpRank(id, worked) {
  if (!id) return null;
  const db = await openDb();
  if (!db.objectStoreNames.contains("ranks")) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("ranks", "readwrite");
    const store = tx.objectStore("ranks");
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result || { id, up: 0, down: 0 };
      if (worked) rec.up = (rec.up || 0) + 1;
      else rec.down = (rec.down || 0) + 1;
      rec.updatedAt = Date.now();
      store.put(rec);
      resolve(rec);
    };
    req.onerror = () => reject(req.error);
  });
}

export function rankBoost(entry, ranks) {
  const r = ranks?.[entry?.id];
  if (!r) return 0;
  return Math.max(-0.2, Math.min(0.22, (r.up || 0) * 0.07 - (r.down || 0) * 0.09));
}

export async function importCommunity(json) {
  const rows = Array.isArray(json) ? json : json?.entries || [];
  const saved = [];
  for (const row of rows) {
    saved.push(await upsertCommunity(row));
  }
  return saved;
}
