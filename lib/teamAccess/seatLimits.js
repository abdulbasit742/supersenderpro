// lib/teamAccess/seatLimits.js — Plan-based seat limits with safe fallbacks.
// Uses SaaS Billing adapter if available; NEVER changes real billing. Upgrade is preview only.
'use strict';
const billingAdapter=require('./adapters/saasBillingAdapter');
const FALLBACK={
  free_trial:{ limit:2, label:'Free Trial (1 owner + 1 viewer)' },
  starter:{ limit:2, label:'Starter' },
  growth:{ limit:5, label:'Growth' },
  pro:{ limit:10, label:'Pro' },
  agency:{ limit:25, label:'Agency' },
  reseller:{ limit:50, label:'Reseller' },
  enterprise:{ limit:null, label:'Enterprise (custom)' },
  lifetime:{ limit:null, label:'Lifetime (configured/custom)' },
};
function normalizePlan(planId){ return String(planId||'free_trial').toLowerCase().replace(/[\s-]+/g,'_'); }
function limitFor(planId){
  const p=normalizePlan(planId);
  const live=billingAdapter.seatLimitPreview(p);
  if(live.available&&Number.isFinite(live.seatLimit)) return live.seatLimit;
  return FALLBACK[p]?FALLBACK[p].limit:2;
}
function upgradeRecommendation(planId, exceeded){
  if(!exceeded) return null;
  const order=['free_trial','starter','growth','pro','agency','reseller','enterprise'];
  const i=order.indexOf(normalizePlan(planId));
  return i>=0&&i<order.length-1?order[i+1]:'enterprise';
}
function forPlanPreview(planId, activeSeats=0){
  const seatLimit=limitFor(planId); const active=Number(activeSeats)||0;
  const exceeded=Number.isFinite(seatLimit)&&active>seatLimit;
  const availableSeats=Number.isFinite(seatLimit)?Math.max(0, seatLimit-active):null;
  return { planId:normalizePlan(planId), seatLimit, activeSeats:active, availableSeats, exceeded,
    upgradeRecommendation:upgradeRecommendation(planId, exceeded), dryRun:true };
}
module.exports={ forPlanPreview, limitFor, FALLBACK, normalizePlan };
