#!/usr/bin/env node
// tests/smoke/developerPortalSmoke.js — end-to-end safety smoke test. No external calls, no real secrets.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
process.env.DEVELOPER_PORTAL_STORE_PATH = 'data/_dpsmoke_apps.json';
process.env.DEVELOPER_PORTAL_WEBHOOKS_PATH = 'data/_dpsmoke_wh.json';
process.env.DEVELOPER_PORTAL_DELIVERIES_PATH = 'data/_dpsmoke_dl.json';
process.env.DEVELOPER_PORTAL_HISTORY_PATH = 'data/_dpsmoke_hist.json';

const assert = (cond, msg) => { if (!cond) throw new Error('SMOKE FAIL: ' + msg); };

(async () => {
  const reg = require(path.join(ROOT,'lib/developerPortal/developerRegistry'));
  const cat = require(path.join(ROOT,'lib/developerPortal/apiCatalog'));
  const ec = require(path.join(ROOT,'lib/developerPortal/webhookEventCatalog'));
  const subs = require(path.join(ROOT,'lib/developerPortal/webhookSubscriptions'));
  const dp = require(path.join(ROOT,'lib/developerPortal/webhookDeliveryPreview'));
  const builder = require(path.join(ROOT,'lib/developerPortal/webhookPayloadBuilder'));

  assert(typeof reg.createApp === 'function', 'registry available');
  assert(cat.catalog().total > 0, 'api catalog available');
  assert(ec.eventTypes().length > 0, 'event catalog available');

  const app = reg.createApp({ name:'Smoke App', appType:'zapier_style' });
  const key = reg.issueKeyPreview(app.id);
  assert(key.isDemo === true, 'fake key preview is demo');
  assert(/^sk_demo_/.test(key.oneTimeKey), 'demo key prefix');

  const sub = subs.createSub({ appId: app.id, url:'https://example.com/hook?token=abc123', eventTypes:['public_funnel.lead_created'] });
  assert(sub.id, 'subscription created');

  const payload = builder.build('public_funnel.lead_created', { phone:'923001234567', email:'a@b.com' });
  const str = JSON.stringify(payload);
  assert(!str.includes('923001234567'), 'phone redacted');
  assert(!str.includes('a@b.com'), 'email redacted');

  const delivery = await dp.deliverPreview(sub.id, 'public_funnel.lead_created');
  assert(delivery.dryRun === true, 'dryRun true');
  assert(delivery.status !== 'delivered_live_if_enabled', 'no live delivery');
  const dstr = JSON.stringify(delivery);
  assert(!dstr.includes('abc123'), 'webhook token not leaked');
  assert(!dstr.includes('sk_demo_'), 'no api key in delivery');

  const out = { generatedAt:new Date().toISOString(), result:'PASS', appId:app.id, subId:sub.id, checks:[
    'registry','api_catalog','event_catalog','demo_key','subscription','payload_redaction','dry_run','no_live','no_leak'] };
  fs.writeFileSync(path.join(ROOT,'artifacts/developer_portal_smoke.json'), JSON.stringify(out,null,2));
  fs.writeFileSync(path.join(ROOT,'artifacts/developer_portal_smoke.md'),
    `# Developer Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**RESULT: PASS** ✅\n\n` + out.checks.map(c=>`- ✅ ${c}`).join('\n') + '\n');

  ['_dpsmoke_apps','_dpsmoke_wh','_dpsmoke_dl','_dpsmoke_hist'].forEach(n=>{ try{ fs.unlinkSync(path.join(ROOT,'data',n+'.json')); }catch{} });
  console.log('Developer Portal smoke test: PASS');
  process.exit(0);
})().catch(e=>{ console.error(e.message); process.exit(1); });
