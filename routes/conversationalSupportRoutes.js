'use strict';
/**
 * routes/conversationalSupportRoutes.js - 24/7 WhatsApp Conversational AI Support agent API.
 * Mounted in server.js at /api/conversational-support (see CONVERSATIONAL SUPPORT HOOK).
 * Wire it with: node scripts/wire-conversational-support.js
 *
 * Safety:
 * - Read endpoints are open; contact phone numbers are masked in output.
 * - Write endpoints require an admin secret (x-admin-secret / ?secret / body.secret) matching
 *   CONV_SUPPORT_ADMIN_SECRET / ADMIN_TOKEN / CHANNEL_ADMIN_SECRET when set. If none configured,
 *   allowed in dev with a warning (repo convention).
 * - /simulate runs the engine in FORCED dry-run (never sends) for safe testing.
 * - /inbound respects CONV_SUPPORT_DRY_RUN (default true). Point your WhatsApp webhook here.
 */
const express = require('express');
const CS = require('../lib/conversationalSupport');
const { maskPhone } = require('../lib/conversationalSupport/util');

const router = express.Router();

function adminGuard(req, res, next) {
  if (!CS.config.requireAdmin) return next();
  const configured = process.env.CONV_SUPPORT_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[ConvSupport] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching CONV_SUPPORT_ADMIN_SECRET' });
}

const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';
const maskConvo = (c) => (c ? Object.assign({}, c, { contact: Object.assign({}, c.contact, { phone: maskPhone(c.contact && c.contact.phone) }) }) : c);
const maskHandoff = (h) => (h ? Object.assign({}, h, { contact: Object.assign({}, h.contact, { phone: maskPhone(h.contact && h.contact.phone) }) }) : h);

/* ---------------- Status / Doctor ---------------- */
router.get('/status', (req, res) => { try { ok(res, { dryRun: CS.config.dryRun, aiAvailable: CS.brain.hubAvailable(), orderPipeline: CS.orderFlow.pipelineAvailable(), products: CS.kb.listProducts(tid(req)).length, faqs: CS.kb.listFaqs(tid(req)).length }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: CS.doctor.run() }); } catch (e) { fail(res, e); } });

/* ---------------- Knowledge base: settings ---------------- */
router.get('/settings', (req, res) => { try { ok(res, { settings: CS.kb.settings(tid(req)) }); } catch (e) { fail(res, e); } });
router.put('/settings', adminGuard, (req, res) => { try { ok(res, { settings: CS.kb.updateSettings(tid(req), req.body || {}) }); } catch (e) { fail(res, e); } });

/* ---------------- Knowledge base: FAQs ---------------- */
router.get('/faqs', (req, res) => { try { ok(res, { faqs: CS.kb.listFaqs(tid(req)) }); } catch (e) { fail(res, e); } });
router.post('/faqs', adminGuard, (req, res) => { try { ok(res, { faq: CS.kb.addFaq(tid(req), req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.delete('/faqs/:faqId', adminGuard, (req, res) => { try { ok(res, { removed: CS.kb.removeFaq(tid(req), req.params.faqId) }); } catch (e) { fail(res, e); } });

/* ---------------- Knowledge base: products ---------------- */
router.get('/products', (req, res) => { try { ok(res, { products: CS.kb.listProducts(tid(req)) }); } catch (e) { fail(res, e); } });
router.post('/products', adminGuard, (req, res) => { try { ok(res, { product: CS.kb.addProduct(tid(req), req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.delete('/products/:prodId', adminGuard, (req, res) => { try { ok(res, { removed: CS.kb.removeProduct(tid(req), req.params.prodId) }); } catch (e) { fail(res, e); } });
router.post('/seed-example', adminGuard, (req, res) => { try { ok(res, CS.seedExample(tid(req))); } catch (e) { fail(res, e); } });

/* ---------------- Run / Test ---------------- */
// Safe test harness: forces dry-run, never sends.
router.post('/simulate', (req, res) => {
  (async () => {
    try { const b = req.body || {}; ok(res, { result: await CS.handleMessage(tid(req), { phone: b.phone || 'sim_' + Date.now(), name: b.name, text: b.text || '' }, { forceDryRun: true }) }); }
    catch (e) { fail(res, e); }
  })();
});
// Real inbound webhook (respects CONV_SUPPORT_DRY_RUN). Point your WhatsApp provider here.
router.post('/inbound', adminGuard, (req, res) => {
  (async () => {
    try { const b = req.body || {}; if (!b.phone) return fail(res, new Error('phone required'), 400); ok(res, { result: await CS.handleMessage(tid(req), { phone: b.phone, name: b.name, text: b.text || '' }) }); }
    catch (e) { fail(res, e); }
  })();
});

/* ---------------- Conversations ---------------- */
router.get('/conversations', (req, res) => { try { ok(res, { conversations: CS.conversations.list(tid(req), req.query.status).map(maskConvo) }); } catch (e) { fail(res, e); } });
router.get('/conversations/:phone', (req, res) => { try { const c = CS.conversations.getByPhone(tid(req), req.params.phone); return c ? ok(res, { conversation: maskConvo(c) }) : fail(res, new Error('conversation not found'), 404); } catch (e) { fail(res, e); } });
router.post('/conversations/:phone/reset', adminGuard, (req, res) => { try { ok(res, { reset: CS.conversations.reset(tid(req), req.params.phone) }); } catch (e) { fail(res, e); } });
router.post('/cleanup', adminGuard, (req, res) => { try { ok(res, { closed: CS.conversations.cleanupExpired(tid(req)) }); } catch (e) { fail(res, e); } });

/* ---------------- Human handoff queue ---------------- */
router.get('/handoffs', (req, res) => { try { ok(res, { handoffs: CS.escalation.listQueue(tid(req), req.query.status).map(maskHandoff) }); } catch (e) { fail(res, e); } });
router.post('/handoffs/:handoffId/claim', adminGuard, (req, res) => { try { const h = CS.escalation.claim(tid(req), req.params.handoffId, (req.body || {}).agent); return h ? ok(res, { handoff: maskHandoff(h) }) : fail(res, new Error('handoff not found'), 404); } catch (e) { fail(res, e); } });
router.post('/handoffs/:handoffId/resolve', adminGuard, (req, res) => { try { const h = CS.escalation.resolve(tid(req), req.params.handoffId); return h ? ok(res, { handoff: maskHandoff(h) }) : fail(res, new Error('handoff not found'), 404); } catch (e) { fail(res, e); } });

module.exports = router;
