// lib/teamAccess/seatUsage.js — Seat usage preview for a workspace (counts active/preview seats).
'use strict';
const workspaces=require('./workspaceRegistry');
const members=require('./teamMemberRegistry');
const seatLimits=require('./seatLimits');
const ACTIVE_STATES=['active','active_preview'];
function preview(workspaceId){
  const ws=workspaces.get(workspaceId);
  if(!ws) return { ok:false, error:'workspace_not_found' };
  const list=members.listByWorkspace(workspaceId);
  const activeSeats=list.filter(m=>ACTIVE_STATES.includes(m.status)).length;
  const sl=seatLimits.forPlanPreview(ws.planId, activeSeats);
  return { ok:true, workspaceId, planId:sl.planId, ...sl, totalMembers:list.length, dryRun:true };
}
module.exports={ preview, ACTIVE_STATES };
