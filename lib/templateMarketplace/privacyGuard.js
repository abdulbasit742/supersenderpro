// lib/templateMarketplace/privacyGuard.js — Redaction + leak detection for marketplace outputs.
// Ensures no secrets, tokens, real phones/emails or raw PII ever leave the marketplace layer.
'use strict';
const PATTERNS=[
  /sk-[A-Za-z0-9]{12,}/,                 // OpenAI-style key
  /gh[pousr]_[A-Za-z0-9]{20,}/,          // GitHub token
  /AIza[0-9A-Za-z_\-]{20,}/,             // Google key
  /xox[baprs]-[A-Za-z0-9-]{8,}/,         // Slack token
  /\b\d{11,}\b/,                          // long digit runs (phone-ish)
  /[A-Za-z0-9._%+-]+@(?!demo\.invalid|example\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, // real email
];
function hasLeak(payload){
  let s; try{ s=typeof payload==='string'?payload:JSON.stringify(payload); }catch(_e){ return false; }
  return PATTERNS.some(re=>re.test(s));
}
function maskValue(v){
  if(typeof v!=='string') return v;
  return v.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'***@***')
          .replace(/\b\d{6,}\b/g, m=>m.slice(0,2)+'***');
}
const SECRET_KEYS=/(token|secret|password|apikey|api_key|authorization|cookie|credential|privatekey)/i;
function redact(obj){
  if(Array.isArray(obj)) return obj.map(redact);
  if(obj&&typeof obj==='object'){ const o={}; for(const k of Object.keys(obj)){ o[k]=SECRET_KEYS.test(k)?'[REDACTED]':redact(obj[k]); } return o; }
  return maskValue(obj);
}
module.exports={ hasLeak, redact, maskValue };
