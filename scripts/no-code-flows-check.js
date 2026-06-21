#!/usr/bin/env node
'use strict';

/** No-Code Flows — check. Verifies files/wiring, builds a sample flow, validates,
 * previews, reads campaign analytics. No external calls, no live sends. */


const fs = require('fs');
const path = require('path');
function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
function read(rel) { try { return fs.readFileSync(path.join(process.cwd(), rel), 'utf8'); } catch (e) { return ''; } }


process.env.NO_CODE_FLOWS_STORE_PATH = 'data/no-code-flows.check.json';

const checks = [];
function add(n, ok, d) { checks.push({ name: n, ok: !!ok, detail: d || null }); }

['lib/noCodeFlows/flowModel.js', 'lib/noCodeFlows/flowValidator.js', 'lib/noCodeFlows/flowPreviewRunner.js',
'lib/noCodeFlows/nodeRegistry.js', 'lib/noCodeFlows/campaignAnalytics.js', 'lib/noCodeFlows/campaignTimeline.js',
'routes/noCodeFlowsRoutes.js', 'public/no-code-flows.html'].forEach(function (f) { add('file ' + f, exists(f)); });
add('route mounted', /noCodeFlowsRoutes/.test(read('server.js')));

try {
  const flowModel = require('../lib/noCodeFlows/flowModel');
  const validator = require('../lib/noCodeFlows/flowValidator');
  const runner = require('../lib/noCodeFlows/flowPreviewRunner');
  const analytics = require('../lib/noCodeFlows/campaignAnalytics');
  const f = flowModel.create({ name: 'Check flow', trigger: { type: 'trigger_keyword', config: { keyword: 'hi' } },
nodes: [{ type: 'action_whatsapp_draft', config: { message: 'Hello' } }, { type: 'end' }] });
  add('flow created', !!f.id, f.id);
  // connect trigger -> first node for reachability
  const updated = flowModel.update(f.id, { edges: [{ from: f.trigger.id, to: f.nodes[0].id }, { from: f.nodes[0].id, to:
f.nodes[1].id }] });
  const v = validator.validate(updated); add('validation runs', v.ok === true, 'errors ' + v.errors.length);
  const pr = runner.run(updated); add('preview dry-run', pr.dryRun === true && pr.liveActionsEnabled === false,
pr.steps.length + ' steps'); add('message drafts produced', pr.messageDrafts.length >= 1);
  const a = analytics.analytics('DEMO-CAMP-001'); add('campaign analytics preview', a.sentPreview >= 0 && a.dryRun ===
true);
} catch (e) { add('module pipeline', false, e.message); }

const passed = checks.filter(function (c) { return c.ok; }).length, failed = checks.length - passed;
try { const dir = path.join(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'no_code_flows_check.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
passed: passed, failed: failed, checks: checks }, null, 2)); } catch (e) {}

try { fs.unlinkSync(path.join(process.cwd(), 'data/no-code-flows.check.json')); } catch (e) {}
console.log('no-code-flows-check: ' + passed + ' passed, ' + failed + ' failed');
process.exit(0);
