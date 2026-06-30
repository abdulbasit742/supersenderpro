'use strict';
/**
 * routes/salesPipelineRoutes.js - Sales & Pipeline (deal-closing) API.
 * Mounted in server.js at /api/sales-pipeline (see SALES PIPELINE HOOK).
 * Wire it with: node scripts/wire-sales-pipeline.js
 *
 * Safety:
 *  - Read endpoints are open; phone numbers are masked in list output.
 *  - Write endpoints require an admin secret (x-admin-secret / ?secret / body.secret)
 *    matching SALES_PIPELINE_ADMIN_SECRET / ADMIN_TOKEN / CHANNEL_ADMIN_SECRET when set.
 *    If none configured, allowed in dev with a warning (repo convention).
 *  - Follow-ups & cart recovery are DRY-RUN by default (prepared, not sent).
 */
const express = require('express');
const SP = require('../lib/salesPipeline');
const { maskPhone } = require('../lib/salesPipeline/util');

const router = express.Router();

function adminGuard(req, res, next) {
  if (!SP.config.requireAdmin) return next();
  const configured = process.env.SALES_PIPELINE_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[SalesPipeline] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching SALES_PIPELINE_ADMIN_SECRET' });
}

const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';
const maskDeal = (d) => (d ? Object.assign({}, d, { contact: Object.assign({}, d.contact, { phone: maskPhone(d.contact && d.contact.phone) }) }) : d);

/* ---------------- Status / Doctor / Config ---------------- */
router.get('/status', (req, res) => { try { ok(res, { metrics: SP.pipeline.metrics(tid(req)), dryRun: SP.config.dryRun }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: SP.doctor.run() }); } catch (e) { fail(res, e); } });
router.get('/stages', (req, res) => { try { ok(res, { stages: SP.stages }); } catch (e) { fail(res, e); } });
router.get('/metrics', (req, res) => { try { ok(res, { metrics: SP.pipeline.metrics(tid(req)) }); } catch (e) { fail(res, e); } });

/* ---------------- Deals / Pipeline ---------------- */
router.get('/deals', (req, res) => {
  try {
    const open = req.query.open === undefined ? undefined : req.query.open === 'true';
    const deals = SP.pipeline.listDeals(tid(req), { stage: req.query.stage, open, ownerId: req.query.ownerId, q: req.query.q });
    ok(res, { deals: deals.map(maskDeal), count: deals.length });
  } catch (e) { fail(res, e); }
});
router.post('/deals', adminGuard, (req, res) => { try { ok(res, { deal: SP.pipeline.createDeal(tid(req), req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/deals/:dealId', (req, res) => { try { const d = SP.pipeline.getDeal(tid(req), req.params.dealId); return d ? ok(res, { deal: d }) : fail(res, new Error('deal not found'), 404); } catch (e) { fail(res, e); } });
router.put('/deals/:dealId', adminGuard, (req, res) => { try { const d = SP.pipeline.updateDeal(tid(req), req.params.dealId, req.body || {}); return d ? ok(res, { deal: d }) : fail(res, new Error('deal not found'), 404); } catch (e) { fail(res, e); } });
router.post('/deals/:dealId/stage', adminGuard, (req, res) => { try { ok(res, { deal: SP.pipeline.moveStage(tid(req), req.params.dealId, (req.body || {}).stage, req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.post('/deals/:dealId/activity', adminGuard, (req, res) => { try { const d = SP.pipeline.recordActivity(tid(req), req.params.dealId, (req.body || {}).note); return d ? ok(res, { deal: d }) : fail(res, new Error('deal not found'), 404); } catch (e) { fail(res, e); } });
router.post('/deals/:dealId/notes', adminGuard, (req, res) => { try { const d = SP.pipeline.addNote(tid(req), req.params.dealId, (req.body || {}).text, (req.body || {}).by); return d ? ok(res, { deal: d }) : fail(res, new Error('deal not found'), 404); } catch (e) { fail(res, e); } });
router.get('/deals/:dealId/followups', (req, res) => { try { ok(res, { followups: SP.followUps.listForDeal(tid(req), req.params.dealId) }); } catch (e) { fail(res, e); } });

/* ---------------- Follow-ups ---------------- */
router.get('/followups/due', (req, res) => { try { ok(res, { due: SP.followUps.listDue(tid(req)) }); } catch (e) { fail(res, e); } });
router.post('/followups/process', adminGuard, async (req, res) => { try { ok(res, await SP.followUps.processDue(tid(req), SP.pipeline)); } catch (e) { fail(res, e); } });

/* ---------------- Cart abandonment recovery ---------------- */
router.get('/carts', (req, res) => { try { ok(res, { carts: SP.cartRecovery.listCarts(tid(req), req.query.status) }); } catch (e) { fail(res, e); } });
router.post('/carts', adminGuard, (req, res) => { try { ok(res, { cart: SP.cartRecovery.trackCart(tid(req), req.body || {}) }); } catch (e) { fail(res, e); } });
router.post('/carts/:cartId/status', adminGuard, (req, res) => { try { const c = SP.cartRecovery.setStatus(tid(req), req.params.cartId, (req.body || {}).status, req.body || {}); return c ? ok(res, { cart: c }) : fail(res, new Error('cart not found'), 404); } catch (e) { fail(res, e); } });
router.post('/carts/process', adminGuard, async (req, res) => { try { ok(res, await SP.cartRecovery.processRecovery(tid(req))); } catch (e) { fail(res, e); } });

/* ---------------- Quotes & Invoices ---------------- */
router.get('/quotes', (req, res) => { try { ok(res, { docs: SP.quotes.list(tid(req), { type: 'quote', dealId: req.query.dealId, status: req.query.status }) }); } catch (e) { fail(res, e); } });
router.post('/quotes', adminGuard, (req, res) => { try { const q = SP.quotes.createQuote(tid(req), req.body || {}); if (q.dealId) SP.pipeline.attachQuote(tid(req), q.dealId, q.id); ok(res, { quote: q }); } catch (e) { fail(res, e); } });
router.get('/invoices', (req, res) => { try { ok(res, { docs: SP.quotes.list(tid(req), { type: 'invoice', dealId: req.query.dealId, status: req.query.status }) }); } catch (e) { fail(res, e); } });
router.post('/invoices', adminGuard, (req, res) => { try { const inv = SP.quotes.createInvoice(tid(req), req.body || {}); if (inv.dealId) SP.pipeline.attachQuote(tid(req), inv.dealId, inv.id); ok(res, { invoice: inv }); } catch (e) { fail(res, e, 400); } });
router.get('/docs/:docId', (req, res) => { try { const d = SP.quotes.getById(tid(req), req.params.docId); if (!d) return fail(res, new Error('not found'), 404); if (req.query.format === 'html') { res.set('Content-Type', 'text/html'); return res.send(SP.quotes.renderHTML(d)); } if (req.query.format === 'text') { res.set('Content-Type', 'text/plain'); return res.send(SP.quotes.renderText(d)); } ok(res, { doc: d }); } catch (e) { fail(res, e); } });
router.post('/docs/:docId/status', adminGuard, (req, res) => { try { const d = SP.quotes.setStatus(tid(req), req.params.docId, (req.body || {}).status, req.body || {}); return d ? ok(res, { doc: d }) : fail(res, new Error('not found'), 404); } catch (e) { fail(res, e); } });

/* ---------------- Run all automations (cron-friendly) ---------------- */
router.post('/tick', adminGuard, async (req, res) => { try { ok(res, { result: await SP.tick(tid(req)) }); } catch (e) { fail(res, e); } });

module.exports = router;
