'use strict';
/** scripts/sales-pipeline-check.js - quick presence/health check. Usage: node scripts/sales-pipeline-check.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const rows = [];
const add = (n, ok) => rows.push({ name: n, ok: !!ok });

add('lib module present', exists('lib/salesPipeline/index.js'));
add('route module present', exists('routes/salesPipelineRoutes.js'));
add('wire script present', exists('scripts/wire-sales-pipeline.js'));
add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('SALES PIPELINE HOOK'));
add('docs present', exists('docs/SALES_PIPELINE_COMMAND_CENTER.md'));

let doctor = null;
try { doctor = require('../lib/salesPipeline/doctor').run(); } catch (e) { doctor = { ok: false, error: e.message }; }

console.log('Sales Pipeline check:');
rows.forEach((r) => console.log('  ' + (r.ok ? 'OK ' : 'XX ') + r.name));
console.log('Doctor:', JSON.stringify(doctor, null, 2));
process.exit(rows.every((r) => r.ok) && doctor && doctor.ok ? 0 : 1);
