#!/usr/bin/env node
'use strict';

/** Privacy Center — check. Verifies files/wiring, creates a request, runs export +
 * delete + retention + audit previews. No real delete, no raw export. */


const fs = require('fs');
const path = require('path');
function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
function read(rel) { try { return fs.readFileSync(path.join(process.cwd(), rel), 'utf8'); } catch (e) { return ''; } }


process.env.PRIVACY_CENTER_STORE_PATH = 'data/privacy-center.check.json';
process.env.PRIVACY_CENTER_RETENTION_PATH = 'data/privacy-retention.check.json';


const checks = [];
function add(n, ok, d) { checks.push({ name: n, ok: !!ok, detail: d || null }); }


['lib/privacyCenter/privacyRequestService.js', 'lib/privacyCenter/dataExportPreview.js',
'lib/privacyCenter/dataDeletionPreview.js', 'lib/privacyCenter/retentionPolicies.js',
'lib/privacyCenter/consentRecords.js', 'lib/privacyCenter/auditExportPreview.js', 'lib/privacyCenter/redactor.js',
'routes/privacyCenterRoutes.js', 'public/privacy-center.html'].forEach(function (f) { add('file ' + f, exists(f)); });
add('route mounted', /privacyCenterRoutes/.test(read('server.js')));


try {
  const service = require('../lib/privacyCenter/privacyRequestService');
  const exp = require('../lib/privacyCenter/dataExportPreview');
  const del = require('../lib/privacyCenter/dataDeletionPreview');
  const ret = require('../lib/privacyCenter/retentionPolicies');
  const audit = require('../lib/privacyCenter/auditExportPreview');
  const r = service.create({ requestType: 'data_export', requesterName: 'Test User', phone: '923001234567', email:
'test@example.com' });
  add('request created + PII masked', !!r.id && !/\b\d{10,15}\b/.test(JSON.stringify(r)), r.id);
  const e = exp.run(r.id); add('export preview redacted + no live', e.liveExport === false && e.dryRun === true &&
!/\b\d{10,15}\b/.test(JSON.stringify(e)));
  const d = del.run(r.id, {}); add('delete preview is plan only', d.liveDelete === false &&
Array.isArray(d.deletionPlanPreview));
  add('payments protected in delete plan', del.run(r.id, { dataTypes: ['payments'] }).deletionPlanPreview.every(function
(p) { return p.wouldDelete === false; }));
  const rp = ret.runPreview(ret.list()[0].id); add('retention preview no execute', rp.plan && rp.plan.wouldExecute ===
false);
  const a = audit.run({ limit: 10 }); add('audit export redacted only', a.redactedOnly === true && a.liveExport ===
false);
} catch (e) { add('module pipeline', false, e.message); }

const passed = checks.filter(function (c) { return c.ok; }).length, failed = checks.length - passed;
try { const dir = path.join(process.cwd(), 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'privacy_center_check.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
passed: passed, failed: failed, checks: checks }, null, 2)); } catch (e) {}
['data/privacy-center.check.json', 'data/privacy-retention.check.json'].forEach(function (p) { try {
fs.unlinkSync(path.join(process.cwd(), p)); } catch (e) {} });
console.log('privacy-center-check: ' + passed + ' passed, ' + failed + ' failed');
process.exit(0);
