  'use strict';

  /** Business Alerts — rule-based action recommendations (preview, no execution). */


  const BY_RULE = {
       revenue_drop_20_percent: 'Review top products + recent campaigns; check channel sync and pricing.',
       profit_negative: 'Audit expenses + discounting; pause loss-making SKUs (manual).',
       expenses_up_30_percent: 'Review largest expense categories vs last period.',
       cashflow_negative: 'Delay non-urgent payables; chase overdue receivables.',
       low_stock_high_count: 'Raise purchase orders for low-stock SKUs (preview in Supplier Planner).',
       out_of_stock_product: 'Restock or hide out-of-stock products before promoting.',
       dead_stock_high: 'Run a clearance offer on dead stock (draft in Growth Campaigns).',
       margin_below_minimum: 'Re-price thin-margin products or renegotiate cost.',
       overdue_receivables_high: 'Send overdue reminder drafts from Receivables Center.',
       payables_due_soon_high: 'Schedule payments; confirm cash availability.',
       refund_rate_high: 'Investigate product quality / delivery; check return reasons.',
       failed_delivery_high: 'Review courier performance; reschedule failed deliveries.',
       sales_channel_error: 'Check channel connection + product mapping.',
       product_sync_blocked: 'Resolve missing catalog data blocking publish.',
       tax_risk_high: 'Review tax mappings before filing (preview).',
       loyalty_liability_high: 'Review points/credit liability vs revenue (preview).',
       system_degraded: 'Check Incident Command + system health probes.',
  };

  function forRule(rule) { return (rule && BY_RULE[rule.name]) || 'Review the affected module and take corrective action.';
  }

  function topRecommendations(alerts) {
    return (alerts || []).slice(0, 5).map((a) => ({ severity: a.severity, category: a.category, recommendation:
  a.recommendedAction || 'review affected module', sourceModule: a.sourceModule }));
  }

  module.exports = { forRule, topRecommendations, BY_RULE };
