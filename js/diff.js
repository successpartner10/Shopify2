import { scrubText } from "./privacy.js";

function lines(text) {
  return (text || "")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2);
}

export function snapshotFrom(text, extras = {}) {
  return {
    at: Date.now(),
    text: scrubText(text || ""),
    lines: lines(text),
    label: extras.label || "State",
    thumb: extras.thumb || "",
    matchId: extras.matchId || "",
    title: extras.title || ""
  };
}

export function diffSnapshots(a, b) {
  if (!a || !b) return { added: [], removed: [], same: [], summary: "Need a before and after capture." };
  const setA = new Set(a.lines.map((l) => l.toLowerCase()));
  const setB = new Set(b.lines.map((l) => l.toLowerCase()));
  const added = b.lines.filter((l) => !setA.has(l.toLowerCase()));
  const removed = a.lines.filter((l) => !setB.has(l.toLowerCase()));
  const same = b.lines.filter((l) => setA.has(l.toLowerCase()));
  const bits = [];
  if (removed.length) bits.push(`${removed.length} line(s) gone`);
  if (added.length) bits.push(`${added.length} line(s) new`);
  if (!bits.length) bits.push("No meaningful text change");
  return { added, removed, same, summary: bits.join(" · ") };
}

export function mapDiffToPlaybook(diff, searchFn) {
  const hay = [...(diff.added || []), ...(diff.removed || [])].join("\n");
  if (!hay.trim()) return null;
  return searchFn(hay);
}
