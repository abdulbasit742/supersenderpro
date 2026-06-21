 'use strict';
 /**
  * customerPortalModel.js — portal customer shape using DEMO-SAFE preview tokens
  * instead of real customer IDs. Pure data + factory + synthetic seeds. Masks at
  * construction; never holds raw phone/email/address.
  */
 const crypto = require('crypto');
 const redactor = require('./redactor');


 // Status enums the self-service center can preview (read-only labels).
 const STATUS_AREAS = ['order', 'invoice', 'appointment', 'service_work_order', 'maintenance_plan', 'ticket', 'loyalty',
 'contract', 'document_request', 'complaint', 'warranty_repair'];

 function previewToken() { return 'cust_' + crypto.randomBytes(6).toString('hex'); }


 function newCustomer(input) {
   const now = new Date().toISOString();
   const i = input || {};
   return {
     previewToken: i.previewToken || previewToken(),
     displayNameSafe: redactor.maskName(i.name || i.displayNameSafe),
     phoneMasked: i.phone ? redactor.maskPhone(i.phone) : (i.phoneMasked || null),
     emailMasked: i.email ? redactor.maskEmail(i.email) : (i.emailMasked || null),
     // status snapshots are simple labels only; no underlying records stored here
     statuses: Object.assign({
       order: i.order || 'none',
       invoice: i.invoice || 'none',
       appointment: i.appointment || 'none',
       service_work_order: i.service_work_order || 'none',
       maintenance_plan: i.maintenance_plan || 'none',
       ticket: i.ticket || 'none',
       loyalty: i.loyalty || 'none',
       contract: i.contract || 'none',
       document_request: i.document_request || 'none',
       complaint: i.complaint || 'none',
       warranty_repair: i.warranty_repair || 'none',
     }, i.statuses || {}),
     loyaltyPointsPreview: Number(i.loyaltyPointsPreview) || 0,
     portalPublicLive: false,
     piiMasked: true,
     dryRun: true,
     createdAt: i.createdAt || now,

    updatedAt: now,
  };
}


function seeds() {
  return [
    newCustomer({ previewToken: 'cust_demo1', name: 'Ayesha Khan', phone: '+923001112233', email: 'ayesha@example.com',
order: 'processing', invoice: 'unpaid', appointment: 'confirmed', ticket: 'open', loyalty: 'silver', contract: 'active',
warranty_repair: 'in_repair', loyaltyPointsPreview: 320 }),
  newCustomer({ previewToken: 'cust_demo2', name: 'Bilal Ahmed', phone: '+923004445566', email: 'bilal@example.com',
order: 'delivered', invoice: 'paid', appointment: 'none', ticket: 'resolved', loyalty: 'gold', contract: 'expiring_soon',
maintenance_plan: 'active', loyaltyPointsPreview: 850 }),
  newCustomer({ previewToken: 'cust_demo3', name: 'Sara', email: 'sara@example.com', order: 'none', invoice: 'none',
complaint: 'under_review', document_request: 'pending', loyalty: 'bronze', loyaltyPointsPreview: 40 }),
];
}

module.exports = { STATUS_AREAS, previewToken, newCustomer, seeds };
