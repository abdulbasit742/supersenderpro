// routes/backupRoutes.js — Ops #2: backup + restore.
//
// Wire-up (server.js) — protect behind owner auth! restore overwrites data:
//   const { requirePermission } = require('./lib/team/teamAccess');
//   app.use('/api/backups', requirePermission('*'), require('./routes/backupRoutes'));
//   // optional nightly auto-backup:
//   require('node-cron').schedule('0 2 * * *', () => require('./lib/ops/backupRestore').createBackup());

const express = require('express');
const router = express.Router();

let br;
try { br = require('../lib/ops/backupRestore'); } catch { br = null; }

function ensure(res) {
  if (!br) { res.status(503).json({ ok: false, error: 'Backup not available' }); return false; }
  return true;
}

// List backups.
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, backups: br.listBackups(), dataFiles: br.listDataFiles() });
});

// Create a backup now. Body: { include?, exclude? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, backup: br.createBackup(req.body || {}) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Download a backup bundle.
router.get('/:id/download', (req, res) => {
  if (!ensure(res)) return;
  const bundle = br.readBackup(req.params.id);
  if (!bundle) return res.status(404).json({ ok: false, error: 'Backup not found' });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.json"`);
  res.send(JSON.stringify(bundle));
});

// Restore from a backup. Body: { only?: string[] }. DESTRUCTIVE — takes a safety backup first.
router.post('/:id/restore', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...br.restore(req.params.id, req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Delete a backup.
router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...br.deleteBackup(req.params.id) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
