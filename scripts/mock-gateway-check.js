#!/usr/bin/env node
'use strict';

/**
 * Mock Gateway — check. Verifies files/wiring/env/gitignore, runs sanitizer +
 * each provider sample + doctor. Writes artifacts/mock_gateway_check.{json,md}.
 * No external calls, no real sends, no production writes.
 */

const fs = require('fs');
const path = require('path');

function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
function read(rel) { try { return fs.readFileSync(path.join(process.cwd(), rel), 'utf8'); } catch (e) { return ''; } }

const checks = [];
function add(name, ok, detail) { checks.push({ name: name, ok: !!ok, detail: detail || null }); }

['lib/mockGateway/index.js', 'lib/mockGateway/mockRegistry.js', 'lib/mockGateway/mockScenarioRunner.js',
'lib/mockGateway/mockInputSanitizer.js', 'lib/mockGateway/mockGatewayDoctor.js', 'routes/mockGatewayRoutes.js',
'public/mock-gateway.html', 'public/js/mock-gateway.js', 'public/css/mock-gateway.css'].forEach(function (f) { add('file ' + f, exists(f)); });
add('route mounted', /mockGatewayRoutes/.test(read('server.js')));
add('env placeholders', /MOCK_GATEWAY_DRY_RUN/.test(read('.env.example')));
add('gitignore protects data', /data\//.test(read('.gitignore')));
add('package scripts', /mock-gateway:smoke/.test(read('package.json')));
add('smoke test exists', exists('tests/smoke/mockGatewaySmoke.js'));

try {
  const sanitizer = require('../lib/mockGateway/mockInputSanitizer');
  const r = sanitizer.sanitize('call +1 555 0100, email x@example.com, token sk-abcdefgh12345678');
  add('sanitizer finds PII/secret', r.findings.length >= 2, r.findings.length + ' findings');
  const blob = JSON.stringify(r.redacted);
  add('sanitizer redacts raw', !/sk-abcdefgh12345678/.test(blob), 'no raw key');
} catch (e) { add('sanitizer runs', false, e.message); }

try {
  const registry = require('../lib/mockGateway/mockRegistry');
  const runner = require('../lib/mockGateway/mockScenarioRunner');
  let allSafe = true;
  registry.names().forEach(function (n) {
      const resp = runner.runProvider(n, {});
      if (resp.dryRun !== true || resp.offlineOnly !== true || resp.liveActionsEnabled !== false) allSafe = false;
    if (/\b\d{10,15}\b/.test(JSON.stringify(resp))) allSafe = false;
  });

  add('all provider previews safe', allSafe, registry.names().length + ' providers');
} catch (e) { add('provider previews run', false, e.message); }

let doctorReport = null;
try { doctorReport = require('../lib/mockGateway/mockGatewayDoctor').run(); add('doctor runs', true, 'score ' +
doctorReport.score); }
catch (e) { add('doctor runs', false, e.message); }

const passed = checks.filter(function (c) { return c.ok; }).length;
const failed = checks.length - passed;

try {
  const dir = path.join(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'mock_gateway_check.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
passed: passed, failed: failed, doctor: doctorReport, checks: checks }, null, 2));
  const md = ['# Mock Gateway — Check', '', 'Passed: ' + passed + ' | Failed: ' + failed + (doctorReport ? ' | Doctor '
+ doctorReport.score + '/100' : ''), '', '| Check | OK | Detail |', '|---|---|---|'].concat(checks.map(function (c) {
return '| ' + c.name + ' | ' + (c.ok ? 'yes' : 'NO') + ' | ' + (c.detail || '') + ' |'; })).join(' ');
  fs.writeFileSync(path.join(dir, 'mock_gateway_check.md'), md);
} catch (e) {}

console.log('mock-gateway-check: ' + passed + ' passed, ' + failed + ' failed' + (doctorReport ? ', doctor ' +
doctorReport.score + '/100' : ''));
const strict = String(process.env.MOCK_GATEWAY_STRICT || 'false').toLowerCase() === 'true';
if (strict && failed > 0) process.exit(1);
process.exit(0);
