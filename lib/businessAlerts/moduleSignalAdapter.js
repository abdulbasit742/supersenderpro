  'use strict';

  /**
      * Business Alerts — read-only module signal adapter.
      *
      * Pulls metric values from existing modules WITHOUT mutating them. Reuses the
      * existing Anomaly module + Executive Command + KPI Command where present.
      * Returns a deterministic sample metric set if nothing is wired so detection
      * still produces example alerts.
      */

  function tryRequire(p) { try { return require(p); } catch (_e) { return null; } }

  function existingAnomaly() { return tryRequire('../../src/modules/anomaly') ||
  tryRequire('../../src/modules/anomaly/anomaly'); }
  function executiveCommand() { return tryRequire('../executiveCommand'); }
  function kpiCommand() { return tryRequire('../kpiCommand'); }

  // Sample metric snapshot (clearly illustrative) used when live sources absent.
  function sampleMetrics() {
    return {
           revenue_change_pct: -24,     // 24% drop -> triggers revenue_drop_20_percent
           net_profit: -5000,           // negative -> profit_negative
           expense_change_pct: 12,
           projected_cash: 30000,
           low_stock_count: 14,         // > 10 -> low_stock_high_count
           out_of_stock_count: 2,       // > 0 -> out_of_stock_product
           dead_stock_value: 20000,
           min_margin_pct: 6,           // < 10 -> margin_below_minimum
           overdue_amount: 60000,
           payables_due_7d: 40000,
           refund_rate_pct: 8,
           failed_delivery_count: 3,
           channel_error_count: 0,
           sync_blocked_count: 0,
           tax_risk_score: 35,
           loyalty_liability: 80000,
           system_health_score: 96,
       };
  }

  /** Collect current metrics + any pre-existing anomaly signals. */
  function collect() {
       const warnings = [];
       const scannedModules = [];


      let metrics = sampleMetrics();
      let source = 'sample';

      const kpi = kpiCommand();
      if (kpi && typeof kpi.metricsSnapshot === 'function') {
      try { const live = kpi.metricsSnapshot(); if (live && typeof live === 'object') { metrics = { ...metrics, ...live };
  source = 'live'; scannedModules.push('kpiCommand'); } } catch (_e) { warnings.push('kpiCommand snapshot failed'); }
      }
      const exec = executiveCommand();
      if (exec) scannedModules.push('executiveCommand');

      // Fold in existing anomaly module alerts as pre-detected signals.
      const preAlerts = [];
      const anomaly = existingAnomaly();
      if (anomaly) {
          scannedModules.push('anomaly');
          try {
        const log = (anomaly.core && typeof anomaly.core.recentAlerts === 'function') ? anomaly.core.recentAlerts() :
  (typeof anomaly.recentAlerts === 'function' ? anomaly.recentAlerts() : []);
        (log || []).slice(0, 20).forEach((a) => preAlerts.push({ signalKey: a.metric || 'anomaly', detectedValue: a.value,
  summary: `${a.metric} ${a.direction} (z=${a.z})`, severity: 'high', category: 'finance', sourceModule: 'anomaly' }));
          } catch (_e) { warnings.push('anomaly log read failed'); }
      }


      return { metrics, preAlerts, scannedModules, source, warnings };
  }


  module.exports = { collect, sampleMetrics };
