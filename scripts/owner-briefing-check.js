#!/usr/bin/env node
// scripts/owner-briefing-check.js — Validates the Owner Briefing install + generates a sample.
// Never exposes secrets. Exit 0 unless a structural check fails.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const O = require('../lib/ownerBriefing');
const { hasLeak } = require('../lib/ownerBriefing/privacy');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('route module present', exists('routes/ownerBriefingRoutes.js'));
add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('OWNER BRIEFING HOOK'));
add('dashboard page present', exists('public/owner-briefing.html'));
add('dashboard js present', exists('public/js/owner-briefing.js'));
add('dashboard css present', exists('public/css/owner-briefing.css'));
add('env placeholders present', exists('.env.example') && fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8').includes('OWNER_BRIEFING_ENABLED'));
['OWNER_BRIEFING.md', 'OWNER_DAILY_ROUTINE.md'].forEach((d) => add(`doc ${d}`, exists(`docs/${d}`)));

let briefing;
try {
  const kpis = O.kpiBuilder.build(); add('kpis built', kpis.kpis.length > 0);
  briefing = O.briefingBuilder.build('morning'); add('briefing built', !!briefing.text);
  add('dry-run default', briefing.dryRun === true && O.config.dryRun === true);
  const packet = O.deliveryAdapter.buildPacket(briefing); add('delivery packet is dry-run', packet.dryRun === true);
  O.historyStore.add(briefing); add('history recorded', O.historyStore.list().length >= 1);
} catch (e) { add('functional pipeline', false, e.message); }

add('no secret leak in briefing', briefing ? !hasLeak(JSON.stringify(briefing)) : false);

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'owner_briefing_check.json'), JSON.stringify(out, null, 2));
let md = `# Owner Briefing Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'owner_briefing_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
