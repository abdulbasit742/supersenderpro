#!/usr/bin/env node
// scripts/franchise-portal-check.js — Validates Franchise Portal install + safe behaviour. No server, no external calls.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));

const LIB = [
  'store.js', 'franchisePortalModel.js', 'franchisePortalService.js', 'statusSummaryPreview.js',
  'franchiseProfilePreview.js', 'tierStatusPreview.js', 'outletAccountStatusPreview.js', 'outletListPreview.js',
  'salesSummaryPreview.js', 'targetAchievementPreview.js', 'royaltySummaryPreview.js', 'royaltyPaymentStatusPreview.js',
  'outstandingPayablePreview.js', 'inventoryAllocationPreview.js', 'replenishmentDraftPreview.js', 'orderStatusPreview.js',
  'settlementStatusPreview.js', 'marketingFundPreview.js', 'headcountPreview.js', 'complianceChecklistPreview.js',
  'territoryAssignmentPreview.js', 'contractStatusPreview.js', 'documentRequestPreview.js', 'supportRequestPreview.js',
  'messageDrafts.js', 'auditPreview.js', 'redactor.js',
];
LIB.forEach((f) => add(`file lib/franchisePortal/${f}`, exists(`lib/franchisePortal/${f}`)));
['routes/franchisePortalRoutes.js', 'public/franchise-portal.html', 'public/js/franchise-portal.js', 'public/css/franchise-portal.css']
  .forEach((f) => add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('FRANCHISE PORTAL HOOK'));

let leakBlob = '';
try {
  const svc = require('../lib/franchisePortal/franchisePortalService');
  const red = require('../lib/franchisePortal/redactor');
  require('../routes/franchisePortalRoutes');
  add('route module loads', true);

  const fns = ['getFranchisePortalStatus', 'lookupFranchisePreview', 'getFranchiseSummaryPreview', 'getFranchiseProfilePreview',
    'getTierStatusPreview', 'getOutletAccountStatusPreview', 'getSalesSummaryPreview', 'getTargetAchievementPreview',
    'getRoyaltySummaryPreview', 'getRoyaltyPaymentStatusPreview', 'getOutstandingPayablePreview', 'getInventoryAllocationPreview',
    'createReplenishmentDraftPreview', 'getOrderStatusPreview', 'getMarketingFundPreview', 'getHeadcountPreview',
    'getComplianceChecklistPreview', 'getTerritoryAssignmentPreview', 'getContractStatusPreview', 'createDocumentRequestPreview',
    'createSupportRequestPreview', 'createMessageDraftPreview', 'getAuditPreview'];
  add('all service functions exported', fns.every((f) => typeof svc[f] === 'function'), fns.filter((f) => typeof svc[f] !== 'function').join(',') || 'all present');

  const status = svc.getFranchisePortalStatus();
  add('status dryRun true + liveActionsEnabled false', status.dryRun === true && status.liveActionsEnabled === false);
  add('status franchisePortalPublicLive false', status.franchisePortalPublicLive === false);
  add('status piiMasked true', status.piiMasked === true);
  add('status externalCallsEnabled false', status.externalCallsEnabled === false);

  add('redactor masks phone', red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567'));
  add('redactor masks email', /^fr\*+@example\.com$/.test(red.maskEmail('franchise@example.com')), red.maskEmail('franchise@example.com'));
  add('redactor masks order ref', red.maskRef('rord_3001') === 'rord_****');
  add('redactor masks invoice ref', red.maskRef('finv_2001') === 'finv_****');
  add('redactor masks payment ref', red.maskPaymentRef('x') === 'pay_****');
  add('redactor masks tax ref', red.maskTaxRef('x') === 'tax_****');
  add('redactor masks document ref', red.maskDocumentRef('x') === 'doc_****');

  const repl = svc.createReplenishmentDraftPreview({ outletId: 'outlet_1', items: [{ sku: 'sku_1', qty: 10 }] });
  add('replenishment liveOrderCreation false', repl.liveOrderCreation === false && repl.liveStockReservation === false && repl.liveStockMutation === false);
  const royalty = svc.getRoyaltySummaryPreview({});
  add('royalty liveRoyaltyMutation false', royalty.liveRoyaltyMutation === false && royalty.livePaymentAction === false);
  const pay = svc.getRoyaltyPaymentStatusPreview({});
  add('royalty payment livePaymentAction false', pay.livePaymentAction === false && pay.liveInvoiceMutation === false);
  const doc = svc.createDocumentRequestPreview({ documentId: 'doc_6001' });
  add('document request liveDocumentDownload false', doc.liveDocumentDownload === false);
  const msg = svc.createMessageDraftPreview({ message: 'hi' });
  add('message draft liveSend false + masked recipient', msg.liveSend === false && msg.recipientMasked.includes('*'));
  const sum = svc.getFranchiseSummaryPreview({});
  add('summary piiMasked true + works without modules', sum.piiMasked === true);

  leakBlob = JSON.stringify({ status, repl, royalty, pay, doc, msg, sum,
    outlets: svc.listOutlets({}), sales: svc.getSalesSummaryPreview({}), invoices: svc.listRoyaltyInvoices({}), audit: svc.getAuditPreview() });
  add('no PII/secret leak', !red.hasLeak(leakBlob));
} catch (e) {
  add('functional pipeline', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, strict: String(process.env.FRANCHISE_PORTAL_STRICT || 'false'), checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'franchise_portal_check.json'), JSON.stringify(out, null, 2));
let md = `# Franchise Portal Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'franchise_portal_check.md'), md);
console.log(md);
const strict = String(process.env.FRANCHISE_PORTAL_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
