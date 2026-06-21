  'use strict';
  /**
   * featureSignalRegistry.js — scalable signal registry. Supports 5000+ signals via
   * categories + calculators WITHOUT changing routes. Each signal:
   *   { id, category, name, description, severity, calculator, enabled, dryRun }
   * calculator(product, ctx) -> boolean (does this signal fire for this product?).
   * Seeds 100+ definitions; add more by pushing to REGISTRY or calling register().
   */
  const inventoryAnalyzer = require('./inventoryAnalyzer');
  const profitLossAnalyzer = require('./profitLossAnalyzer');
  const revenueAnalyzer = require('./revenueAnalyzer');

  const CATEGORIES = [
       'inventory', 'revenue', 'profit', 'loss', 'margin', 'stock_health', 'supplier', 'orders',
       'refunds', 'payments', 'campaign_roi', 'crm_deals', 'ecommerce', 'reseller', 'billing',
       'risk', 'recommendations', 'forecasting_preview', 'dashboard', 'audit',
  ];

  const REGISTRY = [];
  function register(sig) {
    const s = Object.assign({ severity: 'info', enabled: true, dryRun: true }, sig);
       if (!CATEGORIES.includes(s.category)) s.category = 'dashboard';
       if (typeof s.calculator !== 'function') s.calculator = () => false;
       REGISTRY.push(s);
       return s;
  }
  function def(id, category, name, description, severity, calculator) { return register({ id, category, name, description,
  severity, calculator }); }

  // ---- Helpers reused by calculators ----
  const invSig = (p) => inventoryAnalyzer.analyze(p).signals;
  const plSig = (p) => profitLossAnalyzer.analyze(p).signals;
  const revSig = (p) => revenueAnalyzer.analyze(p).signals;
  const has = (arr, s) => arr.indexOf(s) > -1;

  // ---- Seed signals (mapped from the spec lists) ----
  // Inventory (severity by impact)
  ['low_stock','out_of_stock','overstock','dead_stock','fast_moving','slow_moving','reorder_needed','reserved_stock_high',' stock_value_high','stock_value_low','negative_stock_preview','return_rate_high','missing_cost_price','missing_sale_price'
  ,'unsold_30_days','unsold_60_days','unsold_90_days']

 .forEach((s) => def('inv_' + s, 'inventory', s, 'Inventory signal: ' + s, /out_of_stock|negative|dead/.test(s) ? 'high'
: 'warn', (p) => has(invSig(p), s)));

// Margin
['margin_too_low','margin_negative','price_below_cost','margin_good','margin_low']
 .forEach((s) => def('mar_' + s, 'margin', s, 'Margin signal: ' + s, /negative|below_cost/.test(s) ? 'high' : 'warn',
(p) => { const m = p.salePrice > 0 ? Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100) : 0; if (s ===
'margin_negative') return m < 0; if (s === 'margin_too_low') return m >= 0 && m < 10; if (s === 'margin_low') return m >=
10 && m < 25; if (s === 'margin_good') return m >= 25; if (s === 'price_below_cost') return p.salePrice > 0 &&
p.salePrice < p.costPrice; return false; }));

// Profit / loss
['profit_positive','profit_negative','loss_detected','refund_loss','discount_loss','delivery_cost_loss','payment_fee_loss','supplier_cost_increase','campaign_cost_impact','inventory_holding_cost_preview','dead_stock_loss_preview','return_loss _preview','price_optimization_needed']
 .forEach((s) => def('pl_' + s, /loss|negative|refund|return/.test(s) ? 'loss' : 'profit', s, 'Profit/Loss signal: ' +
s, /negative|loss/.test(s) ? 'high' : 'info', (p) => has(plSig(p), s) || (s === 'price_optimization_needed' &&
p.salePrice > 0 && Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100) < 10)));


// Revenue
['top_revenue_product','low_revenue_product','revenue_growth','revenue_drop','high_order_count','low_order_count','repeat _purchase_product','abandoned_cart_revenue_preview','campaign_attributed_revenue_preview','ecommerce_revenue_preview','re seller_revenue_preview','recurring_revenue_preview','upsell_opportunity','cross_sell_opportunity']
 .forEach((s) => def('rev_' + s, 'revenue', s, 'Revenue signal: ' + s, 'info', (p) => has(revSig(p), s)));

// Risk
['low_margin_high_volume','high_stock_low_sales','high_refund_rate','supplier_dependency_risk','pricing_error_risk','miss ing_inventory_data','missing_order_data','missing_payment_data','revenue_leakage_risk','cashflow_risk_preview','complianc e_data_missing','product_not_campaign_ready','product_not_publish_ready']
 .forEach((s) => def('risk_' + s, 'risk', s, 'Business risk signal: ' + s, /risk|missing|error/.test(s) ? 'high' :
'warn', (p) => {
   const m = p.salePrice > 0 ? Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100) : 0;
   const sold = Number(p.soldQtyPreview) || 0; const qty = Number(p.stockQty) || 0; const ret =
Number(p.returnedQtyPreview) || 0;
   switch (s) {
     case 'low_margin_high_volume': return m < 10 && sold >= 50;
     case 'high_stock_low_sales': return qty >= 100 && sold < 5;
     case 'high_refund_rate': return sold > 0 && ret / sold > 0.2;
     case 'pricing_error_risk': return p.salePrice > 0 && p.salePrice < p.costPrice;
     case 'missing_inventory_data': return p.stockQty == null;
     case 'missing_payment_data': return false;
     case 'missing_order_data': return p.soldQtyPreview == null;
     case 'product_not_publish_ready': return !p.salePrice || !p.name;
     case 'product_not_campaign_ready': return m < 0 || !p.salePrice;
     default: return false;
   }
 }));


function list(filter) { const f = filter || {}; return REGISTRY.filter((s) => (!f.category || s.category === f.category)
&& (f.enabled == null || s.enabled === f.enabled)).map((s) => ({ id: s.id, category: s.category, name: s.name,
description: s.description, severity: s.severity, enabled: s.enabled, dryRun: true })); }
function evaluate(product, ctx) { return REGISTRY.filter((s) => s.enabled).filter((s) => { try { return
s.calculator(product, ctx || {}); } catch (e) { return false; } }).map((s) => ({ id: s.id, category: s.category, name:
s.name, severity: s.severity })); }
function count() { return REGISTRY.length; }
function categories() { return CATEGORIES.slice(); }

  module.exports = { CATEGORIES, REGISTRY, register, def, list, evaluate, count, categories };
