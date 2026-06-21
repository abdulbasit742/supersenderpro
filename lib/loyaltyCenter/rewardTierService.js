  'use strict';

  /** Loyalty Center — tier service + customer CRUD (preview). */

  const store = require('./store');
  const model = require('./loyaltyCustomerModel');
  const pointsLedger = require('./pointsLedger');
  const { redactDeep } = require('./redactor');


  function sampleCustomers() {
    return [
      { customerName: 'Demo Buyer A', phone: '+92-300-XXX-1234', lifetimeSpend: 250000, points: 4200, repeatOrders: 12,
  referrals: 3, storeCredit: 500 },
      { customerName: 'Demo Buyer B', phone: '+92-300-XXX-2345', lifetimeSpend: 45000, points: 900, repeatOrders: 4,
  referrals: 1 },
      { customerName: 'Demo Buyer C', phone: '+92-300-XXX-3456', lifetimeSpend: 8000, points: 120, repeatOrders: 1,
  referrals: 0 },
      ];
  }
  function ensureSeeded() { if (store.readCustomers().length) return; store.writeCustomers(sampleCustomers().map((c) =>
  model.build(c))); }

  function list(filter) {
      ensureSeeded();
      let items = store.readCustomers();
      const f = filter || {};
      if (f.tier) items = items.filter((x) => x.tier === f.tier);
    if (f.q) { const q = String(f.q).toLowerCase(); items = items.filter((x) => (x.customerNameSafe ||
  '').toLowerCase().includes(q)); }
      return items.slice(0, Number.isFinite(f.limit) ? f.limit : 100).map(redactDeep);
  }
  function getRaw(id) { ensureSeeded(); return store.readCustomers().find((x) => x.id === id || x.customerId === id) ||
  null; }
  function get(id) { const x = getRaw(id); return x ? redactDeep(x) : null; }

  function tiers() { return model.TIER_THRESHOLDS; }

  /** Tier preview from a hypothetical spend. */
  function tierPreview(spend) { return { ok: true, dryRun: true, lifetimeSpendPreview: Number(spend) || 0, tierPreview:
  model.tierForSpend(spend), thresholds: model.TIER_THRESHOLDS, warnings: [], blockers: [] }; }


  module.exports = { list, get, getRaw, tiers, tierPreview, ensureSeeded, sampleCustomers };
