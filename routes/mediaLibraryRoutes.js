// routes/mediaLibraryRoutes.js — Media #1: media library.
//
// Wire-up (server.js):
//   app.use('/api/media', require('./routes/mediaLibraryRoutes'));
//
// When sending with media, reference a library asset:
//   const m = require('./lib/media/mediaLibrary').useAsset(mediaId);
//   broadcastHub.sendToAll({ message, mediaPath: m.ref, targets });

const express = require('express');
const router = express.Router();

let media;
try { media = require('../lib/media/mediaLibrary'); } catch { media = null; }

function ensure(res) {
  if (!media) { res.status(503).json({ ok: false, error: 'Media library not available' }); return false; }
  return true;
}

// List assets. Query: ?type=&folderId=&tag=&search=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, assets: media.listAssets(req.query), folders: media.listFolders() });
});

// Add an asset. Body: { ref, name?, type?, tags?, folderId? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, asset: media.addAsset(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const a = media.getAsset(req.params.id);
  if (!a) return res.status(404).json({ ok: false, error: 'Asset not found' });
  res.json({ ok: true, asset: a });
});

// Use (resolve + bump usage).
router.post('/:id/use', (req, res) => {
  if (!ensure(res)) return;
  const a = media.useAsset(req.params.id);
  if (!a) return res.status(404).json({ ok: false, error: 'Asset not found' });
  res.json({ ok: true, asset: a });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...media.deleteAsset(req.params.id) });
});

// Folders. Body: { name }
router.post('/folders', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, folder: media.createFolder((req.body || {}).name) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
