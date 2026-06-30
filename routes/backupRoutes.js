// routes/backupRoutes.js — Ops #2: backup + restore.
//
// Wire-up (server.js) — register each department's data file as a dataset, then mount:
//   const backup = require('./lib/backup/backupRestore');
//   const fs = require('fs'); const path = require('path');
//   const readJson  = (f) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname,'data',f),'utf8')); } catch { return null; } };
//   const writeJson = (f) => (d) => fs.writeFileSync(path.join(__dirname,'data',f), JSON.stringify(d,null,2));
//   backup.register('crm_profiles', () => readJson('crm_profiles.json'), writeJson('crm_profiles.json'));
//   backup.register('leads',        () => readJson('leads.json'),        writeJson('leads.json'));
//   // ...register the rest of data/*.json the same way...
//   app.use('/api/backup', require('./routes/backupRoutes'));

const express = require('express');
const router = express.Router();

let backup;
try { backup = require('../lib/backup/backupRestore'); } catch { backup = null; }

function ensure(res) {
  if (!backup) { res.status(503).json({ ok: false, error: 'Backup not available' }); return false; }
  return true;
}

// What datasets are covered.
router.get('/datasets', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, datasets: backup.registered() });
});

// Download a full snapshot as a JSON file.
router.get('/export', (req, res) => {
  if (!ensure(res)) return;
  const snap = backup.exportAll({ requestedBy: req.headers['x-member-id'] || null });
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="supersender_backup_${date}.json"`);
  res.send(JSON.stringify(snap, null, 2));
});

// Restore. Body: the snapshot object, plus ?apply=true to actually write (default dry-run).
router.post('/restore', (req, res) => {
  if (!ensure(res)) return;
  try {
    const apply = req.query.apply === 'true';
    const only = req.query.only ? String(req.query.only).split(',') : null;
    const result = backup.importAll(req.body, { apply, only });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
