'use strict';
/**
 * routes/interactiveTemplatesRoutes.js - WhatsApp Interactive Message builder API.
 * Mounted in server.js at /api/interactive-templates (see INTERACTIVE TEMPLATES HOOK).
 * Wire it with: node scripts/wire-interactive-templates.js
 *
 * Safety:
 * - Read endpoints open; write endpoints admin-guarded (x-admin-secret / ?secret / body.secret).
 * - /preview builds a payload WITHOUT sending (forced dry-run).
 * - /send respects INTERACTIVE_TEMPLATES_DRY_RUN (default true).
 */
const express = require('express');
const IT = require('../lib/interactiveTemplates');

const router = express.Router();

function adminGuard(req, res, next) {
  if (!IT.config.requireAdmin) return next();
  const configured = process.env.INTERACTIVE_TEMPLATES_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[InteractiveTemplates] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching INTERACTIVE_TEMPLATES_ADMIN_SECRET' });
}

const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';

router.get('/status', (req, res) => { try { ok(res, { dryRun: IT.config.dryRun, types: IT.types, count: IT.templates.list(tid(req)).length }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: IT.doctor.run() }); } catch (e) { fail(res, e); } });
router.get('/limits', (req, res) => { try { ok(res, { limits: IT.limits }); } catch (e) { fail(res, e); } });
router.get('/examples', (req, res) => { try { ok(res, { examples: IT.examples() }); } catch (e) { fail(res, e); } });

router.get('/templates', (req, res) => { try { ok(res, { templates: IT.templates.list(tid(req), { type: req.query.type }) }); } catch (e) { fail(res, e); } });
router.post('/templates', adminGuard, (req, res) => { try { ok(res, { template: IT.templates.create(tid(req), req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.get('/templates/:tplId', (req, res) => { try { const t = IT.templates.get(tid(req), req.params.tplId); return t ? ok(res, { template: t }) : fail(res, new Error('template not found'), 404); } catch (e) { fail(res, e); } });
router.put('/templates/:tplId', adminGuard, (req, res) => { try { const t = IT.templates.update(tid(req), req.params.tplId, req.body || {}); return t ? ok(res, { template: t }) : fail(res, new Error('template not found'), 404); } catch (e) { fail(res, e, 400); } });
router.delete('/templates/:tplId', adminGuard, (req, res) => { try { ok(res, { removed: IT.templates.remove(tid(req), req.params.tplId) }); } catch (e) { fail(res, e); } });

router.post('/validate', (req, res) => { try { ok(res, { validation: IT.validate(req.body || {}) }); } catch (e) { fail(res, e); } });
router.post('/preview', (req, res) => { try { const b = req.body || {}; ok(res, { payload: IT.build(b.template || b, b.to || '<recipient>', b.ctx || {}) }); } catch (e) { fail(res, e, 400); } });
router.post('/templates/:tplId/send', adminGuard, (req, res) => {
  (async () => {
    try { const b = req.body || {}; if (!b.to) return fail(res, new Error('to (phone) required'), 400); ok(res, await IT.send(tid(req), req.params.tplId, b.to, b.ctx || {})); }
    catch (e) { fail(res, e, 400); }
  })();
});

module.exports = router;
