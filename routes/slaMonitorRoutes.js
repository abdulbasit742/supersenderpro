'use strict';
// Self-mountable Express router for the SLA Monitor.
// Read endpoints are open (masked data); write/brief endpoints are admin-guarded.

const express = require('express');
const { config } = require('../lib/slaMonitor/config');
const store = require('../lib/slaMonitor/store');
const sla = require('../lib/slaMonitor/index');

function adminGuard(req, res, next) {
  if (!config.adminToken) return next(); // no token configured -> allow in dev
  const got = req.get('x-admin-secret') || req.get('x-admin-token') || '';
  if (got && got === config.adminToken) return next();
  return res.status(401).json({ ok: false, error: 'admin token required' });
}

function tenantOf(req) {
  return req.get('x-tenant-id') || req.query.tenantId || req.body && req.body.tenantId;
}

function router() {
  const r = express.Router();
  r.use(express.json({ limit: '1mb' }));

  r.get('/health', (_req, res) => res.json({ ok: true, subsystem: 'slaMonitor' }));

  r.get('/report', (req, res) => {
    try {
      const tenantId = tenantOf(req);
      res.json({ ok: true, report: sla.report(tenantId) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  r.get('/brief', adminGuard, async (req, res) => {
    try {
      const tenantId = tenantOf(req);
      res.json({ ok: true, ...(await sla.ownerBrief(tenantId)) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // Upsert conversation event timelines (dry-run safe; just records data).
  r.post('/conversations', adminGuard, (req, res) => {
    try {
      const tenantId = tenantOf(req);
      const incoming = Array.isArray(req.body.conversations) ? req.body.conversations : [];
      const existing = store.listConversations(tenantId);
      const byId = new Map(existing.map(c => [c.id, c]));
      for (const c of incoming) { if (c && c.id) byId.set(c.id, c); }
      const merged = Array.from(byId.values());
      store.saveConversations(tenantId, merged);
      res.json({ ok: true, count: merged.length });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  return r;
}

module.exports = router;
module.exports.mount = function mount(app, base) {
  app.use(base || '/api/sla', router());
};
