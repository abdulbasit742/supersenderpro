'use strict';

/**
 * Ecommerce Hub — daily KPI alert to admin.
 * Pulls analytics + conversion + pending COD into one short WhatsApp KPI line
 * for the owner each day. Dry-run safe.
 */

const analytics = require('./analytics');
const conversion = require('./conversionStats');
const notify = require('./orderNotify');
const cod = require('./codStore');
function adminNumbers() { return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(cod.normNum).filter(Boolean); }
async function send() {
  const a = await analytics.snapshot();
  const c = conversion.build();
  const msg = ['\ud83d\udcca *Daily KPIs*', 'Products: ' + a.products + ' (out: ' + a.outOfStock + ')', 'Recent orders: ' + a.totalOrders, 'Pending COD: ' + a.pendingCod, 'Cart recovery: ' + c.recoveryRatePct + '%'].join('\n');
  const out = []; for (const ad of adminNumbers()) out.push(await notify.send(ad, msg));
  return { ok: true, notified: out.length };
}
module.exports = { send };
