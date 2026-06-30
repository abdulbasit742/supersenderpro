'use strict';
/**
 * lib/observability/metrics.js - tiny Prometheus-compatible metrics, no dependency.
 * Supports counters, gauges, and histogram observations, and renders the Prometheus text
 * exposition format for /metrics. Also exposes httpMetrics() middleware that records request
 * count + latency by method/route/status.
 */
const counters = new Map(); // name|labels -> value
const gauges = new Map();
const hist = new Map();      // name|labels -> { buckets:{le:count}, sum, count }
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function keyOf(name, labels) {
  const l = labels && Object.keys(labels).length ? '{' + Object.keys(labels).sort().map((k) => k + '="' + String(labels[k]).replace(/"/g, '') + '"').join(',') + '}' : '';
  return name + l;
}

function inc(name, labels = {}, by = 1) { const k = keyOf(name, labels); counters.set(k, (counters.get(k) || 0) + by); }
function setGauge(name, value, labels = {}) { gauges.set(keyOf(name, labels), value); }
function observe(name, value, labels = {}, buckets = DEFAULT_BUCKETS) {
  const k = keyOf(name, labels);
  let h = hist.get(k);
  if (!h) { h = { buckets: {}, sum: 0, count: 0, _b: buckets }; buckets.forEach((b) => { h.buckets[b] = 0; }); hist.set(k, h); }
  h.sum += value; h.count += 1;
  for (const b of h._b) { if (value <= b) h.buckets[b] += 1; }
}

function render() {
  const lines = [];
  for (const [k, v] of counters) lines.push(k + ' ' + v);
  for (const [k, v] of gauges) lines.push(k + ' ' + v);
  for (const [k, h] of hist) {
    // k may already contain labels; inject le into the brace set
    const base = k.endsWith('}') ? k.slice(0, -1) + ',' : k + '{';
    for (const b of h._b) lines.push(base + 'le="' + b + '"} ' + h.buckets[b]);
    lines.push(base + 'le="+Inf"} ' + h.count);
    lines.push(k + '_sum ' + h.sum);
    lines.push(k + '_count ' + h.count);
  }
  return lines.join('\n') + '\n';
}

// Normalize a path so high-cardinality ids don't explode label space.
function routeLabel(req) {
  const p = (req.route && req.baseUrl != null) ? (req.baseUrl + (req.route.path || '')) : (req.originalUrl || req.url || '/').split('?')[0];
  return p.replace(/\/[0-9a-fA-F]{8,}/g, '/:id').replace(/\/\d+/g, '/:id');
}

function httpMetrics() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      try {
        const route = routeLabel(req);
        const labels = { method: req.method, route, status: String(res.statusCode) };
        inc('http_requests_total', labels);
        const sec = Number(process.hrtime.bigint() - start) / 1e9;
        observe('http_request_duration_seconds', sec, { method: req.method, route });
      } catch {}
    });
    next();
  };
}

function reset() { counters.clear(); gauges.clear(); hist.clear(); }

module.exports = { inc, setGauge, observe, render, httpMetrics, reset, keyOf };
