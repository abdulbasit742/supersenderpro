'use strict';
/**
 * routes/metricsRoutes.js - Prometheus scrape endpoint. Mounted at /metrics (bootstrap).
 * Optionally protected by METRICS_TOKEN (Bearer) so it isn't world-readable in prod.
 */
const express = require('express');
const metrics = require('../lib/observability/metrics');

const router = express.Router();

router.get('/', (req, res) => {
  const token = process.env.METRICS_TOKEN || '';
  if (token) {
    const auth = req.get('authorization') || '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.token || '');
    if (provided !== token) return res.status(401).type('text/plain').send('unauthorized');
  }
  // expose process gauges at scrape time
  try { const mem = process.memoryUsage(); metrics.setGauge('process_resident_memory_bytes', mem.rss); metrics.setGauge('process_uptime_seconds', Math.round(process.uptime())); } catch {}
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(metrics.render());
});

module.exports = router;
