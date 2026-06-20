// lib/teamAccess/workspaceRegistry.js — In-memory + JSON-backed workspace registry (preview/dry-run).
// Does NOT create tenants or modify Tenant Portal / billing. Coordination layer only.
'use strict';
const { paths, flags }=require('./config');
const store=require('./store');
const WORKSPACE_TYPES=['tenant','reseller_managed_client','agency_workspace','internal_admin','demo','pilot','custom'];
const STATUSES=['active','suspended_preview','archived','draft'];
function now(){ return new Date().toISOString(); }
function load(){ return store.readJSON(paths.store, { workspaces:[], members:[] }); }
// Local preview store only (gitignored, masked, no PII/tokens). dryRun blocks REAL auth writes, not our own state.
function save(db){ return store.writeJSON(paths.store, db); }
function genId(prefix){ return `${prefix}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`; }
function normalize(w={}){
  return {
    id:w.id||genId('ws'), tenantId:w.tenantId||null, resellerId:w.resellerId||null,
    businessName:w.businessName||'Unnamed Workspace',
    workspaceType:WORKSPACE_TYPES.includes(w.workspaceType)?w.workspaceType:'tenant',
    planId:w.planId||'free_trial', seatLimit:Number.isFinite(w.seatLimit)?w.seatLimit:null,
    activeSeatCount:Number.isFinite(w.activeSeatCount)?w.activeSeatCount:0,
    status:STATUSES.includes(w.status)?w.status:'active', dryRun:w.dryRun!==false,
    createdAt:w.createdAt||now(), updatedAt:now(),
  };
}
function all(){ return load().workspaces.map(normalize); }
function get(id){ const w=load().workspaces.find(x=>x.id===id); return w?normalize(w):null; }
// Upsert is preview-only by default (returns the normalized record without persisting live).
function upsert(input={}){
  const db=load(); const rec=normalize(input);
  const i=db.workspaces.findIndex(x=>x.id===rec.id);
  if(i>=0) db.workspaces[i]={ ...db.workspaces[i], ...rec }; else db.workspaces.push(rec);
  const persisted=save(db);
  return { ...rec, persisted:!!persisted, preview:flags.allowAuthWrite!==true };
}
module.exports={ all, get, upsert, normalize, WORKSPACE_TYPES, STATUSES, genId };
