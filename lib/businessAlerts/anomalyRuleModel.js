  'use strict';

  /** Business Alerts — anomaly rule model + default rule set. */


  const store = require('./store');

  const CONDITIONS = ['gt', 'gte', 'lt', 'lte', 'eq', 'drop_pct', 'rise_pct'];


  // Default rules: name, category, sourceModule, metricKey, condition, threshold, severity.
  const DEFAULT_RULES = [
    { name: 'revenue_drop_20_percent', category: 'revenue', sourceModule: 'kpiCommand', metricKey: 'revenue_change_pct',
  condition: 'drop_pct', threshold: 20, severity: 'high' },
    { name: 'profit_negative', category: 'profit_loss', sourceModule: 'accounting', metricKey: 'net_profit', condition:
  'lt', threshold: 0, severity: 'critical' },
    { name: 'expenses_up_30_percent', category: 'finance', sourceModule: 'accounting', metricKey: 'expense_change_pct',
  condition: 'rise_pct', threshold: 30, severity: 'high' },
    { name: 'cashflow_negative', category: 'cashflow', sourceModule: 'cashbook', metricKey: 'projected_cash', condition:
  'lt', threshold: 0, severity: 'critical' },
    { name: 'low_stock_high_count', category: 'inventory', sourceModule: 'inventoryControl', metricKey: 'low_stock_count',
  condition: 'gt', threshold: 10, severity: 'medium' },
    { name: 'out_of_stock_product', category: 'inventory', sourceModule: 'inventoryControl', metricKey:
  'out_of_stock_count', condition: 'gt', threshold: 0, severity: 'high' },
    { name: 'dead_stock_high', category: 'inventory', sourceModule: 'productBI', metricKey: 'dead_stock_value', condition:
  'gt', threshold: 50000, severity: 'medium' },
    { name: 'margin_below_minimum', category: 'products', sourceModule: 'productBI', metricKey: 'min_margin_pct',
  condition: 'lt', threshold: 10, severity: 'medium' },
    { name: 'overdue_receivables_high', category: 'receivables', sourceModule: 'receivablesCenter', metricKey:
  'overdue_amount', condition: 'gt', threshold: 100000, severity: 'high' },
    { name: 'payables_due_soon_high', category: 'payables', sourceModule: 'supplierPlanner', metricKey: 'payables_due_7d',
  condition: 'gt', threshold: 100000, severity: 'high' },
    { name: 'refund_rate_high', category: 'sales', sourceModule: 'fulfillmentCenter', metricKey: 'refund_rate_pct',
  condition: 'gt', threshold: 15, severity: 'high' },
    { name: 'failed_delivery_high', category: 'fulfillment', sourceModule: 'fulfillmentCenter', metricKey:
  'failed_delivery_count', condition: 'gt', threshold: 5, severity: 'high' },
    { name: 'sales_channel_error', category: 'sales', sourceModule: 'multiChannel', metricKey: 'channel_error_count',
  condition: 'gt', threshold: 0, severity: 'medium' },
    { name: 'product_sync_blocked', category: 'products', sourceModule: 'catalogMaster', metricKey: 'sync_blocked_count',
  condition: 'gt', threshold: 0, severity: 'medium' },
    { name: 'tax_risk_high', category: 'compliance', sourceModule: 'taxCompliance', metricKey: 'tax_risk_score', condition:
  'gt', threshold: 70, severity: 'high' },
    { name: 'loyalty_liability_high', category: 'loyalty', sourceModule: 'loyaltyCenter', metricKey: 'loyalty_liability',
  condition: 'gt', threshold: 200000, severity: 'medium' },
    { name: 'system_degraded', category: 'system_health', sourceModule: 'incidentCommand', metricKey:
  'system_health_score', condition: 'lt', threshold: 80, severity: 'high' },
  ];

  function build(input) {
    const i = input || {};
    const now = new Date().toISOString();


   return {
     id: store.genId('rule'),
     name: String(i.name || 'rule').slice(0, 80),
     category: i.category || 'finance',
     sourceModule: String(i.sourceModule || 'kpiCommand').slice(0, 40),
     metricKey: String(i.metricKey || '').slice(0, 60),
     condition: CONDITIONS.includes(i.condition) ? i.condition : 'gt',
     threshold: Number(i.threshold) || 0,
     severity: i.severity || 'medium',
     enabled: i.enabled !== false,
     dryRun: true,
     createdAt: now,
     updatedAt: now,
   };
}


function defaults() { return DEFAULT_RULES.map((r) => build(r)); }


module.exports = { CONDITIONS, DEFAULT_RULES, build, defaults };
