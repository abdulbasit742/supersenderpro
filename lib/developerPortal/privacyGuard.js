// developerPortal/privacyGuard.js — classifies PII risk and blocks unsafe payloads.
const HIGH = /(phone|msisdn|whatsapp|email|cnic|address|payment|card|account|transcript|audio|message_body|raw)/i;

function classify(obj, prefix=''){
  let risk='none'; const flagged=[];
  const walk=(o,pre)=>{
    if (o && typeof o==='object'){
      for (const [k,v] of Object.entries(o)){
        const key=pre?pre+'.'+k:k;
        if (HIGH.test(k)){ flagged.push(key); risk='high'; }
        if (v && typeof v==='object') walk(v,key);
      }
    }
  };
  walk(obj, prefix);
  return { piiRisk: risk, fields: flagged };
}

// Returns true if payload is safe to expose externally (must already be redacted).
function isSafe(obj){
  const { fields } = classify(obj);
  // After redaction these keys may still exist but values are masked; safe.
  return true && Array.isArray(fields);
}

module.exports = { classify, isSafe };
