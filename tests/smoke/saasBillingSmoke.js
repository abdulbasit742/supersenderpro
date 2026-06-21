#!/usr/bin/env node
'use strict';
const mod = require('../lib/saasBilling/billingSummary');
if (!mod) throw new Error('module not loadable');
console.log(JSON.stringify({ ok: true, dryRun: true, smoke: 'tests/smoke/saasBillingSmoke.js' }, null, 2));
