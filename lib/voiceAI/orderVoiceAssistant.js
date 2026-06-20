// lib/voiceAI/orderVoiceAssistant.js — Turns an order lifecycle event into a queued voice draft.

const ecommerceVoice = require('./ecommerceVoice');
const queue = require('./voiceQueue');

function fromOrderEvent({ event = 'order_confirmed', order = {}, customerId = null } = {}) {
  let rendered;
  switch (event) {
    case 'payment_pending': rendered = ecommerceVoice.paymentReminder(order); break;
    case 'delivery_update': rendered = ecommerceVoice.deliveryUpdate(order); break;
    case 'abandoned_cart': rendered = ecommerceVoice.abandonedCart(order); break;
    case 'order_confirmed':
    default: rendered = ecommerceVoice.orderConfirmation(order); break;
  }
  const draft = queue.createDraft({ type: 'ecommerce_voice', customerId, targetChannel: 'whatsapp', text: rendered.text });
  return { rendered, draft };
}

module.exports = { fromOrderEvent };
