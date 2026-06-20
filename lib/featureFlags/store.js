// lib/featureFlags/store.js — Safe atomic JSON store for Feature Flags. Local config only.
// Never stores secrets, raw security logs, or full customer/tenant PII.
const fs=require('fs'); const path=require('path');
function readJSON(file, fallback){ try{ if(!fs.existsSync(file)) return fallback; const r=fs.readFileSync(file,'utf8'); if(!r.trim()) return fallback; return JSON.parse(r);}catch(_e){return fallback;} }
function writeJSON(file, data){ try{ const d=path.dirname(file); if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); const t=`${file}.tmp`; fs.writeFileSync(t, JSON.stringify(data,null,2)); fs.renameSync(t,file); return true;}catch(_e){return false;} }
function appendHistory(file, entry, max=300){ const list=readJSON(file, []); list.unshift({ ...entry, at:new Date().toISOString() }); writeJSON(file, list.slice(0,max)); return true; }
module.exports={ readJSON, writeJSON, appendHistory };
