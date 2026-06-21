// lib/teamAccess/bulkAccess.js — Evaluate many permission checks at once (read-only, dry-run).
'use strict';
const evaluator=require('./accessEvaluator');
function checkMany(items=[]){
  const list=Array.isArray(items)?items:[];
  const decisions=list.slice(0,200).map(i=>{ const d=evaluator.evaluate(i||{});
    return { permission:d.permission, roleId:d.roleId, allowed:d.allowed, approvalRequired:d.approvalRequired, blockers:d.blockers }; });
  return { ok:true, count:decisions.length,
    allowed:decisions.filter(d=>d.allowed).length, blocked:decisions.filter(d=>!d.allowed).length,
    approvalRequired:decisions.filter(d=>d.approvalRequired).length, decisions, dryRun:true };
}
module.exports={ checkMany };
