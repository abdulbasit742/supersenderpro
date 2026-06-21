// lib/teamAccess/seatLimitMonitor.js — Scans workspaces and flags seats near/over plan cap (preview only).
// Produces upgrade-preview recommendations. No billing change, no auth write.
'use strict';
const workspaces=require('./workspaceRegistry');
const seatUsage=require('./seatUsage');
const NEAR_THRESHOLD=0.8; // >=80% of seat cap => "near"
function classify(u){
  if(!Number.isFinite(u.seatLimit)) return 'ok'; // unlimited/custom
  if(u.exceeded||u.activeSeats>u.seatLimit) return 'exceeded';
  if(u.seatLimit>0&&u.activeSeats/u.seatLimit>=NEAR_THRESHOLD) return 'near';
  return 'ok';
}
function scan(){
  const rows=workspaces.all().map(w=>{
    const u=seatUsage.preview(w.id);
    if(!u.ok) return { workspaceId:w.id, businessName:w.businessName, level:'unknown' };
    const level=classify(u);
    return { workspaceId:w.id, businessName:w.businessName, planId:u.planId, level,
      activeSeats:u.activeSeats, seatLimit:u.seatLimit, availableSeats:u.availableSeats,
      upgradeRecommendation:(level!=='ok')?(u.upgradeRecommendation||'upgrade_recommended'):null, dryRun:true };
  });
  return rows;
}
function warnings(){ return scan().filter(r=>r.level==='near'||r.level==='exceeded'); }
function summary(){
  const s=scan();
  return { total:s.length, ok:s.filter(r=>r.level==='ok').length,
    near:s.filter(r=>r.level==='near').length, exceeded:s.filter(r=>r.level==='exceeded').length,
    nearThreshold:NEAR_THRESHOLD, dryRun:true };
}
module.exports={ scan, warnings, summary, classify, NEAR_THRESHOLD };
