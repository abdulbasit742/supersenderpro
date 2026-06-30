// lib/anomalies/rules.js
// The rule layer: turns raw anomaly scores into business alerts with severity,
// direction sentiment, and a human sentence. Each metric knows whether a spike
// is good or bad, so we don't cry wolf when revenue jumps.
//
// metric config:
//   key        - id used in the series + dedupe
//   label      - human name
//   goodWhen   - 'up' | 'down' : which direction is desirable
//   threshold  - robust-z cutoff to alert (default 3)
//   unit       - 'currency' | 'count' | 'percent' for formatting

const METRICS = {
  revenue:        { key: 'revenue',        label: 'Daily revenue',     goodWhen: 'up',   threshold: 3,   unit: 'currency' },
  orders:         { key: 'orders',         label: 'Daily orders',      goodWhen: 'up',   threshold: 3,   unit: 'count' },
  newCustomers:   { key: 'newCustomers',   label: 'New customers',     goodWhen: 'up',   threshold: 3,   unit: 'count' },
  conversion:     { key: 'conversion',     label: 'Conversion rate',   goodWhen: 'up',   threshold: 3,   unit: 'percent' },
  churnRisk:      { key: 'churnRisk',      label: 'Customers at risk', goodWhen: 'down', threshold: 2.5, unit: 'count' },
  failedSends:    { key: 'failedSends',    label: 'Failed sends',      goodWhen: 'down', threshold: 2.5, unit: 'count' },
};

function fmt(value, unit) {
  if (unit === 'currency') return 'PKR ' + Number(value || 0).toLocaleString();
  if (unit === 'percent') return round1(value) + '%';
  return String(Math.round(value));
}
function round1(n) { return Math.round((Number(n) || 0) * 10) / 10; }

// Build an alert object from a metric config + a detector score, or null if the
// move isn't large enough to matter.
function toAlert(metricKey, score) {
  const cfg = METRICS[metricKey];
  if (!cfg || !score) return null;
  if (Math.abs(score.z) < cfg.threshold) return null;

  const isGood =
    (score.direction === 'spike' && cfg.goodWhen === 'up') ||
    (score.direction === 'drop' && cfg.goodWhen === 'down');

  // Severity from how extreme the z-score is.
  const absZ = Math.abs(score.z);
  const severity = isGood ? 'positive' : absZ >= 4 ? 'critical' : absZ >= 3 ? 'warning' : 'notice';

  const arrow = score.direction === 'spike' ? 'jumped' : 'dropped';
  const pct = score.deltaPct == null ? '' : ` (${score.deltaPct > 0 ? '+' : ''}${score.deltaPct}%)`;
  const headline =
    `${cfg.label} ${arrow} to ${fmt(score.value, cfg.unit)}${pct} vs a typical ${fmt(score.baselineMedian, cfg.unit)}`;

  return {
    metric: cfg.key,
    label: cfg.label,
    date: score.date,
    value: score.value,
    baseline: score.baselineMedian,
    z: score.z,
    direction: score.direction,
    deltaPct: score.deltaPct,
    severity, // critical | warning | notice | positive
    good: isGood,
    headline,
  };
}

module.exports = { METRICS, toAlert, fmt };
