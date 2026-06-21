#!/usr/bin/env node
 'use strict';

 /**
  * Pilot Ops — config/readiness check. Read-only-ish (creates a sample in an
  * isolated store), secret-safe. Writes artifacts/pilot_ops_check.{json,md}.
  * Exit 0 unless PILOT_OPS_STRICT=true and blockers exist.
  */

 const fs = require('fs');
 const path = require('path');

 process.env.PILOT_OPS_STORE_PATH = 'data/pilot-ops.check.json';
 process.env.PILOT_OPS_FEEDBACK_PATH = 'data/pilot-feedback.check.json';

 function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
 function serverMentions(tok) { try { return fs.readFileSync(path.join(process.cwd(), 'server.js'), 'utf8').indexOf(tok)
 !== -1; } catch (e) { return false; } }
 function envHas(name) { try { return fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8').indexOf(name) !==
 -1; } catch (e) { return false; } }

 const checks = [];
 function add(name, ok, detail) { checks.push({ name: name, ok: !!ok, detail: detail || null }); }


 add('routes file present', exists('routes/pilotOpsRoutes.js'));
 add('route mounted in server.js', serverMentions('pilotOpsRoutes'));
 add('dashboard page present', exists('public/pilot-ops.html'));
 add('docs present', exists('docs/PILOT_OPS_COMMAND_CENTER.md'));
 ['PILOT_OPS_ENABLED', 'PILOT_OPS_DRY_RUN', 'PILOT_OPS_STORE_PATH'].forEach(function (e) { add('env has ' + e, envHas(e));
 });

 let pilot = null;
 try {
   const registry = require('../lib/pilotOps/pilotRegistry');
   const checklist = require('../lib/pilotOps/onboardingChecklist');
   const success = require('../lib/pilotOps/successScoring');
   const risk = require('../lib/pilotOps/riskScoring');
   const feedback = require('../lib/pilotOps/feedbackStore');
   const followup = require('../lib/pilotOps/followupDrafts');
   pilot = registry.create({ businessName: 'Check Co', ownerName: 'Test User', ownerPhone: '923001234567', ownerEmail:
 'test@example.com' });
   add('create sample pilot', !!pilot.id, pilot.id);
   const items = checklist.generate(pilot.id); add('generate checklist', items.length > 0, items.length + ' items');
   const succ = success.compute(pilot, {}); add('success score', typeof succ.score === 'number', 'score ' + succ.score);
   const rsk = risk.compute(pilot, {}); add('risk score', typeof rsk.score === 'number', 'score ' + rsk.score);
   const fb = feedback.create({ pilotId: pilot.id, type: 'bug', title: 'sample', description: 'call me at 923009998888'
 }); add('create feedback', !!fb.id, fb.id);

  add('feedback masks PII', !/\b\d{10,15}\b/.test(JSON.stringify(fb)), 'masked');
  const d = followup.generate(pilot, 'setup_reminder', {}); add('follow-up draft', d.ok !== false, d.draftType);
} catch (e) { add('module pipeline runs', false, (e && e.message) || 'failed'); }


const passed = checks.filter(function (c) { return c.ok; }).length;
const failed = checks.length - passed;
const blockers = checks.filter(function (c) { return !c.ok && /routes file|route mounted|module pipeline/.test(c.name);
}).length;

try {
  const dir = path.join(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'pilot_ops_check.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
passed: passed, failed: failed, checks: checks }, null, 2));
  const md = ['# Pilot Ops — Check Report', '', 'Passed: ' + passed + ' | Failed: ' + failed, '', '| Check | OK | Detail |', '|---|---|---|'].concat(checks.map(function (c) { return '| ' + c.name + ' | ' + (c.ok ? 'yes' : 'NO') + ' | ' +
(c.detail || '') + ' |'; })).join(' ');
  fs.writeFileSync(path.join(dir, 'pilot_ops_check.md'), md);
} catch (e) { /* ignore */ }


// cleanup isolated stores
['data/pilot-ops.check.json', 'data/pilot-feedback.check.json'].forEach(function (p) { try {
fs.unlinkSync(path.join(process.cwd(), p)); } catch (e) { /* ignore */ } });


console.log('pilot-ops-check: ' + passed + ' passed, ' + failed + ' failed');
if (String(process.env.PILOT_OPS_STRICT || 'false').toLowerCase() === 'true' && blockers > 0) { console.error('STRICT: '
+ blockers + ' blocker(s). Exiting 1.'); process.exit(1); }
process.exit(0);
