// lib/complianceCenter/privacy.js — Masking + leak detection (consistent with platform).
function maskSubject(id){ if(!id) return 'unknown'; const s=String(id); const digits=s.replace(/\D/g,''); if(digits.length>=7) return `****${digits.slice(-3)}`; return s.length<=4?`${s[0]||''}***`:`${s.slice(0,2)}***${s.slice(-2)}`; }
function redact(text){ if(text===undefined||text===null) return ''; return String(text)
  .replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,(_m,u)=>`${u.slice(0,2)}***@[REDACTED]`)
  .replace(/(\+?\d[\d\s().-]{7,}\d)/g,'[REDACTED_PHONE]')
  .replace(/\b[A-Za-z0-9_-]{24,}\b/g,'[REDACTED_TOKEN]'); }
function hasLeak(text){ if(!text) return false; let s=String(text).replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g,'').replace(/\b[a-z]+_\d{6,}_[a-z0-9]+/gi,'');
  if(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(s)&&!/\*\*\*@/.test(s)&&!s.includes('[REDACTED'))return true;
  if((s.match(/\d{7,}/g)||[]).length)return true; return false; }
module.exports = { maskSubject, redact, hasLeak };
