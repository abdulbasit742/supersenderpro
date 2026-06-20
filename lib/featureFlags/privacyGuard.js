// lib/featureFlags/privacyGuard.js — Redaction + leak detection for Feature Flags outputs.
'use strict';
const PATTERNS=[
  /sk-[A-Za-z0-9]{12,}/, /gh[pousr]_[A-Za-z0-9]{20,}/, /AIza[0-9A-Za-z_\-]{20,}/, /xox[baprs]-[A-Za-z0-9-]{8,}/,
  /\b\d{11,}\b/, /[A-Za-z0-9._%+-]+@(?!demo\.invalid|example\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
];
function hasLeak(payload){ let s; try{ s=typeof payload==='string'?payload:JSON.stringify(payload); }catch(_e){ return false; } return PATTERNS.some(re=>re.test(s)); }
function maskValue(v){ if(typeof v!=='string') return v;
  return v.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'***@***').replace(/\b\d{6,}\b/g,m=>m.slice(0,2)+'***'); }
const SECRET_KEYS=/(token|secret|password|apikey|api_key|authorization|cookie|credential|privatekey)/i;
function redact(obj){
  if(Array.isArray(obj)) return obj.map(redact);
  if(obj&&typeof obj==='object'){ const o={}; for(const k of Object.keys(obj)){ o[k]=SECRET_KEYS.test(k)?'[REDACTED]':redact(obj[k]); } return o; }
  return maskValue(obj);
}
// Mask tenant/reseller identifiers so private ids are never exposed in responses.
function maskId(id){ if(!id) return id; const s=String(id); return s.length<=3?'***':s.slice(0,2)+'***'+s.slice(-1); }
module.exports={ hasLeak, redact, maskValue, maskId };
