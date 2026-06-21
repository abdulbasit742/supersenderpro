'use strict';
const cfg=require('./config'); const { maskInvoiceRef, maskMessage }=require('./redactor');
function paymentReminderPreview(input){ const i=input||{}; return cfg.base({ livePaymentAction:false, liveInvoiceMutation:false, invoiceRefMasked:maskInvoiceRef(i.invoiceRef||''), reminderDraftPreview:maskMessage(i.message||'Aap ki payment due hai. Meharbani farma kar payment complete karein.'), dueAmountPreview:Number(i.dueAmount)||0 }); }
module.exports={ paymentReminderPreview };
