// lib/complianceCenter/store.js — Safe JSON store.
const fs = require('fs');
const path = require('path');
function readJSON(file, fallback){ try{ if(!fs.existsSync(file)) return fallback; const r=fs.readFileSync(file,'utf8'); if(!r.trim()) return fallback; return JSON.parse(r);}catch(_e){return fallback;} }
function writeJSON(file, data){ try{ const d=path.dirname(file); if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); const t=`${file}.tmp`; fs.writeFileSync(t, JSON.stringify(data,null,2)); fs.renameSync(t,file); return true;}catch(_e){return false;} }
module.exports = { readJSON, writeJSON };
