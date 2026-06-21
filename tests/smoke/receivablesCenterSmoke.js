  'use strict';

  const fs = require('fs');
  const path = require('path');
  process.env.RECEIVABLES_INVOICES_PATH = 'data/.rcv-smoke-inv.json';
  process.env.RECEIVABLES_QUOTATIONS_PATH = 'data/.rcv-smoke-quo.json';


  const calc = require('../../lib/receivablesCenter/taxDiscountCalculator');
  const invoiceService = require('../../lib/receivablesCenter/invoiceService');
  const quotationService = require('../../lib/receivablesCenter/quotationService');
  const aging = require('../../lib/receivablesCenter/receivablesAging');
  const balances = require('../../lib/receivablesCenter/customerBalance');
  const reminders = require('../../lib/receivablesCenter/reminderDrafts');
  const accounting = require('../../lib/receivablesCenter/accountingLinkPreview');
  const routes = require('../../routes/receivablesCenterRoutes');

  const results = [];
  const t = (name, cond) => results.push({ name, pass: Boolean(cond) });

  const c = calc.calculate({ items: [{ qty: 3, unitPrice: 1000, cost: 500 }], discountType: 'flat', discountValue: 500,
  taxRate: 10, shipping: 100 });
  t('subtotal', c.subtotalPreview === 3000);
  t('discount applied', c.discountPreview === 500);
  t('tax on discounted base', c.taxPreview === 250);
  t('total correct', c.totalPreview === 2850);
  t('margin preview', c.marginPreview === 1000); // (3000-500) - 1500 cost


  const inv = invoiceService.create({ customerName: 'John Roe', phone: '+92 300 9998887', email: 'john@acme.com', items: [{
  qty: 1, unitPrice: 10000 }], dueDate: '2020-01-01' });
  t('invoice created dry-run', inv.dryRun === true && inv.totalPreview === 10000);
  t('invoice masked', !/John Roe/.test(JSON.stringify(inv)) && !/3009998887/.test(JSON.stringify(inv)) &&
  !/john@acme\.com/.test(JSON.stringify(inv)));

  const pay = invoiceService.paymentPreview(inv.id, 4000);
  t('payment preview partial', pay.status === 'partially_paid_preview' && pay.balanceDuePreview === 6000);
  t('payment dry-run', pay.dryRun === true && pay.liveActionsEnabled === false);

  const send = invoiceService.sendPreview(inv.id);
  t('send preview no live', send.liveSend === false);

  const ag = aging.aging();


  t('aging overdue bucket', ag.buckets.due_90_plus_days.amountPreview > 0 || ag.overdueAmountPreview > 0); // due 2020 ->
  overdue
  t('aging risk set', ['low', 'medium', 'high'].includes(ag.receivablesRiskLevel));


  const q = quotationService.create({ customerName: 'Q Lead', items: [{ qty: 2, unitPrice: 2500 }] });
  t('quote created', q.totalPreview === 5000);
  const conv = quotationService.convertPreview(q.id);
  t('convert preview makes invoice', conv.ok === true && !!conv.convertedInvoiceIdPreview);

  const rem = reminders.build(inv.id, 'whatsapp_preview');
  t('reminder draft', rem.ok === true && rem.liveSend === false && typeof rem.messagePreview === 'string');
  t('reminder customer masked', !/9998887/.test(JSON.stringify(rem)));

  const led = accounting.build(inv.id);
  t('ledger preview', led.liveLedgerWrite === false && led.ledgerEntriesPreview.length >= 2);


  const bal = balances.balances();
  t('balances rollup', Array.isArray(bal) && bal.length > 0);
  t('routes module loads', !!routes);

  const passed = results.filter((r) => r.pass).length;
  const allPass = passed === results.length;
  try { const dir = path.resolve(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); fs.writeFileSync(path.join(dir, 'receivables_center_smoke.json'), JSON.stringify({ passed, total: results.length,
  allPass, results }, null, 2)); } catch (_e) {}
  console.log(`Receivables Center smoke: ${passed}/${results.length}`);
  results.filter((r) => !r.pass).forEach((r) => console.log(' ✗ ' + r.name));
  try { fs.rmSync(path.resolve(process.cwd(), 'data/.rcv-smoke-inv.json'), { force: true });
  fs.rmSync(path.resolve(process.cwd(), 'data/.rcv-smoke-quo.json'), { force: true }); } catch (_e) {}
  process.exit(allPass ? 0 : 1);
