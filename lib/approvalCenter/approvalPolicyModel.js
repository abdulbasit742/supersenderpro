  'use strict';


  /** Approval Center — policy model + default policy set. */


  const store = require('./store');

  // thresholdRule: { metric, condition, value } where condition in gt/gte/lt/lte/pct_gt.
  const DEFAULT_POLICIES = [
    { name: 'price_change_over_10_percent', requestType: 'price_change_preview', sourceModule: 'pricing', thresholdRule: {
  metric: 'change_pct', condition: 'pct_gt', value: 10 }, requiredRole: 'manager', requiredApprovals: 1, severity: 'medium'
  },
       { name: 'discount_over_20_percent', requestType: 'discount_rule_preview', sourceModule: 'pricing', thresholdRule: {
  metric: 'discount_pct', condition: 'gt', value: 20 }, requiredRole: 'manager', requiredApprovals: 1, severity: 'medium'
  },
    { name: 'margin_below_minimum', requestType: 'price_change_preview', sourceModule: 'productBI', thresholdRule: {
  metric: 'margin_pct', condition: 'lt', value: 10 }, requiredRole: 'owner', requiredApprovals: 1, severity: 'high' },
    { name: 'stock_adjustment_high_value', requestType: 'stock_adjustment_preview', sourceModule: 'inventoryControl',
  thresholdRule: { metric: 'value', condition: 'gt', value: 50000 }, requiredRole: 'manager', requiredApprovals: 1,
  severity: 'high' },
    { name: 'purchase_order_high_value', requestType: 'purchase_order_preview', sourceModule: 'supplierPlanner',
  thresholdRule: { metric: 'value', condition: 'gt', value: 100000 }, requiredRole: 'owner', requiredApprovals: 1,
  severity: 'high' },
    { name: 'vendor_bill_high_value', requestType: 'vendor_bill_payment_preview', sourceModule: 'payables', thresholdRule:
  { metric: 'value', condition: 'gt', value: 100000 }, requiredRole: 'owner', requiredApprovals: 2, severity: 'critical' },
    { name: 'refund_high_value', requestType: 'refund_preview', sourceModule: 'fulfillmentCenter', thresholdRule: { metric:
  'value', condition: 'gt', value: 20000 }, requiredRole: 'manager', requiredApprovals: 1, severity: 'high' },
    { name: 'store_credit_high_value', requestType: 'loyalty_credit_preview', sourceModule: 'loyaltyCenter', thresholdRule:
  { metric: 'value', condition: 'gt', value: 10000 }, requiredRole: 'manager', requiredApprovals: 1, severity: 'medium' },
    { name: 'report_export_sensitive', requestType: 'report_export_preview', sourceModule: 'reportBuilder', thresholdRule:
  { metric: 'sensitive', condition: 'gte', value: 1 }, requiredRole: 'owner', requiredApprovals: 1, severity: 'high' },
    { name: 'campaign_large_audience', requestType: 'campaign_send_preview', sourceModule: 'campaigns', thresholdRule: {
  metric: 'audience', condition: 'gt', value: 1000 }, requiredRole: 'manager', requiredApprovals: 1, severity: 'high' },
    { name: 'whatsapp_broadcast_large_audience', requestType: 'whatsapp_broadcast_preview', sourceModule: 'campaigns',
  thresholdRule: { metric: 'audience', condition: 'gt', value: 500 }, requiredRole: 'manager', requiredApprovals: 1,
  severity: 'high' },
    { name: 'permission_admin_change', requestType: 'team_permission_change_preview', sourceModule: 'rbac', thresholdRule:
  { metric: 'is_admin_change', condition: 'gte', value: 1 }, requiredRole: 'owner', requiredApprovals: 1, severity:
  'critical' },
    { name: 'critical_alert_action', requestType: 'alert_action_preview', sourceModule: 'businessAlerts', thresholdRule: {
  metric: 'severity_rank', condition: 'gte', value: 5 }, requiredRole: 'owner', requiredApprovals: 1, severity: 'critical'


},
];

function build(input) {
 const i = input || {};
    const now = new Date().toISOString();
    return {
      id: store.genId('pol'),
      name: String(i.name || 'policy').slice(0, 80),
      requestType: i.requestType || 'custom_change_preview',
      sourceModule: String(i.sourceModule || 'unknown').slice(0, 40),
   thresholdRule: i.thresholdRule && typeof i.thresholdRule === 'object' ? i.thresholdRule : { metric: 'value',
condition: 'gt', value: 0 },
      requiredRole: i.requiredRole || 'manager',
      requiredApprovals: Math.max(1, Number(i.requiredApprovals) || 1),
      severity: i.severity || 'medium',
      enabled: i.enabled !== false,
      dryRun: true,
      createdAt: now,
      updatedAt: now,
    };
}


function defaults() { return DEFAULT_POLICIES.map((p) => build(p)); }


module.exports = { DEFAULT_POLICIES, build, defaults };
