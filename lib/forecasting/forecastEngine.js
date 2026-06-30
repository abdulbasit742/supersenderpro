// lib/forecasting/forecastEngine.js
// Dependency-free time-series forecasting. No Prophet, no TensorFlow — just
// Holt's linear trend (double exponential smoothing) plus a multiplicative
// day-of-week seasonal index, which is the pattern that actually matters for a
// WhatsApp commerce business (weekends behave differently from weekdays).
//
// Everything here is a pure function over a numeric daily series, so it runs in
// milliseconds inside the PC #2 overnight window and is fully unit-testable.

function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) || 0) * f) / f;
}
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

// --- Day-of-week seasonality (multiplicative) -------------------------------
// series: [{ date: 'YYYY-MM-DD', value }] (continuous daily). Returns 7 indices
// (Sun..Sat) that average to 1. Falls back to all-1 when data is too thin.
function dowSeasonality(series) {
  const buckets = Array.from({ length: 7 }, () => []);
  for (const p of series) {
    const dow = new Date(p.date + 'T00:00:00Z').getUTCDay();
    buckets[dow].push(p.value);
  }
  const overall = mean(series.map((p) => p.value)) || 1;
  const idx = buckets.map((b) => (b.length ? mean(b) / overall : 1));
  // Normalise so the indices average exactly 1.
  const avg = mean(idx) || 1;
  return idx.map((v) => v / avg);
}

// --- Holt's linear trend (double exponential smoothing) ---------------------
// Returns { level, trend, fitted[] } after running through the deseasonalised
// series. alpha = level smoothing, beta = trend smoothing.
function holt(values, alpha = 0.3, beta = 0.1) {
  const n = values.length;
  if (n === 0) return { level: 0, trend: 0, fitted: [] };
  if (n === 1) return { level: values[0], trend: 0, fitted: [values[0]] };

  let level = values[0];
  let trend = values[1] - values[0];
  const fitted = [values[0]];
  for (let i = 1; i < n; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(prevLevel + trend);
  }
  return { level, trend, fitted };
}

// --- Forecast ---------------------------------------------------------------
// Builds an h-day-ahead forecast. Deseasonalise -> Holt -> reseasonalise, then
// attach confidence bands derived from in-sample residual spread.
function forecast(series, horizon = 30, opts = {}) {
  const alpha = opts.alpha != null ? opts.alpha : 0.3;
  const beta = opts.beta != null ? opts.beta : 0.1;
  if (!series.length) return { points: [], seasonality: new Array(7).fill(1), model: 'empty' };

  const season = dowSeasonality(series);
  const deseason = series.map((p) => {
    const s = season[new Date(p.date + 'T00:00:00Z').getUTCDay()] || 1;
    return s !== 0 ? p.value / s : p.value;
  });

  const { level, trend, fitted } = holt(deseason, alpha, beta);

  // In-sample residual std-dev (on the original scale) for confidence bands.
  const residuals = [];
  for (let i = 0; i < series.length; i++) {
    const s = season[new Date(series[i].date + 'T00:00:00Z').getUTCDay()] || 1;
    residuals.push(series[i].value - (fitted[i] || 0) * s);
  }
  const rmse = Math.sqrt(mean(residuals.map((r) => r * r)));

  const lastDate = new Date(series[series.length - 1].date + 'T00:00:00Z');
  const points = [];
  for (let h = 1; h <= horizon; h++) {
    const d = new Date(lastDate.getTime() + h * 86400000);
    const dow = d.getUTCDay();
    const base = Math.max(0, (level + trend * h) * (season[dow] || 1));
    // Bands widen with the forecast horizon (uncertainty grows over time).
    const band = 1.96 * rmse * Math.sqrt(h);
    points.push({
      date: d.toISOString().slice(0, 10),
      forecast: round(base),
      lower: round(Math.max(0, base - band)),
      upper: round(base + band),
    });
  }

  return {
    points,
    seasonality: season.map((s) => round(s, 3)),
    rmse: round(rmse),
    model: 'holt+dow',
    params: { alpha, beta },
  };
}

// --- Backtest: hold out the last `testDays`, forecast them, measure error ----
// Returns MAPE (mean abs % error) so the dashboard can show how trustworthy the
// forecast has been historically.
function backtest(series, testDays = 14) {
  if (series.length < testDays + 7) return { ok: false, reason: 'not enough history' };
  const train = series.slice(0, series.length - testDays);
  const test = series.slice(series.length - testDays);
  const fc = forecast(train, testDays);
  let sumPct = 0;
  let counted = 0;
  for (let i = 0; i < test.length; i++) {
    const actual = test[i].value;
    const pred = fc.points[i] ? fc.points[i].forecast : 0;
    if (actual > 0) { sumPct += Math.abs(actual - pred) / actual; counted += 1; }
  }
  const mape = counted ? round((sumPct / counted) * 100) : null;
  return { ok: true, testDays, mapePct: mape, accuracyPct: mape == null ? null : round(Math.max(0, 100 - mape)) };
}

module.exports = { forecast, backtest, dowSeasonality, holt, round };
