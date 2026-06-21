// lib/serviceCenter/messageDrafts.js
// Builds WhatsApp message DRAFTS for service lifecycle events. Never sends.
'use strict';


const store = require('./store');
const { maskName, maskPhone } = require('./redactor');


const FLAGS = { liveSend: false };

const TEMPLATES = {
  assigned: (wo, tech) => `Hi ${maskName(wo.customerName)}, your service request ${wo.ref} (${wo.asset}) is assigned to
${tech ? tech.name : 'a technician'}. We'll update you on arrival.`,
  on_the_way: (wo, tech) => `Update on ${wo.ref}: ${tech ? tech.name : 'Your technician'} is on the way. Please keep the
area accessible.`,
  estimate: (wo, amount) => `Estimate for ${wo.ref} (${wo.asset}): approx PKR ${amount}. Reply YES to approve before we
proceed.`,
  completed: (wo) => `Your service ${wo.ref} is complete. Thank you! A receipt and feedback link will follow.`,
  awaiting_parts: (wo) => `Update on ${wo.ref}: we're sourcing a required part. We'll reschedule shortly and keep you
posted.`
};

function draft(event, woId, extra = {}) {
  const wo = store.getWorkOrder(woId);
     if (!wo) return { ok: false, errors: ['work order not found'] };
     const tpl = TEMPLATES[event];
     if (!tpl) return { ok: false, errors: ['unknown event: ' + event], available: Object.keys(TEMPLATES) };
     const tech = wo.assignedTech ? store.getTechnician(wo.assignedTech) : null;
     const body = event === 'estimate' ? tpl(wo, extra.amount || '—') : tpl(wo, tech);
     return {
       ok: true,
       event,
       to: maskPhone(wo.phone),
       channel: 'whatsapp',
       body,
       liveSend: FLAGS.liveSend,
       note: 'Draft only. No message sent. liveSend disabled.'
     };
}

module.exports = { FLAGS, draft, TEMPLATES };
