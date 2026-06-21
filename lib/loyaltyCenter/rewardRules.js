  'use strict';

  /** Loyalty Center — reward rule CRUD (preview). */

  const store = require('./store');

  const RULE_TYPES = ['points_per_order_value', 'points_per_product', 'first_purchase_bonus', 'repeat_purchase_bonus',
  'referral_signup_bonus', 'referral_purchase_bonus', 'birthday_reward', 'abandoned_customer_winback', 'vip_bonus',
  'store_credit_reward'];


  const DEFAULT_RULES = [
       { name: '1 point per 10 PKR', ruleType: 'points_per_order_value', pointsValue: 1, minimumSpend: 10 },
       { name: 'First purchase bonus', ruleType: 'first_purchase_bonus', pointsValue: 200, minimumSpend: 0 },
       { name: 'Referral signup bonus', ruleType: 'referral_signup_bonus', pointsValue: 300, minimumSpend: 0 },
  ];

  function readAll() { const items = store.readRules(); if (items.length) return items; return DEFAULT_RULES.map((r) =>
  build(r)); }
  function build(input) { const i = input || {}; const now = new Date().toISOString(); return { id: store.genId('rul'),
  name: String(i.name || 'Rule').slice(0, 80), ruleType: RULE_TYPES.includes(i.ruleType) ? i.ruleType :
  'points_per_order_value', pointsValue: Math.max(0, Number(i.pointsValue) || 0), minimumSpendPreview: Math.max(0,
  Number(i.minimumSpend) || 0), tierRequired: i.tierRequired || null, status: 'active_preview', dryRun: true, createdAt:
  now, updatedAt: now }; }


  function list() { return readAll(); }
  function create(input) { if (!RULE_TYPES.includes((input || {}).ruleType)) return { ok: false, error: 'invalid ruleType'
  }; const rules = store.readRules(); const r = build(input); rules.unshift(r); store.writeRules(rules); return { ok: true,
  rule: r }; }
  function update(id, patch) { const rules = store.readRules(); const idx = rules.findIndex((x) => x.id === id); if (idx
  === -1) return { ok: false, error: 'not found' }; const b = patch || {}; if (b.name != null) rules[idx].name =
  String(b.name).slice(0, 80); if (RULE_TYPES.includes(b.ruleType)) rules[idx].ruleType = b.ruleType; if (b.pointsValue !==
  undefined) rules[idx].pointsValue = Math.max(0, Number(b.pointsValue) || 0); if (b.minimumSpend !== undefined)
  rules[idx].minimumSpendPreview = Math.max(0, Number(b.minimumSpend) || 0); if (b.status) rules[idx].status =
  String(b.status).slice(0, 40); rules[idx].updatedAt = new Date().toISOString(); store.writeRules(rules); return { ok:
  true, rule: rules[idx] }; }

  /** Points preview for an order value against active rules. */
  function pointsForOrder(orderValue) {
    const v = Number(orderValue) || 0;
       let pts = 0;
       for (const r of readAll()) {
        if (r.status !== 'active_preview') continue;
        if (r.ruleType === 'points_per_order_value' && v >= r.minimumSpendPreview) pts += Math.floor(v / Math.max(1,
  r.minimumSpendPreview)) * r.pointsValue;
    }
       return pts;
  }


  module.exports = { RULE_TYPES, list, create, update, build, pointsForOrder };
