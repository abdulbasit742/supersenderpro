'use strict';
/**
 * routes/contactsRoutes.js - Contacts CRM + dynamic Segmentation API.
 * Mounted in server.js at /api/contacts (see CONTACTS HOOK).
 * Wire it with: node scripts/wire-contacts.js
 *
 * Safety:
 * - Read endpoints open; phone numbers masked in list output.
 * - Write endpoints admin-guarded (x-admin-secret / ?secret / body.secret).
 * - No sending: /segments/:id/resolve returns a recipient list for the broadcast engine.
 */
const express = require('express');
const C = require('../lib/contacts');
const { maskPhone } = require('../lib/contacts/util');

const router = express.Router();

function adminGuard(req, res, next) {
  if (!C.config.requireAdmin) return next();
  const configured = process.env.CONTACTS_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[Contacts] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching CONTACTS_ADMIN_SECRET' });
}

const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';
const maskC = (c) => (c ? Object.assign({}, c, { phone: maskPhone(c.phone) }) : c);

router.get('/status', (req, res) => { try { ok(res, { contacts: C.contacts.list(tid(req)).length, segments: C.segments.list(tid(req)).length, operators: C.operators }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: C.doctor.run() }); } catch (e) { fail(res, e); } });

/* ---------------- Contacts ---------------- */
router.get('/contacts', (req, res) => { try { const list = C.contacts.list(tid(req), { tag: req.query.tag, q: req.query.q, optedOut: req.query.optedOut === undefined ? undefined : req.query.optedOut === 'true' }); ok(res, { contacts: list.map(maskC), count: list.length }); } catch (e) { fail(res, e); } });
router.post('/contacts', adminGuard, (req, res) => { try { ok(res, { contact: C.contacts.upsert(tid(req), req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.get('/contacts/:contactId', (req, res) => { try { const c = C.contacts.get(tid(req), req.params.contactId); return c ? ok(res, { contact: c }) : fail(res, new Error('contact not found'), 404); } catch (e) { fail(res, e); } });
router.post('/contacts/:contactId/tags', adminGuard, (req, res) => { try { const b = req.body || {}; const c = C.contacts.setTags(tid(req), req.params.contactId, b.add || [], b.remove || []); return c ? ok(res, { contact: c }) : fail(res, new Error('contact not found'), 404); } catch (e) { fail(res, e); } });
router.post('/contacts/:contactId/opt-out', adminGuard, (req, res) => { try { const c = C.contacts.get(tid(req), req.params.contactId); if (!c) return fail(res, new Error('contact not found'), 404); ok(res, { contact: C.contacts.setOptOut(tid(req), c.phone, (req.body || {}).optedOut !== false) }); } catch (e) { fail(res, e); } });
router.delete('/contacts/:contactId', adminGuard, (req, res) => { try { ok(res, { removed: C.contacts.remove(tid(req), req.params.contactId) }); } catch (e) { fail(res, e); } });
router.post('/import', adminGuard, (req, res) => { try { const b = req.body || {}; if (b.csv) return ok(res, { result: C.importCSV(tid(req), b.csv) }); if (Array.isArray(b.rows)) return ok(res, { result: C.contacts.importMany(tid(req), b.rows) }); fail(res, new Error('provide csv (string) or rows (array)'), 400); } catch (e) { fail(res, e, 400); } });

/* ---------------- Segments ---------------- */
router.get('/segments', (req, res) => { try { ok(res, { segments: C.segments.list(tid(req)) }); } catch (e) { fail(res, e); } });
router.post('/segments', adminGuard, (req, res) => { try { ok(res, { segment: C.segments.create(tid(req), req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.get('/segments/:segId', (req, res) => { try { const s = C.segments.get(tid(req), req.params.segId); return s ? ok(res, { segment: s }) : fail(res, new Error('segment not found'), 404); } catch (e) { fail(res, e); } });
router.put('/segments/:segId', adminGuard, (req, res) => { try { const s = C.segments.update(tid(req), req.params.segId, req.body || {}); return s ? ok(res, { segment: s }) : fail(res, new Error('segment not found'), 404); } catch (e) { fail(res, e, 400); } });
router.delete('/segments/:segId', adminGuard, (req, res) => { try { ok(res, { removed: C.segments.remove(tid(req), req.params.segId) }); } catch (e) { fail(res, e); } });
router.post('/segments/validate', (req, res) => { try { ok(res, { validation: C.segments.validate(req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/segments/:segId/preview', (req, res) => { try { ok(res, C.segments.preview(tid(req), req.params.segId, { includeOptedOut: req.query.includeOptedOut === 'true' })); } catch (e) { fail(res, e, 400); } });
router.get('/segments/:segId/resolve', adminGuard, (req, res) => { try { const matched = C.segments.resolve(tid(req), req.params.segId, { includeOptedOut: req.query.includeOptedOut === 'true' }); ok(res, { count: matched.length, recipients: matched.map((c) => c.phone) }); } catch (e) { fail(res, e, 400); } });
router.post('/segments/preview', (req, res) => { try { ok(res, C.segments.preview(tid(req), req.body || {}, {})); } catch (e) { fail(res, e, 400); } });

module.exports = router;
