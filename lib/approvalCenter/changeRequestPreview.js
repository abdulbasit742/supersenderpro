  'use strict';


  /**
   * Approval Center — change request preview.
      *
      * Builds a before/after preview + risk + whether approval is required, WITHOUT
      * mutating any source module. Pure preview.
      */

  const policyEvaluator = require('./policyEvaluator');
  const risk = require('./riskClassifier');

  function preview(input) {
    const i = input || {};
       const metrics = i.metrics || {};
       // derive common metrics if before/after numbers are supplied
    if (metrics.change_pct === undefined && i.before && i.after && Number.isFinite(Number(i.before.price)) &&
  Number.isFinite(Number(i.after.price)) && Number(i.before.price) > 0) {
           metrics.change_pct = Math.round(((Number(i.after.price) - Number(i.before.price)) / Number(i.before.price)) * 100);
       }
    if (metrics.value === undefined && i.after && Number.isFinite(Number(i.after.value))) metrics.value =
  Number(i.after.value);

       const policy = policyEvaluator.evaluate({ requestType: i.requestType, sourceModule: i.sourceModule, metrics });
       const riskLevel = risk.classify({ requestType: i.requestType, value: metrics.value, changePct: metrics.change_pct });

       return {
         ok: true, dryRun: true, liveMutation: false,
           sourceModule: i.sourceModule || 'unknown',
           beforePreview: i.before || {},


         afterPreview: i.after || {},
         metricsPreview: metrics,
         riskLevel,
         approvalRequiredPreview: policy.approvalRequiredPreview,
         requiredRolePreview: policy.requiredRolePreview,
         matchedPoliciesPreview: policy.matchedPoliciesPreview,
         warnings: [], blockers: [],
       };
  }

  module.exports = { preview };
