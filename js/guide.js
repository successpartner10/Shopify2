export function flowFor(entry, flows) {
  if (!entry || !flows) return null;
  if (entry.flow_id) return flows.find((f) => f.id === entry.flow_id) || null;
  return flows.find((f) => (f.entry_ids || []).includes(entry.id)) || null;
}

export function initProgress(flow, entry) {
  const steps = flow?.steps?.length ? flow.steps.map((s) => s.label) : (entry?.steps || []);
  return {
    flowId: flow?.id || null,
    title: flow?.title || entry?.target_ui_hint || "Guided fix",
    index: 0,
    checked: steps.map(() => false),
    steps: flow?.steps || (entry?.steps || []).map((label, i) => ({
      id: `s${i}`,
      label: String(label).slice(0, 80),
      detail: label,
      done_if: entry?.done_if || [],
      stuck: entry?.alternatives || []
    }))
  };
}

export function markStep(progress, index, value = true) {
  const next = { ...progress, checked: progress.checked.slice() };
  next.checked[index] = value;
  if (value && index >= next.index) next.index = Math.min(next.steps.length - 1, index + 1);
  return next;
}

export function autoAdvance(progress, screenText) {
  if (!progress || !screenText) return progress;
  const hay = screenText.toLowerCase();
  const step = progress.steps[progress.index];
  if (!step) return progress;
  const still = step.still_if || [];
  if (still.some((p) => hay.includes(String(p).toLowerCase()))) return progress;
  const done = step.done_if || [];
  if (done.length && done.some((p) => hay.includes(String(p).toLowerCase()))) {
    return markStep(progress, progress.index, true);
  }
  return progress;
}

export function stuckOptions(progress, entries) {
  const step = progress?.steps?.[progress.index];
  const raw = step?.stuck || [];
  return raw.map((s) => {
    if (typeof s === "string") return { id: s, label: s, entry: entries.find((e) => e.id === s) };
    return { ...s, entry: entries.find((e) => e.id === s.id) };
  }).filter((s) => s.entry || s.label);
}

export function percent(progress) {
  if (!progress?.checked?.length) return 0;
  const n = progress.checked.filter(Boolean).length;
  return Math.round((n / progress.checked.length) * 100);
}
