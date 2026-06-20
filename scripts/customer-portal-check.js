#!/usr/bin/env node
// scripts/customer-portal-check.js — Validates Customer Portal install + safe behaviour. No server, no external calls.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));

const LIB = [
  'store.js', 'customerPortalModel.js', 'customerPortalService.js', 'statusSummaryPreview.js',
  'orderStatusPreview.js', 'invoiceStatusPreview.js', 'bookingStatusPreview.js', 'serviceStatusPreview.js',
  'maintenanceStatusPreview.js', 'ticketStatusPreview.js', 'warrantyStatusPreview.js', 'loyaltyStatusPreview.js',
  'contractStatusPreview.js', 'documentRequestPreview.js', 'supportRequestPreview.js', 'messageDrafts.js',
  'auditPreview.js', 'redactor.js',
];
LIB.forEach((f) => add(`file lib/customerPortal/${f}`, exists(`lib/customerPortal/${f}`)));
['routes/customerPortalRoutes.js', 'public/customer-portal.html', 'public/js/customer-portal.js', 'public/css/customer-portal.css']
  .forEach((f) => add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('CUSTOMER PORTAL HOOK'));

let leakBlob = '';
try {
  const svc = require('../lib/customerPortal/customerPortalService');
  const red = require('../lib/customerPortal/redactor');
  require('../routes/customerPortalRoutes');
  add('route module loads', true);

  // Exported functions exist
  const fns = ['getPortalStatus', 'lookupCustomerPreview', 'getCustomerSummaryPreview', 'getOrderStatusPreview',
    'getInvoiceStatusPreview', 'getBookingStatusPreview', 'getServiceStatusPreview', 'getMaintenanceStatusPreview',
    'getTicketStatusPreview', 'getWarrantyStatusPreview', 'getLoyaltyStatusPreview', 'getContractStatusPreview',
    'getDocumentStatusPreview', 'createSupportRequestPreview', 'createDocumentRequestPreview',
    'createRescheduleRequestPreview', 'createPaymentReminderPreview', 'createMessageDraftPreview', 'getAuditPreview'];
  add('all service functions exported', fns.every((f) => typeof svc[f] === 'function'), fns.filter((f) => typeof svc[f] !== 'function').join(',') || 'all present');

  const status = svc.getPortalStatus();
  add('status dryRun true + liveActionsEnabled false', status.dryRun === true && status.liveActionsEnabled === false);
  add('status externalCallsEnabled false', status.externalCallsEnabled === false);

  add('redactor masks phone', red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567'));
  add('redactor masks email', /^cu\*+@example\.com$/.test(red.maskEmail('customer@example.com')), red.maskEmail('customer@example.com'));
  add('redactor masks ref', red.maskRef('ord_1001') === 'ord_****');

  const inv = svc.getInvoiceStatusPreview({});
  add('invoice livePayment false', inv.livePayment === false);
  const msg = svc.createMessageDraftPreview({ message: 'hi' });
  add('message draft liveSend false + masked recipient', msg.liveSend === false && msg.recipientMasked.includes('*'));
  const sum = svc.getCustomerSummaryPreview({});
  add('summary piiMasked true', sum.piiMasked === true);

  leakBlob = JSON.stringify({ status, inv, msg, sum, orders: svc.listOrders({}), docs: svc.listDocuments({}), audit: svc.getAuditPreview() });
  add('no PII/secret leak', !red.hasLeak(leakBlob));
} catch (e) {
  add('functional pipeline', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, strict: String(process.env.CUSTOMER_PORTAL_STRICT || 'false'), checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'customer_portal_check.json'), JSON.stringify(out, null, 2));
let md = `# Customer Portal Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'customer_portal_check.md'), md);
console.log(md);
const strict = String(process.env.CUSTOMER_PORTAL_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
