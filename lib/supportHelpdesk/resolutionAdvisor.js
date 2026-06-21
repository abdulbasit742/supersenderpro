'use strict';
const STEPS = {
  whatsapp_connection: ['Open WhatsApp setup wizard','Re-scan QR or re-auth Cloud API','Confirm number status','Retry in dry-run'],
  billing: ['Open billing preview','Check plan and invoice status','Draft reply for customer'], payment: ['Check payment reference','Run fraud/duplicate guard','Mark as verified only after approval'],
  bug: ['Collect reproduction steps','Capture screenshot','Create bug triage item'], other: ['Acknowledge','Search KB','Escalate if unresolved']
};
function advise(ticket) { const steps = STEPS[ticket.category] || STEPS.other; return { ok:true, dryRun:true, ticketId:ticket.id, category:ticket.category, steps, nextStep:steps[0] }; }
module.exports = { advise, STEPS };
