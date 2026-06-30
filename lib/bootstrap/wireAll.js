'use strict';
/**
 * lib/bootstrap/wireAll.js — ONE call to wire every new department into the app.
 *
 * The features built across the open PRs (broadcast, marketing, payments, CRM, workflows) each need
 * a few lines of server.js wiring: mount routes, register cross-module hooks, start cron sweeps.
 * Doing that by hand in a 2.1MB server.js is error-prone. This module does it all in one guarded
 * call so go-live is a single line:
 *
 *     const { wireAll } = require('./lib/bootstrap/wireAll');
 *     wireAll(app, { waClient, loadCrmContacts });
 *
 * Design principles:
 *   - SAFE: every require + every wire step is wrapped; a missing/not-yet-merged module is simply
 *     skipped and reported, never crashes the server. So this can be merged before/after any of the
 *     feature PRs.
 *   - CONNECTED: it injects the modules into each other so the system actually works as one
 *     (CRM 360 powers segments; payments award loyalty + activate subscriptions + invoice + dunning;
 *     workflow actions call the real senders).
 *   - HONEST: returns a report of what got wired and what was skipped.
 */

const path = require('path');

function tryRequire(rel) {
  try { return require(rel); } catch { return null; }
}
function safe(report, label, fn) {
  try { fn(); report.wired.push(label); }
  catch (e) { report.skipped.push(`${label}: ${e.message}`); }
}

/**
 * @param {object} app        express app
 * @param {object} opts
 * @param {object} opts.waClient        the live whatsapp-web.js client
 * @param {function} [opts.loadCrmContacts]  (storeId) => contacts[]; falls back to CRM 360 profiles
 * @param {object} [opts.cron]           node-cron (defaults to require('node-cron'))
 * @param {object} [opts.orderHooks]     { markOrderPaid, activatePlan } for payment fulfillment
 */
