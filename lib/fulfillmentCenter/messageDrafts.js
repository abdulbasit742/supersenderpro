  'use strict';


  /** Fulfillment Center — customer message DRAFT builder (never sends). */


  const fulfillment = require('./fulfillmentService');


  function build(orderId, kind, channel) {
      const o = fulfillment.getRaw(orderId);
      if (!o) return { ok: false, error: 'order not found' };
      const ch = ['whatsapp_preview', 'email_preview'].includes(channel) ? channel : 'whatsapp_preview';
      const customerMasked = o.phoneMasked || o.emailMasked || o.customerNameSafe;
      let message;
      switch (kind) {
       case 'shipped':
         message = `Good news ${o.customerNameSafe}! Your order ${o.orderNumber} has shipped via ${o.courierPreview ||
  'courier'}. Track: ${o.trackingRefMasked || 'TBD'}. (preview)`; break;
      case 'out_for_delivery':
        message = `${o.customerNameSafe}, your order ${o.orderNumber} is out for delivery today. Please keep ${o.currency}
  ${o.totalPreview} ready if COD. (preview)`; break;
       case 'failed_delivery':
         message = `${o.customerNameSafe}, we couldn't deliver order ${o.orderNumber} today. Reply to reschedule.
  (preview)`; break;
      case 'delivered':
        message = `${o.customerNameSafe}, your order ${o.orderNumber} was delivered. Thank you! Reply if any issue.
  (preview)`; break;
       default:
         message = `${o.customerNameSafe}, an update on your order ${o.orderNumber}. (preview)`;
      }
      return { ok: true, dryRun: true, liveSend: false, channel: ch, orderId: o.id, customerMasked, messagePreview: message,
  warnings: [], blockers: ['live_send_disabled'] };
  }


  module.exports = { build };
