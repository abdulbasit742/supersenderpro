#!/usr/bin/env node
// tests/smoke/ownerBriefingSmoke.js — Offline smoke test. No external APIs, no sends.
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let O;
check('require route module', () => { require('../../routes/ownerBriefingRoutes'); return 'loaded'; });
check('require barrel', () => { O = require('../../lib/ownerBriefing'); assert(O.kpiBuilder && O.briefingBuilder && O.alertRules, 'missing core'); return 'ok'; });
check('data sources never throw', () => { const k = O.kpiBuilder.build(); assert(Array.isArray(k.kpis), 'kpis not array'); return `${k.kpis.length} kpis`; });
let morning, evening;
check('build morning briefing', () => { morning = O.briefingBuilder.build('morning'); assert(morning.text.length > 0, 'no text'); return `${morning.alerts.length} alerts`; });
check('build evening summary', () => { evening = O.briefingBuilder.build('evening'); assert(evening.kind === 'evening', 'wrong kind'); return 'ok'; });
check('dry-run true by default', () => { assert(O.config.dryRun === true && morning.dryRun === true, 'not dry-run'); return 'dry-run'; });
check('delivery packet never sends', () => { const p = O.deliveryAdapter.buildPacket(morning); assert(p.dryRun === true && p.approvalRequired === true, 'packet not safe'); return p.mode; });
check('alerts evaluate', () => { const a = O.alertRules.evaluate(O.kpiBuilder.build()); assert(Array.isArray(a), 'alerts not array'); return `${a.length} alerts`; });
check('actions derived from alerts', () => { const a = O.actionItems.fromAlerts(O.alertRules.evaluate(O.kpiBuilder.build())); assert(Array.isArray(a), 'actions not array'); return `${a.length} actions`; });
check('history records', () => { O.historyStore.add(morning); assert(O.historyStore.list().length >= 1, 'no history'); return 'ok'; });
check('no secrets leak in output', () => { const { hasLeak } = require('../../lib/ownerBriefing/privacy'); assert(!hasLeak(JSON.stringify({ morning, evening })), 'leak'); return 'clean'; });

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'owner_briefing_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Owner Briefing Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'owner_briefing_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
