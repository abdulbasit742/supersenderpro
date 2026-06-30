'use strict';
/**
 * lib/billing/notifications.js - tell the owner when their subscription status changes.
 * Dunning is a real revenue lever: a past-due customer who gets a friendly nudge often pays.
 * Ties billing (#95) -> notify dispatcher (#322) -> event bus (#344).
 *
 * Safe: notify is dry-run by default (prepares, doesn't send); this never throws.
 */
let notify = null; try { notify = require('../notify'); } catch {}
let bus = null; try { bus = require('../events/bus'); } catch {}
let settings = null; try { settings = require('../settings'); } catch {}

const KINDS = {
  past_due: { event: 'subscription.past_due', subject: 'Payment failed', body: (b) => 'Hi! We could not process your payment for the ' + b.brand + ' subscription. Please update your payment method to avoid interruption. Grace period ends soon.' },
  recovered: { event: 'subscription.recovered', subject: 'Payment received', body: (b) => 'Thanks! Your ' + b.brand + ' subscription payment went through and your account is active.' },
  canceled: { event: 'subscription.canceled', subject: 'Subscription canceled', body: (b) => 'Your ' + b.brand + ' subscription has been canceled and your account moved to the Free plan. You can re-subscribe anytime.' },
  upgraded: { event: 'subscription.upgraded', subject: 'Plan upgraded', body: (b) => 'Your ' + b.brand + ' plan is now ' + (b.planId || 'upgraded') + '. Enjoy the new limits!' },
};

async function notifySubscriptionEvent(tenantId, kind, opts = {}) {
  const def = KINDS[kind];
  if (!def) throw new Error('unknown subscription notification kind: ' + kind);
  let brand = 'SuperSender';
  try { if (settings) brand = (await settings.get(tenantId, 'brandName')) || brand; } catch {}
  const message = def.body({ brand, planId: opts.planId });

  // 1) notify the owner across configured channels (recipients/contact resolved by caller or env)
  const channels = opts.channels || ['whatsapp'];
  const to = opts.to || (Array.isArray(opts.recipients) ? opts.recipients : null);
  const results = {};
  if (notify && to) {
    for (const ch of channels) {
      const target = Array.isArray(to) ? to[0] : to;
      try { results[ch] = await notify.send(ch, target, message, { subject: def.subject, meta: { tenantId, kind } }); } catch (e) { results[ch] = { ok: false, error: e.message }; }
    }
  } else {
    results.note = 'no recipient provided - message prepared only';
  }

  // 2) emit on the bus (webhooks + audit + metrics)
  let emitted = null;
  if (bus) { try { emitted = await bus.emit(tenantId, def.event, { kind, planId: opts.planId }); } catch {} }

  return { kind, event: def.event, message, notify: results, emitted: !!emitted };
}

module.exports = { notifySubscriptionEvent, KINDS };
