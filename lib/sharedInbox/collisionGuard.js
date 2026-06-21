'use strict';
const store = require('./store');
const TTL_MS = parseInt(process.env.SHARED_INBOX_LOCK_TTL_MS || '120000', 10);
function now(){ return Date.now(); }
function check(convId, agentId){ const s=store.load(); const lock=s.locks[convId]; const active=lock && (now()-lock.at)<TTL_MS; if(active && lock.agentId && String(lock.agentId)!==String(agentId)){ return {ok:true, collision:true, heldBy:lock.agentId, heldForMs:now()-lock.at, message:'Another agent is in this conversation.'}; } return {ok:true, collision:false, heldBy:active ? lock.agentId : null}; }
function acquire(convId, agentId){ const s=store.load(); const lock=s.locks[convId]; const active=lock && (now()-lock.at)<TTL_MS; if(active && lock.agentId && String(lock.agentId)!==String(agentId)) return {ok:false, collision:true, heldBy:lock.agentId}; s.locks[convId]={agentId:String(agentId||'agent'),at:now()}; store.save(s); return {ok:true, collision:false, heldBy:String(agentId||'agent')}; }
function release(convId, agentId){ const s=store.load(); if(s.locks[convId] && String(s.locks[convId].agentId)===String(agentId)){ delete s.locks[convId]; store.save(s); } return {ok:true}; }
module.exports = { check, acquire, release, TTL_MS };
