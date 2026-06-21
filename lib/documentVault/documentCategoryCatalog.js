 'use strict';
 /**
     * documentCategoryCatalog.js — enums + the required-document matrix per source
     * module (used by the missing-document checker). Pure data.
  */
 const DOCUMENT_TYPES = ['contract_preview', 'invoice_preview', 'supplier_bill_preview', 'receipt_preview',
 'payment_proof_preview', 'purchase_order_preview', 'tax_document_preview', 'staff_document_preview',
 'asset_warranty_preview', 'product_certificate_preview', 'quality_evidence_preview', 'customer_document_preview',
 'audit_evidence_preview', 'backup_manifest_preview', 'compliance_checklist_preview', 'other_preview'];
 const CATEGORIES = ['finance', 'tax', 'legal', 'supplier', 'customer', 'staff', 'asset', 'inventory', 'quality',
 'procurement', 'sales', 'audit', 'compliance', 'backup', 'operations'];
 const STATUSES = ['draft', 'attached_preview', 'verified_preview', 'needs_review', 'missing_required', 'expiring_soon',
 'expired', 'archived'];
 const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
 const LINKED_MODULES = ['contract_center', 'receivables_center', 'payables_center', 'accounting_center',
 'cashbook_center', 'tax_compliance', 'procurement_center', 'supplier_planner', 'staff_center', 'asset_center',
 'quality_center', 'backup_center', 'approval_center', 'audit_ledger', 'report_builder'];


 // Required document types per source module (for missing-document checks).
 const REQUIRED_BY_MODULE = {

      contract_center: ['contract_preview'],
      receivables_center: ['invoice_preview', 'receipt_preview'],
      payables_center: ['supplier_bill_preview', 'payment_proof_preview'],
      procurement_center: ['purchase_order_preview'],
      tax_compliance: ['tax_document_preview'],
      staff_center: ['staff_document_preview'],
      asset_center: ['asset_warranty_preview'],
      quality_center: ['quality_evidence_preview', 'product_certificate_preview'],
      backup_center: ['backup_manifest_preview'],
      audit_ledger: ['audit_evidence_preview'],
 };


 function categoryFor(documentType) {
   const map = { contract_preview: 'legal', invoice_preview: 'finance', supplier_bill_preview: 'supplier',
 receipt_preview: 'finance', payment_proof_preview: 'finance', purchase_order_preview: 'procurement',
 tax_document_preview: 'tax', staff_document_preview: 'staff', asset_warranty_preview: 'asset',
 product_certificate_preview: 'quality', quality_evidence_preview: 'quality', customer_document_preview: 'customer',
 audit_evidence_preview: 'audit', backup_manifest_preview: 'backup', compliance_checklist_preview: 'compliance',
 other_preview: 'operations' };
      return map[documentType] || 'operations';
 }
 module.exports = { DOCUMENT_TYPES, CATEGORIES, STATUSES, RISK_LEVELS, LINKED_MODULES, REQUIRED_BY_MODULE, categoryFor };
