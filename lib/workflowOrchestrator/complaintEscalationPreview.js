'use strict';
const cfg=require('./config'); const { maskMessage }=require('./redactor'); const SEVERE=/legal|refund|fraud|court|media|angry|worst/i;
function complaintEscalationPreview(input){ const i=input||{}; const msg=String(i.message||''); const severe=SEVERE.test(msg); return cfg.base({ liveTicketCreation:false, liveAlert:false, severityPreview:severe?'high_preview':'normal_preview', escalationRequiredPreview:severe, alertDraftPreview:maskMessage(severe?'High-severity complaint detected, escalate to manager.':'Complaint logged for review.') }); }
module.exports={ complaintEscalationPreview };
