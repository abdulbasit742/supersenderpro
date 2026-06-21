'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = process.cwd(); const STORE_PATH = process.env.SHARED_INBOX_STORE_PATH || 'data/shared-inbox.json';
const abs = (p) => path.isAbsolute(p) ? p : path.join(ROOT, p);
function emptyState(){ return { conversations:{}, notes:{}, savedReplies:{}, locks:{}, sla:{}, version:1 }; }
function readJson(p, fb){ try{return JSON.parse(fs.readFileSync(abs(p),'utf8'));}catch(e){return fb;} }
function writeJson(p,d){ try{fs.mkdirSync(path.dirname(abs(p)),{recursive:true});}catch(e){} fs.writeFileSync(abs(p),JSON.stringify(d,null,2),'utf8'); }
function load(){ return readJson(STORE_PATH, emptyState()); }
function save(s){ writeJson(STORE_PATH,s); return load(); }
function maskPhone(v){ if(!v) return v; const d=String(v).replace(/\D/g,''); return d.length<4 ? '****' : '****'+d.slice(-4); }
function maskEmail(v){ if(!v) return v; return String(v).replace(/([a-z0-9._%+-])[a-z0-9._%+-]*@([a-z0-9])[a-z0-9.-]*\.([a-z]{2,})/gi,'$1***@$2***.$3'); }
module.exports = { emptyState, load, save, maskPhone, maskEmail, paths:{STORE_PATH} };
