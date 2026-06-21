  'use strict';


  /**
      * Approval Center — policy evaluator.
      *
      * Given a request type + metrics, finds matching policies and whether approval
      * is required, the required role, and the strongest severity.
      */

  const store = require('./store');
  const policyModel = require('./approvalPolicyModel');


  function activePolicies() { const p = store.readPolicies(); return p.length ? p : policyModel.defaults(); }

  function conditionMatches(rule, metrics) {
       const m = metrics || {};
       const v = Number(m[rule.metric]);
       const th = Number(rule.value) || 0;
       if (!Number.isFinite(v)) return false;
       switch (rule.condition) {
         case 'gt': return v > th;


       case 'gte': return v >= th;
       case 'lt': return v < th;
       case 'lte': return v <= th;
       case 'pct_gt': return Math.abs(v) > th;
       default: return false;
   }
}


const SEV_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const ROLE_RANK = { viewer: 1, support: 2, manager: 3, owner: 4 };


/**
* @param {object} input { requestType, sourceModule, metrics:{change_pct,discount_pct,value,...} }
*/
function evaluate(input) {
   const i = input || {};
   const matched = [];
   let requiredRole = null;
   let severity = 'low';
   let requiredApprovals = 1;


   for (const p of activePolicies()) {
     if (p.enabled === false) continue;
       if (p.requestType !== i.requestType) continue;
       if (conditionMatches(p.thresholdRule, i.metrics)) {
     matched.push({ id: p.id, name: p.name, requiredRole: p.requiredRole, requiredApprovals: p.requiredApprovals,
severity: p.severity });
           if ((ROLE_RANK[p.requiredRole] || 0) > (ROLE_RANK[requiredRole] || 0)) requiredRole = p.requiredRole;
           if ((SEV_RANK[p.severity] || 0) > (SEV_RANK[severity] || 0)) severity = p.severity;
           requiredApprovals = Math.max(requiredApprovals, p.requiredApprovals || 1);
       }
   }


   const approvalRequired = matched.length > 0;
   return {
       ok: true, dryRun: true,
       requestType: i.requestType,
       approvalRequiredPreview: approvalRequired,
       matchedPoliciesPreview: matched,
       requiredRolePreview: requiredRole || (approvalRequired ? 'manager' : null),
       requiredApprovalsPreview: requiredApprovals,
       riskLevel: severity,
       warnings: [], blockers: [],
   };
}

module.exports = { evaluate, activePolicies, conditionMatches };
