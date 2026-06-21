#!/usr/bin/env node
'use strict';
const mod = require('../lib/resellerPortal/qa/resellerReadinessDoctor');
if (!mod) throw new Error('module not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'tests/smoke/resellerPortalQASmoke.js' }, null, 2));
