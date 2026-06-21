// src/bootstrap.js
// SuperSender Pro - master integration. Wires every drop-in module onto the
// Express app in the correct order, builds the unified inbound pipeline, and
// boots all schedulers. Defensive: a module that fails to load is logged and
// skipped so one bad require never blocks the whole boot.

'use strict';

const express = require('express');

// Safe require: never let a missing/partial module crash startup.
function tryRequire(p) {
  try { return require(p); } catch (e) { console.warn(`[bootstrap] skip ${p}: ${e && e.message}`); return null; }
}
// Safe register: same idea for the .register() call.
function safe(label, fn) {
  try { const r = fn(); console.log(`[bootstrap] ✓ ${label}`); return r; }
    catch (e) { console.error(`[bootstrap] ✗ ${label}: ${e && e.message}`); return null; }
}


function bootstrap(app, deps = {}) {
    const log = console;
    const reg = {}; // keep references to registered modules

    // ---- Load modules (any missing one is skipped) ----
    const M = {
      security:    tryRequire('./modules/security'),
     ratelimit:    tryRequire('./modules/ratelimit'),
     rbac:         tryRequire('./modules/rbac'),
     dedupe:       tryRequire('./modules/dedupe'),
     ui:           tryRequire('./modules/ui'),
     intent:       tryRequire('./modules/intent'),
     kb:           tryRequire('./modules/kb'),
     renewals:     tryRequire('./modules/renewals'),
     winback:      tryRequire('./modules/winback'),
     dropRecovery:tryRequire('./modules/dropRecovery'),
     nextOffer:   tryRequire('./modules/nextOffer'),
     referral:     tryRequire('./modules/referral'),
     sendTime:     tryRequire('./modules/sendTime'),
     abtest:       tryRequire('./modules/abtest'),
     pause:        tryRequire('./modules/pause'),
     paymentOCR:   tryRequire('./modules/paymentOCR'),
     fraudGuard:   tryRequire('./modules/fraudGuard'),
     reconcile:    tryRequire('./modules/reconcile'),
     currency:     tryRequire('./modules/currency'),
     churnRisk:    tryRequire('./modules/churnRisk'),
     ltv:          tryRequire('./modules/ltv'),
     retention:    tryRequire('./modules/retention'),
     funnel:       tryRequire('./modules/funnel'),


     margins:     tryRequire('./modules/margins'),
     revenue:     tryRequire('./modules/revenue'),
     anomaly:     tryRequire('./modules/anomaly'),
     briefing:    tryRequire('./modules/briefing'),
     backup:      tryRequire('./modules/backup'),
     health:      tryRequire('./modules/health'),
     numberHealth:tryRequire('./modules/numberHealth'),
     banRisk:     tryRequire('./modules/banRisk'),
     warmup:      tryRequire('./modules/warmup'),
     rotation:    tryRequire('./modules/rotation'),
     cod:         tryRequire('./modules/cod'),
     codAdapters: tryRequire('./modules/cod/adapters'),
     channels:    tryRequire('./modules/channels'),
     chanAdapters:tryRequire('./modules/channels/adapters'),
 };


 const send = (to, text) => (deps.waCustomer ? deps.waCustomer.sendText(to, text) : Promise.resolve());
 const sendWhatsApp = ({ to, message }) => send(to, message);
 const adminSend = ({ to, message }) => (deps.waAdmin ? deps.waAdmin.sendText(to, message) : Promise.resolve());


 // ===== 1) Security headers FIRST + raw body for webhook HMAC =====
 if (M.security) {
   app.use(express.json({ verify: M.security.core ? M.security.core.captureRawBody : undefined }));
   reg.security = safe('security', () => M.security.register(app));
 } else {
     app.use(express.json());
 }

 // ===== 2) HTTP rate limiting on the API surface =====
 if (M.ratelimit) {
   reg.ratelimit = safe('ratelimit', () => M.ratelimit.register(app));
     [deps.adminNumber].filter(Boolean).forEach((n) => { try { M.ratelimit.core.allow(n); } catch (_) {} });
     app.use('/api/payments', M.ratelimit.httpLimiter('payments', 20, 60));
     app.use('/api/', M.ratelimit.httpLimiter('api', 120, 60));
 }

 // ===== 3) RBAC seed + (log-only by default) =====
 if (M.rbac) {
   reg.rbac = safe('rbac', () => M.rbac.register(app));
   if (deps.adminNumber) { try { M.rbac.core.setActor({ id: deps.adminNumber, role: 'owner', name: 'Owner' }); } catch (_) {} }
     // Lock the dangerous routes (no-ops in RBAC log-only mode until you enforce).
     const guard = (perm) => (M.rbac.requirePermission ? M.rbac.requirePermission(perm) : (_q, _s, n) => n());
     if (M.backup)     app.post('/api/backup/restore', guard('backup.restore'), (_q, _s, n) => n && n());
     if (M.fraudGuard) app.post('/api/fraud-guard/release', guard('fraud.override'), (_q, _s, n) => n && n());
 }


 // ===== 4) Dedupe (no route, used by the inbound pipeline) =====
 if (M.dedupe) reg.dedupe = safe('dedupe', () => M.dedupe.register(app));

 // ===== 5) UI fonts + auto-inject into every dashboard HTML response =====
 if (M.ui) {
   reg.ui = safe('ui/fonts', () => M.ui.register(app));
     app.use((req, res, next) => {
       const _send = res.send.bind(res);
      res.send = (body) => _send(typeof body === 'string' && body.includes('<html') ? M.ui.inject(body) : body);
      next();


     });
 }

 // ===== 6) Register every module's routes/dashboards (deps wired) =====
 const churnBand = (n) => { try { return M.churnRisk.core.scoreOf(n).band; } catch (_) { return null; } };
 const churnScore = (n) => { try { return M.churnRisk.core.scoreOf(n).score; } catch (_) { return 50; } };


 if (M.revenue)     reg.revenue    = safe('revenue', () => M.revenue.register(app));
 if (M.kb)          reg.kb         = safe('kb', () => M.kb.register(app, {}));
 if (M.intent)      reg.intent    = safe('intent', () => M.intent.register(app, {
   replyPricing:        (from) => send(from, deps.catalog ? deps.catalog.priceText() : 'Pricing: contact admin.'),
     replyAvailability: (from) => send(from, deps.stock ? deps.stock.statusText() : 'Checking stock...'),
     replySupport:      async (from, d) => { const a = M.kb ? await M.kb.api.ask(d.text) : null; return send(from, a &&
a.answer ? a.answer : 'Team se connect kar raha hoon.'); },
   escalateToHuman: (from, ctx) => adminSend({ to: deps.adminNumber, message: `Handoff ${from}: ${ctx.text}` }),
 }));
 if (M.churnRisk) reg.churnRisk = safe('churnRisk', () => M.churnRisk.register(app));
 if (M.ltv)       reg.ltv       = safe('ltv', () => M.ltv.register(app, { getChurnRisk: churnScore }));
 if (M.retention) reg.retention = safe('retention', () => M.retention.register(app));
 if (M.funnel)      reg.funnel     = safe('funnel', () => M.funnel.register(app));
 if (M.margins)     reg.margins    = safe('margins', () => M.margins.register(app));
 if (M.nextOffer) reg.nextOffer = safe('nextOffer', () => M.nextOffer.register(app, {
   getCatalog: async () => (deps.catalog ? deps.catalog.all() : []),
     getOwned:   async (n) => (deps.db ? deps.db.ownedProducts(n) : []),
     getChurnBand: churnBand,
 }));
 if (M.referral)    reg.referral   = safe('referral', () => M.referral.register(app, { grantReward: ({ referrer, reward }) => send(referrer, `Referral reward: ${reward.label}`) }));
 if (M.sendTime) reg.sendTime = safe('sendTime', () => M.sendTime.register(app));
 if (M.abtest)      reg.abtest     = safe('abtest', () => M.abtest.register(app));
 if (M.currency)    reg.currency   = safe('currency', () => M.currency.register(app, {}));


 // Payment fraud guard + OCR (OCR delegates fraud checks to the guard).
 if (M.fraudGuard) reg.fraudGuard = safe('fraudGuard', () => M.fraudGuard.register(app));
 if (M.paymentOCR) reg.paymentOCR = safe('paymentOCR', () => M.paymentOCR.register(app, {
     getPendingOrder: async (n) => (deps.db ? deps.db.getPendingOrder(n) : null),
     onApproved: async ({ order }) => {
       if (!order) return;
       try { if (deps.stock) await deps.stock.deliver(order); } catch (_) {}
     if (M.revenue) M.revenue.core.record({ type: order.isRenewal ? 'renewal' : 'sale', amount: order.amount, plan: order.plan, customerNumber: order.customerNumber, orderId: order.orderId });
       if (M.ltv) M.ltv.core.recordPayment({ customerNumber: order.customerNumber, amount: order.amount });
       if (M.retention) M.retention.core.recordActivity(order.customerNumber);
       if (M.winback) M.winback.core.markRecovered(order.customerNumber);
       if (M.dropRecovery) M.dropRecovery.core.markRecovered(order.customerNumber);
     if (M.nextOffer) { const o = await reg.nextOffer.api.recommend(order.customerNumber); if (o)
send(order.customerNumber, o.pitch); }
     },
     onFlagged: ({ reason }) => adminSend({ to: deps.adminNumber, message: `Payment review: ${reason}` }),
 }));
 if (M.reconcile) reg.reconcile = safe('reconcile', () => M.reconcile.register(app, { getOrders: async () => (deps.db ?
deps.db.recentOrders({ days: 35 }) : []) }));

 // Retention engines (schedulers boot inside register()).
 if (M.renewals)     reg.renewals     = safe('renewals', () => M.renewals.register(app, { getActiveOrders: async () =>
(deps.db ? deps.db.getActiveOrders() : []), sendWhatsApp }));
 if (M.winback)      reg.winback      = safe('winback', () => M.winback.register(app, { getExpiredOrders: async () =>


(deps.db ? deps.db.getExpiredOrders() : []), sendWhatsApp }));
 if (M.dropRecovery) reg.dropRecovery = safe('dropRecovery', () => M.dropRecovery.register(app, { sendWhatsApp,
releaseStock: async (o) => { if (deps.stock) deps.stock.release(o.productId); } }));
 if (M.pause)        reg.pause        = safe('pause', () => M.pause.register(app, { sendWhatsApp, onExpiryChange: async ({ customerNumber, newExpiresAt }) => { if (deps.db) deps.db.setExpiry(customerNumber, newExpiresAt); } }));


    // Deliverability cluster (gateway machine).
    if (M.warmup)       reg.warmup       = safe('warmup', () => M.warmup.register(app));
    if (M.numberHealth) reg.numberHealth = safe('numberHealth', () => M.numberHealth.register(app));
 if (M.banRisk)      reg.banRisk      = safe('banRisk', () => M.banRisk.register(app, { onAlert: ({ numberId, band,
forecast, reasons }) => { adminSend({ to: deps.adminNumber, message: `Ban-risk ${band} on ${numberId} (${forecast}):
${reasons.join(', ')}` }); if (band === 'imminent' && M.numberHealth) M.numberHealth.core.recordReport(numberId); } }));
 if (M.rotation)     reg.rotation     = safe('rotation', () => M.rotation.register(app, {
        getPool: () => Object.keys(deps.waClients || {}).map((id) => ({ id, sentToday: 0 })),
        dailyCap: (id) => { try { return M.warmup.core.dailyCap(id); } catch (_) { return 1000; } },
        healthScore: (id) => { try { return M.numberHealth.core.scoreOf(id); } catch (_) { return 100; } },
        capFactor: (id) => { try { return M.numberHealth.core.capFactor(id); } catch (_) { return 1; } },
      banForecast: (id) => { try { return M.banRisk.core.forecast(id).forecast; } catch (_) { return 0; } },
    }));


    // COD + couriers.
    if (M.cod) {
      reg.cod = safe('cod', () => M.cod.register(app, { sendWhatsApp }));
        if (M.codAdapters) { try { M.cod.core.addCourier(M.codAdapters.manualAdapter); } catch (_) {} }
    }


    // Anomaly + briefing read the others; register after them.
    if (M.anomaly) reg.anomaly = safe('anomaly', () => M.anomaly.register(app, {
      onAlert: ({ metric, direction, value }) => adminSend({ to: deps.adminNumber, message: `Anomaly: ${metric}
${direction} -> ${value}` }),
   metrics: {
         fraud_flags:      () => { try { return M.fraudGuard.core.getStats().byBand.fraud || 0; } catch (_) { return null; }
},
         open_drops:      () => { try { return M.dropRecovery.core.getStats().open; } catch (_) { return null; } },
         benched_numbers: () => { try { return M.numberHealth.core.getStats().byBand.bench || 0; } catch (_) { return null;
} },
         conversion_rate: () => { try { return M.funnel.core.report().overallConversion; } catch (_) { return null; } },
      },
    }));
    if (M.briefing) reg.briefing = safe('briefing', () => M.briefing.register(app, {
      sendWhatsApp: adminSend, adminNumber: deps.adminNumber,
        sources: {
          revenue:   () => M.revenue && M.revenue.core.summarize(),
         churn:      () => M.churnRisk && M.churnRisk.core.atRiskList(5),
         banRisk:    () => M.banRisk && M.banRisk.core.getStats(),
         drops:      () => M.dropRecovery && M.dropRecovery.core.getStats(),
         fraud:      () => M.fraudGuard && M.fraudGuard.core.getStats(),
         referrals: () => M.referral && M.referral.core.getStats(),
         health:    () => M.numberHealth && M.numberHealth.core.getStats(),
      },
    }));

    // Backup + health watchdog last.
    if (M.backup) reg.backup = safe('backup', () => M.backup.register(app));
    if (M.health) {
   reg.health = safe('health', () => M.health.register(app, { onAlert: ({ check, status, detail }) => adminSend({ to:
deps.adminNumber, message: `${status === 'down' ? 'DOWN' : 'UP'} ${check}${detail ? ': ' + detail : ''}` }) }));


     try {
         M.health.core.addProbe('data_dir', M.health.core.probes.dataDirWritable);
         if (deps.redis) M.health.core.addProbe('redis', async () => ({ ok: await deps.redis.ping().then(() =>
true).catch(() => false) }));
     if (deps.db) M.health.core.addProbe('db', async () => ({ ok: await deps.db.query('SELECT 1').then(() =>
true).catch(() => false) }));
     Object.keys(deps.waClients || {}).forEach((id) => M.health.core.addProbe('wa_' + id, async () => ({ ok:
deps.waClients[id] && deps.waClients[id].connected === true })));
   } catch (_) {}
 }


 // ===== 7) Channels + the UNIFIED inbound pipeline =====
 if (M.channels) {
     reg.channels = safe('channels', () => M.channels.register(app, { onMessage: (msg) => handleInbound(msg) }));
     if (M.chanAdapters) {
         try {
           M.channels.core.addAdapter(M.chanAdapters.whatsappAdapter({ send: (to, t) => send(to, t) }));
           if (process.env.TELEGRAM_BOT_TOKEN) M.channels.core.addAdapter(M.chanAdapters.telegramAdapter({}));
           if (process.env.INSTAGRAM_ACCESS_TOKEN) M.channels.core.addAdapter(M.chanAdapters.instagramAdapter({}));
           M.channels.core.addAdapter(M.chanAdapters.snapchatAdapter({}));
         } catch (_) {}
     }
 }


 // The one handler every channel + the WhatsApp bot funnels into.
 async function handleInbound(msg) {
   const from = msg.from; const text = msg.text || ''; const channel = msg.channel || 'whatsapp';
     // a) dedupe
     if (M.dedupe) { const d = M.dedupe.core.seen({ id: msg.id, from, body: text }); if (d.duplicate) return; }
     // b) inbound flood guard
     if (M.ratelimit) { const v = M.ratelimit.core.inboundGuard(from); if (v.blocked) return; }
     // c) pause mute + opt-outs
     if (M.pause && M.pause.core.isMuted(from)) { /* still allow intent, but engines self-skip */ }
     // d) engagement + identity signals
     if (M.churnRisk) M.churnRisk.core.onInboundMessage(from);
     if (M.sendTime) M.sendTime.core.recordResponse(from);
     if (M.banRisk) M.banRisk.core.recordInbound(from);
     // e) referral code redemption
     if (M.referral) { const m = text.match(/\bREF-[A-Z0-9]{3,4}-[A-Z0-9]{4}\b/i); if (m) M.referral.core.redeem(from,
m[0]); }
   // f) intent -> route
     let decision = { intent: 'unknown' };
     if (M.intent) decision = await M.intent.core.decide({ from, text });
   if (M.churnRisk && (decision.intent === 'complaint' || decision.sentiment === 'negative'))
M.churnRisk.core.onComplaint(from);
   if (M.funnel) { M.funnel.core.track(from, 'contacted'); if (decision.intent === 'pricing' || decision.intent ===
'availability') M.funnel.core.track(from, 'product_interest'); }

     // g) compose a reply (KB for support/unknown, else intent routing)
     let reply;
     if ((decision.intent === 'support' || decision.intent === 'unknown') && M.kb) {
       const ans = await M.kb.api.ask(text); reply = ans.answer;
     } else if (decision.intent === 'pricing' && deps.catalog) {
       reply = deps.catalog.priceText();
     } else {
         reply = 'Shukriya! Team jald reply karegi.';
     }


       // h) send back on the SAME channel
       if (M.channels) await M.channels.core.send({ channel, to: from, text: reply });
       else await send(from, reply);
   }


   // Expose the handler + registry so server.js / existing WhatsApp webhook can call it.
   app.locals.ssp = { handleInbound, modules: M, reg };
   log.log(`[bootstrap] done. Modules live: ${Object.keys(reg).length}`);
   return { handleInbound, modules: M, reg };
}


module.exports = bootstrap;
