'use strict';
/**
 * routes/chatbotBuilderRoutes.js - no-code Chatbot Flow Builder API.
 * Mounted in server.js at /api/chatbot-builder (see CHATBOT BUILDER HOOK).
 * Wire it with: node scripts/wire-chatbot-builder.js
 *
 * Safety:
 * - Read endpoints are open; contact phone numbers are masked in session output.
 * - Write endpoints require an admin secret (x-admin-secret / ?secret / body.secret)
 *   matching CHATBOT_BUILDER_ADMIN_SECRET / ADMIN_TOKEN / CHANNEL_ADMIN_SECRET when set.
 *   If none configured, allowed in dev with a warning (repo convention).
 * - /simulate runs the engine in FORCED dry-run (never sends) for safe testing.
 * - /inbound respects CHATBOT_BUILDER_DRY_RUN (default true).
 */
const express = require('express');
const CB = require('../lib/chatbotBuilder');
const { maskPhone } = require('../lib/chatbotBuilder/util');

const router = express.Router();

function adminGuard(req, res, next) {
  if (!CB.config.requireAdmin) return next();
  const configured = process.env.CHATBOT_BUILDER_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[ChatbotBuilder] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching CHATBOT_BUILDER_ADMIN_SECRET' });
}

const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';
const maskSession = (s) => (s ? Object.assign({}, s, { contact: Object.assign({}, s.contact, { phone: maskPhone(s.contact && s.contact.phone) }) }) : s);

/* ---------------- Status / Doctor ---------------- */
router.get('/status', (req, res) => { try { ok(res, { dryRun: CB.config.dryRun, aiAvailable: CB.aiReply.hubAvailable(), flows: CB.flows.list(tid(req)).length }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: CB.doctor.run() }); } catch (e) { fail(res, e); } });
router.get('/node-types', (req, res) => { try { ok(res, { nodeTypes: CB.nodeTypes }); } catch (e) { fail(res, e); } });

/* ---------------- Flows CRUD ---------------- */
router.get('/flows', (req, res) => { try { ok(res, { flows: CB.flows.list(tid(req), { status: req.query.status }) }); } catch (e) { fail(res, e); } });
router.post('/flows', adminGuard, (req, res) => { try { const v = CB.flows.validate(req.body || {}); if (!v.ok) return fail(res, new Error('invalid flow: ' + v.errors.join('; ')), 400); ok(res, { flow: CB.flows.create(tid(req), req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/flows/:flowId', (req, res) => { try { const f = CB.flows.get(tid(req), req.params.flowId); return f ? ok(res, { flow: f }) : fail(res, new Error('flow not found'), 404); } catch (e) { fail(res, e); } });
router.put('/flows/:flowId', adminGuard, (req, res) => { try { const f = CB.flows.update(tid(req), req.params.flowId, req.body || {}); return f ? ok(res, { flow: f }) : fail(res, new Error('flow not found'), 404); } catch (e) { fail(res, e); } });
router.delete('/flows/:flowId', adminGuard, (req, res) => { try { ok(res, { removed: CB.flows.remove(tid(req), req.params.flowId) }); } catch (e) { fail(res, e); } });
router.post('/flows/:flowId/status', adminGuard, (req, res) => { try { ok(res, { flow: CB.flows.setStatus(tid(req), req.params.flowId, (req.body || {}).status) }); } catch (e) { fail(res, e, 400); } });
router.post('/flows/validate', (req, res) => { try { ok(res, { validation: CB.flows.validate(req.body || {}) }); } catch (e) { fail(res, e); } });
router.post('/seed-example', adminGuard, (req, res) => { try { ok(res, CB.seedExample(tid(req))); } catch (e) { fail(res, e); } });

/* ---------------- Run / Test ---------------- */
// Safe test harness: forces dry-run, never sends.
router.post('/simulate', (req, res) => {
  (async () => {
    try { const b = req.body || {}; ok(res, { result: await CB.handleMessage(tid(req), { phone: b.phone || 'sim_' + Date.now(), name: b.name, text: b.text || '' }, { forceDryRun: true }) }); }
    catch (e) { fail(res, e); }
  })();
});
// Real inbound hook (respects CHATBOT_BUILDER_DRY_RUN). Point your webhook here.
router.post('/inbound', adminGuard, (req, res) => {
  (async () => {
    try { const b = req.body || {}; if (!b.phone) return fail(res, new Error('phone required'), 400); ok(res, { result: await CB.handleMessage(tid(req), { phone: b.phone, name: b.name, text: b.text || '' }) }); }
    catch (e) { fail(res, e); }
  })();
});

/* ---------------- Sessions ---------------- */
router.get('/sessions', (req, res) => { try { ok(res, { sessions: CB.sessions.list(tid(req), req.query.status).map(maskSession) }); } catch (e) { fail(res, e); } });
router.get('/sessions/:phone', (req, res) => { try { const s = CB.sessions.getByPhone(tid(req), req.params.phone); return s ? ok(res, { session: maskSession(s) }) : fail(res, new Error('session not found'), 404); } catch (e) { fail(res, e); } });
router.post('/sessions/:phone/reset', adminGuard, (req, res) => { try { ok(res, { reset: CB.sessions.reset(tid(req), req.params.phone) }); } catch (e) { fail(res, e); } });
router.post('/cleanup', adminGuard, (req, res) => { try { ok(res, { expired: CB.sessions.cleanupExpired(tid(req)) }); } catch (e) { fail(res, e); } });

module.exports = router;
