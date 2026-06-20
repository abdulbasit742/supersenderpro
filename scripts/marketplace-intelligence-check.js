#!/usr/bin/env node
'use strict';
/**
 * scripts/marketplace-intelligence-check.js
 * Safe, dependency-free self-test for the Marketplace Intelligence layer.
 * Uses a temp store path so it never touches real data/.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-check-'));
process.env.MARKETPLACE_INTELLIGENCE_STORE_PATH = path.join(tmp, 'mi.json');
process.env.MARKETPLACE_INTELLIGENCE_HISTORY_PATH = path.join(tmp, 'mi-history.json');
process.env.MARKETPLACE_INTELLIGENCE_DRY_RUN = 'true';

const mi = require('../lib/marketplaceIntelligence');
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else { console.log('PASS:', msg); } };

// 1. ingest a seller offer (group)
mi.ingest('group', { messages: [{ text: 'iPhone 13 128GB available, price 165000, in stock, Lahore', who: '+92 300 1112233', name: 'Ali Mobiles', city: 'Lahore' }], sourceId: 'grp1', sourceName: 'Mobile Deals' });
let s = mi.status();
assert(s.sellersTracked >= 1, 'seller offer creates a seller entity');
assert(s.skusTracked >= 1, 'offer creates a SKU entity');

// 2. ingest a buyer request
mi.ingest('chat', { messages: [{ text: 'Looking for iPhone 13 128GB urgent, budget 160000', who: '+92 321 9998877', name: 'Sara' }], sourceId: 'chat1' });
s = mi.status();
assert(s.buyersTracked >= 1, 'buyer request creates a buyer/demand entity');

// 3. ecommerce price for spread opportunity
mi.ingest('ecommerce', { products: [{ name: 'iPhone 13 128GB', price: 189000, currency: 'PKR', stock: 5, platform: 'shopify' }] });

// 4. second seller cheaper -> price radar
mi.ingest('dealer', { rates: [{ seller: 'Bilal Traders', product: 'iPhone 13 128GB', price: 158000, city: 'Karachi', stock: 'in stock' }] });

// 5. risky post
mi.ingest('group', { messages: [{ text: 'iPhone 13 half price 100% advance only no cod dm me', who: '+92 333 0001122', name: 'QuickDeal' }], sourceId: 'grp2' });
s = mi.status();
assert(s.highRiskPosts >= 1, 'risky post flagged');

// 6. radar + opportunities + recommendations
const prices = mi.prices();
assert(prices.length >= 1 && prices[0].min <= prices[0].max, 'price radar returns min/max summary');
const opps = mi.opportunities();
assert(Array.isArray(opps), 'opportunity detector returns array');
const recs = require('../lib/marketplaceIntelligence').recommendations;
recs().then(r => {
  assert(r.mode === 'rule_based_dry_run', 'recommendations are dry-run by default');

  // 7. PII safety: no full phone in any API output
  const blob = JSON.stringify({ sellers: mi.sellers(), buyers: mi.buyers(), graph: mi.graphView(), digest: mi.digest() });
  assert(!/\+?92\s?\d{3}\s?\d{7}/.test(blob) && !/\d{11}/.test(blob.replace(/sku_\w+/g, '')), 'no full phone numbers leak into outputs');

  // 8. reports
  const md = mi.report('seller_ranking', 'markdown');
  assert(typeof md === 'string' && md.includes('seller_ranking'), 'markdown report builds');
  const csv = mi.report('sku_price', 'csv');
  assert(typeof csv === 'string' && csv.includes('sku'), 'csv report builds');

  console.log('\nMarketplace Intelligence check complete. exitCode=', process.exitCode || 0);
});