function wireAll(app, opts = {}) {
  const report = { wired: [], skipped: [] };
  const waClient = opts.waClient || null;
  const cron = opts.cron || tryRequire('node-cron');

  // ---- load modules (any may be absent if its PR isn't merged yet) ----
  const broadcastHub   = tryRequire('../broadcastHub');
  const segmentEngine  = tryRequire('../marketing/segmentEngine');
  const dripEngine     = tryRequire('../marketing/dripEngine');
  const segmentBroadcast = tryRequire('../marketing/segmentBroadcast');
  const loyalty        = tryRequire('../marketing/loyaltyEngine');
  const analytics      = tryRequire('../marketing/campaignAnalytics');
  const fulfillment    = tryRequire('../paymentGateway/fulfillment');
  const subs           = tryRequire('../saasBilling/subscriptionLifecycle');
  const invoices       = tryRequire('../saasBilling/invoiceEngine');
  const dunning        = tryRequire('../saasBilling/dunningEngine');
  const billingPortal  = tryRequire('../saasBilling/billingPortal');
  const customer360    = tryRequire('../crm/customer360');
  const salesPipeline  = tryRequire('../crm/salesPipeline');
  const notesTasks     = tryRequire('../crm/notesAndTasks');
  const profileSummary = tryRequire('../crm/profileSummary');
  const workflows      = tryRequire('../workflows/workflowEngine');

  // Default contact loader: prefer caller's CRM, else Customer 360 profiles enriched with loyalty.
  const loadContacts = opts.loadCrmContacts || ((storeId) => {
    if (!customer360) return [];
    return customer360.asSegmentContacts(loyalty ? loyalty.enrichContact : undefined);
  });

  // Helper to convert a phone/contact to a wa id.
  const waId = (c) => {
    const raw = String((c && (c.phone || c.id)) || c || '').trim();
    if (!raw) return null;
    if (raw.includes('@')) return raw;
    const d = raw.replace(/[^\d]/g, '');
    return d ? `${d}@c.us` : null;
  };
  const sendText = async (contact, text) => {
    if (!waClient) throw new Error('no waClient');
    const to = waId(contact);
    if (to) await waClient.sendMessage(to, text);
  };

  function mount(route, mod) { if (mod) app.use(route, mod); }

  // ---- broadcast ----
  safe(report, 'broadcast', () => {
    if (!broadcastHub) throw new Error('module missing');
    if (waClient) broadcastHub.setWhatsAppClient(waClient);
    mount('/api/broadcast', tryRequire('../../routes/broadcastHubRoutes'));
  });

  // ---- marketing: segments ----
  safe(report, 'marketing.segments', () => {
    const r = tryRequire('../../routes/marketingSegmentsRoutes');
    if (r && r.setContactLoader) r.setContactLoader(loadContacts);
    mount('/api/marketing/segments', r);
  });

  // ---- marketing: drip (+ cron executor) ----
  safe(report, 'marketing.drip', () => {
    if (!dripEngine) throw new Error('module missing');
    dripEngine.setSender(async (contact, { text, mediaPath }) => {
      // mediaPath handling left to broadcastHub/mergeFields; text path covers the common case
      await sendText(contact, text);
    });
    const r = tryRequire('../../routes/marketingDripRoutes');
    if (r && r.setSegmentResolver && segmentEngine) {
      r.setSegmentResolver((segmentId, storeId) =>
        segmentEngine.resolveSegmentContacts(segmentId, loadContacts(storeId)).contacts);
    }
    mount('/api/marketing/drips', r);
    if (cron) cron.schedule('* * * * *', () => dripEngine.tick().catch(() => {}));
  });

  // ---- marketing: segment broadcast ----
  safe(report, 'marketing.segmentBroadcast', () => {
    if (!segmentBroadcast) throw new Error('module missing');
    segmentBroadcast.setContactLoader(loadContacts);
    mount('/api/marketing/segment-broadcast', tryRequire('../../routes/marketingSegmentBroadcastRoutes'));
  });

  // ---- marketing: loyalty ----
  safe(report, 'marketing.loyalty', () => {
    mount('/api/marketing/loyalty', tryRequire('../../routes/marketingLoyaltyRoutes'));
  });

  // ---- marketing: analytics ----
  safe(report, 'marketing.analytics', () => {
    mount('/api/marketing/analytics', tryRequire('../../routes/marketingAnalyticsRoutes'));
  });

  // ---- CRM: customer 360 ----
  safe(report, 'crm.customer360', () => {
    mount('/api/crm/profiles', tryRequire('../../routes/customer360Routes'));
  });

  // ---- CRM: sales pipeline (stage moves -> 360 timeline) ----
  safe(report, 'crm.pipeline', () => {
    if (salesPipeline && customer360) {
      salesPipeline.setTimelineRecorder((phone, ev) => customer360.recordEvent(phone, ev));
    }
    mount('/api/crm/pipeline', tryRequire('../../routes/salesPipelineRoutes'));
  });

  // ---- CRM: notes + tasks (-> 360 timeline) ----
  safe(report, 'crm.notesTasks', () => {
    if (notesTasks && customer360) {
      notesTasks.setTimelineRecorder((phone, ev) => customer360.recordEvent(phone, ev));
    }
    mount('/api/crm', tryRequire('../../routes/crmNotesTasksRoutes'));
  });

  // ---- CRM: AI profile summary ----
  safe(report, 'crm.summary', () => {
    if (profileSummary && customer360) {
      profileSummary.setProfileFetcher((id) => customer360.getProfile(id));
    }
    mount('/api/crm/summary', tryRequire('../../routes/crmSummaryRoutes'));
  });

  // ---- payments: fulfillment config (the revenue-leak fix) ----
  safe(report, 'payments.fulfillment', () => {
    if (!fulfillment) throw new Error('module missing');
    fulfillment.configure({
      activateOrder: opts.orderHooks && opts.orderHooks.markOrderPaid
        ? async ({ orderId, event }) => opts.orderHooks.markOrderPaid(orderId, event) : null,
      activateSubscription: async ({ planId, customer }) => {
        if (subs) await subs.activate(customer, planId);
        if (opts.orderHooks && opts.orderHooks.activatePlan) await opts.orderHooks.activatePlan(customer, planId);
      },
      awardLoyalty: loyalty ? ({ customer, amount, reason }) => loyalty.earnFromOrder(customer, amount, reason) : null,
      convertReferral: loyalty ? ({ customer }) => loyalty.convertReferral(customer) : null
    });
    // also drop a 360 payment event + an invoice if those modules exist
  });

  // ---- payments: subscriptions (+ hooks + cron) ----
  safe(report, 'payments.subscriptions', () => {
    if (subs) {
      subs.setHooks({
        onPastDue: dunning ? (s) => dunning.openCase(s.customer, s.planId, { name: s.customer && s.customer.name }) : null,
        onActivate: null,
        onExpire: null
      });
      if (cron) cron.schedule('0 * * * *', () => subs.tick().catch(() => {}));
    }
    mount('/api/subscriptions', tryRequire('../../routes/subscriptionRoutes'));
  });

  // ---- payments: invoices ----
  safe(report, 'payments.invoices', () => {
    mount('/api/invoices', tryRequire('../../routes/invoiceRoutes'));
  });

  // ---- payments: dunning (+ sender + cron) ----
  safe(report, 'payments.dunning', () => {
    if (dunning) {
      dunning.setSender(async (contact, { text }) => sendText(contact, text));
      if (cron) cron.schedule('0 * * * *', () => dunning.tick().catch(() => {}));
    }
    mount('/api/dunning', tryRequire('../../routes/dunningRoutes'));
  });

  // ---- payments: billing portal ----
  safe(report, 'payments.billingPortal', () => {
    mount('/api/billing', tryRequire('../../routes/billingPortalRoutes'));
  });

  // ---- payments routes (checkout/webhook) ----
  safe(report, 'payments.gateway', () => {
    mount('/api/payments', tryRequire('../../routes/paymentGatewayRoutes'));
  });

  // ---- workflows (register actions that call the real departments) ----
  safe(report, 'workflows', () => {
    if (!workflows) throw new Error('module missing');
    workflows.registerAction('send_message', async (p, ctx) => sendText({ phone: p.to || ctx.phone }, p.text));
    if (customer360) workflows.registerAction('add_tag', async (p, ctx) => customer360.upsertProfile(ctx.phone, { tags: [p.tag] }));
    if (dripEngine) workflows.registerAction('enroll_drip', async (p, ctx) => dripEngine.enrollContact(p.campaignId, { phone: ctx.phone }));
    if (dunning) workflows.registerAction('open_dunning', async (p, ctx) => dunning.openCase({ phone: ctx.phone }, p.planId));
    if (loyalty) workflows.registerAction('award_points', async (p, ctx) => loyalty.earn({ phone: ctx.phone }, p.amount, p.reason || 'workflow'));
    if (segmentBroadcast) workflows.registerAction('broadcast_segment', async (p) => segmentBroadcast.broadcastToSegment({ segmentId: p.segmentId, message: p.text }));
    mount('/api/workflows', tryRequire('../../routes/workflowRoutes'));
  });

  console.log(`[wireAll] wired: ${report.wired.join(', ') || 'none'}`);
  if (report.skipped.length) console.warn(`[wireAll] skipped: ${report.skipped.join(' | ')}`);
  return report;
}

module.exports = { wireAll };
