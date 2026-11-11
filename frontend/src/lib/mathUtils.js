// Small numeric helpers shared by the movement-test scorers.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const round = (value, decimals = 0) => Number(Number(value).toFixed(decimals));
export const mean = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0);

export function stdev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Centered moving average; removes single-frame landmark jitter. */
export function smooth(values, window = 5) {
  if (values.length < 3 || window < 2) return [...values];
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = from; j <= to; j += 1) sum += values[j];
    return sum / (to - from + 1);
  });
}

/**
 * 0-100 smoothness of a movement trace: slow, continuous movement scores high,
 * jerky or trembling movement scores low. Prototype thresholds, not clinically validated.
 */
export function smoothnessScore(values) {
  if (values.length < 10) return 60;
  const s = smooth(values, 7);
  const range = Math.max(...s) - Math.min(...s);
  if (range < 1e-6) return 0;
  let jerk = 0;
  for (let i = 2; i < s.length; i += 1) jerk += Math.abs(s[i] - 2 * s[i - 1] + s[i - 2]);
  jerk /= s.length - 2;
  return clamp(100 - (jerk / range - 0.004) * 2800, 0, 100);
}

/**
 * Counts completed excursions in a trace.
 *  kind 'peak'  : value rises to >= enter, then falls back to <= exit      (enter > exit)
 *  kind 'valley': value falls to <= enter, then rises back to >= exit      (enter < exit)
 * Returns every completed excursion with its extreme value and frame indices.
 */
export function findCycles(values, { enter, exit, kind = 'peak' }) {
  const cycles = [];
  let inside = false;
  let extreme = 0;
  let enterIndex = 0;
  values.forEach((v, i) => {
    if (!inside) {
      const entered = kind === 'peak' ? v >= enter : v <= enter;
      if (entered) { inside = true; extreme = v; enterIndex = i; }
      return;
    }
    extreme = kind === 'peak' ? Math.max(extreme, v) : Math.min(extreme, v);
    const exited = kind === 'peak' ? v <= exit : v >= exit;
    if (exited) {
      cycles.push({ extreme, enterIndex, exitIndex: i });
      inside = false;
    }
  });
  return cycles;
}

export const countCycles = (values, options, cap = Infinity) => Math.min(cap, findCycles(values, options).length);

/**
 * Like findCycles, but the thresholds are taken from the patient's own range of motion in this
 * session, so a smaller-but-real movement still counts as a rep. Nothing counts until the trace
 * has moved at least `minRange` (guards against jitter).
 */
export function adaptiveCycles(values, { kind = 'peak', minRange = 20, enterFrac = 0.65, exitFrac = 0.35 } = {}) {
  const s = smooth(values, 5);
  if (s.length < 10) return [];
  const lo = Math.min(...s);
  const hi = Math.max(...s);
  const range = hi - lo;
  if (range < minRange) return [];
  return kind === 'peak'
    ? findCycles(s, { enter: lo + enterFrac * range, exit: lo + exitFrac * range, kind: 'peak' })
    : findCycles(s, { enter: hi - enterFrac * range, exit: hi - exitFrac * range, kind: 'valley' });
}
