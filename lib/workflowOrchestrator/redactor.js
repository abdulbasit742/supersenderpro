// lib/workflowOrchestrator/redactor.js — masking helpers. Pure, no I/O. Never returns raw secrets/PII/stacks.
  'use strict';


  function safeText(value) { if (value == null) return ''; let s = String(value); if (s.length > 300) s = s.slice(0, 297) +
  '...'; return s; }

function maskPhone(phone) {
    const s = String(phone || ''); const digits = s.replace(/[^\d]/g, '');
    if (digits.length < 4) return '***';
    const last4 = digits.slice(-4);
    const prefix = s.trim().startsWith('+') ? '+' : '';
    const cc = digits.slice(0, Math.min(2, Math.max(0, digits.length - 4)));
    const stars = Math.max(2, digits.length - 4 - cc.length);
    return prefix + cc + '*'.repeat(stars) + last4;
}

function maskEmail(email) {
    const s = String(email || ''); const at = s.indexOf('@');
    if (at <= 0) return s ? '***' : '';
    return s.slice(0, Math.min(2, at)) + '***@' + s.slice(at + 1);
}


function maskName(name) {
    const s = String(name || '').trim(); if (!s) return '';
    return s.split(/\s+/).map((p) => (p ? p[0] + '***' : '')).join(' ');
}


function maskToken(token) { return token ? 'token_****' : 'not_configured'; }
function maskSecret(value) { return value ? 'secret_****' : 'not_configured'; }

function maskRefPrefixed(prefix, ref) { const s = String(ref || ''); return s ? prefix + '_****' + s.slice(-2) : prefix +
'_****'; }
function maskRef(ref) { return maskRefPrefixed('ref', ref); }
function maskOrderRef(ref) { return maskRefPrefixed('ord', ref); }
function maskInvoiceRef(ref) { return maskRefPrefixed('inv', ref); }
function maskPaymentRef(ref) { return maskRefPrefixed('pay', ref); }


function maskMessage(message) {
  let s = String(message || '');
    s = s.replace(/\+?\d[\d\s\-()]{7,}\d/g, (m) => maskPhone(m));
    s = s.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, (m) => maskEmail(m));
    if (s.length > 120) s = s.slice(0, 117) + '...';
    return s;
}


function redactContact(record) {
  const r = record || {};
  return { idMasked: r.id ? maskRef(String(r.id)) : 'masked', name: maskName(r.name), phone: maskPhone(r.phone), email:
maskEmail(r.email) };
}
function redactCustomer(record) {
    const r = record || {};
    return Object.assign(redactContact(r), { segment: safeText(r.segment || ''), tagsCount: Array.isArray(r.tags) ?
r.tags.length : 0 });
}
function redactWorkflow(record) {
  const r = record || {};
    return { id: safeText(r.id || ''), name: safeText(r.name || ''), status: safeText(r.status || 'draft_preview'),
      triggerType: safeText(r.trigger && r.trigger.type), conditionsCount: Array.isArray(r.conditions) ?
r.conditions.length : 0,
    actionsCount: Array.isArray(r.actions) ? r.actions.length : 0 };
}
function redactAction(record) {

      const r = record || {};
   return { type: safeText(r.type || ''), channel: safeText(r.channel || ''), liveAction: false, actionExecuted: false,
 previewOnly: true,
       messagePreview: r.message ? maskMessage(r.message) : undefined };
 }
 function redactEvent(record) {
   const r = record || {};
   return { type: safeText(r.type || r.event || 'event'), at: r.at || r.time || null, note: r.note ? maskMessage(r.note) :
 undefined };
 }
 function redactLog(record) {
      if (record == null) return {};
      if (typeof record === 'string') return { message: maskMessage(record) };
      const r = {};
      if (record.level) r.level = safeText(record.level);
      if (record.time || record.timestamp) r.time = safeText(record.time || record.timestamp);
      if (record.message || record.msg) r.message = maskMessage(record.message || record.msg);
      return r;
 }
 function redactError(error) {
   if (!error) return { message: '', stackExposed: false };
      return { message: maskMessage(error.message ? error.message : String(error)), stackExposed: false };
 }

 module.exports = {
   safeText, maskPhone, maskEmail, maskName, maskToken, maskSecret, maskRef, maskOrderRef, maskInvoiceRef, maskPaymentRef,
 maskMessage,
      redactContact, redactCustomer, redactWorkflow, redactAction, redactEvent, redactLog, redactError,
 };
