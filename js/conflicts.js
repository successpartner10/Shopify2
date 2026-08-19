export function detectConflicts(text, catalog = []) {
  const hay = (text || "").toLowerCase();
  const hits = [];
  for (const row of catalog) {
    let score = 0;
    const matched = [];
    for (const p of row.patterns || []) {
      if (hay.includes(String(p).toLowerCase())) {
        score += 1;
        matched.push(p);
      }
    }
    if (score > 0) hits.push({ ...row, score, matched });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}
