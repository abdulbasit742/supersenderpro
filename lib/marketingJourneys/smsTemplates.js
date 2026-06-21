 'use strict';
 /**
     * smsTemplates.js — SMS templates. Render returns a draft preview only; an
     * opt-out line (STOP) is always appended. No live send.
  */
 const TEMPLATES = {
      welcome_sms: { message: 'Welcome to {{business}}, {{firstName}}! Reply HELP anytime.' },
      cart_sms: { message: '{{firstName}}, your cart is waiting at {{business}}.' },
      payment_sms: { message: '{{firstName}}, your payment is pending. Need help?' },
      winback_sms: { message: 'We miss you {{firstName}}! A treat is waiting.' },
      support_sms: { message: '{{firstName}}, your ticket is resolved. Reply if needed.' },
 };


 const OPTOUT_FOOTER = ' Reply STOP to opt out.';


 function fill(str, vars) { return String(str).replace(/{{(\w+)}}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m)); }
 function list() { return Object.keys(TEMPLATES).map((id) => ({ id, message: TEMPLATES[id].message })); }


 function render(templateId, vars) {
   const t = TEMPLATES[templateId] || { message: '(missing template)' };
      const v = Object.assign({ business: 'SuperSender Pro', firstName: 'there' }, vars || {});
      const body = fill(t.message, v) + OPTOUT_FOOTER;
      return { templateId, messagePreview: body, optOutIncluded: true, segments: Math.ceil(body.length / 160) };
 }

 module.exports = { list, render, TEMPLATES };
