// lib/complianceCenter/auditLog.js — Append-only compliance audit (redacted).
const { config } = require('./config');
const { readJSON, writeJSON } = require('./store');
const { redact, maskSubject } = require('./privacy');
const MAX = 5000;
function record(event, meta={}){
  const safe={}; for(const [k,v] of Object.entries(meta)){ safe[k]= (k==='subjectId')?maskSubject(v):(typeof v==='string'?redact(v).slice(0,160):v); }
  const log=readJSON(config.paths.audit,{events:[]}); log.events=Array.isArray(log.events)?log.events:[];
  const entry={id:`cmp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,event,at:new Date().toISOString(),meta:safe};
  log.events.push(entry); if(log.events.length>MAX) log.events=log.events.slice(-MAX); writeJSON(config.paths.audit,log); return entry;
}
function list({limit=100}={}){ const log=readJSON(config.paths.audit,{events:[]}); return (log.events||[]).slice(-limit).reverse(); }
module.exports = { record, list };
