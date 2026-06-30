// routes/bulkImportExportRoutes.js — REST surface for Bulk Import/Export. Mount at /api/import-export.
// These are admin endpoints; sit them behind your existing session/admin auth.

const express = require('express');
const router = express.Router();

let ie = null; try { ie = require('../lib/bulkImportExport'); } catch (e) { ie = null; }
function guard(req, res) { if (!ie) { res.status(503).json({ ok: false, error: 'import/export not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ie) return res.json({ ok: false, error: 'import/export not loaded' });
 const r = ie.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ie.doctor.run()); });

// Preview an import (dry-run). Body: { csvText, mapping?, delimiter? }
router.post('/import/preview', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ie.importEngine.run({ ...(req.body || {}), commit: false }) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
// Commit an import. Body: { csvText, mapping?, delimiter?, source? }
router.post('/import/commit', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ie.importEngine.run({ ...(req.body || {}), commit: true }) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.get('/import/jobs', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ie.importEngine.listJobs(Number(req.query.limit) || 50) }); });
router.get('/import/jobs/:id', (req, res) => { if (!guard(req, res)) return; const j = ie.importEngine.getJob(req.params.id); if (!j) return res.status(404).json({ ok: false, error: 'job not found' }); res.json({ ok: true, job: j }); });

// Export the contact book. ?format=csv|json & ?includePII=true (owner backups).
router.get('/export', (req, res) => {
 if (!guard(req, res)) return;
 if (!ie.exportEngine.available()) return res.status(503).json({ ok: false, error: 'contacts library not present; nothing to export' });
 const includePII = String(req.query.includePII || '') === 'true';
 if (String(req.query.format || 'csv') === 'json') return res.json({ ok: true, contacts: ie.exportEngine.toJSON({ includePII }) });
 const csvText = ie.exportEngine.toCSV({ includePII });
 res.setHeader('Content-Type', 'text/csv; charset=utf-8');
 res.setHeader('Content-Disposition', 'attachment; filename="contacts-export.csv"');
 res.send(csvText);
});

module.exports = router;
