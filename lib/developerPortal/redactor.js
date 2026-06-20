// developerPortal/redactor.js — redacts PII and secrets from any payload before exposure.
const SECRET_KEYS = /(secret|token|apikey|api_key|password|signing|authorization|auth|key|credential|session)/i;

function maskPhone(v){ const s=String(v).replace(/\D/g,''); if(s.length<5) return '***'; return s.slice(0,3)+'****'+s.slice(-2); }
function maskEmail(v){ const s=String(v); const [u,d]=s.split('@'); if(!d) return '***'; return (u||'').slice(0,2)+'***@'+d; }
function maskUrl(v){ try{ const u=new URL(String(v)); return u.protocol+'//'+u.hostname+'/***'; }catch{ return '***'; } }

function redactValue(key, val){
  if (val == null) return val;
  if (SECRET_KEYS.test(key)) return '***REDACTED***';
  if (typeof val === 'string'){
    if (/@/.test(val) && /\./.test(val)) return maskEmail(val);
    if (/^\+?\d[\d\s\-]{6,}$/.test(val)) return maskPhone(val);
    if (/^https?:\/\//i.test(val)) return maskUrl(val);
  }
  return val;
}

function redact(obj){
  if (Array.isArray(obj)) return obj.map(x=>redact(x));
  if (obj && typeof obj === 'object'){
    const out={};
    for (const [k,v] of Object.entries(obj)){
      if (v && typeof v === 'object') out[k]=redact(v);
      else out[k]=redactValue(k,v);
    }
    return out;
  }
  return obj;
}

module.exports = { redact, maskPhone, maskEmail, maskUrl };
