'use strict';
/**
 * routes/conversationalSupportRoutes.js - 24/7 Conversational AI / Support agent API.
 * Mounted at /api/conversational-support (via lib/bootstrap/registerSubsystems or the wire script).
 * Wire it with: node scripts/wire-conversational-support.js
 *
 * Safety:
 * - Read endpoints open; phone numbers are masked in output.
 * - Write endpoints require an admin secret (x-admin-secret / ?secret / body.secret) matching
 *   CONV_SUPPORT_ADMIN_SECRET / ADMIN_TOKEN / CHANNEL_ADMIN_SECRET when set. Dev: allowed w/ warning.
 * - /simulate forces dry-run (never sends). /inbound respects CONV_SUPPORT_DRY_RUN (default true).
 */
const express = require('express');
const CS = require('../lib/conversationalSupport');

const router = express.Router();

const maskPhone = (p) => { const s = String(p || ''); return s.length <= 4 ? s : s.slice(0, 3) + '***' + s.slice(-2); };
const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';
const maskContact = (c) => Object.assign({}, c, { phone: maskPhone(c && c.phone) });
const maskSession = (s) => (s ? Object.assign({}, s, { contact: maskContact(s.contact) }) : s);

function adminGuard(req, res, next) {
  if (!CS.config.requireAdmin) return next();
  const configured = process.env.CONV_SUPPORT_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[ConvSupport] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching CONV_SUPPORT_ADMIN_SECRET' });
}

/* -------- Status / Doctor -------- */
router.get('/status', (req, res) => { try { ok(res, { dryRun: CS.config.dryRun, aiAvailable: CS.llm.hubAvailable(), kbEntries: CS.kb.list(tid(req)).length, openHandoffs: CS.escalation.list(tid(req), 'open').length }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: CS.doctor.run() }); } catch (e) { fail(res, e); } });
router.get('/intents', (req, res) => { try { ok(res, { intents: CS.intents }); } catch (e) { fail(res, e); } });

/* -------- Knowledge base CRUD -------- */
router.get('/kb', (req, res) => { try { ok(res, { entries: CS.kb.list(tid(req)) }); } catch (e) { fail(res, e); } });
router.post('/kb', adminGuard, (req, res) => { try { ok(res, { entry: CS.kb.add(tid(req), req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.post('/kb/bulk', adminGuard, (req, res) => { try { ok(res, { entries: CS.kb.bulkAdd(tid(req), (req.body && req.body.items) || []) }); } catch (e) { fail(res, e, 400); } });
router.delete('/kb/:id', adminGuard, (req, res) => { try { ok(res, { removed: CS.kb.remove(tid(req), req.params.id) }); } catch (e) { fail(res, e); } });
router.get('/kb/search', (req, res) => { try { ok(res, { results: CS.kb.search(tid(req), req.query.q || '', Number(req.query.k) || 3) }); } catch (e) { fail(res, e); } });
router.post('/seed-example', adminGuard, (req, res) => { try { ok(res, CS.seedExample(tid(req))); } catch (e) { fail(res, e); } });

/* -------- Run / Test -------- */
router.post('/simulate', (req, res) => { (async () => { try { const b = req.body || {}; ok(res, { result: await CS.handle(tid(req), { phone: b.phone || 'sim_' + Date.now(), name: b.name }, b.text || '', { forceDryRun: true }) }); } catch (e) { fail(res, e); } })(); });
router.post('/inbound', adminGuard, (req, res) => { (async () => { try { const b = req.body || {}; if (!b.phone) return fail(res, new Error('phone required'), 400); ok(res, { result: await CS.handle(tid(req), { phone: b.phone, name: b.name }, b.text || '') }); } catch (e) { fail(res, e); } })(); });

/* -------- Sessions -------- */
router.get('/sessions', (req, res) => { try { ok(res, { sessions: CS.sessions.list(tid(req), req.query.status).map(maskSession) }); } catch (e) { fail(res, e); } });
router.get('/sessions/:phone', (req, res) => { try { const s = CS.sessions.getByPhone(tid(req), req.params.phone); return s ? ok(res, { session: maskSession(s) }) : fail(res, new Error('session not found'), 404); } catch (e) { fail(res, e); } });
router.post('/sessions/:phone/reset', adminGuard, (req, res) => { try { ok(res, { session: maskSession(CS.sessions.reset(tid(req), req.params.phone)) }); } catch (e) { fail(res, e); } });
router.post('/cleanup', adminGuard, (req, res) => { try { ok(res, { expired: CS.sessions.cleanupExpired(tid(req)) }); } catch (e) { fail(res, e); } });

/* -------- Handoffs / Orders -------- */
router.get('/handoffs', (req, res) => { try { ok(res, { handoffs: CS.escalation.list(tid(req), req.query.status).map((h) => Object.assign({}, h, { contact: maskContact(h.contact) })) }); } catch (e) { fail(res, e); } });
router.post('/handoffs/:id/resolve', adminGuard, (req, res) => { try { const h = CS.escalation.resolve(tid(req), req.params.id, (req.body || {}).note); return h ? ok(res, { handoff: h }) : fail(res, new Error('handoff not found'), 404); } catch (e) { fail(res, e); } });
router.get('/orders', (req, res) => { try { ok(res, { orders: CS.orderTaking.listOrders(tid(req)).map((o) => Object.assign({}, o, { contact: maskContact(o.contact) })) }); } catch (e) { fail(res, e); } });

module.exports = router;
