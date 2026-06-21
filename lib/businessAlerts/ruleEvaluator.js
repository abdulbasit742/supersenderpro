  'use strict';

  /** Business Alerts — evaluate a single rule against a metric value. */


  function evaluate(rule, value) {
      const r = rule || {};
      const v = Number(value);
      const th = Number(r.threshold) || 0;
      if (!Number.isFinite(v)) return { matched: false, detectedValue: null, threshold: th };
      let matched = false;
      switch (r.condition) {
          case 'gt': matched = v > th; break;
          case 'gte': matched = v >= th; break;
          case 'lt': matched = v < th; break;
          case 'lte': matched = v <= th; break;
          case 'eq': matched = v === th; break;
          case 'drop_pct': matched = v <= -Math.abs(th); break;   // value is a % change; a drop of >= th
          case 'rise_pct': matched = v >= Math.abs(th); break;     // a rise of >= th
          default: matched = false;
      }
      return { matched, detectedValue: v, threshold: th };
  }


  function preview(rule, value) {
       const r = evaluate(rule, value);
       return { ok: true, dryRun: true, ruleId: (rule && rule.id) || null, matchedPreview: r.matched, detectedValuePreview:
  r.detectedValue, thresholdPreview: r.threshold, severity: (rule && rule.severity) || 'medium', warnings: [], blockers: []
  };
  }


  module.exports = { evaluate, preview };
