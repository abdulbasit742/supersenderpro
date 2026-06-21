  'use strict';

  /**
      * Receivables Center — payment reminder DRAFT builder.


      *
      * Builds a WhatsApp/email reminder message preview. NEVER sends. Customer masked.
      */


  const invoiceService = require('./invoiceService');
  const { maskPhone, maskEmail } = require('./redactor');


  function build(invoiceId, channel) {
    const inv = invoiceService.getRaw(invoiceId);
          if (!inv) return { ok: false, error: 'invoice not found' };
          const ch = ['whatsapp_preview', 'email_preview'].includes(channel) ? channel : 'whatsapp_preview';
          const customerMasked = inv.phoneMasked || inv.emailMasked || inv.customerNameSafe;
          const amount = `${inv.currency || 'PKR'} ${inv.balanceDuePreview}`;
          const due = inv.dueDate ? new Date(inv.dueDate).toDateString() : 'soon';
          const message =
            `Assalam o Alaikum ${inv.customerNameSafe}, this is a friendly reminder for invoice ${inv.invoiceNumber}. ` +
            `Balance due: ${amount} (due ${due}). Please share your payment confirmation. JazakAllah. (preview)`;
          return {
            ok: true,
            dryRun: true,
            liveSend: false,
            channel: ch,
            invoiceId: inv.id,
            customerMasked,
            messagePreview: message,
            warnings: [],
            blockers: ['live_send_disabled'],
          };
  }


  module.exports = { build };
