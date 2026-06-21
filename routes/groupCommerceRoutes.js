// routes/groupCommerceRoutes.js
// Group Commerce OS - Express router. Mount via the server hook. Dry-run by default.


'use strict';

const express = require('express');
const router = express.Router();


const registry = require('../lib/groupCommerce/groupRegistry');
const commands = require('../lib/groupCommerce/commandRouter');
const moderation = require('../lib/groupCommerce/moderation');
const analyzer = require('../lib/groupCommerce/messageAnalyzer');
const catalog = require('../lib/groupCommerce/catalog');
const bridge = require('../lib/groupCommerce/ecommerceBridge');
const relay = require('../lib/groupCommerce/relayPlanner');
const agents = require('../lib/groupCommerce/agentRegistry');
const pause = require('../lib/groupCommerce/pauseManager');
const store = require('../lib/groupCommerce/store');


function ok(res, p) { return res.json(Object.assign({ ok: true }, p)); }
function fail(res, c, e) { return res.status(c).json({ ok: false, error: String(e) }); }

router.get('/status', (_q, res) => ok(res, {
  dryRun: String(process.env.GROUP_COMMERCE_DRY_RUN || 'true') === 'true',
  enabled: String(process.env.GROUP_COMMERCE_ENABLED || 'true') === 'true',
  groups: registry.list().length, agents: agents.listAgents(),
}));

router.get('/groups', (_q, res) => ok(res, { groups: registry.list() }));
router.post('/groups', (req, res) => { try { ok(res, { group: registry.register(req.body || {}) }); } catch (e) {
fail(res, 500, e.message); } });
router.get('/groups/:id', (req, res) => { const g = registry.get(req.params.id); return g ? ok(res, { group: g }) :
fail(res, 404, 'group not found'); });
router.put('/groups/:id', (req, res) => { const g = registry.update(req.params.id, req.body || {}); return g ? ok(res, {
group: g }) : fail(res, 404, 'group not found'); });

router.post('/groups/:id/command', (req, res) => {
  const b = req.body || {};
  const r = commands.route(b.text || '', { groupId: req.params.id, fromNumber: b.fromNumber });
  store.appendHistory({ type: 'command', groupId: req.params.id, cmd: (b.text || '').split(' ')[0] });
  return ok(res, { result: r });
});


router.post('/groups/:id/analyze-message', (req, res) => {
 const b = req.body || {};
 const analysis = analyzer.analyze(b.message || '');
 const mod = moderation.moderate(b.message || '', { banLinks: b.banLinks, fromHash: b.fromHash });
 return ok(res, { analysis, moderation: mod });
});


router.get('/groups/:id/catalog', (req, res) => ok(res, { catalog: catalog.listCatalog(req.params.id), draft:
catalog.groupPostDraft(req.params.id) }));
router.post('/groups/:id/catalog', (req, res) => { try { ok(res, { item: catalog.upsertItem(req.params.id, req.body ||
{}) }); } catch (e) { fail(res, 500, e.message); } });

router.post('/groups/:id/ecommerce-preview', (req, res) => {
 const b = req.body || {}; const kind = b.kind;
 const map = {
     product_to_catalog: () => bridge.productToGroupCatalog(b.payload || {}),
     offer_to_product: () => bridge.offerToProductDraft(b.payload || {}),
     buyer_to_order: () => bridge.buyerToOrderDraft(b.payload || {}),
     stock_to_ecommerce: () => bridge.stockToEcommerceDraft(b.payload || {}),
     abandoned_cart_alert: () => bridge.abandonedCartAlertDraft(b.payload || {}),
     new_product_post: () => bridge.newProductPostDraft(b.payload || {}),
 };
 if (!map[kind]) return fail(res, 400, 'unknown preview kind');
 return ok(res, { preview: map[kind]() });
});


router.post('/groups/:id/relay-preview', (req, res) => {
 const b = req.body || {}; const kind = b.kind;
 const map = {
     group_to_channel: () => relay.groupProductToChannelDraft(b.payload || {}),
     offer_to_social: () => relay.sellerOfferToSocialDraft(b.payload || {}),
     ecommerce_to_group: () => relay.ecommerceProductToGroupDraft(b.payload || {}),
     market_digest: () => relay.marketSummaryDigest(catalog.listCatalog(req.params.id)),
 };
 if (!map[kind]) return fail(res, 400, 'unknown relay kind');
 return ok(res, { preview: map[kind]() });
});


router.get('/agents', (_q, res) => ok(res, { agents: agents.listAgents() }));
router.post('/groups/:id/agents', (req, res) => {
 const b = req.body || {};
 if (b.suggestFor) return ok(res, agents.suggest(req.params.id, b.suggestFor));
 const r = agents.setAssignment(req.params.id, b.agent, b.enabled !== false);
 return r.ok ? ok(res, r) : fail(res, 400, r.error);
});

router.post('/groups/:id/pause', (req, res) => { const b = req.body || {}; return ok(res, pause.pause(req.params.id,
b.minutes, b.scope)); });
router.post('/groups/:id/resume', (req, res) => ok(res, pause.resume(req.params.id)));

router.get('/history', (_q, res) => ok(res, { events: store.readHistory().events.slice(-100).reverse() }));


module.exports = router;
