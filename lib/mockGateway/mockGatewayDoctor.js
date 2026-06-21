'use strict';

/**
    * Mock Gateway — doctor. Read-only readiness check for offline/local demo + VS Code.
    */

const fs = require('fs');
const path = require('path');
const scoring = require('./mockReadinessScoring');
const registry = require('./mockRegistry');
const scenarios = require('./mockScenarios');
const sanitizer = require('./mockInputSanitizer');
const runner = require('./mockScenarioRunner');
const safety = require('./mockSafety');

function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
function read(rel) { try { return fs.readFileSync(path.join(process.cwd(), rel), 'utf8'); } catch (e) { return ''; } }

function run() {
    const checks = [];
    function add(name, ok, blocker) { checks.push({ name: name, ok: !!ok, blocker: !!blocker }); }

    add('mock gateway index exists', exists('lib/mockGateway/index.js'), true);
    add('route file exists', exists('routes/mockGatewayRoutes.js'), true);
    add('route mounted', /mockGatewayRoutes/.test(read('server.js')), false);
    add('dashboard page exists', exists('public/mock-gateway.html'), false);
    add('dashboard js exists', exists('public/js/mock-gateway.js'), false);

   add('dashboard css exists', exists('public/css/mock-gateway.css'), false);
   add('env placeholders present', /MOCK_GATEWAY_DRY_RUN/.test(read('.env.example')), false);
   add('gitignore protects data', /data\//.test(read('.gitignore')), false);
   add('package scripts present', /mock-gateway:smoke/.test(read('package.json')), false);
   add('smoke test exists', exists('tests/smoke/mockGatewaySmoke.js'), false);

   // Providers load.
   let providersOk = true;
   try { providersOk = registry.list().every(function (p) { return p.status && p.status.available; }); } catch (e) {
providersOk = false; }
 add('providers load', providersOk, false);

   // Scenarios load.
 add('scenarios load', (function () { try { return scenarios.list().length >= 15; } catch (e) { return false; } })(),
false);


   // Sanitizer works.
 add('sanitizer works', (function () { try { const r = sanitizer.sanitize('call me at +1 555 0100 or x@example.com, token sk-abcdefgh12345678'); return r.findings.length >= 2; } catch (e) { return false; } })(), false);


   // Sample scenario returns redacted output, dryRun + offlineOnly.
   let sampleSafe = false;
   try {
    const resp = runner.runScenario('wa_order_confirmation');
    const blob = JSON.stringify(resp);
   sampleSafe = resp.dryRun === true && resp.offlineOnly === true && resp.liveActionsEnabled === false &&
!/\b\d{10,15}\b/.test(blob);
   } catch (e) { sampleSafe = false; }
   add('sample scenario safe + redacted', sampleSafe, true);


   // No live actions / external calls.
   add('live actions disabled', safety.liveActionsEnabled() === false, true);
   add('external calls disabled', safety.externalCallsEnabled() === false, true);


   const sc = scoring.score(checks);
   const blockers = checks.filter(function (c) { return !c.ok && c.blocker; }).map(function (c) { return c.name; });
   const warnings = checks.filter(function (c) { return !c.ok && !c.blocker; }).map(function (c) { return c.name; });


   const readyForLocalDemo = sc.score >= 70 && blockers.length === 0;
   const readyForVSCode = sc.score >= 60 && blockers.indexOf('mock gateway index exists') === -1;
   const readyForManualZip = sc.score >= 50;

   let status = 'blocked';
   if (readyForLocalDemo) status = 'local_demo_ready';
   else if (readyForVSCode) status = 'vscode_ready';
   else if (readyForManualZip) status = 'manual_zip_ready_with_caution';


 const nextSteps = blockers.map(function (b) { return 'Resolve blocker: ' + b; }).concat(warnings.slice(0,
5).map(function (w) { return 'Add: ' + w; }));

   return { dryRun: true, score: sc.score, status: status, blockers: blockers, warnings: warnings, readyForLocalDemo:
readyForLocalDemo, readyForVSCode: readyForVSCode, readyForManualZip: readyForManualZip, checks: checks, nextSteps:
nextSteps };
}


module.exports = { run };
