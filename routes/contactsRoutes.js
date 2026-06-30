// routes/contactsRoutes.js — REST surface for Contacts & Segmentation. Mount at /api/contacts.

const express = require('express');
const router = express.Router();

let cb = null; try { cb = require('../lib/contacts'); } catch (e) { cb = null; }
function guard(req, res) { if (!cb) { res.status(503).json({ ok: false, error: 'contacts not available' }); return false; } return true; }
function view(c) { return cb.segmentEngine.publicContact(c); }

router.get('/status', (req, res) => {
 if (!cb) return res.json({ ok: false, error: 'contacts not loaded' });
 const r = cb.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(cb.doctor.run()); });

// Contacts
router.post('/contacts', (req, res) => { if (!guard(req, res)) return; try { const r = cb.contactStore.upsert(req.body || {}); res.json({ ok: true, created: r.created, contact: view(r.contact) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/contacts/:id', (req, res) => { if (!guard(req, res)) return; const c = cb.contactStore.getById(req.params.id); if (!c) return res.status(404).json({ ok: false, error: 'contact not found' }); res.json({ ok: true, contact: view(c) }); });
router.post('/contacts/:id/tags', (req, res) => { if (!guard(req, res)) return; try { const b = req.body || {}; const c = b.remove ? cb.contactStore.removeTags(req.params.id, b.remove) : cb.contactStore.addTags(req.params.id, b.add || []); res.json({ ok: true, contact: view(c) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/contacts/:id/fields', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, contact: view(cb.contactStore.patch(req.params.id, { fields: (req.body || {}).fields || {} })) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/contacts/:id/consent', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, contact: view(cb.contactStore.setConsent(req.params.id, (req.body || {}).consent)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/contacts/:id/archive', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, contact: view(cb.contactStore.archive(req.params.id)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Segments — membership is always evaluated live.
router.post('/segments/preview', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...cb.segmentEngine.evaluate((req.body || {}).rule, { limit: Number((req.body || {}).limit) || undefined }) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/segments', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: cb.segmentEngine.listSegments() }); });
router.post('/segments', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, segment: cb.segmentEngine.saveSegment(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/segments/:id', (req, res) => { if (!guard(req, res)) return; const s = cb.segmentEngine.getSegment(req.params.id); if (!s) return res.status(404).json({ ok: false, error: 'segment not found' }); res.json({ ok: true, segment: s, ...cb.segmentEngine.evaluate(s.rule) }); });
router.get('/segments/:id/recipients', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, count: cb.segmentEngine.resolveRecipients(req.params.id).length }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

module.exports = router;
