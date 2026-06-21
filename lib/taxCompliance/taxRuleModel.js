  'use strict';
  /**
   * taxRuleModel.js — tax rule + tax report shapes, enums, factories, seeds.
      * Pure data; no I/O. Rates are illustrative previews only.
      */
  const crypto = require('crypto');

  const TAX_TYPES = ['sales_tax_preview', 'gst_preview', 'vat_preview', 'withholding_tax_preview', 'service_tax_preview',
  'import_tax_preview', 'custom_preview'];
  const APPLIES_TO = ['products', 'services', 'shipping', 'digital_products', 'subscriptions', 'reseller_sales',
  'supplier_bills', 'expenses'];
  const RULE_STATUSES = ['active', 'inactive', 'draft'];
  const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

  function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); }


  function newRule(input) {
       const now = new Date().toISOString();
       const i = input || {};
       return {
         id: i.id || 'tax_' + crypto.randomBytes(5).toString('hex'),
         name: i.name || 'Untitled tax rule',
         countryPreview: i.countryPreview || 'PK',
         regionPreview: i.regionPreview || 'federal',
         taxType: TAX_TYPES.includes(i.taxType) ? i.taxType : 'gst_preview',
         ratePercent: num(i.ratePercent),
         appliesTo: Array.isArray(i.appliesTo) ? i.appliesTo.filter((a) => APPLIES_TO.includes(a)) : ['products'],
         status: RULE_STATUSES.includes(i.status) ? i.status : 'active',
         dryRun: true,
         createdAt: i.createdAt || now,
         updatedAt: now,
       };
  }

  function newReport(input) {
       const now = new Date().toISOString();
       const i = input || {};
       return {
         id: i.id || 'rpt_' + crypto.randomBytes(5).toString('hex'),
         period: i.period || 'monthly_preview',
         totalTaxCollectedPreview: num(i.totalTaxCollectedPreview),
         totalTaxPaidPreview: num(i.totalTaxPaidPreview),
         netTaxPayablePreview: num(i.totalTaxCollectedPreview) - num(i.totalTaxPaidPreview),
         taxableRevenuePreview: num(i.taxableRevenuePreview),
         exemptRevenuePreview: num(i.exemptRevenuePreview),
         taxableExpensesPreview: num(i.taxableExpensesPreview),
         riskLevel: RISK_LEVELS.includes(i.riskLevel) ? i.riskLevel : 'low',
         dryRun: true,
         createdAt: now, updatedAt: now,
       };
  }

// Illustrative Pakistan-style sample rules. Preview rates only, not legal advice.
function seeds() {
 return [
   newRule({ id: 'tax_gst17', name: 'GST 17% (standard goods)', taxType: 'gst_preview', ratePercent: 17, appliesTo:
['products', 'shipping'] }),
   newRule({ id: 'tax_svc16', name: 'Service Tax 16%', taxType: 'service_tax_preview', ratePercent: 16, appliesTo:
['services', 'digital_products', 'subscriptions'] }),
   newRule({ id: 'tax_wht', name: 'Withholding Tax 4%', taxType: 'withholding_tax_preview', ratePercent: 4, appliesTo:
['supplier_bills'] }),
   newRule({ id: 'tax_exempt', name: 'Exempt category', taxType: 'custom_preview', ratePercent: 0, appliesTo:
['products'], status: 'active' }),
   ];
}

// Sample taxable figures for previews (no real customer data).
function sampleFigures() {
 return {
     invoices: [
       { id: 'inv_1001', subtotal: 5500, appliesTo: 'subscriptions', exempt: false },
        { id: 'inv_1002', subtotal: 1400, appliesTo: 'products', exempt: false },
        { id: 'inv_1003', subtotal: 1200, appliesTo: 'products', exempt: true },
     ],
     expenses: [
        { id: 'bill_551', subtotal: 3000, appliesTo: 'supplier_bills', exempt: false },
        { id: 'exp_88', subtotal: 800, appliesTo: 'expenses', exempt: false },
     ],
   };
}


module.exports = { TAX_TYPES, APPLIES_TO, RULE_STATUSES, RISK_LEVELS, newRule, newReport, seeds, sampleFigures, num };
