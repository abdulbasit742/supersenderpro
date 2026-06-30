// lib/anomalies/detector.js
// Robust anomaly detection on a numeric daily series. Uses median + MAD (median
// absolute deviation) instead of mean + std-dev, so a single huge spike doesn't
// poison the baseline and hide the next one. Pure functions, no deps — runs in
// the PC #2 overnight window in milliseconds.
//
// A point is anomalous when its robust z-score exceeds a threshold. We also
// classify direction (spike vs drop) because a revenue DROP and a churn SPIKE
// are both bad, while a revenue spike is good news worth surfacing too.

function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Median absolute deviation, scaled to be comparable to std-dev for normal data.
function mad(arr, med) {
  if (!arr.length) return 0;
  const m = med != null ? med : median(arr);
  const devs = arr.map((x) => Math.abs(x - m));
  return 1.4826 * median(devs);
}

function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) || 0) * f) / f;
}

// Robust z-score of the latest point vs a trailing baseline window.
// series: [{ date, value }] (oldest -> newest). Returns null if too short.
function scoreLatest(series, opts = {}) {
  const window = opts.window || 30;
  const minHistory = opts.minHistory || 10;
  if (series.length < minHistory + 1) return null;

  const latest = series[series.length - 1];
  const baseline = series.slice(Math.max(0, series.length - 1 - window), series.length - 1).map((p) => p.value);
  if (baseline.length < minHistory) return null;

  const med = median(baseline);
  let scale = mad(baseline, med);
  // Guard against a zero MAD (flat baseline): fall back to a small fraction of
  // the median so a real move off a flat line still registers.
  if (scale === 0) scale = Math.max(1e-9, Math.abs(med) * 0.1 || 1);

  const z = (latest.value - med) / scale;
  return {
    date: latest.date,
    value: round(latest.value),
    baselineMedian: round(med),
    z: round(z, 2),
    direction: z >= 0 ? 'spike' : 'drop',
    deltaPct: med !== 0 ? round(((latest.value - med) / Math.abs(med)) * 100) : null,
  };
}

// Scan a whole series and return every anomalous day (used for context/history).
function scanSeries(series, opts = {}) {
  const threshold = opts.threshold || 3;
  const window = opts.window || 30;
  const out = [];
  for (let i = Math.max(10, opts.minHistory || 10); i < series.length; i++) {
    const sub = series.slice(0, i + 1);
    const s = scoreLatest(sub, { window, minHistory: opts.minHistory || 10 });
    if (s && Math.abs(s.z) >= threshold) out.push(s);
  }
  return out;
}

module.exports = { scoreLatest, scanSeries, median, mad, round };
