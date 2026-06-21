  'use strict';

  const fs = require('fs');
  const path = require('path');
  process.env.LOYALTY_CUSTOMERS_PATH = 'data/.lc-smoke-cust.json';
  process.env.LOYALTY_LEDGER_PATH = 'data/.lc-smoke-ledger.json';
  process.env.LOYALTY_RULES_PATH = 'data/.lc-smoke-rules.json';


  const model = require('../../lib/loyaltyCenter/loyaltyCustomerModel');
  const tiers = require('../../lib/loyaltyCenter/rewardTierService');
  const ledger = require('../../lib/loyaltyCenter/pointsLedger');
  const rules = require('../../lib/loyaltyCenter/rewardRules');
  const storeCredit = require('../../lib/loyaltyCenter/storeCreditPreview');
  const referral = require('../../lib/loyaltyCenter/referralProgram');
  const redemption = require('../../lib/loyaltyCenter/redemptionPreview');
  const vip = require('../../lib/loyaltyCenter/vipSegmentPreview');
  const liability = require('../../lib/loyaltyCenter/rewardLiability');
  const msg = require('../../lib/loyaltyCenter/messageDrafts');
  const accounting = require('../../lib/loyaltyCenter/accountingImpactPreview');
  const routes = require('../../routes/loyaltyCenterRoutes');

  const results = [];
  const t = (name, cond) => results.push({ name, pass: Boolean(cond) });

  t('tier for high spend', model.tierForSpend(250000) === 'vip_preview');
  t('tier for low spend', model.tierForSpend(500) === 'bronze_preview');

  const list = tiers.list({ limit: 10 });
  t('customers seeded', list.length >= 3);
  t('customers masked', !/3001234567/.test(JSON.stringify(list)));
  const c = tiers.getRaw(list[0].id);


  const e = ledger.addPreview({ customerId: c.customerId, entryType: 'order_reward_preview', pointsPreview: 150 });
  t('ledger entry dry-run', e.dryRun === true && e.pointsPreview === 150);
  const red = ledger.addPreview({ customerId: c.customerId, entryType: 'redemption_preview', pointsPreview: 50 });
  t('redemption entry negative', red.pointsPreview === -50);
  t('balance computed', ledger.balanceFor(c.customerId) === 100);

  t('rule points for order', rules.pointsForOrder(100) >= 0);
  const rule = rules.create({ name: 'Test', ruleType: 'first_purchase_bonus', pointsValue: 200 });
  t('rule created', rule.ok === true);


  const sc = storeCredit.preview({ customerId: c.id, creditAmount: 500 });
  t('store credit no wallet write', sc.liveWalletWrite === false && sc.balanceAfterPreview >= 500);

  const rc = referral.previewCode({ customerId: c.id });
  t('referral code no live', rc.liveReferralCode === false && /-/.test(rc.referralCodePreview));

  const rp = redemption.preview({ customerId: c.id, pointsRequired: 50 });
  t('redemption no coupon', rp.liveCoupon === false && typeof rp.allowedPreview === 'boolean');

  const seg = vip.segments();
  t('vip segments', Number.isFinite(seg.vipCustomersPreview));


  const liab = liability.preview();
  t('liability no ledger write', liab.liveLedgerWrite === false);
  const acc = accounting.build();
  t('accounting balanced preview', acc.liveLedgerWrite === false && acc.ledgerEntriesPreview.length >= 2);

  const m = msg.build(c.customerId, 'birthday', 'whatsapp_preview');
  t('message draft no live send', m.ok === true && m.liveSend === false);
  t('routes module loads', !!routes);


  const passed = results.filter((r) => r.pass).length;
  const allPass = passed === results.length;
  try { const dir = path.resolve(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); fs.writeFileSync(path.join(dir, 'loyalty_center_smoke.json'), JSON.stringify({ passed, total: results.length,
  allPass, results }, null, 2)); } catch (_e) {}
  console.log(`Loyalty Center smoke: ${passed}/${results.length}`);
  results.filter((r) => !r.pass).forEach((r) => console.log(' ✗ ' + r.name));
  ['data/.lc-smoke-cust.json','data/.lc-smoke-ledger.json','data/.lc-smoke-rules.json'].forEach((f) => { try {
  fs.rmSync(path.resolve(process.cwd(), f), { force: true }); } catch (_e) {} });
  process.exit(allPass ? 0 : 1);
