  'use strict';

  /** Fulfillment Center — order CRUD (preview only). Reads sample orders if empty. */

  const store = require('./store');
  const model = require('./orderFulfillmentModel');
  const { redactDeep } = require('./redactor');

  function sampleOrders() {
      return [
        { customerName: 'Demo Buyer A', phone: '+92-300-XXX-1234', address: 'Street 1, Lahore', items: [{ sku: 'SKU1', name:
  'Widget', qty: 2, unitPrice: 1500 }], paymentStatus: 'cod_pending_preview', sourceModule: 'catalog' },
      { customerName: 'Demo Buyer B', phone: '+92-300-XXX-2345', address: 'Block C, Karachi', items: [{ sku: 'SKU2', name:
  'Gadget', qty: 1, unitPrice: 6000 }], paymentStatus: 'paid_preview', sourceModule: 'shopify' },
    ];
  }

  function ensureSeeded() {
    if (store.readOrders().length) return;
      const seeded = sampleOrders().map((o, idx) => model.build(o, idx));
      store.writeOrders(seeded);
  }

  function list(filter) {
    ensureSeeded();
      let items = store.readOrders();
      const f = filter || {};
      if (f.fulfillmentStatus) items = items.filter((x) => x.fulfillmentStatus === f.fulfillmentStatus);
      if (f.paymentStatus) items = items.filter((x) => x.paymentStatus === f.paymentStatus);
      if (f.deliveryStatus) items = items.filter((x) => x.deliveryStatus === f.deliveryStatus);
      if (f.q) { const q = String(f.q).toLowerCase(); items = items.filter((x) => (x.customerNameSafe ||
  '').toLowerCase().includes(q) || (x.orderNumber || '').toLowerCase().includes(q)); }
    return items.slice(0, Number.isFinite(f.limit) ? f.limit : 100).map(redactDeep);
  }
  function getRaw(id) { ensureSeeded(); return store.readOrders().find((x) => x.id === id || x.orderNumber === id) || null;
  }
  function get(id) { const x = getRaw(id); return x ? redactDeep(x) : null; }


  function create(input) {
      ensureSeeded();
      const orders = store.readOrders();
      const o = model.build(input, orders.length);
      orders.unshift(o);


       if (orders.length > 3000) orders.length = 3000;
       store.writeOrders(orders);
       return redactDeep(o);
  }

  function mutate(id, fn) {
    const orders = store.readOrders();
       const idx = orders.findIndex((x) => x.id === id || x.orderNumber === id);
       if (idx === -1) return null;
       const updated = fn(orders[idx]);
       updated.dryRun = true;
       updated.updatedAt = new Date().toISOString();
       orders[idx] = updated;
       store.writeOrders(orders);
       return updated;
  }

  module.exports = { list, get, getRaw, create, mutate, ensureSeeded, sampleOrders };
