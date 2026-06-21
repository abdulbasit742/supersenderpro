 'use strict';
 /**
  * supplierPortalModel.js — vendor portal supplier shape using DEMO-SAFE preview
     * tokens. Masks bank/tax/contact at construction; never holds raw values.
     */
 const crypto = require('crypto');
 const redactor = require('./redactor');


 const STATUS_AREAS = ['rfq', 'quote', 'purchase_order', 'bill_payment', 'delivery', 'quality_score', 'contract',
 'document_request'];


 function previewToken() { return 'sup_' + crypto.randomBytes(6).toString('hex'); }


 function newSupplier(input) {
   const now = new Date().toISOString();
      const i = input || {};
      return {
        previewToken: i.previewToken || previewToken(),
        displayNameSafe: redactor.maskName(i.name || i.displayNameSafe),
        phoneMasked: i.phone ? redactor.maskPhone(i.phone) : (i.phoneMasked || null),
        emailMasked: i.email ? redactor.maskEmail(i.email) : (i.emailMasked || null),
        bankMasked: i.bankAccount ? redactor.maskBank(i.bankAccount) : (i.bankMasked || null),
        taxMasked: i.taxId ? redactor.maskTax(i.taxId) : (i.taxMasked || null),
        statuses: Object.assign({
          rfq: i.rfq || 'none', quote: i.quote || 'none', purchase_order: i.purchase_order || 'none',
           bill_payment: i.bill_payment || 'none', delivery: i.delivery || 'none', quality_score: i.quality_score || 'none',
           contract: i.contract || 'none', document_request: i.document_request || 'none',
        }, i.statuses || {}),
        qualityScorePreview: Number(i.qualityScorePreview) || 0,
        supplierPortalPublicLive: false,
        piiMasked: true,
        dryRun: true,
        createdAt: i.createdAt || now,
        updatedAt: now,
      };
 }

 function seeds() {
   return [
     newSupplier({ previewToken: 'sup_demo1', name: 'CloudVendor A', phone: '+923001112233', email:
 'sales@cloudvendora.com', bankAccount: 'PK36SCBL0000001123456702', taxId: 'NTN1234567', rfq: 'open', quote: 'submitted',

 purchase_order: 'approved', bill_payment: 'pending', delivery: 'in_transit', quality_score: 'good', contract: 'active',
 qualityScorePreview: 88 }),
     newSupplier({ previewToken: 'sup_demo2', name: 'HardwareCo X', phone: '+923004445566', email:
 'orders@hardwarecox.com', bankAccount: 'PK24MEZN0000009988776655', taxId: 'NTN7654321', rfq: 'none', quote: 'none',
 purchase_order: 'delivered', bill_payment: 'paid', delivery: 'delivered', quality_score: 'watch', contract:
 'expiring_soon', document_request: 'pending', qualityScorePreview: 62 }),
     newSupplier({ previewToken: 'sup_demo3', name: 'PackSupplies', email: 'hello@packsupplies.com', taxId: 'NTN5556667',
 rfq: 'invited', quote: 'draft', bill_payment: 'overdue', quality_score: 'none', qualityScorePreview: 40 }),
   ];
 }


 module.exports = { STATUS_AREAS, previewToken, newSupplier, seeds };
