// lib/featureFlags/flagContext.js — Normalises an evaluation context (no PII stored).
'use strict';
function build(input={}){
  return {
    tenantId: input.tenantId||null, resellerId: input.resellerId||null,
    userRole: input.userRole||'guest', planId: (input.planId||'free').toLowerCase(),
    betaGroup: input.betaGroup===true||input.betaGroup==='true',
    moduleHealth: input.moduleHealth||'unknown',     // ok|degraded|down|unknown
    complianceStatus: input.complianceStatus||'unknown', // ok|blocked|unknown
    securityRisk: input.securityRisk||'none',         // none|low|high|critical
    envOverride: input.envOverride,                   // true|false|undefined
    atPercent: typeof input.atPercent==='number'?input.atPercent:null, // for percentage preview
  };
}
module.exports={ build };
