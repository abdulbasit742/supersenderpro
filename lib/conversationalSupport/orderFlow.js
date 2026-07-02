'use strict';
/**
 * lib/conversationalSupport/orderFlow.js - conversational order capture via simple slot-filling:
 *   product -> quantity -> delivery address -> confirm.
 *
 * On confirmation it SOFT-integrates the existing ecommerce order pipeline when present
 * (lib/ecommerceHub orderPipeline.ingest), otherwise it stages the order on the conversation so
 * nothing is lost. Everything is dry-run safe: we never charge or send.
 */
const kb = require('./knowledgeBase');
const { nowISO, extractQty, norm } = require('./util');

// Soft-resolve the order pipeline; never hard-depend on it.
let pipeline = null;
for (const p of ['../ecommerceHub/orderPipeline', '../ecommerceHub']) {
  try { const m = require(p); if (m && (m.ingest || (m.orderPipeline && m.orderPipeline.ingest))) { pipeline = m.ingest ? m : m.orderPipeline; break; } } catch {}
}

function newOrder() { return { stage: 'product', items: [], address: '', createdAt: nowISO() }; }

function summary(order, currency) {
  const cur = currency || 'PKR';
  const lines = order.items.map((i) => `• ${i.qty} x ${i.name} (${i.price} ${cur})`);
  const total = order.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  return { text: lines.join('\n'), total, currency: cur };
}

/**
 * Advance the order conversation by one customer message.
 * Returns { reply, done, placed, order }.
 */
async function step(tid, convo, text, opts) {
  const dryRun = !opts || opts.dryRun !== false;
  const settings = kb.settings(tid);
  const cur = settings.currency || 'PKR';
  const order = convo.order || (convo.order = newOrder());
  const t = norm(text);

  // Allow cancel at any stage.
  if (/(cancel|rehne do|nahi chahiye|stop)/.test(t)) {
    convo.order = null; convo.mode = 'chat';
    return { reply: 'Theek hai, order cancel kar diya. Aur kuch?', done: true, placed: false, order: null };
  }

  if (order.stage === 'product') {
    const product = kb.findProduct(tid, text);
    if (!product) {
      const names = kb.listProducts(tid).slice(0, 8).map((p) => p.name);
      const hint = names.length ? ' Available: ' + names.join(', ') + '.' : '';
      return { reply: 'Aap kaunsa product order karna chahte hain?' + hint, done: false, placed: false, order };
    }
    if (product.inStock === false) {
      return { reply: `Maazrat, ${product.name} abhi stock mein nahi hai. Koi aur item?`, done: false, placed: false, order };
    }
    const qty = extractQty(text);
    order.items = [{ productId: product.id, name: product.name, sku: product.sku, price: product.price, qty }];
    order.stage = 'address';
    return { reply: `${qty} x ${product.name} (${product.price} ${cur}). Delivery address bata dein?`, done: false, placed: false, order };
  }

  if (order.stage === 'address') {
    if (String(text || '').trim().length < 6) {
      return { reply: 'Mukammal delivery address likh dein (ghar/street, area, city).', done: false, placed: false, order };
    }
    order.address = String(text).trim();
    order.stage = 'confirm';
    const sum = summary(order, cur);
    return { reply: `Confirm karein:\n${sum.text}\nTotal: ${sum.total} ${cur}\nAddress: ${order.address}\n\n"haan" likhein confirm ke liye.`, done: false, placed: false, order };
  }

  if (order.stage === 'confirm') {
    if (!/(haan|han|yes|confirm|ok|theek|kardo|done)/.test(t)) {
      return { reply: 'Confirm karne ke liye "haan" likhein, ya "cancel" likhein.', done: false, placed: false, order };
    }
    const sum = summary(order, cur);
    const payload = {
      tenantId: tid,
      contact: convo.contact,
      items: order.items,
      address: order.address,
      total: sum.total,
      currency: cur,
      source: 'conversational-support',
      dryRun,
    };
    let placedVia = 'staged';
    if (pipeline && typeof pipeline.ingest === 'function') {
      try { await pipeline.ingest(payload); placedVia = 'ecommerceHub'; } catch { placedVia = 'staged'; }
    }
    order.stage = 'placed'; order.placedVia = placedVia; order.total = sum.total; order.placedAt = nowISO();
    convo.mode = 'chat';
    const note = dryRun ? ' (DRY-RUN: order recorded, not charged)' : '';
    return {
      reply: `Shukriya! Aap ka order place ho gaya hai.${note}\n${sum.text}\nTotal: ${sum.total} ${cur}\nHum jald confirm karenge. 🙌`,
      done: true, placed: true, order,
    };
  }

  // Unknown stage -> reset safely.
  convo.order = newOrder();
  return { reply: 'Chalein order start karte hain. Aap kaunsa product chahte hain?', done: false, placed: false, order: convo.order };
}

module.exports = { step, newOrder, summary, pipelineAvailable: () => !!pipeline };
