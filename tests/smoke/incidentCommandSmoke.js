#!/usr/bin/env node
'use strict';
const mod = require('../lib/incidentCommand/healthAggregator');
if (!mod) throw new Error('module not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'tests/smoke/incidentCommandSmoke.js' }, null, 2));
