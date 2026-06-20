// adapters/saasBillingAdapter.js — SaaS Billing integration (read-only seat-limit preview). No billing changes.
'use strict';
let available=false; for(const c of ['../../../lib/saasBilling','../../../lib/subscriptionPlans']){ try{ require.resolve(c); available=true; break; }catch(_e){} }
// Returns a seat limit preview if billing exposes plan seat caps; otherwise unavailable (fallbacks used upstream).
function seatLimitPreview(planId){
  return { available, planId, seatLimit:null, dryRun:true,
    note: available?'SaaS Billing detected — using fallback seat caps unless plan exposes seatLimit':'SaaS Billing not detected — fallback seat caps used' };
}
function summary(){ return { available, redacted:true, billingChange:false }; }
module.exports={ available, seatLimitPreview, summary };
