 'use strict';
 /**
  * documentModel.js — document metadata shape, factory, synthetic seeds. Pure data.
     * Metadata only; never file contents.
     */
 const crypto = require('crypto');
 const cat = require('./documentCategoryCatalog');

 function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }


 function statusFromExpiry(expiryDate, base) {
      if (!expiryDate) return base || 'attached_preview';
      const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
      if (days < 0) return 'expired';
      if (days <= 30) return 'expiring_soon';
      return base || 'attached_preview';
 }

 function newDocument(input) {
      const now = new Date().toISOString();
      const i = input || {};
      const documentType = cat.DOCUMENT_TYPES.includes(i.documentType) ? i.documentType : 'other_preview';
      const status = i.status && cat.STATUSES.includes(i.status) ? i.status : statusFromExpiry(i.expiryDate);
      return {
        id: i.id || 'doc_' + crypto.randomBytes(5).toString('hex'),
        title: i.title || 'Untitled document',
        documentType,
        category: cat.CATEGORIES.includes(i.category) ? i.category : cat.categoryFor(documentType),
        sourceModule: cat.LINKED_MODULES.includes(i.sourceModule) ? i.sourceModule : null,

    linkedRecordIdPreview: i.linkedRecordIdPreview || null,
    linkedRecordLabelSafe: i.linkedRecordLabelSafe || null,
    fileNameSafe: i.fileNameSafe || null,
    fileType: i.fileType || 'pdf',
    fileSizePreview: i.fileSizePreview || '0 KB',
    ownerSafe: i.ownerSafe || null,
    expiryDate: i.expiryDate || null,
    status,
    riskLevel: cat.RISK_LEVELS.includes(i.riskLevel) ? i.riskLevel : 'low',
    redactedOnly: true,
    dryRun: true,
    createdAt: i.createdAt || now,
    updatedAt: now,
  };
}


function seeds() {
  return [
    newDocument({ id: 'doc_s1', title: 'Supplier Agreement, CloudVendorA', documentType: 'contract_preview',
sourceModule: 'contract_center', linkedRecordIdPreview: 'ctr_101', owner: 'Abdul', fileName: 'cloudvendor-agreement.pdf',
fileType: 'pdf', fileSizePreview: '240 KB', expiryDate: daysFromNow(20) }),
  newDocument({ id: 'doc_s2', title: 'Invoice INV-1001', documentType: 'invoice_preview', sourceModule:
'receivables_center', linkedRecordIdPreview: 'inv_1001', owner: 'Finance', fileName: 'inv-1001.pdf', fileSizePreview: '88 KB', status: 'verified_preview' }),
  newDocument({ id: 'doc_s3', title: 'GST Return Q2', documentType: 'tax_document_preview', sourceModule:
'tax_compliance', linkedRecordIdPreview: 'rpt_q2', owner: 'Finance', fileName: 'gst-q2.pdf', fileSizePreview: '120 KB',
expiryDate: daysFromNow(-5) }),
  newDocument({ id: 'doc_s4', title: 'Dongle Warranty', documentType: 'asset_warranty_preview', sourceModule:
'asset_center', linkedRecordIdPreview: 'asset_55', owner: 'Ops', fileName: 'dongle-warranty.pdf', fileSizePreview: '64 KB', expiryDate: daysFromNow(400) }),
  newDocument({ id: 'doc_s5', title: 'Payment Proof, BILL-7781', documentType: 'payment_proof_preview', sourceModule:
'payables_center', linkedRecordIdPreview: 'bill_551', owner: 'Finance', fileName: 'proof-7781.jpg', fileType: 'image',
fileSizePreview: '310 KB' }),
  ];
}


module.exports = { newDocument, statusFromExpiry, seeds, daysFromNow };
