'use strict';
function safeText(value){ if(value==null) return ''; let s=String(value); return s.length>300?s.slice(0,297)+'...':s; }
function maskPhone(phone){ const s=String(phone||''); const d=s.replace(/[^\d]/g,''); if(d.length<4) return s?'***':''; const cc=d.slice(0,Math.min(2,Math.max(0,d.length-4))); return (s.trim().startsWith('+')?'+':'')+cc+'*'.repeat(Math.max(2,d.length-4-cc.length))+d.slice(-4); }
function maskEmail(email){ const s=String(email||''); const at=s.indexOf('@'); if(at<=0) return s?'***':''; return s.slice(0,Math.min(2,at))+'***@'+s.slice(at+1); }
function maskName(name){ return String(name||'').trim().split(/\s+/).filter(Boolean).map(p=>p[0]+'***').join(' '); }
function maskToken(token){ return token?'token_****':'not_configured'; }
function maskSecret(value){ return value?'secret_****':'not_configured'; }
function maskRefPrefixed(prefix, ref){ const s=String(ref||''); return s ? prefix+'_****'+s.slice(-2) : prefix+'_****'; }
function maskRef(ref){ return maskRefPrefixed('ref', ref); }
function maskCampaignId(id){ return maskRefPrefixed('camp', id); }
function maskContactId(id){ return maskRefPrefixed('contact', id); }
function maskOrderRef(ref){ return maskRefPrefixed('ord', ref); }
function maskInvoiceRef(ref){ return maskRefPrefixed('inv', ref); }
function maskPaymentRef(ref){ return maskRefPrefixed('pay', ref); }
function maskMessage(message){ let s=String(message||''); s=s.replace(/\+?\d[\d\s\-()]{7,}\d/g,m=>maskPhone(m)); s=s.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g,m=>maskEmail(m)); return s.length>120?s.slice(0,117)+'...':s; }
function redactCampaign(record){ const r=record||{}; return { idMasked:maskCampaignId(r.id), namePreview:r.name?('Campaign '+maskRefPrefixed('',r.name)):'Campaign ****', statusPreview:safeText(r.status||'draft_preview') }; }
function redactContact(record){ const r=record||{}; return { idMasked:maskContactId(r.id), name:maskName(r.name), phone:maskPhone(r.phone), email:maskEmail(r.email) }; }
function redactCustomer(record){ return Object.assign(redactContact(record), { segment:safeText((record||{}).segment||'') }); }
function redactTemplate(record){ const r=record||{}; return { namePreview:safeText(r.name||'template_****'), categoryPreview:safeText(r.category||'utility'), bodyPreview:maskMessage(r.body||'') }; }
function redactAnalytics(record){ const r=record||{}; const out={}; Object.keys(r).forEach(k=>{ out[k]=typeof r[k]==='number'?r[k]:safeText(r[k]); }); return out; }
function redactLog(record){ if(record==null) return {}; if(typeof record==='string') return { message:maskMessage(record) }; return { level:safeText(record.level||''), time:safeText(record.time||record.timestamp||''), message:maskMessage(record.message||record.msg||'') }; }
function redactError(error){ return { message:maskMessage(error&&error.message?error.message:String(error||'')), stackExposed:false }; }
module.exports={ safeText, maskPhone, maskEmail, maskName, maskToken, maskSecret, maskRef, maskCampaignId, maskContactId, maskOrderRef, maskInvoiceRef, maskPaymentRef, maskMessage, redactCampaign, redactContact, redactCustomer, redactTemplate, redactAnalytics, redactLog, redactError };
