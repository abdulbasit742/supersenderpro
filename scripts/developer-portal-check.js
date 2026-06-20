#!/usr/bin/env node
// scripts/developer-portal-check.js — verifies Developer Portal wiring + safety. Never exposes secrets.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
process.env.DEVELOPER_PORTAL_STORE_PATH = process.env.DEVELOPER_PORTAL_STORE_PATH || 'data/_dpcheck_apps.json';
process.env.DEVELOPER_PORTAL_WEBHOOKS_PATH = process.env.DEVELOPER_PORTAL_WEBHOOKS_PATH || 'data/_dpcheck_wh.json';
process.env.DEVELOPER_PORTAL_DELIVERIES_PATH = process.env.DEVELOPER_PORTAL_DELIVERIES_PATH || 'data/_dpcheck_dl.json';
process.env.DEVELOPER_PORTAL_HISTORY_PATH = process.env.DEVELOPER_PORTAL_HISTORY_PATH || 'data/_dpcheck_hist.json';

const results = [];
const add = (name, pass, detail='') => results.push({ name, pass: !!pass, detail });

function fileExists(rel){ return fs.existsSync(path.join(ROOT, rel)); }

(async () => {
  // 1. files
  ['routes/developerPortalRoutes.js','lib/developerPortal/store.js','lib/developerPortal/developerRegistry.js',
   'lib/developerPortal/apiEndpointCatalog.js','lib/developerPortal/webhookEventCatalog.js',
   'lib/developerPortal/webhookSubscriptions.js','lib/developerPortal/webhookDeliveryPreview.js',
   'public/developer-portal.html','public/developers.html'].forEach(f=>add('file:'+f, fileExists(f)));

  // 2. route mount
  const server = fs.readFileSync(path.join(ROOT,'server.js'),'utf8');
  add('route_mounted', server.includes("/api/developer-portal"));

  // 3. env placeholders
  const env = fileExists('.env.example') ? fs.readFileSync(path.join(ROOT,'.env.example'),'utf8') : '';
  add('env_placeholders', env.includes('DEVELOPER_PORTAL_ENABLED') && env.includes('DEVELOPER_PORTAL_ALLOW_LIVE_WEBHOOKS'));

  // 4. gitignore protections
  const gi = fileExists('.gitignore') ? fs.readFileSync(path.join(ROOT,'.gitignore'),'utf8') : '';
  add('gitignore_protections', gi.includes('developer-portal') && gi.includes('developer-webhooks'));

  // 5. functional
  const reg = require(path.join(ROOT,'lib/developerPortal/developerRegistry'));
  const subs = require(path.join(ROOT,'lib/developerPortal/webhookSubscriptions'));
  const dp = require(path.join(ROOT,'lib/developerPortal/webhookDeliveryPreview'));
  const openApi = require(path.join(ROOT,'lib/developerPortal/openApiBuilder'));
  const { policy } = require(path.join(ROOT,'lib/developerPortal/safetyGuard'));

  const app = reg.createApp({ name:'Check App', appType:'n8n' });
  add('create_app', !!app.id);
  const key = reg.issueKeyPreview(app.id);
  add('fake_api_key_preview', !!key.oneTimeKey && key.isDemo === true);
  add('no_hash_exposed', !('apiKeyHash' in key.app));

  const sub = subs.createSub({ appId: app.id, url:'https://example.com/secret-hook', eventTypes:['public_funnel.lead_created'] });
  add('create_subscription', !!sub.id);
  add('url_masked', !String(JSON.stringify(sub)).includes('secret-hook'));

  const delivery = await dp.deliverPreview(sub.id, 'public_funnel.lead_created');
  add('delivery_dry_run', delivery.dryRun === true);
  add('no_live_delivery', delivery.status !== 'delivered_live_if_enabled');

  const oa = openApi.build();
  add('openapi_generated', oa.openapi === '3.0.0' && Object.keys(oa.paths).length > 0);

  add('policy_safe_defaults', policy().dryRun === true && policy().allowLiveWebhooks === false);

  // write artifacts
  const blockers = results.filter(r=>!r.pass);
  const out = { generatedAt: new Date().toISOString(), passed: results.filter(r=>r.pass).length, total: results.length, blockers: blockers.map(b=>b.name), results };
  fs.writeFileSync(path.join(ROOT,'artifacts/developer_portal_check.json'), JSON.stringify(out,null,2));
  const md = `# Developer Portal Check\n\nGenerated: ${out.generatedAt}\n\nPassed **${out.passed}/${out.total}**\n\n` +
    results.map(r=>`- ${r.pass?'✅':'❌'} ${r.name}${r.detail?' — '+r.detail:''}`).join('\n') + '\n';
  fs.writeFileSync(path.join(ROOT,'artifacts/developer_portal_check.md'), md);

  // cleanup temp data
  ['_dpcheck_apps','_dpcheck_wh','_dpcheck_dl','_dpcheck_hist'].forEach(n=>{ try{ fs.unlinkSync(path.join(ROOT,'data',n+'.json')); }catch{} });

  console.log(md);
  const strict = String(process.env.DEVELOPER_PORTAL_STRICT||'').toLowerCase()==='true';
  process.exit(strict && blockers.length ? 1 : 0);
})().catch(e=>{ console.error('Check failed:', e); process.exit(1); });
