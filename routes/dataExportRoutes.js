'use strict';
/**
 * Self-mountable Express router for AI Data Export & Backup.
 * Mount: app.use('/api/data-export', require('./routes/dataExportRoutes'));
 * Does NOT touch server.js.
 */
const express = require('express');
const router = express.Router();
const de = require('../lib/dataExport/dataExport');

function tenantOf(req) {
  return req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || (req.query && req.query.tenantId);
}

router.get('/health', (req, res) => res.json({ ok: true, feature: 'data-export' }));

// On-demand export bundle (download as JSON).
router.get('/export', (req, res) => {
  try {
    const bundle = de.buildBundle(tenantOf(req));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="export-${bundle.manifest.tenantId}.json"`);
    res.send(JSON.stringify(bundle));
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Create a stored backup.
router.post('/backup', (req, res) => {
  try {
    const manifest = de.createBackup(tenantOf(req), req.body && req.body.label);
    res.json({ ok: true, manifest });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List stored backups.
router.get('/backups', (req, res) => {
  try { res.json({ ok: true, backups: de.listBackups(tenantOf(req)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Restore (dry-run unless ?apply=true).
router.post('/restore', (req, res) => {
  try {
    const apply = (req.query.apply === 'true') || (req.body && req.body.apply === true);
    const out = de.restoreBackup(tenantOf(req), req.body && req.body.backupFile, { apply });
    res.json({ ok: true, result: out });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Plain-words summary (AI optional).
router.get('/describe', async (req, res) => {
  try { res.json({ ok: true, summary: await de.describeBackup(tenantOf(req), req.query.backupFile) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Prune old backups.
router.post('/prune', (req, res) => {
  try { res.json({ ok: true, result: de.pruneBackups(tenantOf(req), req.body && req.body.keep) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
