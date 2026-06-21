#!/usr/bin/env node
'use strict';

/** SaaS Billing — check. Verifies files/wiring, runs plan/usage/quota/entitlement/
 * upgrade previews. No real charge, no gateway call. */

const fs = require('fs');
const path = require('path');
function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
function read(rel) { try { return fs.readFileSync(path.join(process.cwd(), rel), 'utf8'); } catch (e) { return ''; } }


process.env.SAAS_BILLING_STORE_PATH = 'data/saas-billing.check.json';
process.env.SAAS_BILLING_EVENTS_PATH = 'data/saas-billing-events.check.json';


const checks = [];
function add(n, ok, d) { checks.push({ name: n, ok: !!ok, detail: d || null }); }


['lib/saasBilling/planCatalog.js', 'lib/saasBilling/usageMeter.js', 'lib/saasBilling/quotaChecker.js',
'lib/saasBilling/entitlementService.js', 'lib/saasBilling/billingSummary.js', 'lib/saasBilling/upgradePreview.js',
'lib/saasBilling/usageEvents.js', 'lib/saasBilling/redactor.js', 'routes/saasBillingRoutes.js', 'public/saas-billing.html'].forEach(function (f) { add('file ' + f, exists(f)); });
add('route mounted', /saasBillingRoutes/.test(read('server.js')));

try {
  const catalog = require('../lib/saasBilling/planCatalog');
  const meter = require('../lib/saasBilling/usageMeter');
  const quota = require('../lib/saasBilling/quotaChecker');
  const ent = require('../lib/saasBilling/entitlementService');
  const up = require('../lib/saasBilling/upgradePreview');
  const summary = require('../lib/saasBilling/billingSummary');
  add('5 default plans', catalog.list().length === 5, catalog.order().join(','));
  add('11 meters', catalog.METERS.length === 11);
  const u = meter.usage('check-tenant'); add('usage preview', u.ok === true && u.dryRun === true &&
Array.isArray(u.meters));
  const rec = meter.recordPreview('check-tenant', 'whatsapp_messages', 50); add('record preview', rec.ok === true &&
rec.dryRun === true);
  const q = quota.checkPreview('check-tenant', 'whatsapp_messages', 100); add('quota check', q.dryRun === true && typeof
q.allowedPreview === 'boolean');
  const e = ent.checkPreview('check-tenant', 'white_label', 'starter_preview'); add('entitlement check upgrade-required',
e.allowedPreview === false && e.upgradeRequiredPreview === true, 'unlock ' + e.unlockPlanPreview);
  const upv = up.preview('check-tenant', 'pro_preview'); add('upgrade preview no live payment', upv.livePayment === false
&& Array.isArray(upv.changesPreview));
  const s = summary.tenantSummary('check-tenant'); add('summary masked + no live', s.livePayment === false &&
!/\b\d{10,15}\b/.test(JSON.stringify(s)));
} catch (e) { add('module pipeline', false, e.message); }

const passed = checks.filter(function (c) { return c.ok; }).length, failed = checks.length - passed;
try { const dir = path.join(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'saas_billing_check.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
passed: passed, failed: failed, checks: checks }, null, 2)); } catch (e) {}
['data/saas-billing.check.json', 'data/saas-billing-events.check.json'].forEach(function (p) { try {
fs.unlinkSync(path.join(process.cwd(), p)); } catch (e) {} });
console.log('saas-billing-check: ' + passed + ' passed, ' + failed + ' failed');
process.exit(0);
